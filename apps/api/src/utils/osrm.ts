/**
 * OSRM (Open Source Routing Machine) Utility
 * Calculates routes, distances, and durations for vehicle routing
 */

const OSRM_URL = process.env.OSRM_URL || 'http://router.project-osrm.org';

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry?: any;   // GeoJSON LineString
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

/**
 * Calculate route between two points using OSRM
 * @param fromLat - Starting latitude
 * @param fromLng - Starting longitude
 * @param toLat - Destination latitude
 * @param toLng - Destination longitude
 * @returns Route with distance (m) and duration (s)
 */
export async function calculateRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<OSRMRoute> {
  try {
    const url = `${OSRM_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false&geometries=geojson`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    return data.routes[0];
  } catch (error) {
    console.error('[OSRM] Route calculation error:', error);

    // Fallback: Calculate straight-line distance (Haversine)
    const distance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
    const duration = (distance / 1000) * 120; // Assume 30 km/h average in city

    return {
      distance,
      duration,
    };
  }
}

/**
 * Calculate straight-line distance between two points (Haversine formula)
 * @returns Distance in meters
 */
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate route with multiple waypoints
 */
export async function calculateRouteWithWaypoints(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<OSRMRoute> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required');
  }

  try {
    const coords = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
    const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=false&geometries=geojson`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    return data.routes[0];
  } catch (error) {
    console.error('[OSRM] Multi-waypoint route error:', error);
    throw error;
  }
}
