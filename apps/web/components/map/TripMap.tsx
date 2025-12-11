'use client';

/**
 * TripMap Component
 *
 * Interactive map component using MapLibre GL JS
 * Features:
 * - Display pickup and dropoff markers
 * - Show route between points
 * - Real-time driver location tracking
 * - Animated driver marker
 * - Auto-fit bounds
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, Marker, LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, Loader, Text } from '@mantine/core';
import type { Coordinate } from '@/types/geolocation';
import type { DriverLocationUpdate } from '@/types/realtime';

// ==========================================================================
// Types
// ==========================================================================

export interface TripMapProps {
  /** Map center (if no pickup/dropoff provided) */
  center?: Coordinate;

  /** Map zoom level */
  zoom?: number;

  /** Pickup location */
  pickup?: Coordinate;

  /** Dropoff location */
  dropoff?: Coordinate;

  /** Route geometry (GeoJSON LineString) */
  route?: GeoJSON.LineString;

  /** Real-time driver location */
  driverLocation?: DriverLocationUpdate;

  /** Map height */
  height?: string | number;

  /** Map style URL */
  styleUrl?: string;

  /** Show route line */
  showRoute?: boolean;

  /** Show markers */
  showMarkers?: boolean;

  /** Auto-fit bounds to show all markers */
  fitBounds?: boolean;

  /** Callback when map is loaded */
  onMapLoad?: (map: Map) => void;

  /** Callback when marker is clicked */
  onMarkerClick?: (type: 'pickup' | 'dropoff' | 'driver', location: Coordinate) => void;
}

// Default Tunisia center (Tunis)
const DEFAULT_CENTER: Coordinate = { lat: 36.8065, lng: 10.1815 };
const DEFAULT_ZOOM = 12;
const DEFAULT_STYLE = process.env.NEXT_PUBLIC_MAPLIBRE_STYLE || 'https://demotiles.maplibre.org/style.json';

// ==========================================================================
// Component
// ==========================================================================

export function TripMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  pickup,
  dropoff,
  route,
  driverLocation,
  height = '500px',
  styleUrl = DEFAULT_STYLE,
  showRoute = true,
  showMarkers = true,
  fitBounds = true,
  onMapLoad,
  onMarkerClick,
}: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const pickupMarkerRef = useRef<Marker | null>(null);
  const dropoffMarkerRef = useRef<Marker | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Initialize Map
  // ==========================================================================

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [center.lng, center.lat],
        zoom: zoom,
        attributionControl: true,
      });

      // Add navigation controls
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add scale control
      map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

      map.on('load', () => {
        setIsLoading(false);
        onMapLoad?.(map);
      });

      map.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map');
        setIsLoading(false);
      });

      mapRef.current = map;

      // Cleanup
      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  }, [center.lat, center.lng, zoom, styleUrl, onMapLoad]);

  // ==========================================================================
  // Pickup Marker
  // ==========================================================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickup || !showMarkers) return;

    // Remove existing marker
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
    }

    // Create pickup marker
    const el = document.createElement('div');
    el.className = 'pickup-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background-color: #228be6;
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    `;
    el.innerHTML = '📍';

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([pickup.lng, pickup.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          '<div style="padding: 8px;"><strong>Point de ramassage</strong></div>'
        )
      )
      .addTo(map);

    el.addEventListener('click', () => {
      onMarkerClick?.('pickup', pickup);
    });

    pickupMarkerRef.current = marker;

    return () => {
      marker.remove();
      pickupMarkerRef.current = null;
    };
  }, [pickup, showMarkers, onMarkerClick]);

  // ==========================================================================
  // Dropoff Marker
  // ==========================================================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dropoff || !showMarkers) return;

    // Remove existing marker
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
    }

    // Create dropoff marker
    const el = document.createElement('div');
    el.className = 'dropoff-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background-color: #fa5252;
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    `;
    el.innerHTML = '🎯';

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([dropoff.lng, dropoff.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          '<div style="padding: 8px;"><strong>Destination</strong></div>'
        )
      )
      .addTo(map);

    el.addEventListener('click', () => {
      onMarkerClick?.('dropoff', dropoff);
    });

    dropoffMarkerRef.current = marker;

    return () => {
      marker.remove();
      dropoffMarkerRef.current = null;
    };
  }, [dropoff, showMarkers, onMarkerClick]);

  // ==========================================================================
  // Driver Marker (Animated)
  // ==========================================================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverLocation) return;

    const { lat, lng, heading = 0, speed = 0 } = driverLocation;

    // Remove existing marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
    }

    // Create driver marker (truck icon with rotation)
    const el = document.createElement('div');
    el.className = 'driver-marker';
    el.style.cssText = `
      width: 50px;
      height: 50px;
      background-color: #37b24d;
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transform: rotate(${heading}deg);
      transition: transform 0.3s ease-out;
      z-index: 1000;
    `;
    el.innerHTML = '🚚';

    const marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
      .setLngLat([lng, lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <strong>Conducteur</strong><br/>
            <small>Vitesse: ${Math.round(speed)} km/h</small>
          </div>`
        )
      )
      .addTo(map);

    el.addEventListener('click', () => {
      onMarkerClick?.('driver', { lat, lng });
    });

    driverMarkerRef.current = marker;

    // Smooth camera movement to follow driver
    if (speed > 5) {
      // Only follow if driver is moving
      map.easeTo({
        center: [lng, lat],
        duration: 1000,
      });
    }

    return () => {
      marker.remove();
      driverMarkerRef.current = null;
    };
  }, [driverLocation, onMarkerClick]);

  // ==========================================================================
  // Route Layer
  // ==========================================================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || !showRoute) return;

    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      map.once('load', () => {
        addRouteLayer(map, route);
      });
    } else {
      addRouteLayer(map, route);
    }

    return () => {
      removeRouteLayer(map);
    };
  }, [route, showRoute]);

  // ==========================================================================
  // Auto-fit Bounds
  // ==========================================================================

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBounds || isLoading) return;

    const bounds: [number, number][] = [];

    if (pickup) bounds.push([pickup.lng, pickup.lat]);
    if (dropoff) bounds.push([dropoff.lng, dropoff.lat]);
    if (driverLocation) bounds.push([driverLocation.lng, driverLocation.lat]);

    if (bounds.length > 0) {
      // Calculate bounding box
      const lngLatBounds = bounds.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(bounds[0], bounds[0])
      );

      map.fitBounds(lngLatBounds as LngLatBoundsLike, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 1000,
      });
    }
  }, [pickup, dropoff, driverLocation, fitBounds, isLoading]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (error) {
    return (
      <Box
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <Text c="red">{error}</Text>
      </Box>
    );
  }

  return (
    <Box pos="relative" style={{ height }}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />

      {isLoading && (
        <Box
          pos="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: '8px',
          }}
        >
          <Loader size="lg" />
        </Box>
      )}
    </Box>
  );
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function addRouteLayer(map: Map, route: GeoJSON.LineString) {
  // Remove existing layers and sources
  removeRouteLayer(map);

  // Add source
  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: route,
    },
  });

  // Add route line layer
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#228be6',
      'line-width': 5,
      'line-opacity': 0.75,
    },
  });

  // Add route outline layer for better visibility
  map.addLayer({
    id: 'route-outline',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#ffffff',
      'line-width': 7,
      'line-opacity': 0.5,
    },
  }, 'route-line'); // Place outline below the main line
}

function removeRouteLayer(map: Map) {
  if (map.getLayer('route-line')) {
    map.removeLayer('route-line');
  }
  if (map.getLayer('route-outline')) {
    map.removeLayer('route-outline');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
  }
}
