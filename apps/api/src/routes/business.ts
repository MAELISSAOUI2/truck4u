import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireBusiness, generateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const RegisterSchema = z.object({
  businessName: z.string().min(2, 'Le nom du commerce doit contenir au moins 2 caractères'),
  businessType: z.enum(['LOCAL_SHOP', 'SOCIAL_SELLER', 'SME', 'RESTAURANT']),
  ownerFirstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  phone: z.string().regex(/^\+216[0-9]{8}$/, 'Le numéro de téléphone doit être au format +216XXXXXXXX'),
  gouvernorat: z.string().min(2),
  delegation: z.string().min(2),
  addressLine: z.string().min(5),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

const VerifyPhoneSchema = z.object({
  phone: z.string(),
  code: z.string().length(6, 'Le code doit contenir 6 chiffres')
});

const UpdateProfileSchema = z.object({
  businessName: z.string().min(2).optional(),
  ownerFirstName: z.string().min(2).optional(),
  gouvernorat: z.string().min(2).optional(),
  delegation: z.string().min(2).optional(),
  addressLine: z.string().min(5).optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  codPayoutMethod: z.enum(['D17', 'FLOUCI', 'BANK_TRANSFER', 'CASH_PICKUP']).optional(),
  codPayoutPhone: z.string().optional(),
  codPayoutBankRib: z.string().optional(),
  codPayoutBankName: z.string().optional()
});

// ==================== HELPER: TRUST LEVEL CONFIG ====================

const TRUST_LEVEL_CONFIG = {
  STARTER: {
    maxDailyCOD: 300,
    maxSingleOrderCOD: 100,
    maxDailyOrders: 5,
    codPayoutDelay: 72,
    requiredDriverLevel: 2,
  },
  VERIFIED: {
    maxDailyCOD: 1000,
    maxSingleOrderCOD: 300,
    maxDailyOrders: 20,
    codPayoutDelay: 48,
    requiredDriverLevel: 2,
  },
  PRO: {
    maxDailyCOD: 5000,
    maxSingleOrderCOD: 1000,
    maxDailyOrders: 100,
    codPayoutDelay: 24,
    requiredDriverLevel: 1,
    discount: 0.15,
  },
  ENTERPRISE: {
    maxDailyCOD: 99999,
    maxSingleOrderCOD: 99999,
    maxDailyOrders: 999,
    codPayoutDelay: 12,
    requiredDriverLevel: 1,
    discount: 0.20,
  }
};

// ==================== ROUTES ====================

/**
 * POST /api/business/register
 * Register a new business account (Step 1: Basic Info)
 */
router.post('/register', async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);

    // Check if phone already exists
    const existingBusiness = await prisma.business.findUnique({
      where: { phone: data.phone }
    });

    if (existingBusiness) {
      return res.status(400).json({
        error: 'Ce numéro de téléphone est déjà enregistré'
      });
    }

    // Create business with STARTER trust level
    const business = await prisma.business.create({
      data: {
        businessName: data.businessName,
        businessType: data.businessType,
        ownerFirstName: data.ownerFirstName,
        phone: data.phone,
        phoneVerified: false,
        gouvernorat: data.gouvernorat,
        delegation: data.delegation,
        addressLine: data.addressLine,
        coordinates: data.coordinates,
        trustLevel: 'STARTER',
        maxDailyCOD: TRUST_LEVEL_CONFIG.STARTER.maxDailyCOD,
        maxSingleOrderCOD: TRUST_LEVEL_CONFIG.STARTER.maxSingleOrderCOD,
        maxDailyOrders: TRUST_LEVEL_CONFIG.STARTER.maxDailyOrders,
        verificationStatus: 'NONE'
      }
    });

    // TODO: Send SMS verification code (integrate with SMS provider)
    // For now, we'll return a mock response

    res.status(201).json({
      message: 'Compte créé avec succès. Un code de vérification a été envoyé par SMS.',
      businessId: business.id,
      phone: business.phone
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }
    next(error);
  }
});

/**
 * POST /api/business/verify-phone
 * Verify phone number with SMS code
 */
