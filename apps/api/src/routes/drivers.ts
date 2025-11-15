import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireDriver, AuthRequest } from '../middleware/auth';
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
  requireDriver,
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
router.get('/verification-status', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
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

// PATCH /api/drivers/availability - Toggle availability
router.patch('/availability', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
  try {
    const { isAvailable } = z.object({
      isAvailable: z.boolean()
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: req.userId },
      data: { isAvailable }
    });

    res.json({
      id: driver.id,
      isAvailable: driver.isAvailable
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/available-rides - Get rides in proximity
router.get('/available-rides', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.userId }
    });

    if (!driver || !driver.isAvailable) {
      return res.json({ rides: [] });
    }

    // Get pending rides matching driver's vehicle type
    const rides = await prisma.ride.findMany({
      where: {
        status: 'PENDING_BIDS',
        vehicleType: driver.vehicleType
      },
      include: {
        customer: {
          select: {
            name: true,
            accountType: true
          }
        },
        bids: {
          where: {
            driverId: req.userId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    res.json({ rides });
  } catch (error) {
    next(error);
  }
});

// GET /api/drivers/earnings/history
router.get('/earnings/history', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
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
