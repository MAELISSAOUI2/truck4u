'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RideTrackingMapProps {
  pickup: { lat: number; lng: number; address?: string };
  dropoff: { lat: number; lng: number; address?: string };
  driverLocation?: { lat: number; lng: number } | null;
  onDriverLocationUpdate?: (location: { lat: number; lng: number }) => void;
  height?: string;
  showRoute?: boolean;
}

export default function RideTrackingMap({
  pickup,
  dropoff,
  driverLocation,
  onDriverLocationUpdate,
  height = '400px',
  showRoute = true
}: RideTrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView([pickup.lat, pickup.lng], 13);

    // Add OpenStreetMap tiles (free!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Add/update markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Green marker for pickup
    const greenIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Red marker for dropoff
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add/update pickup marker
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: greenIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>📍 Départ</b><br>' + (pickup.address || ''));
    }

    // Add/update dropoff marker
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
    } else {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], { icon: redIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>🏁 Arrivée</b><br>' + (dropoff.address || ''));
    }

    // Fit bounds to show both markers
    const bounds = L.latLngBounds([
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng]
    ]);

    // If driver location exists, include it in bounds
    if (driverLocation) {
      bounds.extend([driverLocation.lat, driverLocation.lng]);
    }

    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [pickup, dropoff, mapReady]);

  // Update driver marker (blue) - real-time tracking
  useEffect(() => {
    if (!mapRef.current || !mapReady || !driverLocation) return;

    const blueIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    if (driverMarkerRef.current) {
      // Smoothly animate marker to new position
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: blueIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>🚛 Conducteur</b><br>Position en temps réel');
    }

    // Auto-center on driver when location updates (but don't override user pan)
    mapRef.current.setView([driverLocation.lat, driverLocation.lng], mapRef.current.getZoom(), {
      animate: true
    });

    // Trigger callback
    if (onDriverLocationUpdate) {
      onDriverLocationUpdate(driverLocation);
    }
  }, [driverLocation, mapReady]);

  // Draw route using OSRM (free routing)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !showRoute) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/` +
          `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?` +
          `overview=full&geometries=geojson`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

            // Remove old route if exists
            if (routeLayerRef.current && mapRef.current) {
              mapRef.current.removeLayer(routeLayerRef.current);
            }

            // Draw new route
            if (mapRef.current) {
              routeLayerRef.current = L.polyline(coordinates, {
                color: '#228be6',
                weight: 4,
                opacity: 0.7,
                lineJoin: 'round'
              }).addTo(mapRef.current);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [pickup, dropoff, mapReady, showRoute]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
}
