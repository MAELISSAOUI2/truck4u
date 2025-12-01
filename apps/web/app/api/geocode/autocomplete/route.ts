/**
 * API Route: GET /api/geocode/autocomplete
 *
 * Autocomplete address search with Redis caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { autocomplete, getAutocompleteCacheKey } from '@/lib/services/geocoding/peliasClient';
import { getOrSetCached, CACHE_TTL, getGeocodingAutocompleteKey } from '@/lib/utils/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const limit = searchParams.get('limit');

    // Validate required params
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Parse optional parameters
    const options: {
      lat?: number;
      lng?: number;
      limit?: number;
    } = {};

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        options.lat = latNum;
        options.lng = lngNum;
      }
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 20) {
        options.limit = limitNum;
      }
    }

    // Generate cache key
    const cacheKey = getGeocodingAutocompleteKey(
      query,
      options.lat,
      options.lng,
      options.limit
    );

    // Get or fetch with caching
    const { data: results, cached } = await getOrSetCached(
      cacheKey,
      () => autocomplete(query, options),
      CACHE_TTL.GEOCODING
    );

    return NextResponse.json({
      results,
      cached,
    });
  } catch (error: any) {
    console.error('[API] Autocomplete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
