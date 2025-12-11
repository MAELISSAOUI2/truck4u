/**
 * OSRM Routing Client
 *
 * Provides clean abstraction over OSRM routing service
 * with support for routes, alternatives, and distance matrix.
 */

import type { Coordinate, Route, RouteRequest, RouteResponse, RouteWaypoint } from '@/types/geolocation';
import { decode as decodePolyline } from '@/lib/utils/polyline';

const OSRM_URL = process.env.NEXT_PUBLIC_OSRM_URL || 'http://localhost:5000';
const DEFAULT_PROFILE = process.env.OSRM_PROFILE || 'car';  // car, truck, foot

/**
 * Get route from OSRM
 *
 * @param request - Route request with pickup, dropoff, and options
 * @returns Route with geometry, distance, and duration
 */
export async function getRoute(request: RouteRequest): Promise<RouteResponse> {
  const { pickup, dropoff, waypoints = [], profile = DEFAULT_PROFILE as any, alternatives = false } = request;

  // Build coordinates array: [pickup, ...waypoints, dropoff]
  const coordinates = [
    pickup,
    ...waypoints,
    dropoff,
  ];

  // Format coordinates as "lng,lat;lng,lat;..."
  const coordsString = coordinates
    .map((coord) => `${coord.lng},${coord.lat}`)
    .join(';');

  // Build OSRM URL
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'polyline6',  // More precise than polyline5
    steps: 'true',
    annotations: 'true',
  });

  if (alternatives) {
    params.append('alternatives', 'true');
    params.append('number_of_alternatives', '2');
  }

  const url = `${OSRM_URL}/route/v1/${profile}/${coordsString}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`OSRM request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM returned no routes: ${data.message || 'Unknown error'}`);
    }

    // Transform OSRM routes to our format
    const mainRoute = transformOSRMRoute(data.routes[0]);

    const alternativeRoutes = alternatives && data.routes.length > 1
      ? data.routes.slice(1).map(transformOSRMRoute)
      : undefined;

    return {
      route: mainRoute,
      alternatives: alternativeRoutes,
    };
  } catch (error) {
    console.error('[OSRM] Route error:', error);
    throw error;
  }
}

/**
 * Get distance matrix between multiple points
 * Useful for driver-to-pickup distance calculations
 *
 * @param sources - Array of source coordinates (e.g., driver locations)
 * @param destinations - Array of destination coordinates (e.g., pickup points)
 */
export async function getDistanceMatrix(
  sources: Coordinate[],
  destinations: Coordinate[],
  profile: string = DEFAULT_PROFILE
): Promise<{
  distances: number[][];  // Matrix[i][j] = distance from source[i] to dest[j] in meters
  durations: number[][];  // Matrix[i][j] = duration from source[i] to dest[j] in seconds
}> {
  // Combine all coordinates
  const allCoords = [...sources, ...destinations];
  const coordsString = allCoords
    .map((coord) => `${coord.lng},${coord.lat}`)
    .join(';');

  // Source indices are 0..sources.length-1
  // Destination indices are sources.length..sources.length+destinations.length-1
  const sourceIndices = Array.from({ length: sources.length }, (_, i) => i).join(';');
  const destIndices = Array.from(
    { length: destinations.length },
    (_, i) => i + sources.length
  ).join(';');

  const params = new URLSearchParams({
    sources: sourceIndices,
    destinations: destIndices,
  });

  const url = `${OSRM_URL}/table/v1/${profile}/${coordsString}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`OSRM table request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM table error: ${data.message || 'Unknown error'}`);
    }

    return {
      distances: data.distances || [],
      durations: data.durations || [],
    };
  } catch (error) {
    console.error('[OSRM] Distance matrix error:', error);
    throw error;
  }
}

/**
 * Calculate simple distance between two points
 * Convenience wrapper around getRoute for single point-to-point
 */
export async function getDistance(
  from: Coordinate,
  to: Coordinate,
  profile: string = DEFAULT_PROFILE
): Promise<{ distance: number; duration: number }> {
  const routeResponse = await getRoute({
    pickup: from,
    dropoff: to,
    profile: profile as any,
    alternatives: false,
  });

  return {
    distance: routeResponse.route.distance,
    duration: routeResponse.route.duration,
  };
}

/**
 * Transform OSRM route to our Route format
 */
function transformOSRMRoute(osrmRoute: any): Route {
  // Decode polyline6 geometry
  const geometry = decodePolyline6(osrmRoute.geometry);

  // Extract waypoints from legs
  const waypoints: RouteWaypoint[] = [];
  let cumulativeDistance = 0;
  let cumulativeDuration = 0;

  if (osrmRoute.legs && osrmRoute.legs.length > 0) {
    osrmRoute.legs.forEach((leg: any, legIndex: number) => {
      // Add waypoint at start of each leg
      if (leg.steps && leg.steps.length > 0) {
        const firstStep = leg.steps[0];
        waypoints.push({
          lat: firstStep.maneuver.location[1],
          lng: firstStep.maneuver.location[0],
          name: firstStep.name || `Waypoint ${legIndex + 1}`,
          distance: cumulativeDistance,
          duration: cumulativeDuration,
        });
      }

      cumulativeDistance += leg.distance;
      cumulativeDuration += leg.duration;
    });

    // Add final destination waypoint
    const lastLeg = osrmRoute.legs[osrmRoute.legs.length - 1];
    if (lastLeg.steps && lastLeg.steps.length > 0) {
      const lastStep = lastLeg.steps[lastLeg.steps.length - 1];
      waypoints.push({
        lat: lastStep.maneuver.location[1],
        lng: lastStep.maneuver.location[0],
        name: 'Destination',
        distance: cumulativeDistance,
        duration: cumulativeDuration,
      });
    }
  }

  return {
    geometry,
    distance: osrmRoute.distance,  // meters
    duration: osrmRoute.duration,  // seconds
    waypoints,
  };
}

/**
 * Decode polyline6 format to GeoJSON LineString
 */
function decodePolyline6(encoded: string): GeoJSON.LineString {
  const coordinates = decodePolyline(encoded, 6).map(([lat, lng]) => [lng, lat]);

  return {
    type: 'LineString',
    coordinates,
  };
}

/**
 * Generate cache key for route
 */
export function getRouteCacheKey(
  pickup: Coordinate,
  dropoff: Coordinate,
  profile: string = DEFAULT_PROFILE,
  waypoints?: Coordinate[]
): string {
  const coords = [pickup, ...(waypoints || []), dropoff]
    .map((c) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`)
    .join('|');

  return `route:${profile}:${coords}`;
}
