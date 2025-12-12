import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import path from 'path';
import { blacklistAllUserTokens, removeUserBlacklist } from '../services/tokenBlacklist';

const router = Router();

// All admin routes require admin auth
router.use(verifyToken, requireAdmin);

// ============================================
// KYC MANAGEMENT
// ============================================

// GET /api/admin/kyc/pending - Get drivers with pending KYC verification
router.get('/kyc/pending', async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: {
        verificationStatus: 'PENDING_REVIEW'
      },
      include: {
        kycDocuments: {
          orderBy: { uploadedAt: 'desc' }
        }
      },
      orderBy: {
        updatedAt: 'asc' // Oldest first
      }
    });

    res.json({ drivers, count: drivers.length });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/kyc/driver/:id - Get driver KYC details
router.get('/kyc/driver/:id', async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        kycDocuments: {
          orderBy: { uploadedAt: 'desc' }
        },
        completedRides: {
          take: 10,
          orderBy: { completedAt: 'desc' },
          select: {
            id: true,
            status: true,
            finalPrice: true,
            customerRating: true,
            completedAt: true
          }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ driver });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/kyc/document/:id/verify - Verify a specific document
router.post('/kyc/document/:id/verify', async (req, res, next) => {
  try {
    const { status, notes } = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      notes: z.string().optional()
    }).parse(req.body);

    const authReq = req as AuthRequest;

    const document = await prisma.kYCDocument.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: status,
        verificationNotes: notes,
        verifiedAt: new Date(),
        verifiedBy: authReq.userId
      },
      include: {
        driver: {
          include: {
            kycDocuments: true
          }
        }
      }
    });

    // Check if all documents are approved
    const allApproved = document.driver.kycDocuments.every(
      doc => doc.verificationStatus === 'APPROVED'
    );

    // If all docs approved, approve driver
    if (allApproved) {
      await prisma.driver.update({
        where: { id: document.driverId },
        data: {
          verificationStatus: 'APPROVED',
          verificationNotes: 'All documents verified and approved'
        }
      });
    }

    res.json({
      message: `Document ${status.toLowerCase()}`,
      document
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/kyc/driver/:id/approve - Approve driver KYC
router.post('/kyc/driver/:id/approve', async (req, res, next) => {
  try {
    const { notes } = z.object({
      notes: z.string().optional()
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'APPROVED',
        verificationNotes: notes,
        rejectionReason: null
      }
    });

    // Approve all pending documents
    await prisma.kYCDocument.updateMany({
      where: {
        driverId: req.params.id,
        verificationStatus: 'PENDING'
      },
      data: {
        verificationStatus: 'APPROVED',
        verifiedAt: new Date()
      }
    });

    // TODO: Send SMS notification to driver

    res.json({
      message: 'Driver approved successfully',
      driver
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/kyc/driver/:id/reject - Reject driver KYC
router.post('/kyc/driver/:id/reject', async (req, res, next) => {
  try {
    const { reason, documentIds } = z.object({
      reason: z.string().min(10),
      documentIds: z.array(z.string()).optional()
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'REJECTED',
        rejectionReason: reason
      }
    });

    // Reject specific documents if provided
    if (documentIds && documentIds.length > 0) {
      await prisma.kYCDocument.updateMany({
        where: {
          id: { in: documentIds }
        },
        data: {
          verificationStatus: 'REJECTED',
          verifiedAt: new Date()
        }
      });
    }

    // TODO: Send SMS notification to driver

    res.json({
      message: 'Driver rejected',
      driver
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DRIVER MANAGEMENT
// ============================================

// GET /api/admin/drivers/pending - Get drivers pending verification
router.get('/drivers/pending', async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: {
        verificationStatus: 'PENDING_REVIEW'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({ drivers });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/drivers/:id/verify - Approve or reject driver
router.patch('/drivers/:id/verify', async (req, res, next) => {
  try {
    const { status, reason } = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional()
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: status,
        ...(reason && {
          documents: {
            rejectionReason: reason
          }
        })
      }
    });

    // TODO: Send SMS notification to driver

    res.json({
      message: `Driver ${status.toLowerCase()}`,
      driver
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/rides/active - Get all active rides
router.get('/rides/active', async (req, res, next) => {
  try {
    const rides = await prisma.ride.findMany({
      where: {
        status: {
          in: ['PENDING_BIDS', 'BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED']
        }
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        driver: {
          select: { id: true, name: true, phone: true, vehiclePlate: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ rides });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics - Platform analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Total rides
    const totalRides = await prisma.ride.count({
      where: {
        createdAt: { gte: startDate }
      }
    });

    // Completed rides
    const completedRides = await prisma.ride.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      }
    });

    // GMV (Gross Merchandise Value)
    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: startDate }
      }
    });

    const gmv = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const platformRevenue = payments.reduce((sum, p) => sum + p.platformFee, 0);

    // Active users
    const activeCustomers = await prisma.customer.count({
      where: {
        rides: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      }
    });

    const activeDrivers = await prisma.driver.count({
      where: {
        completedRides: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      }
    });

    // Rides by vehicle type
    const ridesByVehicleType = await prisma.ride.groupBy({
      by: ['vehicleType'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Payment methods distribution
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        completedAt: { gte: startDate }
      },
      _count: true
    });

    // Conversion rate
    const conversionRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 0;

    res.json({
      period,
      summary: {
        totalRides,
        completedRides,
        conversionRate: Math.round(conversionRate * 10) / 10,
        gmv: Math.round(gmv * 100) / 100,
        platformRevenue: Math.round(platformRevenue * 100) / 100,
        activeCustomers,
        activeDrivers
      },
      breakdown: {
        byVehicleType: ridesByVehicleType,
        byPaymentMethod: paymentsByMethod
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/disputes - Get reported issues
router.get('/disputes', async (req, res, next) => {
  try {
    // TODO: Implement disputes/reports system
    res.json({ disputes: [] });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DRIVER LIST & SEARCH
// ============================================

// GET /api/admin/drivers - Get all drivers with filters
router.get('/drivers', async (req, res, next) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;

    const where: any = {};

    if (status) {
      where.verificationStatus = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { vehiclePlate: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          kycDocuments: {
            select: {
              documentType: true,
              verificationStatus: true
            }
          },
          _count: {
            select: {
              completedRides: true,
              bids: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.driver.count({ where })
    ]);

    res.json({
      drivers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/drivers/:id/suspend - Suspend driver
router.patch('/drivers/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = z.object({
      reason: z.string().min(10)
    }).parse(req.body);

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'SUSPENDED',
        isAvailable: false,
        isDeactivated: true,
        deactivatedAt: new Date(),
        deactivationReason: reason,
        rejectionReason: reason
      }
    });

    // Instantly revoke all active sessions
    await blacklistAllUserTokens(driver.id, 'driver', `admin_suspension: ${reason}`);

    console.log(`[Admin] Driver ${driver.id} suspended. All sessions revoked.`);

    res.json({
      message: 'Driver suspended and all sessions terminated',
      driver
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/drivers/:id/activate - Reactivate driver
router.patch('/drivers/:id/activate', async (req, res, next) => {
  try {
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'APPROVED',
        isDeactivated: false,
        deactivatedAt: null,
        deactivationReason: null,
        rejectionReason: null
      }
    });

    // Remove driver from token blacklist (allow new logins)
    await removeUserBlacklist(driver.id, 'driver');

    console.log(`[Admin] Driver ${driver.id} reactivated. Blacklist removed.`);

    res.json({
      message: 'Driver activated successfully',
      driver
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ENHANCED ANALYTICS
// ============================================

// GET /api/admin/stats/overview - Dashboard overview stats
router.get('/stats/overview', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - 7));
    const startOfMonth = new Date(now.setMonth(now.getMonth() - 1));

    // Get key metrics
    const [
      totalDrivers,
      activeDrivers,
      pendingDrivers,
      totalCustomers,
      totalRides,
      todayRides,
      activeRides,
      completedToday,
      totalRevenue
    ] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { verificationStatus: 'APPROVED' } }),
      prisma.driver.count({ where: { verificationStatus: 'PENDING_REVIEW' } }),
      prisma.customer.count(),
      prisma.ride.count(),
      prisma.ride.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.ride.count({
        where: {
          status: {
            in: ['PENDING_BIDS', 'BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT']
          }
        }
      }),
      prisma.ride.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: startOfToday }
        }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED'
        },
        _sum: {
          platformFee: true
        }
      })
    ]);

    res.json({
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
        pending: pendingDrivers
      },
      customers: {
        total: totalCustomers
      },
      rides: {
        total: totalRides,
        today: todayRides,
        active: activeRides,
        completedToday
      },
      revenue: {
        total: totalRevenue._sum.platformFee || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/stats/kyc - KYC statistics
router.get('/stats/kyc', async (req, res, next) => {
  try {
    const kycStats = await prisma.driver.groupBy({
      by: ['verificationStatus'],
      _count: true
    });

    const documentStats = await prisma.kYCDocument.groupBy({
      by: ['verificationStatus'],
      _count: true
    });

    const avgVerificationTime = await prisma.$queryRaw`
      SELECT
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
      FROM "Driver"
      WHERE verification_status = 'APPROVED'
    `;

    res.json({
      driversByStatus: kycStats,
      documentsByStatus: documentStats,
      avgVerificationTimeHours: avgVerificationTime
    });
  } catch (error) {
    next(error);
  }
});

export default router;
