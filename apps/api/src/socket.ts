import { Server, Socket } from 'socket.io';
import { prisma } from '@truck4u/database';
import Redis from 'ioredis';
import { getNotificationService } from './services/notifications';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface DriverSocket extends Socket {
  driverId?: string;
}

interface CustomerSocket extends Socket {
  customerId?: string;
  rideId?: string;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Driver goes online
    socket.on('driver_online', async (data: { driverId: string; location: { lat: number; lng: number } }) => {
      try {
        (socket as DriverSocket).driverId = data.driverId;
        
        // Update driver availability
        await prisma.driver.update({
          where: { id: data.driverId },
          data: {
            isAvailable: true,
            currentLocation: data.location
          }
        });

        // Add to Redis geo index
        await redis.geoadd(
          'drivers:available',
          data.location.lng,
          data.location.lat,
          data.driverId
        );

        socket.join(`driver:${data.driverId}`);
        console.log(`Driver ${data.driverId} is online`);
      } catch (error) {
        console.error('Error in driver_online:', error);
      }
    });

    // Driver goes offline
    socket.on('driver_offline', async (data: { driverId: string }) => {
      try {
        await prisma.driver.update({
          where: { id: data.driverId },
          data: { isAvailable: false }
        });

        await redis.zrem('drivers:available', data.driverId);
        socket.leave(`driver:${data.driverId}`);
        console.log(`Driver ${data.driverId} is offline`);
      } catch (error) {
        console.error('Error in driver_offline:', error);
      }
    });

    // Driver location update during ride
    socket.on('driver_location_update', async (data: {
      rideId: string;
      driverId: string;
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
      timestamp: number;
    }) => {
      try {
        // Store in Redis with expiry
        await redis.setex(
          `ride:${data.rideId}:location`,
          3600, // 1 hour
          JSON.stringify({
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            heading: data.heading,
            timestamp: data.timestamp
          })
        );

        // Broadcast to customer tracking this ride
        io.to(`ride:${data.rideId}:customer`).emit('driver_moved', {
          lat: data.lat,
          lng: data.lng,
          speed: data.speed,
          heading: data.heading,
          timestamp: data.timestamp
        });

        // Process location for intelligent notifications
        const notificationService = getNotificationService();
        if (notificationService) {
          await notificationService.processLocationUpdate({
            rideId: data.rideId,
            driverId: data.driverId,
            lat: data.lat,
            lng: data.lng,
            timestamp: data.timestamp
          });
        }
      } catch (error) {
        console.error('Error in driver_location_update:', error);
      }
    });

    // Customer starts tracking a ride
    socket.on('track_ride', async (data: { rideId: string; customerId: string }) => {
      try {
        (socket as CustomerSocket).customerId = data.customerId;
        (socket as CustomerSocket).rideId = data.rideId;

        // Verify customer owns this ride
        const ride = await prisma.ride.findFirst({
          where: {
            id: data.rideId,
            customerId: data.customerId
          }
        });

        if (ride) {
          socket.join(`ride:${data.rideId}:customer`);
          
          // Send current location if available
          const location = await redis.get(`ride:${data.rideId}:location`);
          if (location) {
            socket.emit('driver_moved', JSON.parse(location));
          }
        }
      } catch (error) {
        console.error('Error in track_ride:', error);
      }
    });

    // Stop tracking
    socket.on('stop_tracking', (data: { rideId: string }) => {
      socket.leave(`ride:${data.rideId}:customer`);
    });

    // New bid submitted - notify customer
    socket.on('bid_submitted', async (data: {
      rideId: string;
      bidId: string;
    }) => {
      try {
        const bid = await prisma.bid.findUnique({
          where: { id: data.bidId },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                rating: true,
                vehicleType: true,
                vehiclePlate: true
              }
            }
          }
        });

        if (bid) {
          // Notify customer
          const ride = await prisma.ride.findUnique({
            where: { id: data.rideId }
          });

          if (ride) {
            io.to(`customer:${ride.customerId}`).emit('new_bid', {
              bidId: bid.id,
              rideId: data.rideId,
              driver: bid.driver,
              proposedPrice: bid.proposedPrice,
              estimatedArrival: bid.estimatedArrival,
              message: bid.message,
              createdAt: bid.createdAt
            });
          }
        }
      } catch (error) {
        console.error('Error in bid_submitted:', error);
      }
    });

    // Customer accepts bid
    socket.on('bid_accepted', async (data: {
      rideId: string;
      bidId: string;
      driverId: string;
    }) => {
      try {
        // Notify driver
        io.to(`driver:${data.driverId}`).emit('bid_accepted', {
          rideId: data.rideId,
          bidId: data.bidId
        });

        // Notify other drivers their bids were rejected
        const otherBids = await prisma.bid.findMany({
          where: {
            rideId: data.rideId,
            id: { not: data.bidId },
            status: 'ACTIVE'
          }
        });

        otherBids.forEach((bid) => {
          io.to(`driver:${bid.driverId}`).emit('bid_rejected', {
            rideId: data.rideId,
            bidId: bid.id
          });
        });
      } catch (error) {
        console.error('Error in bid_accepted:', error);
      }
    });

    // Ride status changed
    socket.on('ride_status_changed', (data: {
      rideId: string;
      status: string;
      customerId: string;
      driverId?: string;
    }) => {
      // Notify customer
      io.to(`customer:${data.customerId}`).emit('ride_status_changed', {
        rideId: data.rideId,
        status: data.status
      });

      // Notify driver if present
      if (data.driverId) {
        io.to(`driver:${data.driverId}`).emit('ride_status_changed', {
          rideId: data.rideId,
          status: data.status
        });
      }
    });

    // Join customer room for notifications
    socket.on('customer_connect', (data: { customerId: string }) => {
      socket.join(`customer:${data.customerId}`);
      console.log(`✅ Customer ${data.customerId} joined room: customer:${data.customerId}`);
      console.log(`📡 Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
    });

    // Join driver room for notifications (without changing availability status)
    socket.on('driver_connect', (data: { driverId: string }) => {
      (socket as DriverSocket).driverId = data.driverId;
      socket.join(`driver:${data.driverId}`);
      console.log(`✅ Driver ${data.driverId} joined room: driver:${data.driverId}`);
      console.log(`📡 Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
    });

    // Join admin room for notifications
    socket.on('admin_connect', (data: { adminId: string }) => {
      socket.join(`admin:${data.adminId}`);
      socket.join('admins'); // All admins room for broadcasting
      console.log(`✅ Admin ${data.adminId} joined room: admin:${data.adminId}`);
      console.log(`📡 Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
