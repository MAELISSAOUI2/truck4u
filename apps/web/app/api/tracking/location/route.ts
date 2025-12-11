/**
 * Driver Location Update API Endpoint
 *
 * POST /api/tracking/location
 *
 * HTTP endpoint for driver location updates (fallback when WebSocket unavailable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ==========================================================================
// Validation Schema
// ==========================================================================

const LocationUpdateSchema = z.object({
  rideId: z.string().uuid('Invalid ride ID'),
  driverId: z.string().uuid('Invalid driver ID'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().min(0).optional(),
  timestamp: z.number().positive(),
});

const BatchLocationUpdateSchema = z.object({
  updates: z.array(LocationUpdateSchema).min(1).max(10),
});

// ==========================================================================
// POST Handler - Single Location Update
// ==========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if batch or single update
    const isBatch = 'updates' in body;

    if (isBatch) {
      return handleBatchUpdate(body);
    } else {
      return handleSingleUpdate(body);
    }
  } catch (error) {
    console.error('Location update error:', error);

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
        error: 'Failed to update location',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ==========================================================================
// Single Update Handler
// ==========================================================================

async function handleSingleUpdate(body: unknown) {
  const validated = LocationUpdateSchema.parse(body);

  // TODO: Verify JWT token and driver authorization
  // const token = request.headers.get('authorization')?.replace('Bearer ', '');
  // const user = await verifyToken(token);
  // if (user.id !== validated.driverId || user.role !== 'DRIVER') {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // TODO: Store location in Redis
  // const redis = new Redis(process.env.REDIS_URL);
  // await redis.setex(
  //   `driver:${validated.driverId}:location`,
  //   300, // 5 minutes
  //   JSON.stringify(validated)
  // );

  // TODO: Update Redis geo index
  // await redis.geoadd('drivers:active', validated.lng, validated.lat, validated.driverId);

  // TODO: Broadcast to Socket.IO if available
  // const io = getSocketServer();
  // io.to(`trip:${validated.rideId}`).emit('driver:location', validated);

  console.log(`📍 Location updated for driver ${validated.driverId}:`, {
    lat: validated.lat.toFixed(4),
    lng: validated.lng.toFixed(4),
    speed: validated.speed,
  });

  return NextResponse.json({
    success: true,
    message: 'Location updated successfully',
    timestamp: Date.now(),
  });
}

// ==========================================================================
// Batch Update Handler
// ==========================================================================

async function handleBatchUpdate(body: unknown) {
  const validated = BatchLocationUpdateSchema.parse(body);

  // TODO: Implement batch update logic with Redis pipeline
  // const redis = new Redis(process.env.REDIS_URL);
  // const pipeline = redis.pipeline();
  //
  // for (const update of validated.updates) {
  //   pipeline.setex(
  //     `driver:${update.driverId}:location`,
  //     300,
  //     JSON.stringify(update)
  //   );
  //   pipeline.geoadd('drivers:active', update.lng, update.lat, update.driverId);
  // }
  //
  // await pipeline.exec();

  console.log(`📍 Batch location update: ${validated.updates.length} locations`);

  return NextResponse.json({
    success: true,
    message: `${validated.updates.length} locations updated successfully`,
    processed: validated.updates.length,
    timestamp: Date.now(),
  });
}

// ==========================================================================
// GET Handler - Get Driver's Latest Location
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const rideId = searchParams.get('rideId');

    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId is required' },
        { status: 400 }
      );
    }

    // TODO: Verify authorization
    // const token = request.headers.get('authorization')?.replace('Bearer ', '');
    // const user = await verifyToken(token);
    // Verify user can access this ride

    // TODO: Fetch from Redis
    // const redis = new Redis(process.env.REDIS_URL);
    // const location = await redis.get(`driver:${driverId}:location`);
    //
    // if (!location) {
    //   return NextResponse.json(
    //     { error: 'Location not found' },
    //     { status: 404 }
    //   );
    // }
    //
    // return NextResponse.json({
    //   success: true,
    //   location: JSON.parse(location),
    // });

    // Temporary mock response
    return NextResponse.json({
      success: true,
      location: null,
      message: 'TODO: Implement Redis lookup',
    });
  } catch (error) {
    console.error('Get location error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get location',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ==========================================================================
// DELETE Handler - Clear Driver Location (on trip completion)
// ==========================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId is required' },
        { status: 400 }
      );
    }

    // TODO: Verify authorization (driver or admin only)
    // const token = request.headers.get('authorization')?.replace('Bearer ', '');
    // const user = await verifyToken(token);

    // TODO: Clear from Redis
    // const redis = new Redis(process.env.REDIS_URL);
    // await redis.del(`driver:${driverId}:location`);
    // await redis.zrem('drivers:active', driverId);

    console.log(`🗑️ Location cleared for driver ${driverId}`);

    return NextResponse.json({
      success: true,
      message: 'Location cleared successfully',
    });
  } catch (error) {
    console.error('Clear location error:', error);

    return NextResponse.json(
      {
        error: 'Failed to clear location',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
