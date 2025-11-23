import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireCustomer, requireDriver, requireDriverAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { updateDriverBadges } from './drivers';

const router = Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Schemas
const estimateSchema = z.object({
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string()
  }),
  dropoff: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string()
  }),
  vehicleType: z.enum(['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD']),
  loadAssistance: z.boolean().default(false),
  numberOfTrips: z.number().min(1).max(5).default(1),
  isExpress: z.boolean().default(false)
});

const createRideSchema = estimateSchema.extend({
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
    details: z.string().optional(),
    access_notes: z.string().optional()
  }),
  dropoff: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
    details: z.string().optional()
  }),
  itemPhotos: z.array(z.string()).max(3).default([]),
  description: z.string().max(500).optional(),
  serviceType: z.enum(['IMMEDIATE', 'SCHEDULED']).default('IMMEDIATE'),
  scheduledFor: z.string().datetime().optional()
});

const bidSchema = z.object({
  proposedPrice: z.number().positive(),
  estimatedArrival: z.number().positive(),
  message: z.string().max(200).optional()
});

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Calculate ETA based on distance (returns minutes)
function calculateETA(distanceKm: number): number {
  // Average speed in city: 30 km/h
  // Average speed on highway: 60 km/h
  // Use a mixed average of 40 km/h for realistic urban/highway mix
  const AVERAGE_SPEED_KMH = 40;
  const timeHours = distanceKm / AVERAGE_SPEED_KMH;
  const timeMinutes = Math.round(timeHours * 60);

  // Add buffer time for traffic, loading, etc (15% of time)
  const bufferMinutes = Math.round(timeMinutes * 0.15);

  return timeMinutes + bufferMinutes;
}

// Helper: Calculate estimated DateTime from now + minutes
function calculateEstimatedTime(minutesFromNow: number): Date {
  const now = new Date();
  return new Date(now.getTime() + minutesFromNow * 60000);
}

// Helper: Estimate price based on distance and options
function estimatePrice(distance: number, vehicleType: string, loadAssistance: boolean, numberOfTrips: number, isExpress: boolean = false) {
  const baseRates = {
    CAMIONNETTE: 0.8,
    FOURGON: 1.2,
    CAMION_3_5T: 1.8,
    CAMION_LOURD: 2.5
  };

  let basePrice = distance * (baseRates[vehicleType as keyof typeof baseRates] || 1);
  basePrice += 5; // Flat fee

  if (loadAssistance) basePrice += 15;
  if (numberOfTrips > 1) basePrice *= numberOfTrips * 0.9; // 10% discount for multiple trips

  // Express delivery fee (10-15 DT based on distance)
  let expressFee = 0;
  if (isExpress) {
    expressFee = distance < 10 ? 10 : distance < 30 ? 12 : 15;
  }

  return {
    min: Math.round(basePrice * 0.85),
    max: Math.round(basePrice * 1.15),
    expressFee: expressFee
  };
}

