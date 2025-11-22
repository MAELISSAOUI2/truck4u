import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireAdmin, AuthRequest, generateToken } from '../middleware/auth';
import { z } from 'zod';
import path from 'path';

const router = Router();

// ============================================
// ADMIN LOGIN (no auth required)
// ============================================

// POST /api/admin/login - Simple admin login (for development)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string()
    }).parse(req.body);

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // For development: simple password check (in production, use bcrypt)
    // For now, we'll just check if any password is provided and admin exists
    if (!password) {
      return res.status(401).json({ error: 'Mot de passe requis' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ error: 'Compte administrateur désactivé' });
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const token = generateToken(admin.id, 'admin');

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// All other admin routes require admin auth
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

    // Notify driver via socket.io
    const io = req.app.get('io') as any;
    if (io) {
      io.to(`driver:${driver.id}`).emit('kyc_status_changed', {
        status: 'APPROVED',
        message: 'Votre dossier KYC a été approuvé! Vous pouvez maintenant accéder au tableau de bord.',
        notes: notes || null
      });
    }

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

    // Notify driver via socket.io
    const io = req.app.get('io') as any;
    if (io) {
      io.to(`driver:${driver.id}`).emit('kyc_status_changed', {
        status: 'REJECTED',
        message: 'Votre dossier KYC a été rejeté. Veuillez consulter les détails et soumettre à nouveau.',
        reason: reason
      });
    }

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

// GET /api/admin/rides - Get all rides with filters and pagination
router.get('/rides', async (req, res, next) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;

    const where: any = {};

    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Search by ID, customer name, driver name, or address
    if (search) {
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
        { driver: { name: { contains: search as string, mode: 'insensitive' } } },
        { pickupAddress: { contains: search as string, mode: 'insensitive' } },
        { dropoffAddress: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          driver: {
            select: { id: true, name: true, phone: true, vehiclePlate: true, vehicleType: true }
          },
          payment: {
            select: {
              id: true,
              method: true,
              status: true,
              totalAmount: true,
              platformFee: true,
              driverAmount: true,
              completedAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.ride.count({ where })
    ]);

    // Calculate stats
    const totalRides = await prisma.ride.count();
    const activeRides = await prisma.ride.count({
      where: {
        status: {
          in: ['PENDING_BIDS', 'BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED']
        }
      }
    });
    const completedRides = await prisma.ride.count({
      where: { status: 'COMPLETED' }
    });

    // Calculate platform revenue (20 DT × completed rides with COMPLETED payments)
    const platformRevenue = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _sum: {
        platformFee: true
      }
    });

    res.json({
      rides,
      stats: {
        total: totalRides,
        active: activeRides,
        completed: completedRides,
        platformRevenue: platformRevenue._sum.platformFee || 0
      },
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
    const { period = '7d' } = req.query;

    // Calculate date range
    let startDate: Date | null = null;
    const endDate = new Date();

    if (period === '7d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90d') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
    }
    // If period === 'all', startDate remains null (no date filter)

    // Build date filter
    const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

    // Ride statistics
    const [totalRides, completedRides, activeRides, cancelledRides] = await Promise.all([
      prisma.ride.count({ where: dateFilter }),
      prisma.ride.count({ where: { ...dateFilter, status: 'COMPLETED' } }),
      prisma.ride.count({
        where: {
          ...dateFilter,
          status: {
            in: ['PENDING_BIDS', 'BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED']
          }
        }
      }),
      prisma.ride.count({ where: { ...dateFilter, status: 'CANCELLED' } })
    ]);

    const completionRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 0;

    // Revenue statistics
    const paymentDateFilter = startDate ? { completedAt: { gte: startDate } } : {};

    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        ...paymentDateFilter
      },
      select: {
        totalAmount: true,
        platformFee: true,
        driverAmount: true
      }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const platformFees = payments.reduce((sum, p) => sum + p.platformFee, 0);
    const driverEarnings = payments.reduce((sum, p) => sum + p.driverAmount, 0);
    const averageRideValue = completedRides > 0 ? totalRevenue / completedRides : 0;

    // User statistics
    const [totalCustomers, totalDrivers, activeDriversCount, approvedDrivers] = await Promise.all([
      prisma.customer.count(),
      prisma.driver.count(),
      prisma.driver.count({
        where: {
          isAvailable: true,
          verificationStatus: 'APPROVED'
        }
      }),
      prisma.driver.count({
        where: { verificationStatus: 'APPROVED' }
      })
    ]);

    res.json({
      rides: {
        total: totalRides,
        completed: completedRides,
        active: activeRides,
        cancelled: cancelledRides,
        completionRate: Math.round(completionRate * 10) / 10
      },
      revenue: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        driverEarnings: Math.round(driverEarnings * 100) / 100,
        averageRideValue: Math.round(averageRideValue * 100) / 100
      },
      users: {
        totalCustomers,
        totalDrivers,
        activeDrivers: activeDriversCount,
        approvedDrivers
      },
      period: {
        startDate: startDate ? startDate.toISOString() : new Date(0).toISOString(),
        endDate: endDate.toISOString()
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
        rejectionReason: reason
      }
    });

    res.json({
      message: 'Driver suspended',
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
        rejectionReason: null
      }
    });

    res.json({
      message: 'Driver activated',
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
