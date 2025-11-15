import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireCustomer, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const subscriptionPlans = {
  STARTER: {
    monthlyFee: 299,
    includedRides: 20,
    reducedCommission: 0.08
  },
  BUSINESS: {
    monthlyFee: 799,
    includedRides: 60,
    reducedCommission: 0.08
  },
  ENTERPRISE: {
    monthlyFee: 1999,
    includedRides: 200,
    reducedCommission: 0.05
  }
};

// GET /api/subscriptions/plans
router.get('/plans', async (req, res) => {
  res.json({
    plans: [
      {
        id: 'STARTER',
        name: 'Starter',
        monthlyFee: 299,
        includedRides: 20,
        extraRideCost: 10,
        commission: '8%',
        features: [
          'Accès chauffeurs professionnels vérifiés',
          'Facturation mensuelle agrégée',
          'Support prioritaire'
        ]
      },
      {
        id: 'BUSINESS',
        name: 'Business',
        monthlyFee: 799,
        includedRides: 60,
        extraRideCost: 8,
        commission: '8%',
        features: [
          'Tous les avantages Starter',
          'Tarifs négociés pour trajets récurrents',
          'Reporting mensuel détaillé',
          'Account manager dédié'
        ]
      },
      {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        monthlyFee: 1999,
        includedRides: 200,
        extraRideCost: 6,
        commission: '5%',
        features: [
          'Tous les avantages Business',
          'Commission réduite à 5%',
          'API access pour intégration',
          'Facturation personnalisée',
          'SLA garanti'
        ]
      }
    ]
  });
});

// POST /api/subscriptions/subscribe
router.post('/subscribe', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { planType } = z.object({
      planType: z.enum(['STARTER', 'BUSINESS', 'ENTERPRISE'])
    }).parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: req.userId },
      include: { subscription: true }
    });

    if (customer?.subscription && customer.subscription.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Already have an active subscription' });
    }

    if (customer?.accountType !== 'BUSINESS') {
      return res.status(400).json({ error: 'Business account required' });
    }

    const plan = subscriptionPlans[planType];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await prisma.b2BSubscription.create({
      data: {
        customerId: req.userId!,
        planType,
        monthlyFee: plan.monthlyFee,
        includedRides: plan.includedRides,
        reducedCommission: plan.reducedCommission,
        status: 'ACTIVE',
        endDate
      }
    });

    // Update customer
    await prisma.customer.update({
      where: { id: req.userId },
      data: { isB2BSubscriber: true }
    });

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/current
router.get('/current', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.b2BSubscription.findUnique({
      where: { customerId: req.userId }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/invoice/:month
router.get('/invoice/:month', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { month } = req.params; // Format: YYYY-MM

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const rides = await prisma.ride.findMany({
      where: {
        customerId: req.userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      include: {
        payment: true
      }
    });

    const subscription = await prisma.b2BSubscription.findUnique({
      where: { customerId: req.userId }
    });

    const totalRides = rides.length;
    const totalAmount = rides.reduce((sum, r) => sum + (r.finalPrice || 0), 0);
    const totalFees = rides.reduce((sum, r) => sum + (r.payment?.platformFee || 0), 0);

    res.json({
      month,
      subscription,
      summary: {
        totalRides,
        includedRides: subscription?.includedRides || 0,
        extraRides: Math.max(0, totalRides - (subscription?.includedRides || 0)),
        totalAmount,
        totalFees,
        subscriptionFee: subscription?.monthlyFee || 0
      },
      rides: rides.map(r => ({
        id: r.id,
        date: r.createdAt,
        pickup: r.pickup,
        dropoff: r.dropoff,
        finalPrice: r.finalPrice,
        platformFee: r.payment?.platformFee
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