// Helper: Notify all nearby drivers within 100km radius
async function dispatchToDrivers(rideId: string, pickup: any, vehicleType: string, io: Server) {
  try {
    console.log(`🚀 Dispatching ride ${rideId} to drivers within 100km of`, pickup);

    // Find ALL drivers within 100km radius using Redis GEORADIUS
    const nearbyDriverIds = await redis.georadius(
      'drivers:available',
      pickup.lng,
      pickup.lat,
      100, // 100km radius
      'km',
      'ASC' // Sorted by distance (closest first)
    ) as string[];

    console.log(`📍 Found ${nearbyDriverIds.length} drivers within 100km`);

    if (nearbyDriverIds.length === 0) {
      console.log('⚠️ No available drivers found within 100km');
      return;
    }

    // Filter by vehicle type and verification status
    const drivers = await prisma.driver.findMany({
      where: {
        id: { in: nearbyDriverIds },
        vehicleType,
        isAvailable: true,
        verificationStatus: 'APPROVED'
      },
      select: {
        id: true,
        name: true,
        rating: true,
        currentLocation: true
      }
    });

    console.log(`✅ Found ${drivers.length} eligible drivers (${vehicleType}, APPROVED, available)`);

    if (drivers.length === 0) {
      console.log('⚠️ No eligible drivers found after filtering');
      return;
    }

    // Get ride details
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    if (!ride) {
      console.error('❌ Ride not found:', rideId);
      return;
    }

    // Notify ALL eligible drivers via Socket.io immediately
    let notifiedCount = 0;
    drivers.forEach(driver => {
      // Calculate distance from driver to pickup
      const driverLocation = driver.currentLocation as any;
      const distanceToPickup = driverLocation
        ? calculateDistance(
            driverLocation.lat,
            driverLocation.lng,
            pickup.lat,
            pickup.lng
          )
        : null;

      io.to(`driver:${driver.id}`).emit('ride_request', {
        rideId: ride.id,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        distance: ride.distance,
        vehicleType: ride.vehicleType,
        loadAssistance: ride.loadAssistance,
        numberOfTrips: ride.numberOfTrips,
        isExpress: ride.isExpress,
        expressFee: ride.expressFee,
        estimatedMinPrice: ride.estimatedMinPrice,
        estimatedMaxPrice: ride.estimatedMaxPrice,
        estimatedDuration: ride.estimatedDuration,
        description: ride.description,
        itemPhotos: ride.itemPhotos,
        customer: ride.customer,
        distanceToPickup: distanceToPickup ? Math.round(distanceToPickup * 10) / 10 : null,
        createdAt: ride.createdAt
      });

      notifiedCount++;
      console.log(`📤 Notified driver ${driver.name} (${driver.id}) - ${distanceToPickup ? Math.round(distanceToPickup) + 'km away' : 'distance unknown'}`);
    });

    console.log(`✅ Successfully notified ${notifiedCount} drivers for ride ${rideId}`);
  } catch (error) {
    console.error('❌ Error in dispatchToDrivers:', error);
  }
}

// POST /api/rides/estimate - Get price estimate
router.post('/estimate', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const data = estimateSchema.parse(req.body);

    const distance = calculateDistance(
      data.pickup.lat,
      data.pickup.lng,
      data.dropoff.lat,
      data.dropoff.lng
    );

    const estimatedPrice = estimatePrice(
      distance,
      data.vehicleType,
      data.loadAssistance,
      data.numberOfTrips,
      data.isExpress
    );

    const estimatedDuration = calculateETA(distance);

    // Count available drivers
    const availableDriversCount = await prisma.driver.count({
      where: {
        vehicleType: data.vehicleType,
        isAvailable: true,
        verificationStatus: 'APPROVED'
      }
    });

    res.json({
      distance: Math.round(distance * 10) / 10,
      estimatedDuration,
      estimatedPrice,
      expressFee: estimatedPrice.expressFee,
      isExpress: data.isExpress,
      availableDriversCount
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides - Create a new ride
router.post('/', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const data = createRideSchema.parse(req.body);

    const distance = calculateDistance(
      data.pickup.lat,
      data.pickup.lng,
      data.dropoff.lat,
      data.dropoff.lng
    );

    const estimatedPrice = estimatePrice(
      distance,
      data.vehicleType,
      data.loadAssistance,
      data.numberOfTrips,
      data.isExpress
    );

    const estimatedDuration = calculateETA(distance);

    const ride = await prisma.ride.create({
      data: {
        customerId: req.userId!,
        status: 'PENDING_BIDS',
        pickup: data.pickup,
        dropoff: data.dropoff,
        distance,
        estimatedDuration,
        vehicleType: data.vehicleType,
        loadAssistance: data.loadAssistance,
        numberOfTrips: data.numberOfTrips,
        itemPhotos: data.itemPhotos,
        description: data.description,
        serviceType: data.serviceType,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        isExpress: data.isExpress,
        expressFee: estimatedPrice.expressFee || 0,
        estimatedMinPrice: estimatedPrice.min,
        estimatedMaxPrice: estimatedPrice.max
      }
    });

    // Dispatch to nearby drivers
    const io = req.app.get('io') as Server;
    setTimeout(() => {
      dispatchToDrivers(ride.id, data.pickup, data.vehicleType, io);
    }, 100);

    res.status(201).json(ride);
  } catch (error) {
    next(error);
  }
});

// GET /api/rides/new-bids - Get rides with new bids
router.get('/new-bids', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const ridesWithBids = await prisma.ride.findMany({
      where: {
        customerId: req.userId,
        status: 'PENDING_BIDS',
      },
      include: {
        bids: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                rating: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: { bids: true }
        }
      }
    });

    // Filter only rides that have bids
    const ridesWithNewBids = ridesWithBids
      .filter(ride => ride.bids.length > 0)
      .map(ride => ({
        rideId: ride.id,
        count: ride.bids.length,
        latestBid: ride.bids[0] ? {
          driverName: ride.bids[0].driver.name,
          price: ride.bids[0].proposedPrice,
        } : null,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
      }));

    res.json({ newBids: ridesWithNewBids });
  } catch (error) {
    next(error);
  }
});

