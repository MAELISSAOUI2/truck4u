import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@truck4u/database';
import { isTokenBlacklisted, isUserBlacklisted } from '../services/tokenBlacklist';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userType?: 'customer' | 'driver' | 'admin';
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

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: 'customer' | 'driver' | 'admin';
    };

    // Check if token is blacklisted (instant revocation)
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Check if all user tokens are blacklisted
    const isUserBlocked = await isUserBlacklisted(decoded.id, decoded.role);
    if (isUserBlocked) {
      return res.status(401).json({
        error: 'All sessions have been terminated. Please log in again.',
        code: 'USER_TOKENS_REVOKED'
      });
    }

    // Check if user is deactivated (for drivers)
    if (decoded.role === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { id: decoded.id },
        select: { isDeactivated: true }
      });

      if (driver?.isDeactivated) {
        return res.status(403).json({
          error: 'Account has been deactivated. Please contact support.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
    }

    // Attach user info to request
    req.userId = decoded.id;
    req.userType = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

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

export const generateToken = (userId: string, userType: 'customer' | 'driver' | 'admin') => {
  return jwt.sign({ userId, userType }, JWT_SECRET, { expiresIn: '7d' });
};
