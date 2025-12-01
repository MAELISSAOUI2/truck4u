/**
 * Real-Time Tracking Event Handlers
 *
 * Socket.IO event handlers for trip tracking and driver location updates
 */

import { Server, Socket } from 'socket.io';
import { prisma } from '@truck4u/database';
import Redis from 'ioredis';
import {
  DriverLocationUpdate,
  TripJoinData,
  TripStatusUpdate,
  DriverArrivedData,
  TripStartedData,
  TripCompletedData,
  ETAUpdate,
  SocketData,
  getDriverLocationKey,
  getTripRoomKey,
  getTripStatusKey,
  DEFAULT_TRACKING_CONFIG,
} from '../../../../apps/web/types/realtime';
import {
  authorizeRideAccess,
  validateDriverForRide,
  LocationUpdateRateLimiter,
} from './middleware';

// Rate limiter for location updates (1 update per second per driver)
const locationRateLimiter = new LocationUpdateRateLimiter(1000);

/**
 * Setup real-time tracking event handlers
 */
export function setupTrackingHandlers(
  io: Server,
  socket: Socket,
  redis: Redis
): void {
  const socketData = socket.data as SocketData;

  console.log(`🔌 Client connected: ${socket.id} (User: ${socketData.userId}, Role: ${socketData.role})`);

  // Emit connection confirmation
  socket.emit('connected', {
    userId: socketData.userId,
    role: socketData.role,
  });

  // ==========================================================================
  // Join Trip Room
  // ==========================================================================
  socket.on('join-trip', async (data: TripJoinData) => {
    try {
      const { rideId, userId, userRole } = data;

      // Verify authorization
      const authResult = await authorizeRideAccess(socket, rideId, prisma);

      if (!authResult.authorized) {
        socket.emit('error', {
          message: authResult.error || 'Not authorized to join this trip',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Join room
      const roomName = `trip:${rideId}`;
      socket.join(roomName);

      console.log(`👥 ${userRole} ${userId} joined trip room: ${roomName}`);

      // Store room membership in Redis for analytics
      await redis.sadd(getTripRoomKey(rideId), socket.id);
      await redis.expire(getTripRoomKey(rideId), 86400); // 24 hours

      // Send latest driver location if available (for customers joining late)
      if (userRole === 'CUSTOMER' && authResult.ride?.driverId) {
        const locationKey = getDriverLocationKey(authResult.ride.driverId);
        const cachedLocation = await redis.get(locationKey);

        if (cachedLocation) {
          const location: DriverLocationUpdate = JSON.parse(cachedLocation);
          socket.emit('driver:location', location);
        }
      }

      // Send latest trip status
      const statusKey = getTripStatusKey(rideId);
      const cachedStatus = await redis.get(statusKey);

      if (cachedStatus) {
        const status: TripStatusUpdate = JSON.parse(cachedStatus);
        socket.emit('trip:status-changed', status);
      }
    } catch (error) {
      console.error('Error in join-trip:', error);
      socket.emit('error', {
        message: 'Failed to join trip room',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // ==========================================================================
  // Leave Trip Room
  // ==========================================================================
  socket.on('leave-trip', async (data: { rideId: string }) => {
    try {
      const { rideId } = data;
      const roomName = `trip:${rideId}`;

      socket.leave(roomName);
      await redis.srem(getTripRoomKey(rideId), socket.id);

      console.log(`👋 User ${socketData.userId} left trip room: ${roomName}`);
    } catch (error) {
      console.error('Error in leave-trip:', error);
    }
  });

  // ==========================================================================
  // Driver Location Update
  // ==========================================================================
  socket.on('driver:location', async (data: DriverLocationUpdate) => {
    try {
      const { rideId, driverId, lat, lng, heading, speed, accuracy, timestamp } = data;

      // Rate limiting
      if (!locationRateLimiter.canUpdate(driverId)) {
        const waitTime = locationRateLimiter.getTimeUntilNextUpdate(driverId);
        socket.emit('error', {
          message: `Rate limit exceeded. Wait ${waitTime}ms`,
          code: 'RATE_LIMIT',
        });
        return;
      }

      // Validate driver authorization
      const validation = await validateDriverForRide(socket, rideId, driverId, prisma);

      if (!validation.valid) {
        socket.emit('error', {
          message: validation.error || 'Invalid driver for this ride',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        socket.emit('error', {
          message: 'Invalid coordinates',
          code: 'INVALID_DATA',
        });
        return;
      }

      // Cache location in Redis
      const locationKey = getDriverLocationKey(driverId);
      await redis.setex(
        locationKey,
        DEFAULT_TRACKING_CONFIG.locationCacheTTL,
        JSON.stringify(data)
      );

      // Update Redis geo index for proximity queries
      await redis.geoadd('drivers:active', lng, lat, driverId);
      await redis.expire('drivers:active', 3600); // 1 hour

      // Broadcast to trip room
      const roomName = `trip:${rideId}`;
      io.to(roomName).emit('driver:location', data);

      console.log(`📍 Driver ${driverId} location updated: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);

      // TODO: Calculate ETA and broadcast if distance changed significantly
      // This would integrate with the routing service
    } catch (error) {
      console.error('Error in driver:location:', error);
      socket.emit('error', {
        message: 'Failed to update location',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // ==========================================================================
  // Driver Arrived at Pickup
  // ==========================================================================
  socket.on('driver:arrived', async (data: DriverArrivedData) => {
    try {
      const { rideId, driverId, arrivedAt, location } = data;

      // Validate driver authorization
      const validation = await validateDriverForRide(socket, rideId, driverId, prisma);

      if (!validation.valid) {
        socket.emit('error', {
          message: validation.error || 'Invalid driver for this ride',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Update ride status in database
      await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'DRIVER_ARRIVED',
          driverArrivedAt: new Date(arrivedAt),
        },
      });

      // Cache status in Redis
      const statusUpdate: TripStatusUpdate = {
        rideId,
        status: 'DRIVER_ARRIVED',
        updatedAt: arrivedAt,
      };

      await redis.setex(
        getTripStatusKey(rideId),
        3600, // 1 hour
        JSON.stringify(statusUpdate)
      );

      // Broadcast to trip room
      const roomName = `trip:${rideId}`;
      io.to(roomName).emit('driver:arrived', data);
      io.to(roomName).emit('trip:status-changed', statusUpdate);

      console.log(`✅ Driver ${driverId} arrived at pickup for ride ${rideId}`);
    } catch (error) {
      console.error('Error in driver:arrived:', error);
      socket.emit('error', {
        message: 'Failed to mark arrival',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // ==========================================================================
  // Trip Started (Pickup Completed)
  // ==========================================================================
  socket.on('trip:started', async (data: TripStartedData) => {
    try {
      const { rideId, startedAt, pickupLocation } = data;

      // Get ride to validate driver
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (!ride) {
        socket.emit('error', {
          message: 'Ride not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Validate driver authorization
      if (ride.driverId) {
        const validation = await validateDriverForRide(socket, rideId, ride.driverId, prisma);

        if (!validation.valid) {
          socket.emit('error', {
            message: validation.error || 'Invalid driver for this ride',
            code: 'UNAUTHORIZED',
          });
          return;
        }
      }

      // Update ride status in database
      await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(startedAt),
          actualPickupLocation: pickupLocation,
        },
      });

      // Cache status in Redis
      const statusUpdate: TripStatusUpdate = {
        rideId,
        status: 'IN_PROGRESS',
        updatedAt: startedAt,
      };

      await redis.setex(
        getTripStatusKey(rideId),
        3600, // 1 hour
        JSON.stringify(statusUpdate)
      );

      // Broadcast to trip room
      const roomName = `trip:${rideId}`;
      io.to(roomName).emit('trip:started', data);
      io.to(roomName).emit('trip:status-changed', statusUpdate);

      console.log(`🚀 Trip ${rideId} started`);
    } catch (error) {
      console.error('Error in trip:started:', error);
      socket.emit('error', {
        message: 'Failed to start trip',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // ==========================================================================
  // Trip Completed
  // ==========================================================================
  socket.on('trip:completed', async (data: TripCompletedData) => {
    try {
      const { rideId, completedAt, dropoffLocation, totalDistance, totalDuration, finalPrice } = data;

      // Get ride to validate driver
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (!ride) {
        socket.emit('error', {
          message: 'Ride not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Validate driver authorization
      if (ride.driverId) {
        const validation = await validateDriverForRide(socket, rideId, ride.driverId, prisma);

        if (!validation.valid) {
          socket.emit('error', {
            message: validation.error || 'Invalid driver for this ride',
            code: 'UNAUTHORIZED',
          });
          return;
        }
      }

      // Update ride status in database
      await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(completedAt),
          actualDropoffLocation: dropoffLocation,
          actualDistance: totalDistance,
          actualDuration: totalDuration,
          finalPrice: finalPrice,
        },
      });

      // Cache status in Redis
      const statusUpdate: TripStatusUpdate = {
        rideId,
        status: 'COMPLETED',
        updatedAt: completedAt,
        metadata: {
          completedAt,
        },
      };

      await redis.setex(
        getTripStatusKey(rideId),
        86400, // 24 hours (keep longer for completed trips)
        JSON.stringify(statusUpdate)
      );

      // Broadcast to trip room
      const roomName = `trip:${rideId}`;
      io.to(roomName).emit('trip:completed', data);
      io.to(roomName).emit('trip:status-changed', statusUpdate);

      console.log(`🏁 Trip ${rideId} completed`);

      // Clean up Redis data for this driver
      if (ride.driverId) {
        await redis.del(getDriverLocationKey(ride.driverId));
        await redis.zrem('drivers:active', ride.driverId);
        locationRateLimiter.clear(ride.driverId);
      }
    } catch (error) {
      console.error('Error in trip:completed:', error);
      socket.emit('error', {
        message: 'Failed to complete trip',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // ==========================================================================
  // Disconnect
  // ==========================================================================
  socket.on('disconnect', async () => {
    console.log(`🔌 Client disconnected: ${socket.id} (User: ${socketData.userId})`);

    // Clean up rate limiter if driver
    if (socketData.role === 'DRIVER') {
      locationRateLimiter.clear(socketData.userId);
    }

    // Remove from all trip rooms in Redis
    const rooms = Array.from(socket.rooms);
    for (const room of rooms) {
      if (room.startsWith('trip:')) {
        const rideId = room.replace('trip:', '');
        await redis.srem(getTripRoomKey(rideId), socket.id);
      }
    }
  });
}
