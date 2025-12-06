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
 * Falls back to Nominatim (OSM) if Pelias fails or has no data
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

  // TEMPORARILY DISABLED: Skip Pelias and go directly to Nominatim
  // This is because Pelias has no imported data yet
  console.log('[Pelias] Skipped (no data), using Nominatim directly');

  // Fallback to Nominatim search
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      addressdetails: '1',
      limit: (options?.limit || 10).toString(), // Augmenté à 10 résultats
      countrycodes: 'tn', // Focus on Tunisia
      'accept-language': 'fr', // Prefer French results
      dedupe: '1', // Dédupliquer les résultats similaires
    });

    // Add proximity bias (viewbox) if coordinates provided
    if (options?.lat !== undefined && options?.lng !== undefined) {
      // Create a viewbox around the user's location (roughly 100km radius)
      const latDelta = 1.0;
      const lngDelta = 1.0;
      const viewbox = `${options.lng - lngDelta},${options.lat + latDelta},${options.lng + lngDelta},${options.lat - latDelta}`;
      params.append('viewbox', viewbox);
      // Don't use bounded=1, it's too restrictive
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Truck4u/1.0',
          'Accept-Language': 'fr,en', // Prefer French, fallback to English
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim search failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Transform Nominatim results to our format
    return data.map((item: any) => {
      const addr = item.address || {};

      // Build cleaner address label
      const parts = [];
      if (addr.house_number && addr.road) {
        parts.push(`${addr.house_number} ${addr.road}`);
      } else if (addr.road) {
        parts.push(addr.road);
      } else if (addr.neighbourhood) {
        parts.push(addr.neighbourhood);
      } else if (item.name && item.name !== addr.city) {
        parts.push(item.name);
      }

      const city = addr.city || addr.town || addr.village || addr.suburb;
      if (city) {
        parts.push(city);
      }

      const label = parts.length > 0 ? parts.join(', ') : item.display_name;

      return {
        id: item.place_id ? item.place_id.toString() : '',
        label,
        address: label,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: determineTypeFromOSM(item.type, item.class),
        confidence: item.importance || 0.5,
        bounds: item.boundingbox ? {
          minLat: parseFloat(item.boundingbox[0]),
          maxLat: parseFloat(item.boundingbox[1]),
          minLng: parseFloat(item.boundingbox[2]),
          maxLng: parseFloat(item.boundingbox[3]),
        } : undefined,
      };
    });
  } catch (error) {
    console.error('[Nominatim] Autocomplete error:', error);
    return []; // Return empty array instead of throwing for autocomplete
  }
}

/**
 * Determine result type from OSM class/type
 */
function determineTypeFromOSM(osmType: string, osmClass: string): GeocodingResult['type'] {
  if (osmClass === 'building' || osmType === 'house') return 'address';
  if (osmClass === 'highway' || osmType === 'road') return 'street';
  if (osmClass === 'amenity' || osmClass === 'shop') return 'venue';
  if (osmClass === 'place' && (osmType === 'city' || osmType === 'town' || osmType === 'village')) return 'locality';
  if (osmClass === 'boundary' && osmType === 'administrative') return 'region';
  return 'address';
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
 * Falls back to Nominatim (OSM) if Pelias fails or has no data
 *
 * @param lat - Latitude
 * @param lng - Longitude
 */
export async function reverse(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!isValidCoordinate(lat, lng)) {
    throw new Error('Invalid coordinates');
  }

  // TEMPORARILY DISABLED: Skip Pelias and go directly to Nominatim
  // This is because Pelias has no imported data yet
  console.log('[Pelias] Skipped (no data), using Nominatim directly');

  // Fallback to Nominatim (OpenStreetMap)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=fr`,
      {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Truck4u/1.0', // Required by Nominatim usage policy
          'Accept-Language': 'fr,en',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim reverse failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return null;
    }

    const addr = data.address || {};
    const street = addr.road || addr.street || addr.pedestrian;
    const housenumber = addr.house_number;
    const locality = addr.city || addr.town || addr.village || addr.suburb || addr.neighbourhood;
    const region = addr.state || addr.province || addr.county;

    // Format address in French/Latin script (avoid Arabic)
    const addressParts = [];

    if (housenumber && street) {
      addressParts.push(`${housenumber} ${street}`);
    } else if (street) {
      addressParts.push(street);
    } else if (addr.neighbourhood) {
      addressParts.push(addr.neighbourhood);
    }

    if (locality && locality !== street) {
      addressParts.push(locality);
    }

    if (region && region !== locality) {
      addressParts.push(region);
    }

    if (addr.postcode) {
      addressParts.push(addr.postcode);
    }

    const formattedAddress = addressParts.length > 0
      ? addressParts.join(', ')
      : (locality || region || 'Tunisie');

    return {
      address: formattedAddress,
      placeId: data.place_id ? data.place_id.toString() : '',
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      components: {
        street,
        housenumber,
        locality,
        region,
        postalcode: addr.postcode,
        country: 'Tunisie',
      },
    };
  } catch (error) {
    console.error('[Nominatim] Reverse geocoding error:', error);
    throw new Error('Both Pelias and Nominatim reverse geocoding failed');
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
