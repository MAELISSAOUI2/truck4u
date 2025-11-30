/**
 * API Route: GET /api/geocode/reverse
 *
 * Reverse geocoding - Convert coordinates to address
 */

import { NextRequest, NextResponse } from 'next/server';
import { reverse, getReverseCacheKey } from '@/lib/services/geocoding/peliasClient';

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

    // TODO: Add Redis caching here
    // const cacheKey = getReverseCacheKey(latNum, lngNum);
    // Check cache first

    // Call Pelias
    const result = await reverse(latNum, lngNum);

    if (!result) {
      return NextResponse.json(
        { error: 'No results found for coordinates' },
        { status: 404 }
      );
    }

    // TODO: Store in cache

    return NextResponse.json({
      result,
      cached: false,
    });
  } catch (error: any) {
    console.error('[API] Reverse geocoding error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
