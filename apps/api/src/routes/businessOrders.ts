import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireBusiness, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { matchOrder } from '../services/matchingEngine';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const CreateOrderSchema = z.object({
  // Recipient
  recipientName: z.string().min(2),
  recipientPhone: z.string().regex(/^\+216[0-9]{8}$/),
  recipientGouvernorat: z.string().min(2),
  recipientDelegation: z.string().min(2),
  recipientAddress: z.string().min(5),
  recipientCoordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  recipientNotes: z.string().optional(),
  savedAddressId: z.string().optional(),

  // Pickup (optional, defaults to business address)
  pickupContactName: z.string().optional(),
  pickupContactPhone: z.string().optional(),
  pickupGouvernorat: z.string().optional(),
  pickupDelegation: z.string().optional(),
  pickupAddress: z.string().optional(),
  pickupCoordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),

  // Cargo
  cargoType: z.enum(['DOCUMENT', 'PETIT_COLIS', 'MOYEN_COLIS', 'GROS_COLIS', 'PALETTE', 'MOBILIER', 'ELECTROMENAGER', 'ALIMENTAIRE']),
  cargoDescription: z.string().optional(),
  estimatedWeight: z.number().positive().optional(),
  estimatedSize: z.enum(['TRES_PETIT', 'PETIT', 'MOYEN', 'GRAND', 'TRES_GRAND']).optional(),

  // COD
  hasCOD: z.boolean().default(false),
  codAmount: z.number().positive().optional()
});

const RateOrderSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional()
});

// ==================== HELPERS ====================

/**
 * Generate order number: TRK-YYYYMMDD-XXXX
 */
async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's orders
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const count = await prisma.businessOrder.count({
    where: {
      createdAt: { gte: todayStart }
    }
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `TRK-${dateStr}-${sequence}`;
}

/**
 * Check if business has reached daily limits
 */
async function checkDailyLimits(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId }
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count today's orders
  const todayOrders = await prisma.businessOrder.count({
    where: {
      businessId,
      createdAt: { gte: today },
      status: { notIn: ['CANCELLED', 'FAILED'] }
    }
  });

  if (todayOrders >= business.maxDailyOrders) {
    return {
      exceeded: true,
      type: 'orders' as const,
      message: `Limite quotidienne atteinte (${business.maxDailyOrders} commandes/jour)`
    };
  }

  // Sum today's COD
  const todayCOD = await prisma.businessOrder.aggregate({
    where: {
      businessId,
      createdAt: { gte: today },
      hasCOD: true,
      status: { notIn: ['CANCELLED', 'FAILED'] }
    },
    _sum: { codAmount: true }
  });

  const totalCOD = todayCOD._sum.codAmount || 0;

  return {
    exceeded: false,
    usage: {
      orders: todayOrders,
      cod: totalCOD
    },
    limits: {
      maxDailyOrders: business.maxDailyOrders,
      maxDailyCOD: business.maxDailyCOD,
      maxSingleOrderCOD: business.maxSingleOrderCOD
    }
  };
}

// ==================== ROUTES ====================

/**
 * POST /api/business/orders
 * Create a new order (DRAFT status)
 */
