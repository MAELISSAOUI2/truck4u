import { prisma } from '@truck4u/database';
import type { Server } from 'socket.io';

/**
 * Service de batch pour gérer l'expiration des abonnements conducteurs
 */

export async function processSubscriptionExpiration(io?: Server) {
  const result = {
    checked: 0,
    expired: 0,
    renewed: 0,
    failed: 0,
  };

  try {
    const now = new Date();

    // Trouver tous les abonnements actifs qui ont expiré
    const expiredSubscriptions = await prisma.driverSubscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: now,
        },
      },
      include: {
        driver: true,
      },
    });

    result.checked = expiredSubscriptions.length;
    console.log(`[Subscription] Checking ${result.checked} expired subscriptions...`);

    for (const subscription of expiredSubscriptions) {
      try {
        // Marquer comme expiré
        await prisma.$transaction(async (tx) => {
          await tx.driverSubscription.update({
            where: { id: subscription.id },
            data: {
              status: 'EXPIRED',
            },
          });

          // Retirer les avantages du conducteur
          await tx.driver.update({
            where: { id: subscription.driverId },
            data: {
              hasActiveSubscription: false,
              subscriptionTier: null,
              platformFeeRate: 0.10, // Reset à la commission par défaut
            },
          });
        });

        result.expired++;
        console.log(`[Subscription] ❌ Expired subscription for driver ${subscription.driverId}`);

        // Notifier le conducteur
        if (io) {
          io.to(`driver:${subscription.driverId}`).emit('subscription_expired', {
            tier: subscription.tier,
            message: 'Votre abonnement a expiré. Renouvelez pour retrouver vos avantages !',
          });
        }
      } catch (error) {
        result.failed++;
        console.error(`[Subscription] Failed to expire subscription ${subscription.id}:`, error);
      }
    }

    console.log(
      `[Subscription] Batch completed: ${result.expired} expired, ${result.failed} failed`
    );
  } catch (error) {
    console.error('[Subscription] Batch job failed:', error);
    throw error;
  }

  return result;
}

/**
 * Démarre le batch job avec un intervalle de 1 heure
 */
export function startSubscriptionExpirationBatch(io?: Server) {
  console.log('[Subscription] Starting expiration batch job (runs every hour)...');

  // Exécuter immédiatement au démarrage
  processSubscriptionExpiration(io).catch((error) => {
    console.error('[Subscription] Initial batch run failed:', error);
  });

  // Puis exécuter toutes les heures
  const intervalId = setInterval(
    () => {
      processSubscriptionExpiration(io).catch((error) => {
        console.error('[Subscription] Batch run failed:', error);
      });
    },
    60 * 60 * 1000
  ); // 1 heure

  // Retourner une fonction pour arrêter le batch
  return () => {
    console.log('[Subscription] Stopping batch job...');
    clearInterval(intervalId);
  };
}