// GET /api/rides/history - Get user's ride history
router.get('/history', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const where: any = {};
    if (req.userType === 'customer') {
      where.customerId = req.userId;
    } else if (req.userType === 'driver') {
      where.driverId = req.userId;
    }

    const rides = await prisma.ride.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        driver: { select: { name: true, rating: true } },
        payment: true,
        winningBid: {
          include: {
            driver: { select: { name: true, rating: true } }
          }
        },
        _count: {
          select: { bids: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

// GET /api/rides/:id - Get ride details
router.get('/:id', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        driver: {
          select: { id: true, name: true, phone: true, rating: true, vehiclePlate: true }
        },
        bids: {
          include: {
            driver: {
              select: { id: true, name: true, rating: true, vehicleType: true }
            }
          },
          orderBy: { proposedPrice: 'asc' }
        },
        payment: true
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check authorization
    const isCustomer = ride.customerId === req.userId;
    const isAssignedDriver = ride.driverId === req.userId;
    const isDriverViewingAvailableRide = req.userType === 'driver' && ride.status === 'PENDING_BIDS';

    if (!isCustomer && !isAssignedDriver && !isDriverViewingAvailableRide) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(ride);
  } catch (error) {
    next(error);
  }
});

// GET /api/rides/:id/bids - Get bids for a ride
router.get('/:id/bids', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const bids = await prisma.bid.findMany({
      where: {
        rideId: req.params.id,
        ride: {
          customerId: req.userId
        }
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            rating: true,
            vehicleType: true,
            vehiclePlate: true,
            totalRides: true
          }
        }
      },
      orderBy: { proposedPrice: 'asc' }
    });

    res.json({ bids });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/bid - Submit a bid (driver)
