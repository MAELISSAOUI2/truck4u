import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'kyc');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and PDF are allowed'));
    }
  }
});

// All KYC routes require authentication
router.use(verifyToken);

// POST /api/kyc/documents - Upload KYC document
router.post('/documents', upload.single('file'), async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { documentType, expiresAt } = z.object({
      documentType: z.enum([
        'CIN_FRONT', 'CIN_BACK', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION',
        'BUSINESS_LICENSE', 'VEHICLE_PHOTO_FRONT', 'VEHICLE_PHOTO_BACK',
        'VEHICLE_PHOTO_LEFT', 'VEHICLE_PHOTO_RIGHT', 'VEHICLE_PHOTO_INTERIOR',
        'INSURANCE_CERTIFICATE', 'TECHNICAL_INSPECTION'
      ]),
      expiresAt: z.string().optional()
    }).parse(req.body);

    // Get driver info
    const driver = await prisma.driver.findUnique({
      where: { id: authReq.userId }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if document already exists for this type
    const existingDoc = await prisma.kYCDocument.findFirst({
      where: {
        driverId: driver.id,
        documentType
      }
    });

    // Create document record
    const document = existingDoc
      ? await prisma.kYCDocument.update({
          where: { id: existingDoc.id },
          data: {
            fileUrl: `/uploads/kyc/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            verificationStatus: 'PENDING',
            uploadedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null
          }
        })
      : await prisma.kYCDocument.create({
          data: {
            driverId: driver.id,
            documentType,
            fileUrl: `/uploads/kyc/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            expiresAt: expiresAt ? new Date(expiresAt) : null
          }
        });

    // Check if all required documents are uploaded
    const allDocuments = await prisma.kYCDocument.findMany({
      where: { driverId: driver.id }
    });

    const requiredDocs = [
      'CIN_FRONT', 'CIN_BACK', 'DRIVING_LICENSE',
      'VEHICLE_REGISTRATION', 'VEHICLE_PHOTO_FRONT'
    ];

    const hasAllRequired = requiredDocs.every(type =>
      allDocuments.some(doc => doc.documentType === type)
    );

    // Update driver status if all required docs are uploaded
    if (hasAllRequired && driver.verificationStatus === 'PENDING_DOCUMENTS') {
      await prisma.driver.update({
        where: { id: driver.id },
        data: { verificationStatus: 'PENDING_REVIEW' }
      });
    }

    res.json({
      message: 'Document uploaded successfully',
      document,
      allDocumentsUploaded: hasAllRequired
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/kyc/documents - Get all driver's documents
router.get('/documents', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    const driver = await prisma.driver.findUnique({
      where: { id: authReq.userId },
      include: {
        kycDocuments: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check which required documents are missing
    const requiredDocs = [
      'CIN_FRONT', 'CIN_BACK', 'DRIVING_LICENSE',
      'VEHICLE_REGISTRATION', 'VEHICLE_PHOTO_FRONT'
    ];

    const missingDocs = requiredDocs.filter(type =>
      !driver.kycDocuments.some(doc => doc.documentType === type)
    );

    res.json({
      documents: driver.kycDocuments,
      verificationStatus: driver.verificationStatus,
      missingDocuments: missingDocs,
      rejectionReason: driver.rejectionReason
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/kyc/documents/:id - Delete a document
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    const driver = await prisma.driver.findUnique({
      where: { id: authReq.userId }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const document = await prisma.kYCDocument.findFirst({
      where: {
        id: req.params.id,
        driverId: driver.id
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), document.fileUrl);
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    // Delete from database
    await prisma.kYCDocument.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/kyc/status - Get KYC verification status
router.get('/status', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    const driver = await prisma.driver.findUnique({
      where: { id: authReq.userId },
      select: {
        id: true,
        verificationStatus: true,
        verificationNotes: true,
        rejectionReason: true,
        kycDocuments: {
          select: {
            documentType: true,
            verificationStatus: true,
            verificationNotes: true
          }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const requiredDocs = [
      'CIN_FRONT', 'CIN_BACK', 'DRIVING_LICENSE',
      'VEHICLE_REGISTRATION', 'VEHICLE_PHOTO_FRONT'
    ];

    const uploadedDocs = driver.kycDocuments.map(doc => doc.documentType);
    const missingDocs = requiredDocs.filter(type => !uploadedDocs.includes(type));

    const progress = {
      total: requiredDocs.length,
      uploaded: requiredDocs.length - missingDocs.length,
      percentage: Math.round(((requiredDocs.length - missingDocs.length) / requiredDocs.length) * 100)
    };

    res.json({
      verificationStatus: driver.verificationStatus,
      progress,
      missingDocuments: missingDocs,
      documents: driver.kycDocuments,
      verificationNotes: driver.verificationNotes,
      rejectionReason: driver.rejectionReason
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/kyc/profile - Update driver profile for KYC
router.put('/profile', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    const data = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      vehicleType: z.enum(['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD']).optional(),
      vehiclePlate: z.string().optional(),
      vehicleBrand: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleYear: z.number().min(1990).max(new Date().getFullYear()).optional(),
      vehicleColor: z.string().optional(),
      hasBusinessLicense: z.boolean().optional()
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: authReq.userId },
      data
    });

    res.json({
      message: 'Profile updated successfully',
      driver
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/kyc/submit - Submit documents for review
router.post('/submit', async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    const driver = await prisma.driver.findUnique({
      where: { id: authReq.userId },
      include: {
        kycDocuments: true
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if all required documents are uploaded
    const requiredDocs = [
      'CIN_FRONT', 'CIN_BACK', 'DRIVING_LICENSE',
      'VEHICLE_REGISTRATION', 'VEHICLE_PHOTO_FRONT'
    ];

    const uploadedDocTypes = driver.kycDocuments.map(doc => doc.documentType);
    const missingDocs = requiredDocs.filter(type => !uploadedDocTypes.includes(type));

    if (missingDocs.length > 0) {
      return res.status(400).json({
        error: 'Tous les documents requis doivent être téléchargés',
        missingDocuments: missingDocs
      });
    }

    // Update driver status to PENDING_REVIEW
    const updatedDriver = await prisma.driver.update({
      where: { id: authReq.userId },
      data: {
        verificationStatus: 'PENDING_REVIEW'
      }
    });

    // TODO: Send notification to admins via socket.io
    // This will be implemented when we set up socket.io

    res.json({
      message: 'Documents soumis pour vérification',
      verificationStatus: updatedDriver.verificationStatus
    });
  } catch (error) {
    next(error);
  }
});

export default router;
