import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireCustomer, requireDriver, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import Redis from 'ioredis';
import { Server } from 'socket.io';

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
  numberOfTrips: z.number().min(1).max(5).default(1)
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

// Helper: Estimate price based on distance and options
function estimatePrice(distance: number, vehicleType: string, loadAssistance: boolean, numberOfTrips: number) {
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

  return {
    min: Math.round(basePrice * 0.85),
    max: Math.round(basePrice * 1.15)
  };
}

// Helper: Proximity-based driver dispatch
async function dispatchToDrivers(rideId: string, pickup: any, vehicleType: string, io: Server) {
  const radiusSteps = [
    { radius: 5, waitTime: 180000 }, // 5km, 3min
    { radius: 10, waitTime: 120000 }, // 10km, 2min
    { radius: 20, waitTime: 120000 }, // 20km, 2min
    { radius: 30, waitTime: 60000 }  // 30km+, 1min
  ];

  for (const step of radiusSteps) {
    // Find drivers within radius using Redis GEORADIUS
    const nearbyDriverIds = await redis.georadius(
      'drivers:available',
      pickup.lng,
      pickup.lat,
      step.radius,
      'km',
      'ASC'
    ) as string[];

    if (nearbyDriverIds.length === 0) continue;

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
        rating: true
      }
    });

    if (drivers.length > 0) {
      // Notify drivers via Socket.io
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: { customer: true }
      });

      drivers.forEach(driver => {
        io.to(`driver:${driver.id}`).emit('ride_request', {
          rideId,
          pickup: ride?.pickup,
          dropoff: ride?.dropoff,
          distance: ride?.distance,
          vehicleType,
          loadAssistance: ride?.loadAssistance,
          estimatedPrice: { min: ride?.estimatedMinPrice, max: ride?.estimatedMaxPrice },
          expiresIn: step.waitTime / 1000
        });
      });

      // Wait for bids
      await new Promise(resolve => setTimeout(resolve, step.waitTime));

      // Check if any bids received
      const bids = await prisma.bid.count({
        where: { rideId, status: 'ACTIVE' }
      });

      if (bids > 0) break; // Stop searching if we got bids
    }
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
      data.numberOfTrips
    );

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
      estimatedDuration: Math.ceil(distance / 0.5), // Assuming 30km/h avg speed
      estimatedPrice,
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
      data.numberOfTrips
    );

    const ride = await prisma.ride.create({
      data: {
        customerId: req.userId!,
        status: 'PENDING_BIDS',
        pickup: data.pickup,
        dropoff: data.dropoff,
        distance,
        estimatedDuration: Math.ceil(distance / 0.5),
        vehicleType: data.vehicleType,
        loadAssistance: data.loadAssistance,
        numberOfTrips: data.numberOfTrips,
        itemPhotos: data.itemPhotos,
        description: data.description,
        serviceType: data.serviceType,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
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
    if (ride.customerId !== req.userId && ride.driverId !== req.userId) {
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
router.post('/:id/bid', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
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

    // Update ride status
    await prisma.ride.update({
      where: { id: req.params.id },
      data: { status: 'BID_ACCEPTED' }
    });

    // Notify customer via Socket.io
    const io = req.app.get('io') as Server;
    io.to(`customer:${ride.customerId}`).emit('new_bid', bid);

    res.status(201).json(bid);
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
      include: { ride: true }
    });

    if (!bid || bid.ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update bid and ride
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
          finalPrice: bid.proposedPrice
        }
      }),
      prisma.bid.updateMany({
        where: {
          rideId: bid.rideId,
          id: { not: bidId },
          status: 'ACTIVE'
        },
        data: { status: 'REJECTED' }
      })
    ]);

    // Notify all involved parties via Socket.io
    const io = req.app.get('io') as Server;
    io.to(`driver:${bid.driverId}`).emit('bid_accepted', { rideId: bid.rideId, bidId });
    
    // Notify rejected drivers
    const rejectedBids = await prisma.bid.findMany({
      where: { rideId: bid.rideId, status: 'REJECTED' }
    });
    rejectedBids.forEach(rb => {
      io.to(`driver:${rb.driverId}`).emit('bid_rejected', { rideId: bid.rideId });
    });

    res.json({ message: 'Bid accepted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/rides/:id/status - Update ride status
router.patch('/:id/status', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED', 'COMPLETED'])
    }).parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id }
    });

    if (!ride || ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    });

    // Notify customer
    const io = req.app.get('io') as Server;
    io.to(`customer:${ride.customerId}`).emit('ride_status_changed', {
      rideId: ride.id,
      status
    });

    res.json(updatedRide);
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

// POST /api/rides/:id/rate - Rate the ride
router.post('/:id/rate', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { rating, review } = z.object({
      rating: z.number().min(1).max(5),
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

    // Update ride rating
    await prisma.ride.update({
      where: { id: req.params.id },
      data: {
        customerRating: rating,
        customerReview: review
      }
    });

    // Update driver's average rating
    if (ride.driver) {
      const allRatings = await prisma.ride.findMany({
        where: {
          driverId: ride.driverId,
          customerRating: { not: null }
        },
        select: { customerRating: true }
      });

      const avgRating = allRatings.reduce((sum, r) => sum + (r.customerRating || 0), 0) / allRatings.length;

      await prisma.driver.update({
        where: { id: ride.driverId! },
        data: { rating: avgRating }
      });
    }

    res.json({ message: 'Rating submitted successfully' });
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
        acceptedBid: {
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

    res.json({ rides });
  } catch (error) {
    next(error);
  }
});

export default router;