router.post('/:id/bid', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = bidSchema.parse(req.body);
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });

    if (!ride || ride.status !== 'PENDING_BIDS') {
      return res.status(400).json({ error: 'Ride not accepting bids' });
    }

    // Check for existing bid
    const existingBid = await prisma.bid.findFirst({
      where: {
        rideId: req.params.id,
        driverId: req.userId,
        status: 'ACTIVE'
      }
    });

    if (existingBid) {
      return res.status(400).json({ error: 'You already have an active bid on this ride' });
    }

    const bid = await prisma.bid.create({
      data: {
        rideId: req.params.id,
        driverId: req.userId!,
        proposedPrice: data.proposedPrice,
        estimatedArrival: data.estimatedArrival,
        message: data.message,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      },
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

    // Notify customer via Socket.io - ride remains in PENDING_BIDS until customer accepts
    const io = req.app.get('io') as Server;
    const bidData = {
      bidId: bid.id,
      rideId: ride.id,
      driver: bid.driver,
      proposedPrice: bid.proposedPrice,
      estimatedArrival: bid.estimatedArrival,
      message: bid.message,
      createdAt: bid.createdAt
    };

    console.log(`📢 Emitting new_bid to customer:${ride.customerId}`, bidData);
    io.to(`customer:${ride.customerId}`).emit('new_bid', bidData);

    res.status(201).json(bid);
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/reject-bid - Reject a bid (customer)
router.post('/:id/reject-bid', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { bidId } = z.object({ bidId: z.string() }).parse(req.body);

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { ride: true }
    });

    if (!bid || bid.ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (bid.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Bid is not active' });
    }

    // Update bid status
    await prisma.bid.update({
      where: { id: bidId },
      data: { status: 'REJECTED' }
    });

    // Notify driver via Socket.io
    const io = req.app.get('io') as Server;
    io.to(`driver:${bid.driverId}`).emit('bid_rejected', { rideId: bid.rideId, bidId });

    res.json({ message: 'Bid rejected successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/accept-bid - Accept a bid (customer)
router.post('/:id/accept-bid', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { bidId } = z.object({ bidId: z.string() }).parse(req.body);

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { ride: true, driver: true }
    });

    if (!bid || bid.ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate platform fee
    const customer = await prisma.customer.findUnique({ where: { id: req.userId! } });
    const platformFee = customer?.isB2BSubscriber
      ? Math.round(bid.proposedPrice * 0.08 * 100) / 100
      : Math.round(bid.proposedPrice * 0.15 * 100) / 100;
    const driverAmount = bid.proposedPrice - platformFee;

    // Calculate ETA to pickup based on driver's current location
    const driverLocation = bid.driver.currentLocation as any;
    const pickup = bid.ride.pickup as any;
    let estimatedPickupTime = null;
    let estimatedDeliveryTime = null;

    if (driverLocation && driverLocation.lat && driverLocation.lng && pickup && pickup.lat && pickup.lng) {
      const distanceToPickup = calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        pickup.lat,
        pickup.lng
      );
      const etaMinutesToPickup = calculateETA(distanceToPickup);
      estimatedPickupTime = calculateEstimatedTime(etaMinutesToPickup);

      // Calculate ETA to delivery (pickup time + ride duration)
      const rideETAMinutes = calculateETA(bid.ride.distance);
      estimatedDeliveryTime = calculateEstimatedTime(etaMinutesToPickup + rideETAMinutes);
    }

    // Update bid, ride, and set driver as unavailable (payment created later when customer pays)
    await prisma.$transaction([
      prisma.bid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' }
      }),
      prisma.ride.update({
        where: { id: bid.rideId },
        data: {
          status: 'BID_ACCEPTED',
          driverId: bid.driverId,
          winningBidId: bidId,
          finalPrice: bid.proposedPrice,
          platformFee,
          driverEarnings: driverAmount,
          estimatedPickupTime,
          estimatedDeliveryTime
        }
      }),
      prisma.bid.updateMany({
        where: {
          rideId: bid.rideId,
          id: { not: bidId },
          status: 'ACTIVE'
        },
        data: { status: 'REJECTED' }
      }),
      // Set driver as unavailable (busy)
      prisma.driver.update({
        where: { id: bid.driverId },
        data: { isAvailable: false }
      })
    ]);

    // Remove driver from available drivers in Redis
    await redis.zrem('drivers:available', bid.driverId);

    // Notify all involved parties via Socket.io
    const io = req.app.get('io') as Server;
    io.to(`driver:${bid.driverId}`).emit('bid_accepted', {
      rideId: bid.rideId,
      bidId,
      ride: await prisma.ride.findUnique({
        where: { id: bid.rideId },
        include: { customer: { select: { name: true, phone: true } } }
      })
    });

    // Notify rejected drivers
    const rejectedBids = await prisma.bid.findMany({
      where: { rideId: bid.rideId, status: 'REJECTED' }
    });
    rejectedBids.forEach(rb => {
      io.to(`driver:${rb.driverId}`).emit('bid_rejected', { rideId: bid.rideId });
    });

    res.json({
      message: 'Bid accepted successfully',
      paymentRequired: true,
      ride: await prisma.ride.findUnique({
        where: { id: bid.rideId },
        include: {
          driver: { select: { id: true, name: true, phone: true, rating: true, vehiclePlate: true } },
          payment: true
        }
      })
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/rides/:id/status - Update ride status (uses requireDriverAuth for development)
router.patch('/:id/status', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({
      // Note: COMPLETED is not allowed here - use confirmation workflow instead
      status: z.enum(['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'])
    }).parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } }
      }
    });

    if (!ride || ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const oldStatus = ride.status;

    // Prepare update data
    const updateData: any = { status };

    // Set actualPickupTime when arriving at pickup
    if (status === 'PICKUP_ARRIVED' && !ride.actualPickupTime) {
      updateData.actualPickupTime = new Date();

      // Recalculate estimatedDeliveryTime based on current time + ride duration
      const rideETAMinutes = calculateETA(ride.distance);
      updateData.estimatedDeliveryTime = calculateEstimatedTime(rideETAMinutes);
    }

    // Set actualDeliveryTime when completing delivery
    if (status === 'DROPOFF_ARRIVED' && !ride.actualDeliveryTime) {
      updateData.actualDeliveryTime = new Date();
    }

    // Set completedAt for completed rides
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedRide = await prisma.ride.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Notify via Socket.io
    const io = req.app.get('io') as Server;
    io.to(`customer:${ride.customerId}`).emit('ride_status_changed', {
      rideId: ride.id,
      status
    });

    // Send intelligent notification via notification service
    const { getNotificationService } = await import('../services/notifications');
    const notificationService = getNotificationService();
    if (notificationService) {
      await notificationService.sendStatusChangeNotification(ride, oldStatus, status);
    }

    res.json(updatedRide);
  } catch (error) {
    next(error);
  }
});

