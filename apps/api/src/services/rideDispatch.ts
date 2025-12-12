import { prisma } from '@truck4u/database';
import Redis from 'ioredis';
import type { Server } from 'socket.io';
import { rideDispatchQueue } from './queues';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface DispatchJobData {
  rideId: string;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  vehicleType: string;
  currentRadiusStep: number;
}

const RADIUS_STEPS = [
  { radius: 5, waitTime: 180000 }, // 5km, 3min
  { radius: 10, waitTime: 120000 }, // 10km, 2min
  { radius: 20, waitTime: 120000 }, // 20km, 2min
  { radius: 30, waitTime: 60000 }  // 30km+, 1min
];

/**
 * Process a single dispatch step for a ride
 * Called by BullMQ worker for each radius expansion step
 */
export async function processDispatchStep(data: DispatchJobData, io?: Server) {
  const { rideId, pickup, vehicleType, currentRadiusStep } = data;

  console.log(`[RideDispatch] Processing step ${currentRadiusStep} for ride ${rideId}`);

  // Check if ride is still pending bids
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { customer: true }
  });

  if (!ride) {
    console.log(`[RideDispatch] Ride ${rideId} not found, aborting`);
    return { success: false, reason: 'ride_not_found' };
  }

  if (ride.status !== 'PENDING_BIDS') {
    console.log(`[RideDispatch] Ride ${rideId} no longer pending bids (status: ${ride.status}), aborting`);
    return { success: false, reason: 'ride_status_changed', currentStatus: ride.status };
  }

  // Get current radius step configuration
  const step = RADIUS_STEPS[currentRadiusStep];
  if (!step) {
    console.log(`[RideDispatch] No more radius steps for ride ${rideId}, marking as NO_DRIVERS_AVAILABLE`);
    await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'NO_DRIVERS_AVAILABLE' }
    });

    // Notify customer that no drivers were found
    if (io) {
      io.to(`customer:${ride.customerId}`).emit('ride_no_drivers', {
        rideId,
        message: 'Aucun conducteur disponible pour le moment. Veuillez réessayer plus tard.'
      });
    }

    return { success: false, reason: 'no_more_steps' };
  }

  // Find drivers within radius using Redis GEORADIUS
  let nearbyDriverIds: string[] = [];
  try {
    nearbyDriverIds = await redis.georadius(
      'drivers:available',
      pickup.lng,
      pickup.lat,
      step.radius,
      'km',
      'ASC'
    ) as string[];
  } catch (error) {
    console.error(`[RideDispatch] Redis GEORADIUS error:`, error);
    // Continue without Redis geolocation
  }

  console.log(`[RideDispatch] Found ${nearbyDriverIds.length} drivers within ${step.radius}km`);

  if (nearbyDriverIds.length === 0) {
    // No drivers in this radius, schedule next step
    return scheduleNextStep(data, io);
  }

  // Filter by vehicle type and verification status
  const drivers = await prisma.driver.findMany({
    where: {
      id: { in: nearbyDriverIds },
      vehicleType,
      isAvailable: true,
      verificationStatus: 'APPROVED',
      isDeactivated: false
    },
    select: {
      id: true,
      name: true,
      rating: true,
      vehicleType: true
    }
  });

  console.log(`[RideDispatch] ${drivers.length} qualified drivers found`);

  if (drivers.length === 0) {
    // No qualified drivers, schedule next step
    return scheduleNextStep(data, io);
  }

  // Notify drivers via Socket.io
  if (io) {
    const notificationData = {
      rideId,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      distance: ride.distance,
      vehicleType: ride.vehicleType,
      loadAssistance: ride.loadAssistance,
      estimatedPrice: {
        min: ride.estimatedMinPrice,
        max: ride.estimatedMaxPrice
      },
      expiresIn: step.waitTime / 1000,
      radiusKm: step.radius
    };

    drivers.forEach(driver => {
      io.to(`driver:${driver.id}`).emit('ride_request', notificationData);
    });

    console.log(`[RideDispatch] Notified ${drivers.length} drivers for ride ${rideId}`);
  }

  // Schedule check for bids after wait time
  await rideDispatchQueue.add(
    'check-bids',
    data,
    {
      delay: step.waitTime,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );

  return {
    success: true,
    driversNotified: drivers.length,
    radiusKm: step.radius,
    nextCheckIn: step.waitTime
  };
}

/**
 * Check if bids were received, otherwise schedule next radius step
 */
export async function checkBidsAndContinue(data: DispatchJobData, io?: Server) {
  const { rideId } = data;

  console.log(`[RideDispatch] Checking bids for ride ${rideId}`);

  const ride = await prisma.ride.findUnique({
    where: { id: rideId }
  });

  if (!ride || ride.status !== 'PENDING_BIDS') {
    console.log(`[RideDispatch] Ride ${rideId} no longer pending bids, stopping dispatch`);
    return { success: true, reason: 'ride_status_changed' };
  }

  // Count active bids
  const bidsCount = await prisma.bid.count({
    where: {
      rideId,
      status: 'ACTIVE'
    }
  });

  console.log(`[RideDispatch] Found ${bidsCount} active bids for ride ${rideId}`);

  if (bidsCount > 0) {
    // We have bids, stop dispatching
    console.log(`[RideDispatch] Ride ${rideId} has bids, dispatch complete`);

    // Notify customer about received bids
    if (io) {
      io.to(`customer:${ride.customerId}`).emit('ride_bids_received', {
        rideId,
        bidsCount
      });
    }

    return { success: true, reason: 'bids_received', bidsCount };
  }

  // No bids yet, schedule next radius step
  return scheduleNextStep(data, io);
}

/**
 * Schedule the next radius expansion step
 */
async function scheduleNextStep(data: DispatchJobData, io?: Server) {
  const nextStep = data.currentRadiusStep + 1;

  if (nextStep >= RADIUS_STEPS.length) {
    console.log(`[RideDispatch] No more radius steps for ride ${data.rideId}`);
    return { success: false, reason: 'no_more_steps' };
  }

  console.log(`[RideDispatch] Scheduling step ${nextStep} for ride ${data.rideId}`);

  await rideDispatchQueue.add(
    'dispatch-step',
    { ...data, currentRadiusStep: nextStep },
    {
      delay: 1000, // Small delay before next expansion
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );

  return {
    success: true,
    reason: 'scheduled_next_step',
    nextStep
  };
}

/**
 * Initiate dispatch process for a new ride
 * Called when a ride is created
 */
export async function initiateRideDispatch(
  rideId: string,
  pickup: { lat: number; lng: number; address: string },
  vehicleType: string
) {
  console.log(`[RideDispatch] Initiating dispatch for ride ${rideId}`);

  const jobData: DispatchJobData = {
    rideId,
    pickup,
    vehicleType,
    currentRadiusStep: 0
  };

  await rideDispatchQueue.add('dispatch-step', jobData, {
    delay: 100, // Small delay to ensure ride is saved
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  });

  console.log(`[RideDispatch] Dispatch job queued for ride ${rideId}`);

  return { queued: true };
}
