import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// All admin routes require admin auth
router.use(verifyToken, requireAdmin);

// GET /api/admin/drivers/pending - Get drivers pending verification
router.get('/drivers/pending', async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: {
        verificationStatus: 'PENDING_REVIEW'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({ drivers });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/drivers/:id/verify - Approve or reject driver
router.patch('/drivers/:id/verify', async (req, res, next) => {
  try {
    const { status, reason } = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional()
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: status,
        ...(reason && {
          documents: {
            rejectionReason: reason
          }
        })
      }
    });

    // TODO: Send SMS notification to driver

    res.json({
      message: `Driver ${status.toLowerCase()}`,
      driver
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/rides/active - Get all active rides
router.get('/rides/active', async (req, res, next) => {
  try {
    const rides = await prisma.ride.findMany({
      where: {
        status: {
          in: ['PENDING_BIDS', 'BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED']
        }
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        driver: {
          select: { id: true, name: true, phone: true, vehiclePlate: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ rides });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics - Platform analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Total rides
    const totalRides = await prisma.ride.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    // Completed rides
    const completedRides = await prisma.ride.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      }
    });

    // GMV (Gross Merchandise Value)
    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startDate }
      }
    });

    const gmv = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const platformRevenue = payments.reduce((sum, p) => sum + p.platformFee, 0);

    // Active users
    const activeCustomers = await prisma.customer.count({
      where: {
        rides: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      }
    });

    const activeDrivers = await prisma.driver.count({
      where: {
        completedRides: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      }
    });

    // Rides by vehicle type
    const ridesByVehicleType = await prisma.ride.groupBy({
      by: ['vehicleType'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Payment methods distribution
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        completedAt: { gte: startDate }
      },
      _count: true
    });

    // Conversion rate
    const conversionRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 0;

    res.json({
      period,
      summary: {
        totalRides,
        completedRides,
        conversionRate: Math.round(conversionRate * 10) / 10,
        gmv: Math.round(gmv * 100) / 100,
        platformRevenue: Math.round(platformRevenue * 100) / 100,
        activeCustomers,
        activeDrivers
      },
      breakdown: {
        byVehicleType: ridesByVehicleType,
        byPaymentMethod: paymentsByMethod
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/disputes - Get reported issues
router.get('/disputes', async (req, res, next) => {
  try {
    // TODO: Implement disputes/reports system
    res.json({ disputes: [] });
  } catch (error) {
    next(error);
  }
});

export default router;
