import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireBusiness, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const CreateAddressSchema = z.object({
  nickname: z.string().min(2, 'Le surnom doit contenir au moins 2 caractères'),
  contactName: z.string().min(2),
  contactPhone: z.string().regex(/^\+216[0-9]{8}$/),
  gouvernorat: z.string().min(2),
  delegation: z.string().min(2),
  addressLine: z.string().min(5),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().default(false)
});

const UpdateAddressSchema = CreateAddressSchema.partial();

// ==================== ROUTES ====================

/**
 * POST /api/business/addresses
 * Create a new saved address
 */
router.post('/', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const data = CreateAddressSchema.parse(req.body);

    // If this is set as default, unset all other defaults
    if (data.isDefault) {
      await prisma.businessAddress.updateMany({
        where: {
          businessId: req.userId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const address = await prisma.businessAddress.create({
      data: {
        businessId: req.userId!,
        ...data
      }
    });

    res.status(201).json({
      message: 'Adresse enregistrée avec succès',
      address
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
 * GET /api/business/addresses
 * List all saved addresses
 */
router.get('/', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const addresses = await prisma.businessAddress.findMany({
      where: {
        businessId: req.userId
      },
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ addresses });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/addresses/recent
 * Get recently used addresses
 */
router.get('/recent', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const addresses = await prisma.businessAddress.findMany({
      where: {
        businessId: req.userId
      },
      orderBy: {
        lastUsedAt: 'desc'
      },
      take: limit
    });

    res.json({ addresses });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/addresses/frequent
 * Get most frequently used addresses
 */
router.get('/frequent', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const addresses = await prisma.businessAddress.findMany({
      where: {
        businessId: req.userId,
        usageCount: { gt: 0 }
      },
      orderBy: {
        usageCount: 'desc'
      },
      take: limit
    });

    res.json({ addresses });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/addresses/:id
 * Get address details
 */
router.get('/:id', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const address = await prisma.businessAddress.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!address) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    res.json(address);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/business/addresses/:id
 * Update an address
 */
router.put('/:id', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const updates = UpdateAddressSchema.parse(req.body);

    const address = await prisma.businessAddress.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!address) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await prisma.businessAddress.updateMany({
        where: {
          businessId: req.userId,
          isDefault: true,
          id: { not: req.params.id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const updatedAddress = await prisma.businessAddress.update({
      where: { id: req.params.id },
      data: updates
    });

    res.json({
      message: 'Adresse mise à jour avec succès',
      address: updatedAddress
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
 * DELETE /api/business/addresses/:id
 * Delete an address
 */
router.delete('/:id', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const address = await prisma.businessAddress.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!address) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    await prisma.businessAddress.delete({
      where: { id: req.params.id }
    });

    res.json({
      message: 'Adresse supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business/addresses/:id/set-default
 * Set address as default
 */
router.post('/:id/set-default', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const address = await prisma.businessAddress.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!address) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    // Unset all other defaults
    await prisma.businessAddress.updateMany({
      where: {
        businessId: req.userId,
        isDefault: true
      },
      data: {
        isDefault: false
      }
    });

    // Set this as default
    const updatedAddress = await prisma.businessAddress.update({
      where: { id: req.params.id },
      data: {
        isDefault: true
      }
    });

    res.json({
      message: 'Adresse définie comme adresse par défaut',
      address: updatedAddress
    });
  } catch (error) {
    next(error);
  }
});

export default router;
