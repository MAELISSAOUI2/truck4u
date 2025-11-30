/**
 * API Route: POST /api/routing/route
 *
 * Get route from OSRM with distance, duration, and geometry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRoute, getRouteCacheKey } from '@/lib/services/routing/osrmClient';
import type { RouteRequest } from '@/types/geolocation';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const RouteRequestSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  dropoff: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  waypoints: z.array(
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
  ).optional(),
  profile: z.enum(['car', 'truck', 'foot']).optional(),
  alternatives: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validated = RouteRequestSchema.parse(body);

    // TODO: Check Redis cache first
    // const cacheKey = getRouteCacheKey(
    //   validated.pickup,
    //   validated.dropoff,
    //   validated.profile || 'car',
    //   validated.waypoints
    // );

    // Call OSRM
    const routeResponse = await getRoute(validated as RouteRequest);

    // TODO: Store in cache

    return NextResponse.json({
      ...routeResponse,
      cached: false,
    });
  } catch (error: any) {
    console.error('[API] Routing error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
