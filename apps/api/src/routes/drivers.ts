import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireDriver, requireDriverAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

// S3 Client (use Cloudflare R2 or AWS S3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const uploadToS3 = async (file: Express.Multer.File, folder: string): Promise<string> => {
  const key = `${folder}/${uuidv4()}-${file.originalname}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET || 'truck4u',
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  return `${process.env.S3_PUBLIC_URL || 'https://cdn.truck4u.tn'}/${key}`;
};

// POST /api/drivers/documents/upload - Upload verification documents
router.post(
  '/documents/upload',
  verifyToken,
  requireDriverAuth,
  upload.fields([
    { name: 'cin_front', maxCount: 1 },
    { name: 'cin_back', maxCount: 1 },
    { name: 'driving_license', maxCount: 1 },
    { name: 'vehicle_registration', maxCount: 1 },
    { name: 'business_license', maxCount: 1 },
    { name: 'vehicle_photos', maxCount: 5 }
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.cin_front || !files.cin_back || !files.driving_license || !files.vehicle_registration) {
        return res.status(400).json({ 
          error: 'Missing required documents: CIN (front & back), driving license, vehicle registration' 
        });
      }

      // Upload all files to S3
      const documents: any = {};

      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fieldName === 'vehicle_photos') {
          documents[fieldName] = await Promise.all(
            fileArray.map(file => uploadToS3(file, 'documents'))
          );
        } else {
          documents[fieldName] = await uploadToS3(fileArray[0], 'documents');
        }
      }

      // Update driver with document URLs
      const driver = await prisma.driver.update({
        where: { id: req.userId },
        data: {
          documents,
          hasBusinessLicense: !!files.business_license,
          verificationStatus: 'PENDING_REVIEW'
        }
      });

      res.json({
        message: 'Documents uploaded successfully',
        documents: driver.documents
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/drivers/verification-status
router.get('/verification-status', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        hasBusinessLicense: true,
        documents: true
      }
    });

    res.json(driver);
  } catch (error) {
    next(error);
  }
});

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// PATCH /api/drivers/availability - Toggle availability
router.patch('/availability', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { isAvailable, location } = z.object({
      isAvailable: z.boolean(),
      location: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional()
    }).parse(req.body);

    // Update availability and location if provided
    const updateData: any = { isAvailable };
    if (isAvailable && location) {
      updateData.currentLocation = {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date().toISOString()
      };
    }

    const driver = await prisma.driver.update({
      where: { id: req.userId },
      data: updateData
    });

    res.json({
      id: driver.id,
      isAvailable: driver.isAvailable,
      currentLocation: driver.currentLocation
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/available-rides - Get rides in proximity
router.get('/available-rides', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId }
    });

    if (!driver) {
      return res.json({ rides: [] });
    }

    // If driver is not available (busy with another ride), return empty list
    if (!driver.isAvailable) {
      return res.json({ rides: [], message: 'Driver is currently busy with another ride' });
    }

    // Get driver's current location
    const driverLocation = driver.currentLocation as any;

    // Maximum distance in km (configurable)
    const MAX_DISTANCE_KM = parseInt(process.env.MAX_RIDE_DISTANCE_KM || '100');

    // Get all pending rides matching driver's vehicle type
    const allRides = await prisma.ride.findMany({
      where: {
        status: 'PENDING_BIDS',
        vehicleType: driver.vehicleType
      },
      include: {
        customer: {
          select: {
            name: true,
            accountType: true,
            phone: true
          }
        },
        _count: {
          select: {
            bids: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter by proximity if driver has location
    let rides = allRides;
    if (driverLocation && driverLocation.lat && driverLocation.lng) {
      rides = allRides.filter(ride => {
        const pickup = ride.pickup as any;
        if (!pickup || !pickup.lat || !pickup.lng) return false;

        const distance = calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          pickup.lat,
          pickup.lng
        );

        return distance <= MAX_DISTANCE_KM;
      });
    }

    // Add distance to each ride for sorting/display
    const ridesWithDistance = rides.map(ride => {
      const pickup = ride.pickup as any;
      let distanceToPickup = null;

      if (driverLocation && pickup && pickup.lat && pickup.lng) {
        distanceToPickup = Math.round(calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          pickup.lat,
          pickup.lng
        ));
      }

      return {
        ...ride,
        distanceToPickup
      };
    });

    // Sort by priority: Express rides first, then by distance (closest first)
    ridesWithDistance.sort((a, b) => {
      // Express rides have priority
      if (a.isExpress && !b.isExpress) return -1;
      if (!a.isExpress && b.isExpress) return 1;

      // If both are express or both are not express, sort by distance
      if (a.distanceToPickup === null) return 1;
      if (b.distanceToPickup === null) return -1;
      return a.distanceToPickup - b.distanceToPickup;
    });

    res.json({
      rides: ridesWithDistance.slice(0, 20), // Limit to 20 closest rides
      maxDistance: MAX_DISTANCE_KM,
      driverHasLocation: !!driverLocation
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/earnings/history
router.get('/earnings/history', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { period } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const earnings = await prisma.driverEarnings.findMany({
      where: {
        driverId: req.userId,
        paidAt: {
          gte: startDate
        }
      },
      orderBy: {
        paidAt: 'desc'
      }
    });

    const total = earnings.reduce((sum, e) => ({
      gross: sum.gross + e.grossAmount,
      fees: sum.fees + e.platformFee,
      net: sum.net + e.netEarnings
    }), { gross: 0, fees: 0, net: 0 });

    res.json({
      summary: total,
      earnings
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/drivers/earnings/simulate - Calculate earnings simulation
router.post('/earnings/simulate', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const params = z.object({
      ridesPerDay: z.number().min(0).max(50),
      averageRidePrice: z.number().min(0),
      workDaysPerWeek: z.number().min(1).max(7),
      fuelCostPerKm: z.number().min(0).optional().default(0.5), // DT per km
      avgDistancePerRide: z.number().min(0).optional().default(15), // km
      maintenanceCostPerMonth: z.number().min(0).optional().default(100), // DT
      period: z.enum(['day', 'week', 'month']).optional().default('month')
    }).parse(req.body);

    const {
      ridesPerDay,
      averageRidePrice,
      workDaysPerWeek,
      fuelCostPerKm,
      avgDistancePerRide,
      maintenanceCostPerMonth,
      period
    } = params;

    // Platform fee is 10% (as mentioned in the earnings page)
    const PLATFORM_FEE_PERCENTAGE = 0.10;

    // Calculate daily earnings
    const dailyGrossEarnings = ridesPerDay * averageRidePrice;
    const dailyPlatformFees = dailyGrossEarnings * PLATFORM_FEE_PERCENTAGE;
    const dailyNetEarnings = dailyGrossEarnings - dailyPlatformFees;
    const dailyFuelCost = ridesPerDay * avgDistancePerRide * fuelCostPerKm;
    const dailyProfit = dailyNetEarnings - dailyFuelCost;

    // Calculate weekly earnings
    const weeklyGrossEarnings = dailyGrossEarnings * workDaysPerWeek;
    const weeklyPlatformFees = dailyPlatformFees * workDaysPerWeek;
    const weeklyNetEarnings = dailyNetEarnings * workDaysPerWeek;
    const weeklyFuelCost = dailyFuelCost * workDaysPerWeek;
    const weeklyProfit = dailyProfit * workDaysPerWeek;

    // Calculate monthly earnings (assuming 4.33 weeks per month)
    const monthlyGrossEarnings = weeklyGrossEarnings * 4.33;
    const monthlyPlatformFees = weeklyPlatformFees * 4.33;
    const monthlyNetEarnings = weeklyNetEarnings * 4.33;
    const monthlyFuelCost = weeklyFuelCost * 4.33;
    const monthlyProfit = monthlyNetEarnings - monthlyFuelCost - maintenanceCostPerMonth;

    // Calculate yearly earnings
    const yearlyGrossEarnings = monthlyGrossEarnings * 12;
    const yearlyPlatformFees = monthlyPlatformFees * 12;
    const yearlyNetEarnings = monthlyNetEarnings * 12;
    const yearlyFuelCost = monthlyFuelCost * 12;
    const yearlyMaintenanceCost = maintenanceCostPerMonth * 12;
    const yearlyProfit = yearlyNetEarnings - yearlyFuelCost - yearlyMaintenanceCost;

    // Total rides per period
    const totalRidesPerDay = ridesPerDay;
    const totalRidesPerWeek = ridesPerDay * workDaysPerWeek;
    const totalRidesPerMonth = totalRidesPerWeek * 4.33;
    const totalRidesPerYear = totalRidesPerMonth * 12;

    // Cost breakdown percentages
    const totalCostsMonthly = monthlyPlatformFees + monthlyFuelCost + maintenanceCostPerMonth;
    const costBreakdown = {
      platformFees: (monthlyPlatformFees / totalCostsMonthly) * 100,
      fuelCosts: (monthlyFuelCost / totalCostsMonthly) * 100,
      maintenance: (maintenanceCostPerMonth / totalCostsMonthly) * 100
    };

    res.json({
      inputs: params,
      daily: {
        rides: Math.round(totalRidesPerDay),
        grossEarnings: Math.round(dailyGrossEarnings * 100) / 100,
        platformFees: Math.round(dailyPlatformFees * 100) / 100,
        netEarnings: Math.round(dailyNetEarnings * 100) / 100,
        fuelCost: Math.round(dailyFuelCost * 100) / 100,
        profit: Math.round(dailyProfit * 100) / 100
      },
      weekly: {
        rides: Math.round(totalRidesPerWeek),
        grossEarnings: Math.round(weeklyGrossEarnings * 100) / 100,
        platformFees: Math.round(weeklyPlatformFees * 100) / 100,
        netEarnings: Math.round(weeklyNetEarnings * 100) / 100,
        fuelCost: Math.round(weeklyFuelCost * 100) / 100,
        profit: Math.round(weeklyProfit * 100) / 100
      },
      monthly: {
        rides: Math.round(totalRidesPerMonth),
        grossEarnings: Math.round(monthlyGrossEarnings * 100) / 100,
        platformFees: Math.round(monthlyPlatformFees * 100) / 100,
        netEarnings: Math.round(monthlyNetEarnings * 100) / 100,
        fuelCost: Math.round(monthlyFuelCost * 100) / 100,
        maintenanceCost: Math.round(maintenanceCostPerMonth * 100) / 100,
        profit: Math.round(monthlyProfit * 100) / 100
      },
      yearly: {
        rides: Math.round(totalRidesPerYear),
        grossEarnings: Math.round(yearlyGrossEarnings * 100) / 100,
        platformFees: Math.round(yearlyPlatformFees * 100) / 100,
        netEarnings: Math.round(yearlyNetEarnings * 100) / 100,
        fuelCost: Math.round(yearlyFuelCost * 100) / 100,
        maintenanceCost: Math.round(yearlyMaintenanceCost * 100) / 100,
        profit: Math.round(yearlyProfit * 100) / 100
      },
      costBreakdown: {
        platformFees: Math.round(costBreakdown.platformFees * 10) / 10,
        fuelCosts: Math.round(costBreakdown.fuelCosts * 10) / 10,
        maintenance: Math.round(costBreakdown.maintenance * 10) / 10
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/drivers/profile/photo - Upload profile photo
router.post('/profile/photo', verifyToken, requireDriverAuth, upload.single('photo'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    // Validate file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Upload to S3
    const photoUrl = await uploadToS3(req.file, 'profile-photos');

    // Update driver profile with photo URL
    const driver = await prisma.driver.update({
      where: { id: req.userId },
      data: { profilePhoto: photoUrl }
    });

    res.json({
      photoUrl: driver.profilePhoto,
      message: 'Profile photo updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/:id/kyc-documents - Get driver KYC documents (including vehicle photos)
router.get('/:id/kyc-documents', verifyToken, async (req, res, next) => {
  try {
    const driverId = req.params.id;

    const documents = await prisma.kYCDocument.findMany({
      where: { driverId },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json({ documents });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/:id/reviews - Get driver reviews from completed rides
router.get('/:id/reviews', verifyToken, async (req, res, next) => {
  try {
    const driverId = req.params.id;

    // Get all completed rides for this driver that have customer reviews
    const rides = await prisma.ride.findMany({
      where: {
        driverId,
        status: 'COMPLETED',
        customerRatingOverall: { not: null }
      },
      include: {
        customer: {
          select: { name: true }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 50 // Limit to 50 most recent reviews
    });

    const reviews = rides.map(ride => ({
      id: ride.id,
      customerName: ride.customer.name,
      rating: ride.customerRatingOverall || 0,
      ratingPunctuality: ride.customerRatingPunctuality || 0,
      ratingCare: ride.customerRatingCare || 0,
      ratingCommunication: ride.customerRatingCommunication || 0,
      review: ride.customerReview || '',
      date: ride.completedAt?.toISOString() || ride.updatedAt.toISOString()
    }));

    // Calculate review statistics including detailed criteria
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const averagePunctuality = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.ratingPunctuality, 0) / totalReviews
      : 0;

    const averageCare = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.ratingCare, 0) / totalReviews
      : 0;

    const averageCommunication = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.ratingCommunication, 0) / totalReviews
      : 0;

    // Rating distribution for overall rating
    const distribution = {
      5: reviews.filter(r => Math.round(r.rating) === 5).length,
      4: reviews.filter(r => Math.round(r.rating) === 4).length,
      3: reviews.filter(r => Math.round(r.rating) === 3).length,
      2: reviews.filter(r => Math.round(r.rating) === 2).length,
      1: reviews.filter(r => Math.round(r.rating) === 1).length
    };

    res.json({
      reviews,
      statistics: {
        total: totalReviews,
        average: Math.round(averageRating * 10) / 10,
        averagePunctuality: Math.round(averagePunctuality * 10) / 10,
        averageCare: Math.round(averageCare * 10) / 10,
        averageCommunication: Math.round(averageCommunication * 10) / 10,
        distribution
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate and update driver badges
async function updateDriverBadges(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      rides: {
        where: { status: 'COMPLETED' },
        select: {
          customerRating: true,
          completedAt: true,
          createdAt: true
        }
      },
      bids: {
        select: {
          status: true
        }
      }
    }
  });

  if (!driver) return;

  const badges: string[] = [];
  const completedRides = driver.rides;
  const totalRides = completedRides.length;

  // VERIFIED badge - always if status is APPROVED
  if (driver.verificationStatus === 'APPROVED') {
    badges.push('VERIFIED');
  }

  // NEW badge - less than 10 completed rides
  if (totalRides < 10) {
    badges.push('NEW');
  }

  // TOP_RATED badge - rating >= 4.8 and at least 20 rides
  if (driver.rating >= 4.8 && totalRides >= 20) {
    badges.push('TOP_RATED');
  }

  // PUNCTUAL badge - Check if rides were completed on time
  // Assuming a ride is punctual if completed within estimated time + buffer
  const punctualRides = completedRides.filter(ride => {
    if (!ride.completedAt) return false;
    const createdAt = new Date(ride.createdAt);
    const completedAt = new Date(ride.completedAt);
    const timeDiff = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60); // in minutes
    // Assuming most rides should complete within 3 hours
    return timeDiff <= 180;
  });

  if (totalRides >= 10 && (punctualRides.length / totalRides) >= 0.9) {
    badges.push('PUNCTUAL');
  }

  // CLEAN badge - High ratings (4.5+) consistently
  const recentRatings = completedRides
    .filter(r => r.customerRating !== null)
    .slice(0, 20)
    .map(r => r.customerRating!);

  if (recentRatings.length >= 10 && recentRatings.every(rating => rating >= 4)) {
    badges.push('CLEAN');
  }

  // PROFESSIONAL badge - Has business license and high completion rate
  if (driver.hasBusinessLicense && totalRides >= 50) {
    badges.push('PROFESSIONAL');
  }

  // Calculate acceptance rate
  const totalBids = driver.bids.length;
  const acceptedBids = driver.bids.filter(bid => bid.status === 'ACCEPTED').length;
  const acceptanceRate = totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;

  // Update driver with badges and acceptance rate
  await prisma.driver.update({
    where: { id: driverId },
    data: {
      badges,
      acceptanceRate,
      totalBids,
      acceptedBids,
      completedRides: totalRides
    }
  });

  return badges;
}

// Helper function to calculate and update driver tier
async function updateDriverTier(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      completedRides: true,
      rating: true,
      acceptanceRate: true
    }
  });

  if (!driver) return null;

  let newTier: 'BRONZE' | 'SILVER' | 'GOLD' = 'BRONZE';
  let platformFeeRate = 0.10; // 10% default

  // Gold Tier Requirements:
  // - 200+ completed rides
  // - Average rating >= 4.5
  // - Acceptance rate >= 80%
  if (
    driver.completedRides >= 200 &&
    driver.rating >= 4.5 &&
    driver.acceptanceRate >= 80
  ) {
    newTier = 'GOLD';
    platformFeeRate = 0.06; // 6% for Gold
  }
  // Silver Tier Requirements:
  // - 50-199 completed rides
  // - Average rating >= 4.0
  // - Acceptance rate >= 70%
  else if (
    driver.completedRides >= 50 &&
    driver.rating >= 4.0 &&
    driver.acceptanceRate >= 70
  ) {
    newTier = 'SILVER';
    platformFeeRate = 0.08; // 8% for Silver
  }
  // Bronze Tier (default):
  // - 0-49 completed rides or doesn't meet Silver requirements
  // - Platform fee: 10%

  // Update driver tier and platform fee
  await prisma.driver.update({
    where: { id: driverId },
    data: {
      tier: newTier,
      platformFeeRate
    }
  });

  return { tier: newTier, platformFeeRate };
}

// POST /api/drivers/:id/update-badges - Update driver badges and tier (can be called by admin or cron)
router.post('/:id/update-badges', verifyToken, async (req, res, next) => {
  try {
    const badges = await updateDriverBadges(req.params.id);
    const tierInfo = await updateDriverTier(req.params.id);

    res.json({
      message: 'Badges and tier updated successfully',
      badges,
      tierInfo
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/tier/info - Get driver tier info and progress
router.get('/tier/info', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        tier: true,
        platformFeeRate: true,
        completedRides: true,
        rating: true,
        acceptanceRate: true
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Define tier requirements
    const tiers = {
      BRONZE: {
        name: 'Bronze',
        color: '#CD7F32',
        icon: '🥉',
        requirements: {
          rides: 0,
          rating: 0,
          acceptanceRate: 0
        },
        benefits: [
          'Accès à la plateforme',
          'Frais de plateforme: 10%',
          'Support client standard'
        ],
        platformFee: 10
      },
      SILVER: {
        name: 'Silver',
        color: '#C0C0C0',
        icon: '🥈',
        requirements: {
          rides: 50,
          rating: 4.0,
          acceptanceRate: 70
        },
        benefits: [
          'Frais de plateforme réduits: 8%',
          'Badge Silver visible',
          'Priorité dans les demandes',
          'Support client prioritaire'
        ],
        platformFee: 8
      },
      GOLD: {
        name: 'Gold',
        color: '#FFD700',
        icon: '🥇',
        requirements: {
          rides: 200,
          rating: 4.5,
          acceptanceRate: 80
        },
        benefits: [
          'Frais de plateforme minimaux: 6%',
          'Badge Gold premium',
          'Priorité maximale',
          'Support client VIP',
          'Bonus mensuels exclusifs'
        ],
        platformFee: 6
      }
    };

    const currentTier = tiers[driver.tier];

    // Calculate progress to next tier
    let nextTier = null;
    let progress = null;

    if (driver.tier === 'BRONZE') {
      nextTier = tiers.SILVER;
      progress = {
        rides: {
          current: driver.completedRides,
          required: nextTier.requirements.rides,
          percentage: Math.min((driver.completedRides / nextTier.requirements.rides) * 100, 100)
        },
        rating: {
          current: driver.rating,
          required: nextTier.requirements.rating,
          percentage: Math.min((driver.rating / nextTier.requirements.rating) * 100, 100)
        },
        acceptanceRate: {
          current: driver.acceptanceRate,
          required: nextTier.requirements.acceptanceRate,
          percentage: Math.min((driver.acceptanceRate / nextTier.requirements.acceptanceRate) * 100, 100)
        }
      };
    } else if (driver.tier === 'SILVER') {
      nextTier = tiers.GOLD;
      progress = {
        rides: {
          current: driver.completedRides,
          required: nextTier.requirements.rides,
          percentage: Math.min((driver.completedRides / nextTier.requirements.rides) * 100, 100)
        },
        rating: {
          current: driver.rating,
          required: nextTier.requirements.rating,
          percentage: Math.min((driver.rating / nextTier.requirements.rating) * 100, 100)
        },
        acceptanceRate: {
          current: driver.acceptanceRate,
          required: nextTier.requirements.acceptanceRate,
          percentage: Math.min((driver.acceptanceRate / nextTier.requirements.acceptanceRate) * 100, 100)
        }
      };
    }

    res.json({
      currentTier,
      nextTier,
      progress,
      allTiers: tiers
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/schedule - Get driver's schedule and upcoming rides
router.get('/schedule', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId },
      select: {
        weeklySchedule: true,
        scheduleExceptions: true
      }
    });

    // Get upcoming rides
    const upcomingRides = await prisma.ride.findMany({
      where: {
        driverId: req.userId,
        status: { in: ['BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT'] },
        scheduledFor: { gte: new Date() }
      },
      include: {
        customer: {
          select: { name: true, phone: true }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: 20
    });

    res.json({
      weeklySchedule: driver?.weeklySchedule || getDefaultSchedule(),
      scheduleExceptions: driver?.scheduleExceptions || [],
      upcomingRides: upcomingRides.map(ride => ({
        id: ride.id,
        scheduledFor: ride.scheduledFor,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        status: ride.status,
        customer: ride.customer
      }))
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/drivers/schedule - Update driver's weekly schedule
router.put('/schedule', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { weeklySchedule } = z.object({
      weeklySchedule: z.record(z.array(z.object({
        start: z.string(),
        end: z.string()
      })))
    }).parse(req.body);

    await prisma.driver.update({
      where: { id: req.userId },
      data: { weeklySchedule }
    });

    res.json({ message: 'Schedule updated successfully', weeklySchedule });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/schedule/analytics - Get best times to work based on demand
router.get('/schedule/analytics', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    // Analyze rides from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rides = await prisma.ride.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['COMPLETED', 'IN_TRANSIT', 'LOADING'] }
      },
      select: {
        createdAt: true,
        finalPrice: true
      }
    });

    // Group by day of week and hour
    const demandByDayAndHour: Record<string, Record<number, { count: number; avgPrice: number }>> = {};
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    days.forEach(day => {
      demandByDayAndHour[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        demandByDayAndHour[day][hour] = { count: 0, avgPrice: 0 };
      }
    });

    rides.forEach(ride => {
      const date = new Date(ride.createdAt);
      const dayName = days[date.getDay()];
      const hour = date.getHours();

      demandByDayAndHour[dayName][hour].count++;
      demandByDayAndHour[dayName][hour].avgPrice += ride.finalPrice || 0;
    });

    // Calculate averages and find peak hours
    Object.keys(demandByDayAndHour).forEach(day => {
      Object.keys(demandByDayAndHour[day]).forEach(hourStr => {
        const hour = parseInt(hourStr);
        const data = demandByDayAndHour[day][hour];
        if (data.count > 0) {
          data.avgPrice = data.avgPrice / data.count;
        }
      });
    });

    // Find top 5 peak hours across all days
    const peakHours: Array<{ day: string; hour: number; demand: number; avgPrice: number }> = [];
    Object.entries(demandByDayAndHour).forEach(([day, hours]) => {
      Object.entries(hours).forEach(([hourStr, data]) => {
        if (data.count > 0) {
          peakHours.push({
            day,
            hour: parseInt(hourStr),
            demand: data.count,
            avgPrice: Math.round(data.avgPrice * 100) / 100
          });
        }
      });
    });

    peakHours.sort((a, b) => b.demand - a.demand);

    res.json({
      demandByDayAndHour,
      peakHours: peakHours.slice(0, 10),
      recommendations: generateScheduleRecommendations(demandByDayAndHour)
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to generate default schedule
function getDefaultSchedule() {
  return {
    monday: [{ start: '08:00', end: '18:00' }],
    tuesday: [{ start: '08:00', end: '18:00' }],
    wednesday: [{ start: '08:00', end: '18:00' }],
    thursday: [{ start: '08:00', end: '18:00' }],
    friday: [{ start: '08:00', end: '18:00' }],
    saturday: [{ start: '08:00', end: '14:00' }],
    sunday: []
  };
}

// Helper function to generate schedule recommendations
function generateScheduleRecommendations(demandData: any) {
  const recommendations = [];

  // Find days with highest demand
  const dayDemand: Record<string, number> = {};
  Object.entries(demandData).forEach(([day, hours]: [string, any]) => {
    dayDemand[day] = Object.values(hours).reduce((sum: number, h: any) => sum + h.count, 0);
  });

  const sortedDays = Object.entries(dayDemand).sort((a, b) => b[1] - a[1]);
  const topDays = sortedDays.slice(0, 3).map(([day]) => day);

  recommendations.push({
    type: 'top_days',
    message: `Les jours avec le plus de demande sont: ${topDays.join(', ')}`,
    days: topDays
  });

  // Find peak hours
  const avgHourDemand: Record<number, number> = {};
  for (let hour = 0; hour < 24; hour++) {
    avgHourDemand[hour] = 0;
    let dayCount = 0;
    Object.values(demandData).forEach((hours: any) => {
      if (hours[hour]?.count > 0) {
        avgHourDemand[hour] += hours[hour].count;
        dayCount++;
      }
    });
    if (dayCount > 0) avgHourDemand[hour] /= dayCount;
  }

  const peakHour = Object.entries(avgHourDemand).reduce((max, [hour, demand]) =>
    demand > max.demand ? { hour: parseInt(hour), demand } : max,
    { hour: 0, demand: 0 }
  );

  recommendations.push({
    type: 'peak_hours',
    message: `L'heure de pointe est autour de ${peakHour.hour}h`,
    hour: peakHour.hour
  });

  return recommendations;
}

