import { Request, Response, NextFunction } from 'express';
import { prisma } from '@truck4u/database';

/**
 * Middleware: Require Active B2B Subscription
 *
 * Checks if customer has BUSINESS account type and enforces
 * active subscription requirement for business customers.
 *
 * Usage:
 *   router.post('/rides', verifyToken, requireB2BSubscription, createRide);
 */
export async function requireB2BSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Non authentifié',
      });
    }

    // Fetch customer with subscription
    const customer = await prisma.customer.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Client non trouvé',
      });
    }

    // If customer is BUSINESS type, check subscription
    if (customer.accountType === 'BUSINESS') {
      // Check if has active subscription
      if (!customer.subscription) {
        return res.status(403).json({
          error: 'Abonnement B2B requis',
          message: 'Les comptes entreprise doivent avoir un abonnement actif pour créer des courses',
          redirectTo: '/customer/subscription',
          requiresSubscription: true,
        });
      }

      // Check subscription status
      if (customer.subscription.status !== 'ACTIVE') {
        return res.status(403).json({
          error: 'Abonnement inactif',
          message: `Votre abonnement est ${customer.subscription.status}. Veuillez renouveler votre abonnement.`,
          redirectTo: '/customer/subscription',
          subscriptionStatus: customer.subscription.status,
        });
      }

      // Check subscription expiration
      const now = new Date();
      const endDate = new Date(customer.subscription.endDate);

      if (endDate < now) {
        return res.status(403).json({
          error: 'Abonnement expiré',
          message: 'Votre abonnement a expiré. Veuillez le renouveler pour continuer.',
          redirectTo: '/customer/subscription',
          endDate: customer.subscription.endDate,
        });
      }

      // Attach subscription info to request for later use
      (req as any).subscription = customer.subscription;
    }

    // INDIVIDUAL customers don't need subscription, continue
    next();
  } catch (error) {
    console.error('[requireB2BSubscription] Error:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de l\'abonnement',
    });
  }
}

/**
 * Optional Middleware: Check B2B Subscription (non-blocking)
 *
 * Checks subscription but doesn't block the request.
 * Adds subscription info to request object.
 * Useful for analytics or feature gating without hard blocking.
 */
export async function checkB2BSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).userId;

    if (userId) {
      const customer = await prisma.customer.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
        },
      });

      if (customer) {
        (req as any).customer = customer;
        (req as any).isB2B = customer.accountType === 'BUSINESS';
        (req as any).hasActiveSubscription =
          customer.subscription?.status === 'ACTIVE' &&
          new Date(customer.subscription.endDate) > new Date();
      }
    }

    next();
  } catch (error) {
    console.error('[checkB2BSubscription] Error:', error);
    // Don't block request on error, just log it
    next();
  }
}
