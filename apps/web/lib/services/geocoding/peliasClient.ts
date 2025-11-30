/**
 * Pelias Geocoding Client
 *
 * Provides clean abstraction over Pelias geocoding service
 * with optional Redis caching for performance.
 */

import type { GeocodingResult, ReverseGeocodeResult } from '@/types/geolocation';

const PELIAS_URL = process.env.NEXT_PUBLIC_PELIAS_URL || 'http://localhost:4000';
const PELIAS_API_KEY = process.env.PELIAS_API_KEY;

// Cache TTLs
const AUTOCOMPLETE_CACHE_TTL = 3600; // 1 hour
const REVERSE_CACHE_TTL = 86400;     // 24 hours

/**
 * Autocomplete address search
 *
 * @param query - Search query
 * @param options - Optional parameters for proximity bias and limits
 */
export async function autocomplete(
  query: string,
  options?: {
    lat?: number;
    lng?: number;
    limit?: number;
    sources?: string;  // e.g., 'osm,oa,wof'
  }
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Build URL with query parameters
  const params = new URLSearchParams({
    text: query.trim(),
    size: (options?.limit || 5).toString(),
  });

  // Add focus point for proximity bias
  if (options?.lat !== undefined && options?.lng !== undefined) {
    params.append('focus.point.lat', options.lat.toString());
    params.append('focus.point.lon', options.lng.toString());
  }

  // Add sources filter
  if (options?.sources) {
    params.append('sources', options.sources);
  }

  // Add API key if configured
  if (PELIAS_API_KEY) {
    params.append('api_key', PELIAS_API_KEY);
  }

  try {
    const response = await fetch(`${PELIAS_URL}/v1/autocomplete?${params.toString()}`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`Pelias autocomplete failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Pelias response to our format
    return transformPeliasFeatures(data.features || []);
  } catch (error) {
    console.error('[Pelias] Autocomplete error:', error);
    throw error;
  }
}

/**
 * Forward geocoding - Convert address to coordinates
 *
 * @param address - Address string to geocode
 */
export async function forward(address: string): Promise<GeocodingResult[]> {
  if (!address || address.trim().length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    text: address.trim(),
    size: '5',
  });

  if (PELIAS_API_KEY) {
    params.append('api_key', PELIAS_API_KEY);
  }

  try {
    const response = await fetch(`${PELIAS_URL}/v1/search?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Pelias search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return transformPeliasFeatures(data.features || []);
  } catch (error) {
    console.error('[Pelias] Forward geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocoding - Convert coordinates to address
 *
 * @param lat - Latitude
 * @param lng - Longitude
 */
export async function reverse(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!isValidCoordinate(lat, lng)) {
    throw new Error('Invalid coordinates');
  }

  const params = new URLSearchParams({
    'point.lat': lat.toString(),
    'point.lon': lng.toString(),
    size: '1',
  });

  if (PELIAS_API_KEY) {
    params.append('api_key', PELIAS_API_KEY);
  }

  try {
    const response = await fetch(`${PELIAS_URL}/v1/reverse?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Pelias reverse failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const props = feature.properties;

    return {
      address: formatAddress(props),
      placeId: feature.properties.id || feature.properties.gid || '',
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      components: {
        street: props.street,
        housenumber: props.housenumber,
        locality: props.locality,
        region: props.region,
        postalcode: props.postalcode,
        country: props.country,
      },
    };
  } catch (error) {
    console.error('[Pelias] Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Transform Pelias GeoJSON features to our GeocodingResult format
 */
function transformPeliasFeatures(features: any[]): GeocodingResult[] {
  return features.map((feature) => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;

    // Determine type from layer
    let type: GeocodingResult['type'] = 'address';
    if (props.layer === 'venue') type = 'venue';
    else if (props.layer === 'street') type = 'street';
    else if (props.layer === 'locality') type = 'locality';
    else if (props.layer === 'region') type = 'region';

    // Extract bounds if available
    let bounds: GeocodingResult['bounds'] | undefined;
    if (feature.bbox && feature.bbox.length === 4) {
      bounds = {
        minLng: feature.bbox[0],
        minLat: feature.bbox[1],
        maxLng: feature.bbox[2],
        maxLat: feature.bbox[3],
      };
    }

    return {
      id: props.id || props.gid || '',
      label: props.label || formatAddress(props),
      address: formatAddress(props),
      lat: coords[1],
      lng: coords[0],
      type,
      confidence: props.confidence || 0.5,
      bounds,
    };
  });
}

/**
 * Format address from Pelias properties
 */
function formatAddress(props: any): string {
  const parts: string[] = [];

  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name) {
    parts.push(props.name);
  }

  if (props.locality) parts.push(props.locality);
  if (props.region) parts.push(props.region);
  if (props.country) parts.push(props.country);

  return parts.join(', ') || 'Unknown location';
}

/**
 * Validate coordinates
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Generate cache key for autocomplete
 */
export function getAutocompleteCacheKey(query: string, options?: { lat?: number; lng?: number }): string {
  const normalized = query.trim().toLowerCase();
  const proximity = options?.lat && options?.lng ? `${options.lat.toFixed(4)},${options.lng.toFixed(4)}` : 'none';
  return `geocode:autocomplete:${normalized}:${proximity}`;
}

/**
 * Generate cache key for reverse geocoding
 */
export function getReverseCacheKey(lat: number, lng: number): string {
  return `geocode:reverse:${lat.toFixed(6)}:${lng.toFixed(6)}`;
}
