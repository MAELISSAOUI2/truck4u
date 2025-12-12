import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * Add a token to the blacklist
 * The token will be blocked until its natural expiration
 */
export async function blacklistToken(token: string, reason?: string): Promise<void> {
  try {
    // Decode token to get expiration
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const exp = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    // Only blacklist if token hasn't expired yet
    if (ttl > 0) {
      const key = `${BLACKLIST_PREFIX}${token}`;
      const data = JSON.stringify({
        userId: decoded.id,
        role: decoded.role,
        reason: reason || 'manual_revocation',
        blacklistedAt: new Date().toISOString()
      });

      // Set with TTL matching token expiration
      await redis.setex(key, ttl, data);
      console.log(`[TokenBlacklist] Token blacklisted for user ${decoded.id} (reason: ${reason})`);
    }
  } catch (error) {
    console.error('[TokenBlacklist] Error blacklisting token:', error);
    throw error;
  }
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const key = `${BLACKLIST_PREFIX}${token}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[TokenBlacklist] Error checking blacklist:', error);
    // Fail open: if Redis is down, don't block all requests
    return false;
  }
}

/**
 * Blacklist all tokens for a specific user
 * Useful when:
 * - Admin deactivates a user
 * - User changes password
 * - Security breach detected
 */
export async function blacklistAllUserTokens(
  userId: string,
  role: 'driver' | 'customer' | 'admin',
  reason?: string
): Promise<number> {
  try {
    // We can't enumerate all active tokens, so we use a user-specific blacklist
    // All subsequent auth checks will verify against this user blacklist
    const key = `${BLACKLIST_PREFIX}user:${role}:${userId}`;
    const data = JSON.stringify({
      reason: reason || 'all_tokens_revoked',
      blacklistedAt: new Date().toISOString()
    });

    // Set with 15 minute TTL (max access token lifetime)
    await redis.setex(key, 15 * 60, data);

    console.log(`[TokenBlacklist] All tokens for ${role} ${userId} blacklisted (reason: ${reason})`);
    return 1;
  } catch (error) {
    console.error('[TokenBlacklist] Error blacklisting user tokens:', error);
    throw error;
  }
}

/**
 * Check if all tokens for a user are blacklisted
 */
export async function isUserBlacklisted(
  userId: string,
  role: 'driver' | 'customer' | 'admin'
): Promise<boolean> {
  try {
    const key = `${BLACKLIST_PREFIX}user:${role}:${userId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[TokenBlacklist] Error checking user blacklist:', error);
    return false;
  }
}

/**
 * Remove a user from the blacklist (e.g., after password change confirmation)
 */
export async function removeUserBlacklist(
  userId: string,
  role: 'driver' | 'customer' | 'admin'
): Promise<void> {
  try {
    const key = `${BLACKLIST_PREFIX}user:${role}:${userId}`;
    await redis.del(key);
    console.log(`[TokenBlacklist] User ${role} ${userId} removed from blacklist`);
  } catch (error) {
    console.error('[TokenBlacklist] Error removing user blacklist:', error);
    throw error;
  }
}

/**
 * Get blacklist statistics (for monitoring)
 */
export async function getBlacklistStats(): Promise<{
  totalBlacklistedTokens: number;
  totalBlacklistedUsers: number;
}> {
  try {
    const tokenKeys = await redis.keys(`${BLACKLIST_PREFIX}*`);
    const userKeys = tokenKeys.filter(k => k.includes(':user:'));

    return {
      totalBlacklistedTokens: tokenKeys.length - userKeys.length,
      totalBlacklistedUsers: userKeys.length
    };
  } catch (error) {
    console.error('[TokenBlacklist] Error getting stats:', error);
    return { totalBlacklistedTokens: 0, totalBlacklistedUsers: 0 };
  }
}

/**
 * Clean up expired blacklist entries (maintenance task)
 * This is mostly automatic via Redis TTL, but useful for monitoring
 */
export async function cleanupBlacklist(): Promise<number> {
  try {
    const keys = await redis.keys(`${BLACKLIST_PREFIX}*`);
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // Key exists but has no TTL (shouldn't happen, but cleanup anyway)
        await redis.del(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[TokenBlacklist] Cleaned up ${cleaned} stale blacklist entries`);
    }

    return cleaned;
  } catch (error) {
    console.error('[TokenBlacklist] Error cleaning up blacklist:', error);
    return 0;
  }
}