// PUT /api/rides/:id/update-eta - Update ETA based on current driver location
router.put('/:id/update-eta', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { currentLat, currentLng } = z.object({
      currentLat: z.number(),
      currentLng: z.number()
    }).parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id }
    });

    if (!ride || ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const pickup = ride.pickup as any;
    const dropoff = ride.dropoff as any;
    const updateData: any = {};

    // If driver hasn't arrived at pickup yet, update estimatedPickupTime
    if (ride.status === 'DRIVER_ARRIVING' || ride.status === 'BID_ACCEPTED') {
      if (pickup && pickup.lat && pickup.lng) {
        const distanceToPickup = calculateDistance(
          currentLat,
          currentLng,
          pickup.lat,
          pickup.lng
        );
        const etaMinutesToPickup = calculateETA(distanceToPickup);
        updateData.estimatedPickupTime = calculateEstimatedTime(etaMinutesToPickup);

        // Also update estimatedDeliveryTime
        const rideETAMinutes = calculateETA(ride.distance);
        updateData.estimatedDeliveryTime = calculateEstimatedTime(etaMinutesToPickup + rideETAMinutes);
      }
    }
    // If driver is heading to delivery, update estimatedDeliveryTime
    else if (ride.status === 'IN_TRANSIT' || ride.status === 'LOADING') {
      if (dropoff && dropoff.lat && dropoff.lng) {
        const distanceToDropoff = calculateDistance(
          currentLat,
          currentLng,
          dropoff.lat,
          dropoff.lng
        );
        const etaMinutesToDropoff = calculateETA(distanceToDropoff);
        updateData.estimatedDeliveryTime = calculateEstimatedTime(etaMinutesToDropoff);
      }
    }

    if (Object.keys(updateData).length > 0) {
      const updatedRide = await prisma.ride.update({
        where: { id: req.params.id },
        data: updateData
      });

      // Notify customer of updated ETA via Socket.io
      const io = req.app.get('io') as Server;
      io.to(`customer:${ride.customerId}`).emit('eta_updated', {
        rideId: ride.id,
        estimatedPickupTime: updatedRide.estimatedPickupTime,
        estimatedDeliveryTime: updatedRide.estimatedDeliveryTime
      });

      res.json({
        estimatedPickupTime: updatedRide.estimatedPickupTime,
        estimatedDeliveryTime: updatedRide.estimatedDeliveryTime
      });
    } else {
      res.json({
        message: 'No ETA update needed for current status',
        estimatedPickupTime: ride.estimatedPickupTime,
        estimatedDeliveryTime: ride.estimatedDeliveryTime
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/proof-photo/:type - Upload proof photos
router.post('/:id/proof-photo/:type', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.params;
    if (!['loading', 'delivery'].includes(type)) {
      return res.status(400).json({ error: 'Invalid photo type' });
    }

    // In production, handle actual file upload
    const { photoUrl } = z.object({ photoUrl: z.string().url() }).parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id }
    });

    if (!ride || ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const proofPhotos = (ride.proofPhotos as any) || {};
    proofPhotos[type] = photoUrl;
    proofPhotos[`${type}_timestamp`] = new Date().toISOString();

    await prisma.ride.update({
      where: { id: req.params.id },
      data: { proofPhotos }
    });

    res.json({ message: 'Photo uploaded successfully', proofPhotos });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/confirm-completion-driver - Driver confirms ride completion (uses requireDriverAuth for development)
router.post('/:id/confirm-completion-driver', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: { driver: true }
    });

    if (!ride || ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (ride.status !== 'DROPOFF_ARRIVED') {
      return res.status(400).json({ error: 'Ride must be at DROPOFF_ARRIVED status' });
    }

    // Update ride metadata to track driver confirmation
    const metadata = (ride.proofPhotos as any) || {};
    metadata.driverConfirmedCompletion = true;
    metadata.driverConfirmedAt = new Date().toISOString();

    await prisma.ride.update({
      where: { id: req.params.id },
      data: {
        proofPhotos: metadata,
        // Don't set to COMPLETED yet - wait for customer confirmation
      }
    });

    // Notify customer
    const io = req.app.get('io') as Server;
    io.to(`customer:${ride.customerId}`).emit('driver_confirmed_completion', {
      rideId: ride.id,
      driverName: ride.driver?.name
    });

    res.json({
      message: 'Driver confirmation recorded. Waiting for customer confirmation.',
      waitingForCustomer: true
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/confirm-completion-customer - Customer confirms ride completion
router.post('/:id/confirm-completion-customer', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: {
        driver: true,
        payment: true
      }
    });

    if (!ride || ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (ride.status !== 'DROPOFF_ARRIVED') {
      return res.status(400).json({ error: 'Ride must be at DROPOFF_ARRIVED status' });
    }

    // Check if driver has confirmed
    const metadata = (ride.proofPhotos as any) || {};
    const driverConfirmed = metadata.driverConfirmedCompletion === true;

    if (!driverConfirmed) {
      return res.status(400).json({ error: 'Driver must confirm completion first' });
    }

    // Both parties confirmed - complete the ride and process payment
    await prisma.$transaction([
      // Mark ride as completed
      prisma.ride.update({
        where: { id: req.params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      }),
      // Complete the payment
      prisma.payment.update({
        where: { rideId: req.params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      }),
      // Record driver earnings
      prisma.driverEarnings.create({
        data: {
          driverId: ride.driverId!,
          rideId: req.params.id,
          grossAmount: ride.payment!.totalAmount,
          platformFee: ride.payment!.platformFee,
          netEarnings: ride.payment!.driverAmount
        }
      }),
      // Update driver stats and set as available again
      prisma.driver.update({
        where: { id: ride.driverId! },
        data: {
          totalEarnings: {
            increment: ride.payment!.driverAmount
          },
          totalRides: {
            increment: 1
          },
          isAvailable: true // Driver is now available for new rides
        }
      })
    ]);

    // Add driver back to available drivers in Redis (if they have a current location)
    if (ride.driver?.currentLocation) {
      const location = ride.driver.currentLocation as any;
      await redis.geoadd(
        'drivers:available',
        location.lng,
        location.lat,
        ride.driverId!
      );
    }

    // Notify driver
    const io = req.app.get('io') as Server;
    io.to(`driver:${ride.driverId}`).emit('ride_completed', {
      rideId: ride.id,
      earnings: ride.payment!.driverAmount
    });

    res.json({
      message: 'Ride completed successfully',
      payment: await prisma.payment.findUnique({ where: { rideId: req.params.id } })
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/rides/:id/rate - Rate the ride (multi-criteria)
router.post('/:id/rate', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { punctuality, care, communication, review } = z.object({
      punctuality: z.number().min(1).max(5),
      care: z.number().min(1).max(5),
      communication: z.number().min(1).max(5),
      review: z.string().max(500).optional()
    }).parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: { driver: true }
    });

    if (!ride || ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (ride.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }

    // Calculate overall average from the 3 criteria
    const overallRating = (punctuality + care + communication) / 3;

    // Update ride rating with detailed criteria
    await prisma.ride.update({
      where: { id: req.params.id },
      data: {
        customerRatingPunctuality: punctuality,
        customerRatingCare: care,
        customerRatingCommunication: communication,
        customerRatingOverall: overallRating,
        customerReview: review
      }
    });

    // Update driver's average ratings (overall and by criteria)
    if (ride.driver) {
      const allRatings = await prisma.ride.findMany({
        where: {
          driverId: ride.driverId,
          customerRatingOverall: { not: null }
        },
        select: {
          customerRatingPunctuality: true,
          customerRatingCare: true,
          customerRatingCommunication: true,
          customerRatingOverall: true
        }
      });

      if (allRatings.length > 0) {
        const avgOverall = allRatings.reduce((sum, r) => sum + (r.customerRatingOverall || 0), 0) / allRatings.length;
        const avgPunctuality = allRatings.reduce((sum, r) => sum + (r.customerRatingPunctuality || 0), 0) / allRatings.length;
        const avgCare = allRatings.reduce((sum, r) => sum + (r.customerRatingCare || 0), 0) / allRatings.length;
        const avgCommunication = allRatings.reduce((sum, r) => sum + (r.customerRatingCommunication || 0), 0) / allRatings.length;

        await prisma.driver.update({
          where: { id: ride.driverId! },
          data: {
            rating: avgOverall,
            ratingPunctuality: avgPunctuality,
            ratingCare: avgCare,
            ratingCommunication: avgCommunication
          }
        });

        // Notify driver that they've been rated
        const io = req.app.get('io') as Server;
        if (io) {
          io.to(`driver:${ride.driverId}`).emit('ride_rated', {
            rideId: ride.id,
            ratings: { punctuality, care, communication },
            overallRating: Math.round(overallRating * 10) / 10,
            review,
            newAverageRating: Math.round(avgOverall * 10) / 10,
            message: `Le client vous a noté ${Math.round(overallRating * 10) / 10}/5 étoiles`
          });
        }

        // Update driver badges based on new rating and stats
        try {
          await updateDriverBadges(ride.driverId!);
        } catch (badgeError) {
          console.error('Error updating driver badges:', badgeError);
          // Don't fail the request if badge update fails
        }
      }
    }

    res.json({
      message: 'Rating submitted successfully',
      overallRating: Math.round(overallRating * 10) / 10
    });
  } catch (error) {
    next(error);
  }
});


    res.json({ rides });
  } catch (error) {
    next(error);
  }
});

export default router;
