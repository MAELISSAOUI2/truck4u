import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireDriver, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import type { Server } from 'socket.io';

const router = Router();

// All routes require driver authentication
router.use(verifyToken, requireDriver);

// GET /api/driver-subscriptions/plans - Get available subscription plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = [
      {
        tier: 'STANDARD',
        name: 'Standard',
        price: 0,
        currency: 'DT',
        interval: 'month',
        features: [
          'Accès normal aux courses',
          'Notifications standard',
          'Support par email',
        ],
        priorityMultiplier: 1.0,
        profileBoost: 0,
        earlyAccessMinutes: 0,
      },
      {
        tier: 'PREMIUM',
        name: 'Premium',
        price: 49,
        currency: 'DT',
        interval: 'month',
        popular: true,
        features: [
          '✨ Priorité sur les offres (1.5×)',
          '🚀 Profil boosté +50%',
          '⏰ Accès anticipé 5 min',
          '📱 Notifications prioritaires',
          '🎯 Badge Premium visible',
          '📊 Statistiques avancées',
          '💬 Support prioritaire',
        ],
        priorityMultiplier: 1.5,
        profileBoost: 50,
        earlyAccessMinutes: 5,
      },
      {
        tier: 'ELITE',
        name: 'Elite',
        price: 99,
        currency: 'DT',
        interval: 'month',
        features: [
          '⭐ Priorité maximale (2.5×)',
          '🚀 Profil ultra-boosté +100%',
          '⏰ Accès anticipé 15 min',
          '💰 Commission réduite (8% au lieu de 10%)',
          '🏆 Badge Elite visible',
          '📱 Notifications instantanées',
          '📊 Analytics complets',
          '💬 Support VIP 24/7',
          '🎁 Bonus mensuels',
        ],
        priorityMultiplier: 2.5,
        profileBoost: 100,
        reducedPlatformFee: 0.08,
        earlyAccessMinutes: 15,
      },
    ];

    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// GET /api/driver-subscriptions/current - Get current subscription
router.get('/current', async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId },
      include: {
        subscription: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({
      hasSubscription: driver.hasActiveSubscription,
      tier: driver.subscriptionTier || 'STANDARD',
      subscription: driver.subscription,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/driver-subscriptions/subscribe - Subscribe to a plan
router.post('/subscribe', async (req: AuthRequest, res, next) => {
  try {
    const { tier, paymentMethod } = z.object({
      tier: z.enum(['PREMIUM', 'ELITE']),
      paymentMethod: z.enum(['CASH', 'CARD', 'FLOUCI']),
    }).parse(req.body);

    // Get plan details
    const planDetails = {
      PREMIUM: {
        monthlyFee: 49,
        priorityMultiplier: 1.5,
        profileBoost: 50,
        earlyAccessMinutes: 5,
      },
      ELITE: {
        monthlyFee: 99,
        priorityMultiplier: 2.5,
        profileBoost: 100,
        reducedPlatformFee: 0.08,
        earlyAccessMinutes: 15,
      },
    };

    const plan = planDetails[tier];

    // Check if already has active subscription
    const existingSubscription = await prisma.driverSubscription.findUnique({
      where: { driverId: req.userId! },
    });

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      return res.status(400).json({
        error: 'Vous avez déjà un abonnement actif',
        currentTier: existingSubscription.tier,
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // +1 month

    const renewalDate = new Date(endDate);

    // Create subscription
    const subscription = await prisma.$transaction(async (tx) => {
      // Create or update subscription
      const sub = existingSubscription
        ? await tx.driverSubscription.update({
            where: { id: existingSubscription.id },
            data: {
              tier,
              status: 'ACTIVE',
              monthlyFee: plan.monthlyFee,
              priorityMultiplier: plan.priorityMultiplier,
              profileBoost: plan.profileBoost,
              reducedPlatformFee: plan.reducedPlatformFee,
              earlyAccessMinutes: plan.earlyAccessMinutes,
              startDate,
              endDate,
              renewalDate,
              lastPaymentDate: new Date(),
              lastPaymentAmount: plan.monthlyFee,
              paymentMethod,
            },
          })
        : await tx.driverSubscription.create({
            data: {
              driverId: req.userId!,
              tier,
              monthlyFee: plan.monthlyFee,
              priorityMultiplier: plan.priorityMultiplier,
              profileBoost: plan.profileBoost,
              reducedPlatformFee: plan.reducedPlatformFee,
              earlyAccessMinutes: plan.earlyAccessMinutes,
              startDate,
              endDate,
              renewalDate,
              lastPaymentDate: new Date(),
              lastPaymentAmount: plan.monthlyFee,
              paymentMethod,
            },
          });

      // Update driver status
      await tx.driver.update({
        where: { id: req.userId },
        data: {
          hasActiveSubscription: true,
          subscriptionTier: tier,
          platformFeeRate: plan.reducedPlatformFee || undefined, // Update commission if Elite
        },
      });

      return sub;
    });

    // Send notification
    const io = req.app.get('io') as Server;
    io.to(`driver:${req.userId}`).emit('subscription_activated', {
      tier,
      message: `Votre abonnement ${tier} est maintenant actif !`,
      benefits: plan,
    });

    res.json({
      success: true,
      subscription,
      message: 'Abonnement activé avec succès',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/driver-subscriptions/cancel - Cancel subscription
router.post('/cancel', async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.driverSubscription.findUnique({
      where: { driverId: req.userId! },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Aucun abonnement trouvé' });
    }

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Abonnement déjà annulé' });
    }

    // Cancel subscription (will expire at end date)
    await prisma.$transaction(async (tx) => {
      await tx.driverSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Note: Don't update driver status yet, wait until expiration
    });

    res.json({
      success: true,
      message: 'Abonnement annulé. Vous garderez vos avantages jusqu\'à la date d\'expiration.',
      expiresAt: subscription.endDate,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/driver-subscriptions/stats - Get subscription stats
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.driverSubscription.findUnique({
      where: { driverId: req.userId! },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return res.json({
        hasSubscription: false,
        stats: null,
      });
    }

    // Calculate stats
    const daysRemaining = Math.ceil(
      (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Get rides count since subscription started
    const ridesCount = await prisma.ride.count({
      where: {
        driverId: req.userId,
        createdAt: {
          gte: subscription.startDate,
        },
      },
    });

    // Get earnings since subscription started
    const earnings = await prisma.driverEarnings.findMany({
      where: {
        driverId: req.userId,
        paidAt: {
          gte: subscription.startDate,
        },
      },
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.netEarnings, 0);

    res.json({
      hasSubscription: true,
      tier: subscription.tier,
      daysRemaining,
      renewalDate: subscription.renewalDate,
      stats: {
        ridesSinceSubscription: ridesCount,
        earningsSinceSubscription: totalEarnings,
        avgEarningsPerRide: ridesCount > 0 ? totalEarnings / ridesCount : 0,
        platformFeeSaved: subscription.reducedPlatformFee
          ? earnings.reduce((sum, e) => sum + (e.grossAmount * 0.02), 0)
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
