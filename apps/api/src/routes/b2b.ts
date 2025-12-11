import { Router, Request, Response } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken } from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * GET /api/b2b/subscription
 * Get current customer's B2B subscription
 */
router.get('/subscription', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.userId!;

    const subscription = await prisma.b2BSubscription.findUnique({
      where: { customerId },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Aucun abonnement trouvé',
        subscription: null,
      });
    }

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('[B2B] Get subscription error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'abonnement' });
  }
});

/**
 * POST /api/b2b/subscription/purchase
 * Purchase or renew B2B subscription
 */
router.post('/subscription/purchase', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.userId!;
    const { planType, paymentMethod } = req.body;

    // Validate plan type
    const validPlans = ['STARTER', 'BUSINESS', 'ENTERPRISE'];
    if (!validPlans.includes(planType)) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    // Verify customer exists and is BUSINESS type
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    if (customer.accountType !== 'BUSINESS') {
      return res.status(400).json({
        error: 'Abonnement B2B réservé aux comptes entreprise',
      });
    }

    // Plan configurations
    const planConfigs: Record<string, { monthlyFee: number; includedRides: number; commission: number }> = {
      STARTER: { monthlyFee: 49, includedRides: 10, commission: 0.09 },
      BUSINESS: { monthlyFee: 149, includedRides: 50, commission: 0.07 },
      ENTERPRISE: { monthlyFee: 399, includedRides: 200, commission: 0.05 },
    };

    const config = planConfigs[planType];

    // Calculate subscription dates (1 month from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Check if customer already has a subscription
    const existingSubscription = await prisma.b2BSubscription.findUnique({
      where: { customerId },
    });

    let subscription;

    if (existingSubscription) {
      // Update existing subscription (renewal or upgrade)
      subscription = await prisma.b2BSubscription.update({
        where: { customerId },
        data: {
          planType,
          monthlyFee: config.monthlyFee,
          includedRides: config.includedRides,
          usedRides: 0, // Reset used rides on renewal
          reducedCommission: config.commission,
          status: 'ACTIVE',
          startDate,
          endDate,
          lastInvoiceDate: new Date(),
        },
      });
    } else {
      // Create new subscription
      subscription = await prisma.b2BSubscription.create({
        data: {
          customerId,
          planType,
          monthlyFee: config.monthlyFee,
          includedRides: config.includedRides,
          usedRides: 0,
          reducedCommission: config.commission,
          status: 'ACTIVE',
          startDate,
          endDate,
          lastInvoiceDate: new Date(),
        },
      });
    }

    // Update customer isB2BSubscriber flag
    await prisma.customer.update({
      where: { id: customerId },
      data: { isB2BSubscriber: true },
    });

    res.json({
      success: true,
      subscription,
      message: `Abonnement ${planType} activé avec succès`,
    });
  } catch (error) {
    console.error('[B2B] Purchase subscription error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'activation de l\'abonnement' });
  }
});

/**
 * POST /api/b2b/subscription/:id/cancel
 * Cancel B2B subscription
 */
router.post('/subscription/:id/cancel', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.userId!;
    const { id } = req.params;

    // Verify subscription exists and belongs to user
    const subscription = await prisma.b2BSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    if (subscription.customerId !== customerId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Update subscription status to CANCELLED
    const updatedSubscription = await prisma.b2BSubscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endDate: new Date(), // End immediately
      },
    });

    // Update customer flag
    await prisma.customer.update({
      where: { id: customerId },
      data: { isB2BSubscriber: false },
    });

    res.json({
      success: true,
      subscription: updatedSubscription,
      message: 'Abonnement annulé avec succès',
    });
  } catch (error) {
    console.error('[B2B] Cancel subscription error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de l\'abonnement' });
  }
});

/**
 * GET /api/b2b/subscription/usage
 * Get subscription usage statistics
 */
router.get('/subscription/usage', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.userId!;

    const subscription = await prisma.b2BSubscription.findUnique({
      where: { customerId },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Aucun abonnement actif' });
    }

    // Calculate usage percentage
    const usagePercentage = (subscription.usedRides / subscription.includedRides) * 100;

    // Calculate days remaining
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Get recent rides count (this month)
    const startOfMonth = new Date(subscription.startDate);
    const ridesThisMonth = await prisma.ride.count({
      where: {
        customerId,
        createdAt: {
          gte: startOfMonth,
          lte: new Date(),
        },
      },
    });

    res.json({
      success: true,
      usage: {
        usedRides: subscription.usedRides,
        includedRides: subscription.includedRides,
        remainingRides: subscription.includedRides - subscription.usedRides,
        usagePercentage: Math.round(usagePercentage),
        daysRemaining,
        ridesThisMonth,
      },
    });
  } catch (error) {
    console.error('[B2B] Get usage error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
