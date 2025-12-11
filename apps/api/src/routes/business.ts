import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@truck4u/database';
import { verifyToken } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================
// AUTHENTICATION
// ============================================

/**
 * POST /api/business/register
 * Inscription d'une nouvelle entreprise
 */
router.post('/register', async (req, res) => {
  try {
    const {
      // Auth
      email,
      phone,
      password,

      // Company Info
      companyName,
      tradeName,
      taxId,
      businessLicense,
      sector,

      // Contact
      contactName,
      contactPhone,
      contactEmail,

      // Address
      address, // {street, city, postalCode, region, lat, lng}
      billingAddress,
    } = req.body;

    // Validation
    if (!email || !phone || !password || !companyName || !taxId || !contactName || !contactPhone || !address) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants',
        required: ['email', 'phone', 'password', 'companyName', 'taxId', 'contactName', 'contactPhone', 'address']
      });
    }

    // Check if email or phone already exists
    const existing = await prisma.business.findFirst({
      where: {
        OR: [
          { email },
          { phone },
          { taxId },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Email, téléphone ou matricule fiscal déjà utilisé'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create business
    const business = await prisma.business.create({
      data: {
        email,
        phone,
        passwordHash,
        companyName,
        tradeName,
        taxId,
        businessLicense,
        sector,
        contactName,
        contactPhone,
        contactEmail: contactEmail || email,
        address,
        billingAddress,
      },
    });

    // Generate token
    const token = jwt.sign(
      {
        businessId: business.id,
        email: business.email,
        type: 'business'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Compte entreprise créé avec succès',
      business: {
        id: business.id,
        email: business.email,
        phone: business.phone,
        companyName: business.companyName,
        verificationStatus: business.verificationStatus,
      },
      token,
    });
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte entreprise' });
  }
});

/**
 * POST /api/business/login
 * Connexion entreprise
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Find business
    const business = await prisma.business.findUnique({
      where: { email },
    });

    if (!business) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, business.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Check if account is active
    if (!business.isActive) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez le support.' });
    }

    // Update last login
    await prisma.business.update({
      where: { id: business.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = jwt.sign(
      {
        businessId: business.id,
        email: business.email,
        type: 'business'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Connexion réussie',
      business: {
        id: business.id,
        email: business.email,
        phone: business.phone,
        companyName: business.companyName,
        tradeName: business.tradeName,
        verificationStatus: business.verificationStatus,
        subscriptionTier: business.subscriptionTier,
        isActive: business.isActive,
      },
      token,
    });
  } catch (error) {
    console.error('Error during business login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ============================================
// PROFILE MANAGEMENT (Protected Routes)
// ============================================

/**
 * GET /api/business/profile
 * Récupérer profil entreprise
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId; // verifyToken sets userId

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        email: true,
        phone: true,
        companyName: true,
        tradeName: true,
        taxId: true,
        businessLicense: true,
        sector: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        address: true,
        billingAddress: true,
        verificationStatus: true,
        verifiedAt: true,
        rejectionReason: true,
        isActive: true,
        subscriptionTier: true,
        totalOrders: true,
        completedOrders: true,
        totalSpent: true,
        createdAt: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    res.json({ business });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

/**
 * PUT /api/business/profile
 * Mettre à jour profil entreprise
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;

    const {
      phone,
      tradeName,
      sector,
      contactName,
      contactPhone,
      contactEmail,
      address,
      billingAddress,
    } = req.body;

    // Build update data
    const updateData: any = {};
    if (phone !== undefined) updateData.phone = phone;
    if (tradeName !== undefined) updateData.tradeName = tradeName;
    if (sector !== undefined) updateData.sector = sector;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (address !== undefined) updateData.address = address;
    if (billingAddress !== undefined) updateData.billingAddress = billingAddress;

    const business = await prisma.business.update({
      where: { id: businessId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        companyName: true,
        tradeName: true,
        sector: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        address: true,
        billingAddress: true,
      },
    });

    res.json({
      message: 'Profil mis à jour avec succès',
      business,
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

/**
 * GET /api/business/stats
 * Statistiques entreprise
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const businessId = (req as any).userId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        totalOrders: true,
        completedOrders: true,
        totalSpent: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Get orders by status
    const ordersByStatus = await prisma.businessOrder.groupBy({
      by: ['status'],
      where: { businessId },
      _count: true,
    });

    // Get recent orders
    const recentOrders = await prisma.businessOrder.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        pickup: true,
        dropoff: true,
        vehicleType: true,
        scheduledFor: true,
        createdAt: true,
      },
    });

    res.json({
      stats: {
        totalOrders: business.totalOrders,
        completedOrders: business.completedOrders,
        totalSpent: business.totalSpent,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count,
        })),
      },
      recentOrders,
    });
  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
