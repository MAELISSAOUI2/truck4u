import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireCustomer, requireDriverAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import type { Server } from 'socket.io';

const router = Router();

const cancelRideSchema = z.object({
  reason: z.string().optional(),
});

// Helper: Calculate if cancellation is within grace period (5 minutes)
function isWithinGracePeriod(bidAcceptedAt: Date): boolean {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  return bidAcceptedAt > fiveMinutesAgo;
}

// Helper: Reset monthly strikes for all drivers
async function resetMonthlyStrikesIfNeeded() {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find drivers whose strikes need reset
    const driversToReset = await prisma.driver.findMany({
      where: {
        cancellationStrikes: { gt: 0 },
        lastStrikeResetAt: { lt: oneMonthAgo }
      }
    });

    if (driversToReset.length > 0) {
      await prisma.driver.updateMany({
        where: {
          id: { in: driversToReset.map(d => d.id) }
        },
        data: {
          cancellationStrikes: 0,
          lastStrikeResetAt: new Date()
        }
      });

      console.log(`✅ Reset strikes for ${driversToReset.length} drivers`);
    }
  } catch (error) {
    console.error('Error resetting monthly strikes:', error);
  }
}

// POST /api/cancellations/customer/:rideId - Customer cancels a ride
router.post('/customer/:rideId', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { rideId } = req.params;
    const { reason } = cancelRideSchema.parse(req.body);

    // Get ride with payment info
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        payment: true,
        driver: true,
        customer: true,
        winningBid: true
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Course non trouvée' });
    }

    if (ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Can't cancel if already completed or cancelled
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cette course ne peut pas être annulée' });
    }

    // Determine when bid was accepted (for grace period calculation)
    let bidAcceptedAt: Date | null = null;
    if (ride.winningBid) {
      // Find when the bid was accepted (ride moved to BID_ACCEPTED)
      // We'll use updatedAt when status became BID_ACCEPTED
      // For simplicity, use current time if no better timestamp
      bidAcceptedAt = ride.updatedAt;
    }

    // Check if within grace period
    const withinGrace = bidAcceptedAt ? isWithinGracePeriod(bidAcceptedAt) : true;
    const cancellationFee = withinGrace ? 0 : 5; // 5 DT late cancellation fee

    // Calculate refund amount
    let refundAmount = 0;
    if (ride.payment && ride.payment.status === 'COMPLETED') {
      // Refund = platform fee paid - cancellation fee
      refundAmount = ride.payment.platformFee - cancellationFee;
    }

    // Create cancellation record
    const cancellation = await prisma.cancellation.create({
      data: {
        rideId: ride.id,
        cancelledBy: 'CUSTOMER',
        customerId: req.userId,
        driverId: ride.driverId || undefined,
        reason,
        bidAcceptedAt: bidAcceptedAt || undefined,
        wasWithinGracePeriod: withinGrace,
        cancellationFee,
        refundAmount,
        refundStatus: refundAmount > 0 ? 'PENDING' : 'COMPLETED'
      }
    });

    // Update ride status to CANCELLED
    await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED' }
    });

    // Process refund if applicable
    if (refundAmount > 0 && ride.payment) {
      // In production, integrate with payment gateway for actual refund
      await prisma.cancellation.update({
        where: { id: cancellation.id },
        data: {
          refundStatus: 'PROCESSING',
          // refundProcessedAt will be set when gateway confirms
        }
      });
    }

    // Send notifications via Socket.io
    const io = req.app.get('io') as Server;

    // Notify driver if assigned
    if (ride.driverId) {
      io.to(`driver:${ride.driverId}`).emit('ride_cancelled', {
        rideId: ride.id,
        message: 'Le client a annulé la course',
        cancelledBy: 'customer',
        reason: reason || 'Aucune raison spécifiée'
      });
    }

    // Notify customer
    io.to(`customer:${req.userId}`).emit('cancellation_confirmed', {
      rideId: ride.id,
      cancellationFee,
      refundAmount,
      withinGracePeriod: withinGrace
    });

    res.json({
      success: true,
      cancellation,
      message: withinGrace
        ? 'Course annulée. Remboursement intégral en cours.'
        : `Course annulée. Frais d'annulation: ${cancellationFee} DT. Remboursement: ${refundAmount} DT.`
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cancellations/driver/:rideId - Driver cancels a ride
router.post('/driver/:rideId', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rideId } = req.params;
    const { reason } = cancelRideSchema.parse(req.body);

    // Reset monthly strikes if needed
    await resetMonthlyStrikesIfNeeded();

    // Get ride with driver info
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: true,
        customer: true,
        payment: true
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Course non trouvée' });
    }

    if (ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Can't cancel if already completed or cancelled
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cette course ne peut pas être annulée' });
    }

    const driver = ride.driver!;

    // Check if driver is already deactivated
    if (driver.isDeactivated) {
      return res.status(403).json({ error: 'Votre compte est désactivé' });
    }

    // Increment strike count
    const newStrikeCount = driver.cancellationStrikes + 1;
    const willBeDeactivated = newStrikeCount >= 3;

    // Create cancellation record
    const cancellation = await prisma.cancellation.create({
      data: {
        rideId: ride.id,
        cancelledBy: 'DRIVER',
        driverId: req.userId,
        customerId: ride.customerId,
        reason,
        strikeGiven: true,
        strikeCount: newStrikeCount,
        accountDeactivated: willBeDeactivated,
        // Customer gets full refund
        refundAmount: ride.payment?.platformFee || 0,
        refundStatus: ride.payment ? 'PENDING' : 'COMPLETED'
      }
    });

    // Update driver strikes and possibly deactivate
    await prisma.driver.update({
      where: { id: req.userId },
      data: {
        cancellationStrikes: newStrikeCount,
        ...(willBeDeactivated ? {
          isDeactivated: true,
          deactivatedAt: new Date(),
          deactivationReason: 'Désactivation automatique après 3 annulations'
        } : {})
      }
    });

    // Update ride status
    await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED' }
    });

    // Process customer refund if payment was made
    if (ride.payment && ride.payment.status === 'COMPLETED') {
      await prisma.cancellation.update({
        where: { id: cancellation.id },
        data: { refundStatus: 'PROCESSING' }
      });
    }

    // Send notifications
    const io = req.app.get('io') as Server;

    // Notify customer
    io.to(`customer:${ride.customerId}`).emit('ride_cancelled', {
      rideId: ride.id,
      message: 'Le transporteur a annulé la course. Remboursement intégral en cours.',
      cancelledBy: 'driver',
      reason: reason || 'Aucune raison spécifiée'
    });

    // Notify driver
    if (willBeDeactivated) {
      io.to(`driver:${req.userId}`).emit('account_deactivated', {
        message: 'Votre compte a été désactivé après 3 annulations. Contactez le support pour réactivation.',
        strikeCount: newStrikeCount
      });
    } else if (newStrikeCount === 2) {
      io.to(`driver:${req.userId}`).emit('strike_warning', {
        message: '⚠️ ATTENTION: Dernier avertissement! Une autre annulation désactivera votre compte.',
        strikeCount: newStrikeCount
      });
    } else {
      io.to(`driver:${req.userId}`).emit('strike_given', {
        message: `Annulation enregistrée. Strike ${newStrikeCount}/3.`,
        strikeCount: newStrikeCount
      });
    }

    res.json({
      success: true,
      cancellation,
      strikeCount: newStrikeCount,
      accountDeactivated: willBeDeactivated,
      message: willBeDeactivated
        ? 'Course annulée. Votre compte a été désactivé après 3 annulations.'
        : newStrikeCount === 2
        ? 'Course annulée. ⚠️ Dernier avertissement! Une autre annulation désactivera votre compte.'
        : `Course annulée. Strike ${newStrikeCount}/3 enregistré.`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/cancellations/history - Get cancellation history (admin or specific user)
router.get('/history', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { userType, limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let where: any = {};

    // Filter by user type if specified
    if (userType === 'customer') {
      where.customerId = req.userId;
    } else if (userType === 'driver') {
      where.driverId = req.userId;
    }

    const cancellations = await prisma.cancellation.findMany({
      where,
      include: {
        ride: {
          select: {
            id: true,
            pickup: true,
            dropoff: true,
            finalPrice: true,
            status: true
          }
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: { cancelledAt: 'desc' },
      take: limitNum,
      skip: offsetNum
    });

    const total = await prisma.cancellation.count({ where });

    res.json({
      cancellations,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/cancellations/stats - Get cancellation statistics
router.get('/stats', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { period = '30' } = req.query; // Days
    const days = parseInt(period as string);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total cancellations
    const total = await prisma.cancellation.count({
      where: { cancelledAt: { gte: since } }
    });

    // By initiator
    const byCustomer = await prisma.cancellation.count({
      where: {
        cancelledBy: 'CUSTOMER',
        cancelledAt: { gte: since }
      }
    });

    const byDriver = await prisma.cancellation.count({
      where: {
        cancelledBy: 'DRIVER',
        cancelledAt: { gte: since }
      }
    });

    // Grace period stats
    const withinGrace = await prisma.cancellation.count({
      where: {
        wasWithinGracePeriod: true,
        cancelledAt: { gte: since }
      }
    });

    const lateCancel = await prisma.cancellation.count({
      where: {
        wasWithinGracePeriod: false,
        cancelledAt: { gte: since }
      }
    });

    // Financial impact
    const totalFees = await prisma.cancellation.aggregate({
      where: { cancelledAt: { gte: since } },
      _sum: { cancellationFee: true }
    });

    const totalRefunds = await prisma.cancellation.aggregate({
      where: { cancelledAt: { gte: since } },
      _sum: { refundAmount: true }
    });

    // Driver strikes
    const strikesGiven = await prisma.cancellation.count({
      where: {
        strikeGiven: true,
        cancelledAt: { gte: since }
      }
    });

    const accountsDeactivated = await prisma.cancellation.count({
      where: {
        accountDeactivated: true,
        cancelledAt: { gte: since }
      }
    });

    res.json({
      period: `${days} days`,
      total,
      byInitiator: {
        customer: byCustomer,
        driver: byDriver
      },
      gracePeriod: {
        withinGrace,
        lateCancel,
        percentage: total > 0 ? ((withinGrace / total) * 100).toFixed(1) : 0
      },
      financial: {
        totalFeesCollected: totalFees._sum.cancellationFee || 0,
        totalRefundsProcessed: totalRefunds._sum.refundAmount || 0
      },
      driverImpact: {
        strikesGiven,
        accountsDeactivated
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
