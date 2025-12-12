import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { generateToken, verifyToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { blacklistToken, blacklistAllUserTokens } from '../services/tokenBlacklist';
import { refreshAccessToken, revokeRefreshToken, revokeAllUserTokens } from '../services/refreshToken';

const router = Router();

// Schemas
const loginSchema = z.object({
  phone: z.string().regex(/^\+216[0-9]{8}$/, 'Invalid Tunisian phone number'),
  userType: z.enum(['customer', 'driver'])
});

const registerCustomerSchema = z.object({
  phone: z.string().regex(/^\+216[0-9]{8}$/),
  name: z.string().min(2),
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email().optional()
});

const registerDriverSchema = z.object({
  phone: z.string().regex(/^\+216[0-9]{8}$/),
  name: z.string().min(2),
  vehicleType: z.enum(['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD']),
  vehiclePlate: z.string().optional(),
  email: z.string().email().optional()
});

// POST /api/auth/login - Simple login (in production, use OTP)
router.post('/login', async (req, res, next) => {
  try {
    const { phone, userType } = loginSchema.parse(req.body);

    let user;
    if (userType === 'customer') {
      user = await prisma.customer.findUnique({ where: { phone } });
    } else {
      user = await prisma.driver.findUnique({ where: { phone } });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateToken(user.id, userType);

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        userType
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register/customer
router.post('/register/customer', async (req, res, next) => {
  try {
    const data = registerCustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data
    });

    const token = generateToken(customer.id, 'customer');

    res.status(201).json({
      token,
      user: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        accountType: customer.accountType,
        userType: 'customer'
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register/driver
router.post('/register/driver', async (req, res, next) => {
  try {
    const data = registerDriverSchema.parse(req.body);

    const driver = await prisma.driver.create({
      data: {
        ...data,
        verificationStatus: 'PENDING_REVIEW',
        documents: {}
      }
    });

    const token = generateToken(driver.id, 'driver');

    res.status(201).json({
      token,
      user: {
        id: driver.id,
        phone: driver.phone,
        name: driver.name,
        vehicleType: driver.vehicleType,
        verificationStatus: driver.verificationStatus,
        userType: 'driver'
      }
    });
  } catch (error) {
    next(error);
  }
});

// In production, implement OTP verification
// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  // TODO: Implement with Twilio or local SMS service
  res.json({ message: 'OTP verification not implemented yet' });
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({
      refreshToken: z.string()
    }).parse(req.body);

    const tokenPair = await refreshAccessToken(refreshToken);

    if (!tokenPair) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    res.json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Logout from current session
router.post('/logout', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { refreshToken } = z.object({
      refreshToken: z.string().optional()
    }).parse(req.body);

    // Blacklist the access token
    if (token) {
      await blacklistToken(token, 'user_logout');
    }

    // Revoke the refresh token
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!req.userId || !req.userType) {
      return res.status(400).json({ error: 'Missing user information' });
    }

    // Blacklist all access tokens for this user (15 min TTL)
    await blacklistAllUserTokens(req.userId, req.userType, 'logout_all_devices');

    // Revoke all refresh tokens from database
    const revokedCount = await revokeAllUserTokens(req.userId, req.userType);

    // Also blacklist the current access token
    if (token) {
      await blacklistToken(token, 'logout_all_devices');
    }

    res.json({
      message: 'Logged out from all devices successfully',
      revokedSessions: revokedCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;
