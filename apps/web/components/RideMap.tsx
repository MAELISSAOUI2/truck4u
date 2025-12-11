'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJ1Y2s0dSIsImEiOiJjbTEyMzQ1Njc4OTAxMmxxZjNkaDV6Z2huIn0.demo';

interface RideMapProps {
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    address: string;
  };
}

export default function RideMap({ pickup, dropoff }: RideMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [pickup.lng, pickup.lat],
      zoom: 12,
    });

    // Add pickup marker
    new mapboxgl.Marker({ color: '#228BE6' })
      .setLngLat([pickup.lng, pickup.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Départ</strong><br/>${pickup.address}`))
      .addTo(map.current);

    // Add dropoff marker
    new mapboxgl.Marker({ color: '#40C057' })
      .setLngLat([dropoff.lng, dropoff.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Arrivée</strong><br/>${dropoff.address}`))
      .addTo(map.current);

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([pickup.lng, pickup.lat]);
    bounds.extend([dropoff.lng, dropoff.lat]);
    map.current.fitBounds(bounds, { padding: 50 });

    // Draw route
    drawRoute();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [pickup, dropoff]);

  const drawRoute = async () => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const geojson = {
          type: 'Feature' as const,
          properties: {},
          geometry: data.routes[0].geometry,
        };

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson as any);
        } else {
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: { type: 'geojson', data: geojson as any },
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#228BE6', 'line-width': 5, 'line-opacity': 0.75 },
          });
        }
      }
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  };

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: 300, borderRadius: '8px' }}
    />
  );
}
