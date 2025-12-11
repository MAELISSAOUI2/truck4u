import { prisma } from '@truck4u/database';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface TokenPayload {
  id: string;
  role: 'driver' | 'customer' | 'admin';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate a secure random refresh token string
 */
function generateRefreshTokenString(): string {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Create access and refresh token pair for a user
 */
export async function createTokenPair(
  userId: string,
  role: 'driver' | 'customer' | 'admin'
): Promise<TokenPair> {
  // Generate access token (JWT)
  const accessToken = jwt.sign(
    { id: userId, role } as TokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Generate refresh token (random string)
  const refreshTokenString = generateRefreshTokenString();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  // Store refresh token in database
  const data: any = {
    token: refreshTokenString,
    expiresAt,
  };

  // Set the appropriate user ID field
  if (role === 'driver') {
    data.driverId = userId;
  } else if (role === 'customer') {
    data.customerId = userId;
  } else if (role === 'admin') {
    data.adminId = userId;
  }

  await prisma.refreshToken.create({ data });

  return {
    accessToken,
    refreshToken: refreshTokenString,
  };
}

/**
 * Verify and use a refresh token to generate new access token
 */
export async function refreshAccessToken(refreshTokenString: string): Promise<TokenPair | null> {
  // Find refresh token in database
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenString },
    include: {
      driver: true,
      customer: true,
      admin: true,
    },
  });

  // Validate refresh token
  if (!refreshToken) {
    return null; // Token not found
  }

  if (refreshToken.isRevoked) {
    return null; // Token has been revoked
  }

  if (refreshToken.expiresAt < new Date()) {
    // Token expired - delete it
    await prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });
    return null;
  }

  // Determine user type and ID
  let userId: string;
  let role: 'driver' | 'customer' | 'admin';

  if (refreshToken.driverId && refreshToken.driver) {
    userId = refreshToken.driverId;
    role = 'driver';
  } else if (refreshToken.customerId && refreshToken.customer) {
    userId = refreshToken.customerId;
    role = 'customer';
  } else if (refreshToken.adminId && refreshToken.admin) {
    userId = refreshToken.adminId;
    role = 'admin';
  } else {
    return null; // Invalid token state
  }

  // Revoke old refresh token
  await prisma.refreshToken.update({
    where: { id: refreshToken.id },
    data: { isRevoked: true },
  });

  // Create new token pair
  return createTokenPair(userId, role);
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(refreshTokenString: string): Promise<boolean> {
  try {
    await prisma.refreshToken.update({
      where: { token: refreshTokenString },
      data: { isRevoked: true },
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(
  userId: string,
  role: 'driver' | 'customer' | 'admin'
): Promise<number> {
  const where: any = {};

  if (role === 'driver') {
    where.driverId = userId;
  } else if (role === 'customer') {
    where.customerId = userId;
  } else if (role === 'admin') {
    where.adminId = userId;
  }

  const result = await prisma.refreshToken.updateMany({
    where: { ...where, isRevoked: false },
    data: { isRevoked: true },
  });

  return result.count;
}

/**
 * Clean up expired refresh tokens (to be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`[RefreshToken] Cleaned up ${result.count} expired tokens`);
  return result.count;
}
