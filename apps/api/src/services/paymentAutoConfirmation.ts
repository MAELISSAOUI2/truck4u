import { prisma } from '@truck4u/database';
import type { Server } from 'socket.io';

/**
 * Service de batch pour confirmer automatiquement les paiements ON_HOLD
 * après 15 minutes si le conducteur est arrivé à destination
 */

// Calculer la distance entre deux points GPS (en mètres) - Formule Haversine
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance en mètres
}

interface AutoConfirmResult {
  checked: number;
  confirmed: number;
  failed: number;
  details: Array<{
    rideId: string;
    success: boolean;
    reason?: string;
  }>;
}

/**
 * Vérifie et confirme automatiquement les paiements ON_HOLD
 * si le conducteur est à destination depuis plus de 15 minutes
 */
export async function processAutoConfirmation(io?: Server): Promise<AutoConfirmResult> {
  const result: AutoConfirmResult = {
    checked: 0,
    confirmed: 0,
    failed: 0,
    details: [],
  };

  try {
    // Trouver tous les paiements ON_HOLD qui sont en attente depuis plus de 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const paymentsOnHold = await prisma.payment.findMany({
      where: {
        status: 'ON_HOLD',
        onHoldAt: {
          lte: fifteenMinutesAgo, // On_hold depuis au moins 15 minutes
        },
      },
      include: {
        ride: {
          include: {
            driver: true,
            customer: true,
          },
        },
      },
    });

    result.checked = paymentsOnHold.length;
    console.log(`[Auto-Confirm] Checking ${result.checked} payments...`);

    for (const payment of paymentsOnHold) {
      const { ride } = payment;

      try {
        // Vérifier que la course est bien terminée ou que le conducteur est arrivé
        const validStatuses = ['DROPOFF_ARRIVED', 'COMPLETED'];

        if (!validStatuses.includes(ride.status)) {
          result.details.push({
            rideId: ride.id,
            success: false,
            reason: `Ride status is ${ride.status}, not at dropoff yet`,
          });
          continue;
        }

        // Vérifier la position du conducteur si disponible
        let driverAtDestination = false;

        if (ride.driver?.currentLat && ride.driver?.currentLng) {
          const distance = calculateDistance(
            ride.driver.currentLat,
            ride.driver.currentLng,
            ride.dropoffLat,
            ride.dropoffLng
          );

          // Considérer que le conducteur est à destination s'il est à moins de 100m
          const DESTINATION_THRESHOLD = 100; // mètres
          driverAtDestination = distance <= DESTINATION_THRESHOLD;

          console.log(
            `[Auto-Confirm] Ride ${ride.id}: Driver ${driverAtDestination ? 'IS' : 'IS NOT'} at destination (${distance.toFixed(0)}m away)`
          );
        } else {
          // Si pas de position GPS, se baser uniquement sur le statut
          driverAtDestination = ride.status === 'DROPOFF_ARRIVED' || ride.status === 'COMPLETED';
          console.log(
            `[Auto-Confirm] Ride ${ride.id}: No GPS data, using status ${ride.status}`
          );
        }

        if (!driverAtDestination) {
          result.details.push({
            rideId: ride.id,
            success: false,
            reason: 'Driver not at destination yet',
          });
          continue;
        }

        // Auto-confirmer le paiement
        await prisma.$transaction(async (tx) => {
          // Mettre à jour le paiement
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              autoConfirmedAt: new Date(),
              confirmedByBatch: true,
            },
          });

          // Enregistrer les gains du conducteur (si pas déjà fait)
          const existingEarnings = await tx.driverEarnings.findFirst({
            where: { rideId: ride.id },
          });

          if (!existingEarnings && ride.driverId) {
            await tx.driverEarnings.create({
              data: {
                driverId: ride.driverId,
                rideId: ride.id,
                grossAmount: payment.totalAmount,
                platformFee: payment.platformFee,
                netEarnings: payment.driverAmount,
              },
            });

            // Mettre à jour les totaux du conducteur
            await tx.driver.update({
              where: { id: ride.driverId },
              data: {
                totalEarnings: {
                  increment: payment.driverAmount,
                },
                totalRides: {
                  increment: 1,
                },
              },
            });
          }
        });

        result.confirmed++;
        result.details.push({
          rideId: ride.id,
          success: true,
        });

        console.log(`[Auto-Confirm] ✅ Payment auto-confirmed for ride ${ride.id}`);

        // Envoyer notifications Socket.io
        if (io) {
          // Notifier le client
          if (ride.customerId) {
            io.to(`customer:${ride.customerId}`).emit('payment_auto_confirmed', {
              rideId: ride.id,
              paymentId: payment.id,
              amount: payment.totalAmount,
              message: 'Votre paiement a été confirmé automatiquement',
            });
          }

          // Notifier le conducteur
          if (ride.driverId) {
            io.to(`driver:${ride.driverId}`).emit('payment_auto_confirmed', {
              rideId: ride.id,
              paymentId: payment.id,
              amount: payment.driverAmount,
              message: 'Le paiement a été confirmé automatiquement',
            });
          }
        }
      } catch (error) {
        result.failed++;
        result.details.push({
          rideId: ride.id,
          success: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`[Auto-Confirm] ❌ Failed to confirm payment for ride ${ride.id}:`, error);
      }
    }

    console.log(
      `[Auto-Confirm] Batch completed: ${result.confirmed} confirmed, ${result.failed} failed, ${result.checked} total`
    );
  } catch (error) {
    console.error('[Auto-Confirm] Batch job failed:', error);
    throw error;
  }

  return result;
}

/**
 * Démarre le batch job avec un intervalle de 2 minutes
 */
export function startAutoConfirmationBatch(io?: Server) {
  console.log('[Auto-Confirm] Starting batch job (runs every 2 minutes)...');

  // Exécuter immédiatement au démarrage
  processAutoConfirmation(io).catch((error) => {
    console.error('[Auto-Confirm] Initial batch run failed:', error);
  });

  // Puis exécuter toutes les 2 minutes
  const intervalId = setInterval(
    () => {
      processAutoConfirmation(io).catch((error) => {
        console.error('[Auto-Confirm] Batch run failed:', error);
      });
    },
    2 * 60 * 1000
  ); // 2 minutes

  // Retourner une fonction pour arrêter le batch
  return () => {
    console.log('[Auto-Confirm] Stopping batch job...');
    clearInterval(intervalId);
  };
}
