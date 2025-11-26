import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireBusiness, AuthRequest } from '../middleware/auth';

const router = Router();

// ==================== ROUTES ====================

/**
 * GET /api/business/drivers
 * Get all drivers the business has worked with
 */
router.get('/', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const relations = await prisma.driverBusinessRelation.findMany({
      where: {
        businessId: req.userId
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            rating: true,
            totalDeliveries: true,
            b2bLevel: true,
            isAvailable: true
          }
        }
      },
      orderBy: {
        lastDeliveryAt: 'desc'
      }
    });

    res.json({ relations });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/drivers/:driverId
 * Get driver details and relationship history
 */
router.get('/:driverId', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const relation = await prisma.driverBusinessRelation.findUnique({
      where: {
        driverId_businessId: {
          driverId: req.params.driverId,
          businessId: req.userId!
        }
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            rating: true,
            totalDeliveries: true,
            completedDeliveries: true,
            b2bLevel: true,
            isAvailable: true,
            currentLat: true,
            currentLng: true
          }
        }
      }
    });

    if (!relation) {
      return res.status(404).json({
        error: 'Aucun historique avec ce livreur'
      });
    }

    // Get recent orders with this driver
    const recentOrders = await prisma.businessOrder.findMany({
      where: {
        businessId: req.userId,
        driverId: req.params.driverId
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
        driverRating: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    res.json({
      relation,
      recentOrders
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/drivers/favorites
 * Get favorite drivers
 */
router.get('/favorites/list', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const favorites = await prisma.businessFavoriteDriver.findMany({
      where: {
        businessId: req.userId
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            rating: true,
            totalDeliveries: true,
            b2bLevel: true,
            isAvailable: true,
            currentLat: true,
            currentLng: true
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    res.json({ favorites });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business/drivers/:driverId/favorite
 * Add driver to favorites
 */
router.post('/:driverId/favorite', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.driverId }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Livreur introuvable' });
    }

    // Check if already favorited
    const existing = await prisma.businessFavoriteDriver.findUnique({
      where: {
        businessId_driverId: {
          businessId: req.userId!,
          driverId: req.params.driverId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Ce livreur est déjà dans vos favoris'
      });
    }

    // Add to favorites
    const favorite = await prisma.businessFavoriteDriver.create({
      data: {
        businessId: req.userId!,
        driverId: req.params.driverId
      }
    });

    res.status(201).json({
      message: 'Livreur ajouté aux favoris',
      favorite
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/business/drivers/:driverId/favorite
 * Remove driver from favorites
 */
router.delete('/:driverId/favorite', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const favorite = await prisma.businessFavoriteDriver.findUnique({
      where: {
        businessId_driverId: {
          businessId: req.userId!,
          driverId: req.params.driverId
        }
      }
    });

    if (!favorite) {
      return res.status(404).json({
        error: 'Ce livreur n\'est pas dans vos favoris'
      });
    }

    await prisma.businessFavoriteDriver.delete({
      where: {
        businessId_driverId: {
          businessId: req.userId!,
          driverId: req.params.driverId
        }
      }
    });

    res.json({
      message: 'Livreur retiré des favoris'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/drivers/:driverId/is-favorite
 * Check if driver is in favorites
 */
router.get('/:driverId/is-favorite', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const favorite = await prisma.businessFavoriteDriver.findUnique({
      where: {
        businessId_driverId: {
          businessId: req.userId!,
          driverId: req.params.driverId
        }
      }
    });

    res.json({
      isFavorite: !!favorite
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business/drivers/stats
 * Get driver relationship statistics
 */
router.get('/stats/summary', verifyToken, requireBusiness, async (req: AuthRequest, res, next) => {
  try {
    const [totalDrivers, favoriteDrivers, relations] = await Promise.all([
      // Total unique drivers worked with
      prisma.driverBusinessRelation.count({
        where: { businessId: req.userId }
      }),
      // Favorite drivers count
      prisma.businessFavoriteDriver.count({
        where: { businessId: req.userId }
      }),
      // Get top 3 drivers by delivery count
      prisma.driverBusinessRelation.findMany({
        where: { businessId: req.userId },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rating: true
            }
          }
        },
        orderBy: {
          totalDeliveries: 'desc'
        },
        take: 3
      })
    ]);

    res.json({
      totalDrivers,
      favoriteDrivers,
      topDrivers: relations
    });
  } catch (error) {
    next(error);
  }
});

export default router;
