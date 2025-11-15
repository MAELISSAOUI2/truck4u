import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireCustomer, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/customers/profile
router.get('/profile', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.userId },
      include: {
        subscription: true
      }
    });

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/customers/profile
router.patch('/profile', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { name, email, companyName, taxId } = req.body;

    const customer = await prisma.customer.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(companyName && { companyName }),
        ...(taxId && { taxId })
      }
    });

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

export default router;
