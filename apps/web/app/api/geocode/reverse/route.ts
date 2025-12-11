/**
 * API Route: GET /api/geocode/reverse
 *
 * Reverse geocoding - Convert coordinates to address with Redis caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { reverse, getReverseCacheKey } from '@/lib/services/geocoding/peliasClient';
import { getOrSetCached, CACHE_TTL, getReverseGeocodeKey } from '@/lib/utils/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Validate required params
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Query parameters "lat" and "lng" are required' },
        { status: 400 }
      );
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = getReverseGeocodeKey(latNum, lngNum);

    // Get or fetch with caching
    const { data: result, cached } = await getOrSetCached(
      cacheKey,
      async () => {
        const res = await reverse(latNum, lngNum);
        if (!res) {
          throw new Error('No results found for coordinates');
        }
        return res;
      },
      CACHE_TTL.GEOCODING
    );

    return NextResponse.json({
      result,
      cached,
    });
  } catch (error: any) {
    console.error('[API] Reverse geocoding error:', error);

    if (error.message === 'No results found for coordinates') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
