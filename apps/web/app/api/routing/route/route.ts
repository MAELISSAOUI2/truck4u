/**
 * API Route: POST /api/routing/route
 *
 * Get route from OSRM with distance, duration, and geometry with Redis caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRoute, getRouteCacheKey } from '@/lib/services/routing/osrmClient';
import type { RouteRequest } from '@/types/geolocation';
import { getOrSetCached, CACHE_TTL, getRouteKey } from '@/lib/utils/redis';
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

    // Generate cache key
    const cacheKey = getRouteKey(
      validated.pickup,
      validated.dropoff,
      validated.profile || 'car',
      validated.alternatives || false
    );

    // Get or fetch with caching (only cache if no waypoints and no alternatives)
    const shouldCache = !validated.waypoints && !validated.alternatives;

    let routeResponse;
    let cached = false;

    if (shouldCache) {
      const result = await getOrSetCached(
        cacheKey,
        () => getRoute(validated as RouteRequest),
        CACHE_TTL.ROUTING
      );
      routeResponse = result.data;
      cached = result.cached;
    } else {
      // Don't cache complex routes (with waypoints or alternatives)
      routeResponse = await getRoute(validated as RouteRequest);
    }

    return NextResponse.json({
      ...routeResponse,
      cached,
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
