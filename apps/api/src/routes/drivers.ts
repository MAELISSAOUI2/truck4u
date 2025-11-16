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

    // Sort by distance (closest first)
    ridesWithDistance.sort((a, b) => {
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

export default router;