router.post('/', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const data = CreateOrderSchema.parse(req.body);

    // Get business info
    const business = await prisma.business.findUnique({
      where: { id: req.userId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Compte introuvable' });
    }

    if (!business.phoneVerified) {
      return res.status(403).json({
        error: 'Vous devez vérifier votre numéro de téléphone avant de créer une commande'
      });
    }

    // Check daily limits
    const limitsCheck = await checkDailyLimits(req.userId!);
    if (limitsCheck.exceeded) {
      return res.status(403).json({
        error: limitsCheck.message,
        type: limitsCheck.type
      });
    }

    // Validate COD amount
    if (data.hasCOD) {
      if (!data.codAmount) {
        return res.status(400).json({
          error: 'Le montant COD est requis'
        });
      }

      if (data.codAmount > business.maxSingleOrderCOD) {
        return res.status(403).json({
          error: `Montant COD trop élevé (max: ${business.maxSingleOrderCOD} DT)`
        });
      }

      const remainingCOD = business.maxDailyCOD - (limitsCheck.usage?.cod || 0);
      if (data.codAmount > remainingCOD) {
        return res.status(403).json({
          error: `Limite COD quotidienne dépassée (disponible: ${remainingCOD} DT)`
        });
      }
    }

    // Use saved address if provided
    let savedAddress = null;
    if (data.savedAddressId) {
      savedAddress = await prisma.businessAddress.findFirst({
        where: {
          id: data.savedAddressId,
          businessId: req.userId
        }
      });
    }

    // Pickup defaults to business address
    const pickupData = {
      pickupContactName: data.pickupContactName || business.ownerFirstName,
      pickupContactPhone: data.pickupContactPhone || business.phone,
      pickupGouvernorat: data.pickupGouvernorat || business.gouvernorat,
      pickupDelegation: data.pickupDelegation || business.delegation,
      pickupAddress: data.pickupAddress || business.addressLine,
      pickupCoordinates: data.pickupCoordinates || business.coordinates || { lat: 0, lng: 0 }
    };

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order
    const order = await prisma.businessOrder.create({
      data: {
        businessId: req.userId!,
        orderNumber,

        // Recipient
        recipientName: savedAddress?.contactName || data.recipientName,
        recipientPhone: savedAddress?.contactPhone || data.recipientPhone,
        recipientGouvernorat: savedAddress?.gouvernorat || data.recipientGouvernorat,
        recipientDelegation: savedAddress?.delegation || data.recipientDelegation,
        recipientAddress: savedAddress?.addressLine || data.recipientAddress,
        recipientCoordinates: savedAddress?.coordinates || data.recipientCoordinates,
        recipientNotes: data.recipientNotes,
        savedAddressId: data.savedAddressId,

        // Pickup
        ...pickupData,

        // Cargo
        cargoType: data.cargoType,
        cargoDescription: data.cargoDescription,
        estimatedWeight: data.estimatedWeight,
        estimatedSize: data.estimatedSize,

        // COD
        hasCOD: data.hasCOD,
        codAmount: data.codAmount,
        codStatus: data.hasCOD ? 'PENDING' : 'NOT_APPLICABLE',

        // Status
        status: 'DRAFT',
        matchingStatus: 'PENDING'
      }
    });

    // Create status history entry
    await prisma.businessOrderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'DRAFT',
        timestamp: new Date()
      }
    });

    res.status(201).json({
      message: 'Commande créée avec succès',
      order
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
 * GET /api/business/orders
 * List orders with pagination and filters
 */
router.get('/', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {
      businessId: req.userId
    };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.businessOrder.findMany({
        where,
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              currentLat: true,
              currentLng: true,
              rating: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.businessOrder.count({ where })
    ]);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/orders/:id
 * Get order details
 */
router.get('/:id', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const order = await prisma.businessOrder.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            currentLat: true,
            currentLng: true,
            rating: true,
            totalDeliveries: true
          }
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business/orders/:id/submit
 * Submit order for driver matching (DRAFT → SEARCHING_DRIVER)
 */
router.post('/:id/submit', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const order = await prisma.businessOrder.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    if (order.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Seules les commandes en brouillon peuvent être soumises'
      });
    }

    // Update status to trigger matching
    const updatedOrder = await prisma.businessOrder.update({
      where: { id: order.id },
      data: {
        status: 'SEARCHING_DRIVER',
        matchingStatus: 'SEARCHING'
      }
    });

    // Create status history
    await prisma.businessOrderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'SEARCHING_DRIVER',
        timestamp: new Date()
      }
    });

    // Trigger matching engine asynchronously
    matchOrder(order.id).catch(error => {
      console.error(`Failed to match order ${order.id}:`, error);
    });

    res.json({
      message: 'Commande soumise pour recherche de livreur',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business/orders/:id/cancel
 * Cancel an order
 */
router.post('/:id/cancel', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    const order = await prisma.businessOrder.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const cancellableStatuses = ['DRAFT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: 'Cette commande ne peut plus être annulée'
      });
    }

    // Cancel order
    const updatedOrder = await prisma.businessOrder.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason
      }
    });

    // Create status history
    await prisma.businessOrderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'CANCELLED',
        timestamp: new Date(),
        notes: reason
      }
    });

    // TODO: Notify driver if assigned

    res.json({
      message: 'Commande annulée avec succès',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business/orders/:id/rate
 * Rate a completed order
 */
router.post('/:id/rate', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const { rating, comment } = RateOrderSchema.parse(req.body);

    const order = await prisma.businessOrder.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        error: 'Seules les commandes livrées peuvent être notées'
      });
    }

    if (order.driverRating) {
      return res.status(400).json({
        error: 'Cette commande a déjà été notée'
      });
    }

    // Update order rating
    const updatedOrder = await prisma.businessOrder.update({
      where: { id: order.id },
      data: {
        driverRating: rating,
        driverRatingComment: comment
      }
    });

    // Update driver rating
    if (order.driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: order.driverId }
      });

      if (driver) {
        const newTotalRatings = driver.totalRatings + 1;
        const newAverageRating = (driver.rating * driver.totalRatings + rating) / newTotalRatings;

        await prisma.driver.update({
          where: { id: order.driverId },
          data: {
            rating: newAverageRating,
            totalRatings: newTotalRatings
          }
        });

        // Update business-driver relation
        await prisma.driverBusinessRelation.upsert({
          where: {
            driverId_businessId: {
              driverId: order.driverId,
              businessId: req.userId!
            }
          },
          create: {
            driverId: order.driverId,
            businessId: req.userId!,
            totalDeliveries: 1,
            completedDeliveries: 1,
            averageRating: rating,
            lastDeliveryAt: new Date()
          },
          update: {
            totalDeliveries: { increment: 1 },
            completedDeliveries: { increment: 1 },
            averageRating: (driver.rating * driver.totalRatings + rating) / (driver.totalRatings + 1),
            lastDeliveryAt: new Date()
          }
        });
      }
    }

    res.json({
      message: 'Évaluation enregistrée avec succès',
      order: updatedOrder
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
 * GET /api/business/orders/:id/tracking
 * Get real-time tracking info
 */
router.get('/:id/tracking', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const order = await prisma.businessOrder.findFirst({
      where: {
        id: req.params.id,
        businessId: req.userId
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            currentLat: true,
            currentLng: true
          }
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      driver: order.driver,
      pickup: {
        address: order.pickupAddress,
        coordinates: order.pickupCoordinates
      },
      destination: {
        address: order.recipientAddress,
        coordinates: order.recipientCoordinates
      },
      timeline: order.statusHistory,
      estimatedArrival: order.estimatedArrival
    });
  } catch (error) {
    next(error);
  }
});

export default router;