router.post('/verify-phone', async (req, res, next) => {
  try {
    const { phone, code } = VerifyPhoneSchema.parse(req.body);

    // TODO: Verify code with SMS provider
    // For now, accept code "123456" for testing
    if (code !== '123456') {
      return res.status(400).json({ error: 'Code de vérification incorrect' });
    }

    const business = await prisma.business.findUnique({
      where: { phone }
    });

    if (!business) {
      return res.status(404).json({ error: 'Compte introuvable' });
    }

    if (business.phoneVerified) {
      return res.status(400).json({ error: 'Ce numéro est déjà vérifié' });
    }

    // Update phone verification
    const updatedBusiness = await prisma.business.update({
      where: { phone },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date()
      }
    });

    // Generate JWT token
    const token = generateToken(updatedBusiness.id, 'business');

    res.json({
      message: 'Téléphone vérifié avec succès',
      token,
      business: {
        id: updatedBusiness.id,
        businessName: updatedBusiness.businessName,
        trustLevel: updatedBusiness.trustLevel,
        phoneVerified: updatedBusiness.phoneVerified
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }
    next(error);
  }
});

/**
 * GET /api/business/profile
 * Get current business profile
 */
router.get('/profile', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.userId },
      include: {
        _count: {
          select: {
            orders: true,
            addresses: true,
            favoriteDrivers: true
          }
        }
      }
    });

    if (!business) {
      return res.status(404).json({ error: 'Compte introuvable' });
    }

    // Don't expose sensitive fields
    const { cinFront, cinBack, cinSelfie, ...safeProfile } = business;

    res.json(safeProfile);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/business/profile
 * Update business profile
 */
router.put('/profile', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const updates = UpdateProfileSchema.parse(req.body);

    const updatedBusiness = await prisma.business.update({
      where: { id: req.userId },
      data: updates
    });

    res.json({
      message: 'Profil mis à jour avec succès',
      business: updatedBusiness
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors
      });
    }
    next(error);
  }
});

/**
 * GET /api/business/limits
 * Get current trust level limits and usage
 */
router.get('/limits', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.userId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Compte introuvable' });
    }

    // Calculate today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.businessOrder.count({
      where: {
        businessId: req.userId!,
        createdAt: { gte: today },
        status: { notIn: ['CANCELLED', 'FAILED'] }
      }
    });

    const todayCOD = await prisma.businessOrder.aggregate({
      where: {
        businessId: req.userId!,
        createdAt: { gte: today },
        hasCOD: true,
        status: { notIn: ['CANCELLED', 'FAILED'] }
      },
      _sum: {
        codAmount: true
      }
    });

    const config = TRUST_LEVEL_CONFIG[business.trustLevel];

    res.json({
      trustLevel: business.trustLevel,
      limits: {
        maxDailyCOD: business.maxDailyCOD,
        maxSingleOrderCOD: business.maxSingleOrderCOD,
        maxDailyOrders: business.maxDailyOrders
      },
      usage: {
        todayOrders,
        todayCOD: todayCOD._sum.codAmount || 0
      },
      available: {
        orders: business.maxDailyOrders - todayOrders,
        cod: business.maxDailyCOD - (todayCOD._sum.codAmount || 0)
      },
      config: {
        codPayoutDelay: config.codPayoutDelay,
        requiredDriverLevel: config.requiredDriverLevel,
        discount: config.discount || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/upgrade-eligibility
 * Check if business is eligible for trust level upgrade
 */
router.get('/upgrade-eligibility', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.userId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Compte introuvable' });
    }

    let eligibleFor: string | null = null;
    let requirements: any = {};

    if (business.trustLevel === 'STARTER') {
      // Check eligibility for VERIFIED
      const hasCompletedOrders = business.completedOrders >= 3;
      const hasPhoneVerified = business.phoneVerified;

      eligibleFor = hasCompletedOrders && hasPhoneVerified ? 'VERIFIED' : null;
      requirements = {
        phoneVerified: hasPhoneVerified,
        completedOrders: business.completedOrders >= 3,
        cinDocuments: false // Not uploaded yet
      };
    } else if (business.trustLevel === 'VERIFIED') {
      // Check eligibility for PRO
      const hasCompletedOrders = business.completedOrders >= 30;
      const hasGoodRating = business.rating >= 4.5;
      const hasVerification = business.verificationStatus === 'APPROVED';

      eligibleFor = hasCompletedOrders && hasGoodRating && hasVerification ? 'PRO' : null;
      requirements = {
        completedOrders: business.completedOrders >= 30,
        rating: business.rating >= 4.5,
        verification: hasVerification
      };
    }

    res.json({
      currentLevel: business.trustLevel,
      eligibleFor,
      requirements,
      stats: {
        completedOrders: business.completedOrders,
        totalOrders: business.totalOrders,
        rating: business.rating
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
