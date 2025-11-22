import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { generateToken } from '../middleware/auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';

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
  email: z.string().email().or(z.literal('')).optional()
});

const registerDriverSchema = z.object({
  phone: z.string().regex(/^\+216[0-9]{8}$/),
  name: z.string().min(2),
  vehicleType: z.enum(['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD']),
  vehiclePlate: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
  vehicleColor: z.string().optional(),
  hasBusinessLicense: z.boolean().default(false),
  email: z.string().email().or(z.literal('')).optional()
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
        verificationStatus: 'PENDING_DOCUMENTS'
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

export default router;
