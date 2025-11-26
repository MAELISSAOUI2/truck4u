import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@truck4u/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userType?: 'customer' | 'driver' | 'admin' | 'business';
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      userType: 'customer' | 'driver' | 'admin' | 'business';
    };

    req.userId = decoded.userId;
    req.userType = decoded.userType;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware for basic driver authentication (doesn't require approval)
export const requireDriverAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userType !== 'driver') {
    return res.status(403).json({ error: 'Driver access required' });
  }
  next();
};

// Middleware for driver routes requiring full approval
export const requireDriver = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userType !== 'driver') {
    return res.status(403).json({ error: 'Driver access required' });
  }

  // Check if driver is approved
  const driver = await prisma.driver.findUnique({
    where: { id: req.userId }
  });

  if (!driver || driver.verificationStatus !== 'APPROVED') {
    return res.status(403).json({ error: 'Driver not approved' });
  }

  next();
};

export const requireCustomer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userType !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireBusiness = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userType !== 'business') {
    return res.status(403).json({ error: 'Business access required' });
  }
  next();
};

export const generateToken = (userId: string, userType: 'customer' | 'driver' | 'admin' | 'business') => {
  return jwt.sign({ userId, userType }, JWT_SECRET, { expiresIn: '7d' });
};
