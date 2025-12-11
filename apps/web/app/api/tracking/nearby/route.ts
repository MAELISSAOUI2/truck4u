/**
 * Nearby Drivers API Endpoint
 *
 * GET /api/tracking/nearby
 *
 * Find drivers near a location using Redis geospatial queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ==========================================================================
// Validation Schema
// ==========================================================================

const NearbyQuerySchema = z.object({
  lat: z.string().transform((val) => parseFloat(val)),
  lng: z.string().transform((val) => parseFloat(val)),
  radius: z
    .string()
    .optional()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  unit: z.enum(['m', 'km', 'mi', 'ft']).optional().default('m'),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10)),
});

// ==========================================================================
// GET Handler - Find Nearby Drivers
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const params = NearbyQuerySchema.parse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: searchParams.get('radius'),
      unit: searchParams.get('unit'),
      limit: searchParams.get('limit'),
    });

    // Validate coordinate ranges
    if (params.lat < -90 || params.lat > 90) {
      return NextResponse.json(
        { error: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (params.lng < -180 || params.lng > 180) {
      return NextResponse.json(
        { error: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    // TODO: Verify authorization
    // const token = request.headers.get('authorization')?.replace('Bearer ', '');
    // const user = await verifyToken(token);

    // TODO: Query Redis for nearby drivers
    // const redis = new Redis(process.env.REDIS_URL);
    //
    // const nearbyDrivers = await redis.georadius(
    //   'drivers:active',
    //   params.lng,
    //   params.lat,
    //   params.radius,
    //   params.unit,
    //   'WITHDIST',
    //   'WITHCOORD',
    //   'ASC',
    //   'COUNT',
    //   params.limit
    // );
    //
    // // Format: [[driverId, distance, [lng, lat]], ...]
    // const drivers = await Promise.all(
    //   nearbyDrivers.map(async ([driverId, distance, [lng, lat]]) => {
    //     // Fetch driver details from cache or database
    //     const locationKey = `driver:${driverId}:location`;
    //     const cachedLocation = await redis.get(locationKey);
    //
    //     let location = null;
    //     if (cachedLocation) {
    //       location = JSON.parse(cachedLocation);
    //     }
    //
    //     return {
    //       driverId,
    //       distance: parseFloat(distance),
    //       position: {
    //         lat: parseFloat(lat),
    //         lng: parseFloat(lng),
    //       },
    //       location,
    //     };
    //   })
    // );

    console.log(
      `🔍 Searching for drivers near [${params.lat.toFixed(4)}, ${params.lng.toFixed(4)}] within ${params.radius}${params.unit}`
    );

    // Temporary mock response
    return NextResponse.json({
      success: true,
      query: {
        center: { lat: params.lat, lng: params.lng },
        radius: params.radius,
        unit: params.unit,
      },
      drivers: [], // TODO: Replace with actual Redis query
      count: 0,
      message: 'TODO: Implement Redis GEORADIUS query',
    });
  } catch (error) {
    console.error('Nearby drivers error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to find nearby drivers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ==========================================================================
// POST Handler - Update Driver Availability Zone
// ==========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      driverId: z.string().uuid(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      isAvailable: z.boolean(),
    });

    const validated = schema.parse(body);

    // TODO: Verify authorization (driver only)
    // const token = request.headers.get('authorization')?.replace('Bearer ', '');
    // const user = await verifyToken(token);
    // if (user.id !== validated.driverId || user.role !== 'DRIVER') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // TODO: Update Redis geo index
    // const redis = new Redis(process.env.REDIS_URL);
    //
    // if (validated.isAvailable) {
    //   // Add to available drivers index
    //   await redis.geoadd(
    //     'drivers:available',
    //     validated.lng,
    //     validated.lat,
    //     validated.driverId
    //   );
    //   await redis.expire('drivers:available', 86400); // 24 hours
    // } else {
    //   // Remove from available drivers index
    //   await redis.zrem('drivers:available', validated.driverId);
    // }

    console.log(
      `📍 Driver ${validated.driverId} availability updated: ${validated.isAvailable ? 'available' : 'unavailable'}`
    );

    return NextResponse.json({
      success: true,
      message: `Driver ${validated.isAvailable ? 'marked as available' : 'removed from available drivers'}`,
    });
  } catch (error) {
    console.error('Update availability error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update availability',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
