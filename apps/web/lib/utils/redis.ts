/**
 * Redis Utilities
 *
 * Shared Redis client and caching utilities for Next.js API routes
 */

import Redis from 'ioredis';

// ==========================================================================
// Redis Client Singleton
// ==========================================================================

let redis: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (redis) {
    return redis;
  }

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Only reconnect when the error contains "READONLY"
        return true;
      }
      return false;
    },
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  return redis;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// ==========================================================================
// Cache Configuration
// ==========================================================================

export const CACHE_TTL = {
  /** 1 hour for geocoding results */
  GEOCODING: 3600,

  /** 6 hours for routing results */
  ROUTING: 21600,

  /** 5 minutes for driver locations */
  DRIVER_LOCATION: 300,

  /** 15 minutes for price estimates */
  PRICE_ESTIMATE: 900,

  /** 24 hours for static data */
  STATIC: 86400,
} as const;

// ==========================================================================
// Caching Functions
// ==========================================================================

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const cached = await client.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`Error getting cached value for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.STATIC
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting cached value for key ${key}:`, error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`Error deleting cached value for key ${key}:`, error);
  }
}

/**
 * Delete cached values matching pattern
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error(`Error deleting cached pattern ${pattern}:`, error);
  }
}

/**
 * Check if key exists in cache
 */
export async function hasCached(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Error checking cache existence for key ${key}:`, error);
    return false;
  }
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function getOrSetCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.STATIC
): Promise<{ data: T; cached: boolean }> {
  // Try to get from cache
  const cached = await getCached<T>(key);

  if (cached !== null) {
    return { data: cached, cached: true };
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Store in cache
  await setCached(key, fresh, ttl);

  return { data: fresh, cached: false };
}

// ==========================================================================
// Cache Key Generators
// ==========================================================================

/**
 * Generate cache key for geocoding autocomplete
 */
export function getGeocodingAutocompleteKey(
  query: string,
  lat?: number,
  lng?: number,
  limit?: number
): string {
  const proximity = lat && lng ? `${lat.toFixed(4)},${lng.toFixed(4)}` : 'none';
  return `geocoding:autocomplete:${query}:${proximity}:${limit || 5}`;
}

/**
 * Generate cache key for reverse geocoding
 */
export function getReverseGeocodeKey(lat: number, lng: number): string {
  return `geocoding:reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Generate cache key for route
 */
export function getRouteKey(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  profile: string,
  alternatives: boolean
): string {
  const pickupStr = `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}`;
  const dropoffStr = `${dropoff.lat.toFixed(4)},${dropoff.lng.toFixed(4)}`;
  return `routing:route:${profile}:${pickupStr}:${dropoffStr}:${alternatives}`;
}

/**
 * Generate cache key for price estimate
 */
export function getPriceEstimateKey(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  vehicleType: string,
  tripType: string,
  trafficLevel: string
): string {
  const pickupStr = `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}`;
  const dropoffStr = `${dropoff.lat.toFixed(4)},${dropoff.lng.toFixed(4)}`;
  return `pricing:estimate:${vehicleType}:${tripType}:${trafficLevel}:${pickupStr}:${dropoffStr}`;
}

// ==========================================================================
// Redis Pub/Sub Utilities
// ==========================================================================

/**
 * Publish message to channel
 */
export async function publish(channel: string, message: any): Promise<void> {
  try {
    const client = getRedisClient();
    await client.publish(channel, JSON.stringify(message));
  } catch (error) {
    console.error(`Error publishing to channel ${channel}:`, error);
  }
}

/**
 * Subscribe to channel
 */
export async function subscribe(
  channel: string,
  callback: (message: any) => void
): Promise<Redis> {
  const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  subscriber.subscribe(channel);

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const parsed = JSON.parse(message);
        callback(parsed);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });

  return subscriber;
}

// ==========================================================================
// Health Check
// ==========================================================================

/**
 * Check Redis connection health
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
