import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';
import type { Server } from 'socket.io';
import { processAutoConfirmation } from './paymentAutoConfirmation';
import { processSubscriptionExpiration } from './subscriptionExpiration';

// Configuration Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

// Créer une connexion Redis pour BullMQ
const connection = new Redis(redisConfig);

// Queues
export const autoConfirmQueue = new Queue('auto-confirm-payments', { connection });
export const subscriptionExpirationQueue = new Queue('subscription-expiration', { connection });

// Schedulers (pour les jobs répétés)
const autoConfirmScheduler = new QueueScheduler('auto-confirm-payments', { connection: connection.duplicate() });
const subscriptionScheduler = new QueueScheduler('subscription-expiration', { connection: connection.duplicate() });

/**
 * Démarre les workers BullMQ pour traiter les jobs
 */
export function startQueueWorkers(io?: Server) {
  console.log('[BullMQ] Starting queue workers...');

  // Worker pour auto-confirmation des paiements
  const autoConfirmWorker = new Worker(
    'auto-confirm-payments',
    async (job) => {
      console.log(`[BullMQ] Processing auto-confirm job ${job.id}...`);
      const result = await processAutoConfirmation(io);
      console.log(`[BullMQ] Auto-confirm completed:`, result);
      return result;
    },
    { connection: connection.duplicate() }
  );

  // Worker pour expiration des abonnements
  const subscriptionWorker = new Worker(
    'subscription-expiration',
    async (job) => {
      console.log(`[BullMQ] Processing subscription expiration job ${job.id}...`);
      const result = await processSubscriptionExpiration(io);
      console.log(`[BullMQ] Subscription expiration completed:`, result);
      return result;
    },
    { connection: connection.duplicate() }
  );

  // Gestionnaires d'événements
  autoConfirmWorker.on('completed', (job) => {
    console.log(`[BullMQ] ✅ Auto-confirm job ${job.id} completed`);
  });

  autoConfirmWorker.on('failed', (job, err) => {
    console.error(`[BullMQ] ❌ Auto-confirm job ${job?.id} failed:`, err);
  });

  subscriptionWorker.on('completed', (job) => {
    console.log(`[BullMQ] ✅ Subscription expiration job ${job.id} completed`);
  });

  subscriptionWorker.on('failed', (job, err) => {
    console.error(`[BullMQ] ❌ Subscription expiration job ${job?.id} failed:`, err);
  });

  console.log('[BullMQ] ✅ Workers started successfully');

  // Retourner fonction de cleanup
  return async () => {
    console.log('[BullMQ] Stopping workers and schedulers...');
    await autoConfirmWorker.close();
    await subscriptionWorker.close();
    await autoConfirmScheduler.close();
    await subscriptionScheduler.close();
    await connection.quit();
    console.log('[BullMQ] All workers stopped');
  };
}

/**
 * Configure les jobs répétés (cron)
 */
export async function setupRecurringJobs() {
  console.log('[BullMQ] Setting up recurring jobs...');

  // Auto-confirmation toutes les 2 minutes
  await autoConfirmQueue.add(
    'process',
    {},
    {
      repeat: {
        every: 2 * 60 * 1000, // 2 minutes en millisecondes
      },
      removeOnComplete: 100, // Garder les 100 derniers jobs complétés
      removeOnFail: 200, // Garder les 200 derniers jobs échoués
    }
  );
  console.log('[BullMQ] ✅ Auto-confirm job scheduled (every 2 minutes)');

  // Expiration des abonnements toutes les heures
  await subscriptionExpirationQueue.add(
    'process',
    {},
    {
      repeat: {
        every: 60 * 60 * 1000, // 1 heure en millisecondes
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    }
  );
  console.log('[BullMQ] ✅ Subscription expiration job scheduled (every hour)');

  // Exécuter immédiatement les deux jobs
  await autoConfirmQueue.add('initial-run', {}, { priority: 1 });
  await subscriptionExpirationQueue.add('initial-run', {}, { priority: 1 });
  console.log('[BullMQ] ✅ Initial jobs queued for immediate execution');
}

/**
 * Initialise BullMQ avec les queues et workers
 */
export async function initializeBullMQ(io?: Server) {
  try {
    console.log('[BullMQ] Initializing...');

    // Tester la connexion Redis
    await connection.ping();
    console.log('[BullMQ] ✅ Redis connection established');

    // Démarrer les workers
    const stopWorkers = startQueueWorkers(io);

    // Configurer les jobs récurrents
    await setupRecurringJobs();

    console.log('[BullMQ] ✅ Initialization complete');

    return stopWorkers;
  } catch (error) {
    console.error('[BullMQ] ❌ Initialization failed:', error);
    throw error;
  }
}

/**
 * Nettoie les anciens jobs répétés (utile pour éviter les doublons)
 */
export async function cleanOldRepeatingJobs() {
  console.log('[BullMQ] Cleaning old repeating jobs...');

  const autoConfirmRepeatable = await autoConfirmQueue.getRepeatableJobs();
  for (const job of autoConfirmRepeatable) {
    await autoConfirmQueue.removeRepeatableByKey(job.key);
  }

  const subscriptionRepeatable = await subscriptionExpirationQueue.getRepeatableJobs();
  for (const job of subscriptionRepeatable) {
    await subscriptionExpirationQueue.removeRepeatableByKey(job.key);
  }

  console.log('[BullMQ] ✅ Old repeating jobs cleaned');
}