// GET /api/drivers/return-loads - Find rides along return route
router.get('/return-loads', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId },
      select: {
        vehicleType: true,
        currentLocation: true,
        homeLocation: true,
        tier: true,
        platformFeeRate: true
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get destination from query params or use driver's home location
    const destinationLat = req.query.destinationLat ? parseFloat(req.query.destinationLat as string) : null;
    const destinationLng = req.query.destinationLng ? parseFloat(req.query.destinationLng as string) : null;

    let destination: { lat: number; lng: number; address?: string } | null = null;

    if (destinationLat && destinationLng) {
      destination = { lat: destinationLat, lng: destinationLng };
    } else if (driver.homeLocation) {
      const home = driver.homeLocation as any;
      if (home.lat && home.lng) {
        destination = home;
      }
    }

    // Get current location
    const currentLoc = driver.currentLocation as any;

    if (!currentLoc || !currentLoc.lat || !currentLoc.lng) {
      return res.status(400).json({
        error: 'Current location not available. Please enable GPS and update your location.'
      });
    }

    if (!destination) {
      return res.status(400).json({
        error: 'Destination not set. Please set your home location or provide a destination.'
      });
    }

    // Maximum detour in km (configurable)
    const MAX_DETOUR_KM = parseInt(process.env.MAX_RETURN_DETOUR_KM || '20');

    // Calculate direct distance from current to destination
    const directDistance = calculateDistance(
      currentLoc.lat,
      currentLoc.lng,
      destination.lat,
      destination.lng
    );

    // Find all pending rides matching vehicle type
    const allRides = await prisma.ride.findMany({
      where: {
        status: 'PENDING_BIDS',
        vehicleType: driver.vehicleType
      },
      include: {
        customer: {
          select: {
            name: true,
            accountType: true,
            phone: true
          }
        },
        _count: {
          select: {
            bids: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter rides that are along the return route
    const returnLoads = allRides
      .map(ride => {
        const pickup = ride.pickup as any;
        const dropoff = ride.dropoff as any;

        if (!pickup || !pickup.lat || !pickup.lng) return null;

        // Calculate: current -> pickup
        const distToPickup = calculateDistance(
          currentLoc.lat,
          currentLoc.lng,
          pickup.lat,
          pickup.lng
        );

        // Calculate: pickup -> destination
        const pickupToDest = calculateDistance(
          pickup.lat,
          pickup.lng,
          destination!.lat,
          destination!.lng
        );

        // Calculate: pickup -> dropoff (if we have dropoff)
        let pickupToDropoff = 0;
        let dropoffToDest = 0;

        if (dropoff && dropoff.lat && dropoff.lng) {
          pickupToDropoff = calculateDistance(
            pickup.lat,
            pickup.lng,
            dropoff.lat,
            dropoff.lng
          );

          dropoffToDest = calculateDistance(
            dropoff.lat,
            dropoff.lng,
            destination!.lat,
            destination!.lng
          );
        }

        // Total distance with this ride: current -> pickup -> dropoff -> destination
        const totalDistanceWithRide = dropoff
          ? distToPickup + pickupToDropoff + dropoffToDest
          : distToPickup + pickupToDest;

        // Detour = additional distance compared to direct route
        const detour = totalDistanceWithRide - directDistance;

        // Calculate efficiency: how much of the ride distance is useful vs detour
        const rideDistance = dropoff ? pickupToDropoff : 0;
        const efficiency = rideDistance > 0 ? (rideDistance / totalDistanceWithRide) * 100 : 0;

        // Only include if detour is acceptable
        if (detour <= MAX_DETOUR_KM) {
          // Calculate potential earnings (after platform fees)
          const grossEarnings = ride.finalPrice || ride.suggestedPrice || 0;
          const platformFee = grossEarnings * driver.platformFeeRate;
          const netEarnings = grossEarnings - platformFee;

          return {
            ...ride,
            returnLoadInfo: {
              directDistance: Math.round(directDistance * 10) / 10,
              totalDistanceWithRide: Math.round(totalDistanceWithRide * 10) / 10,
              detour: Math.round(detour * 10) / 10,
              distanceToPickup: Math.round(distToPickup * 10) / 10,
              efficiency: Math.round(efficiency * 10) / 10,
              grossEarnings: Math.round(grossEarnings * 100) / 100,
              platformFee: Math.round(platformFee * 100) / 100,
              netEarnings: Math.round(netEarnings * 100) / 100,
              pickupToDropoff: Math.round(pickupToDropoff * 10) / 10
            }
          };
        }

        return null;
      })
      .filter(ride => ride !== null);

    // Sort by efficiency (best matches first)
    returnLoads.sort((a, b) => {
      return (b?.returnLoadInfo?.efficiency || 0) - (a?.returnLoadInfo?.efficiency || 0);
    });

    res.json({
      currentLocation: currentLoc,
      destination,
      directDistance: Math.round(directDistance * 10) / 10,
      maxDetour: MAX_DETOUR_KM,
      returnLoads: returnLoads.slice(0, 20), // Limit to 20 best matches
      totalFound: returnLoads.length
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/drivers/home-location - Update driver's home location
router.put('/home-location', verifyToken, requireDriverAuth, async (req: AuthRequest, res, next) => {
  try {
    const { lat, lng, address } = z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional()
    }).parse(req.body);

    await prisma.driver.update({
      where: { id: req.userId },
      data: {
        homeLocation: { lat, lng, address: address || '' }
      }
    });

    res.json({
      message: 'Home location updated successfully',
      homeLocation: { lat, lng, address }
    });
  } catch (error) {
    next(error);
  }
});

// Export the badge and tier update functions for use in other routes
export { updateDriverBadges, updateDriverTier };
export default router;
