/**
 * Real-Time Tracking Middleware
 *
 * JWT authentication and authorization middleware for Socket.IO
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SocketData } from '../../../../apps/web/types/realtime';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

/**
 * Authenticate Socket.IO connection using JWT token
 *
 * Token can be provided in:
 * 1. auth.token (recommended)
 * 2. handshake.auth.token
 * 3. query.token (fallback for older clients)
 */
export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): void {
  try {
    // Extract token from multiple possible locations
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token as string ||
      null;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (!decoded.userId || !decoded.role) {
      return next(new Error('Authentication error: Invalid token payload'));
    }

    // Attach user data to socket
    socket.data = {
      userId: decoded.userId,
      role: decoded.role,
      authenticatedAt: Date.now(),
    } as SocketData;

    console.log(`✅ Socket authenticated: ${decoded.userId} (${decoded.role})`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Authentication error: Invalid token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Authentication error: Token expired'));
    }

    return next(new Error('Authentication error: Unknown error'));
  }
}

/**
 * Authorize socket to perform actions on a specific ride
 */
export async function authorizeRideAccess(
  socket: Socket,
  rideId: string,
  prisma: any
): Promise<{ authorized: boolean; ride?: any; error?: string }> {
  const socketData = socket.data as SocketData;

  if (!socketData || !socketData.userId) {
    return {
      authorized: false,
      error: 'Socket not authenticated',
    };
  }

  try {
    // Fetch ride with customer and driver info
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: { select: { id: true } },
        driver: { select: { id: true } },
      },
    });

    if (!ride) {
      return {
        authorized: false,
        error: 'Ride not found',
      };
    }

    // Check authorization based on role
    const isCustomer = socketData.role === 'CUSTOMER' && ride.customerId === socketData.userId;
    const isDriver = socketData.role === 'DRIVER' && ride.driverId === socketData.userId;
    const isAdmin = socketData.role === 'ADMIN';

    if (isCustomer || isDriver || isAdmin) {
      return {
        authorized: true,
        ride,
      };
    }

    return {
      authorized: false,
      error: 'Not authorized to access this ride',
    };
  } catch (error) {
    console.error('Error checking ride authorization:', error);
    return {
      authorized: false,
      error: 'Failed to check authorization',
    };
  }
}

/**
 * Validate driver can send location updates for a ride
 */
export async function validateDriverForRide(
  socket: Socket,
  rideId: string,
  driverId: string,
  prisma: any
): Promise<{ valid: boolean; error?: string }> {
  const socketData = socket.data as SocketData;

  // Must be a driver
  if (socketData.role !== 'DRIVER') {
    return {
      valid: false,
      error: 'Only drivers can send location updates',
    };
  }

  // Driver ID must match authenticated user
  if (socketData.userId !== driverId) {
    return {
      valid: false,
      error: 'Driver ID mismatch',
    };
  }

  try {
    // Verify ride exists and is assigned to this driver
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        driverId: driverId,
        status: {
          in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'],
        },
      },
    });

    if (!ride) {
      return {
        valid: false,
        error: 'Ride not found or not assigned to this driver',
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating driver for ride:', error);
    return {
      valid: false,
      error: 'Failed to validate driver',
    };
  }
}

/**
 * Rate limiting middleware for location updates
 *
 * Prevents spam by limiting update frequency per driver
 */
export class LocationUpdateRateLimiter {
  private lastUpdateTime: Map<string, number> = new Map();
  private minInterval: number;

  constructor(minIntervalMs: number = 1000) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Check if driver can send location update
   */
  canUpdate(driverId: string): boolean {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(driverId);

    if (!lastUpdate || now - lastUpdate >= this.minInterval) {
      this.lastUpdateTime.set(driverId, now);
      return true;
    }

    return false;
  }

  /**
   * Get time until next allowed update
   */
  getTimeUntilNextUpdate(driverId: string): number {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(driverId);

    if (!lastUpdate) {
      return 0;
    }

    const timeSinceLastUpdate = now - lastUpdate;
    return Math.max(0, this.minInterval - timeSinceLastUpdate);
  }

  /**
   * Clear rate limit for driver (e.g., on disconnect)
   */
  clear(driverId: string): void {
    this.lastUpdateTime.delete(driverId);
  }
}
