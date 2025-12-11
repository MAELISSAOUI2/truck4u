import express from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * POST /api/business-orders
 * Créer une nouvelle commande
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;

    const {
      // Order Type
      orderType, // 'ON_DEMAND', 'RECURRING', 'SCHEDULED'
      frequency, // 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'

      // Route
      pickup, // {lat, lng, address, contactName, contactPhone}
      dropoff, // {lat, lng, address, contactName, contactPhone}
      waypoints, // [{lat, lng, address}]
      distance,
      estimatedDuration,

      // Service Details
      vehicleType,
      loadAssistance,
      requiresPatente,
      numberOfTrips,
      description,
      specialInstructions,

      // Scheduling
      scheduledFor,
      isUrgent,
      deadline,

      // Assignment
      assignmentType, // 'AUTO_MATCH', 'PREFERRED_DRIVER', 'MANUAL'
      preferredDriverId,

      // Pricing
      quotedPrice,

      // Metadata
      internalReference,
    } = req.body;

    // Validation
    if (!pickup || !dropoff || !vehicleType || !distance || !estimatedDuration) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants',
        required: ['pickup', 'dropoff', 'vehicleType', 'distance', 'estimatedDuration']
      });
    }

    // Verify business exists and is active
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.isActive) {
      return res.status(403).json({ error: 'Compte entreprise inactif' });
    }

    // Create order
    const order = await prisma.businessOrder.create({
      data: {
        businessId,
        orderType: orderType || 'ON_DEMAND',
        frequency,
        pickup,
        dropoff,
        waypoints,
        distance,
        estimatedDuration,
        vehicleType,
        loadAssistance: loadAssistance || false,
        requiresPatente: requiresPatente || false,
        numberOfTrips: numberOfTrips || 1,
        description,
        specialInstructions,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        isUrgent: isUrgent || false,
        deadline: deadline ? new Date(deadline) : null,
        assignmentType: assignmentType || 'AUTO_MATCH',
        preferredDriverId,
        quotedPrice,
        internalReference,
      },
    });

    // Auto-match if requested
    if (order.assignmentType === 'AUTO_MATCH') {
      // Trigger matching in background (non-blocking)
      matchDriverToOrder(order.id).catch(err => {
        console.error('Error auto-matching driver:', err);
      });
    }

    // Update business stats
    await prisma.business.update({
      where: { id: businessId },
      data: {
        totalOrders: { increment: 1 },
      },
    });

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: {
        id: order.id,
        status: order.status,
        orderType: order.orderType,
        vehicleType: order.vehicleType,
        requiresPatente: order.requiresPatente,
        scheduledFor: order.scheduledFor,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating business order:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

/**
 * GET /api/business-orders
 * Liste des commandes de l'entreprise
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;
    const { status, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.businessOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          assignedDriver: {
            select: {
              id: true,
              name: true,
              phone: true,
              vehicleType: true,
              rating: true,
              hasPatente: true,
            },
          },
        },
      }),
      prisma.businessOrder.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching business orders:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
});

/**
 * GET /api/business-orders/:id
 * Détails d'une commande
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;
    const { id } = req.params;

    const order = await prisma.businessOrder.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            vehicleType: true,
            vehiclePlate: true,
            vehicleBrand: true,
            vehicleModel: true,
            rating: true,
            hasPatente: true,
            patenteNumber: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
});

/**
 * PUT /api/business-orders/:id/cancel
 * Annuler une commande
 */
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;
    const { id } = req.params;

    const order = await prisma.businessOrder.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Check if order can be cancelled
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({ error: 'Cette commande ne peut pas être annulée' });
    }

    const updatedOrder = await prisma.businessOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({
      message: 'Commande annulée avec succès',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la commande' });
  }
});

/**
 * PUT /api/business-orders/:id/rate
 * Noter une commande terminée
 */
router.put('/:id/rate', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Note invalide (1-5 requis)' });
    }

    const order = await prisma.businessOrder.findFirst({
      where: {
        id,
        businessId,
        status: 'COMPLETED',
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée ou non terminée' });
    }

    const updatedOrder = await prisma.businessOrder.update({
      where: { id },
      data: {
        rating,
        review,
      },
    });

    // Update driver rating if assigned
    if (order.assignedDriverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: order.assignedDriverId },
      });

      if (driver) {
        const newTotalRides = driver.totalRides + 1;
        const newRating = ((driver.rating * driver.totalRides) + rating) / newTotalRides;

        await prisma.driver.update({
          where: { id: order.assignedDriverId },
          data: {
            rating: newRating,
            totalRides: newTotalRides,
          },
        });
      }
    }

    res.json({
      message: 'Note enregistrée avec succès',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la note' });
  }
});

// ============================================
// MATCHING ENGINE
// ============================================

/**
 * Auto-match driver to order
 * Finds best available driver based on:
 * - Patente requirement
 * - Vehicle type
 * - Location proximity
 * - Rating
 * - Availability
 */
async function matchDriverToOrder(orderId: string) {
  try {
    const order = await prisma.businessOrder.findUnique({
      where: { id: orderId },
    });

    if (!order || order.assignedDriverId) {
      return; // Order not found or already assigned
    }

    // Build driver search criteria
    const where: any = {
      isAvailable: true,
      verificationStatus: 'APPROVED',
      isDeactivated: false,
      vehicleType: order.vehicleType,
    };

    // If patente required, filter by it
    if (order.requiresPatente) {
      where.hasPatente = true;
      where.patenteExpiryDate = {
        gte: new Date(), // Not expired
      };
    }

    // Find available drivers
    const drivers = await prisma.driver.findMany({
      where,
      orderBy: [
        { rating: 'desc' }, // Prefer higher rated drivers
        { completedRides: 'desc' }, // Then by experience
      ],
      take: 10, // Get top 10 candidates
    });

    if (drivers.length === 0) {
      console.log(`No drivers available for order ${orderId}`);
      return;
    }

    // For now, assign to best driver (first in sorted list)
    // TODO: Add proximity calculation based on currentLocation
    const selectedDriver = drivers[0];

    // Assign driver to order
    await prisma.businessOrder.update({
      where: { id: orderId },
      data: {
        assignedDriverId: selectedDriver.id,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      },
    });

    console.log(`Order ${orderId} assigned to driver ${selectedDriver.id}`);

    // TODO: Send notification to driver via Socket.io
  } catch (error) {
    console.error('Error in matchDriverToOrder:', error);
    throw error;
  }
}

export default router;
