'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SimpleMapProps {
  pickup: { lat: number; lng: number; address?: string };
  dropoff: { lat: number; lng: number; address?: string };
  driverLocation?: { lat: number; lng: number };
  height?: string;
}

export default function SimpleMap({ pickup, dropoff, driverLocation, height = '400px' }: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on Tunisia
    const map = L.map(containerRef.current).setView([36.8065, 10.1815], 12);

    // Add OpenStreetMap tiles (free!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

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
        .bindPopup('<b>Départ</b><br>' + (pickup.address || ''));
    }

    // Add/update dropoff marker
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
    } else {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], { icon: redIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>Arrivée</b><br>' + (dropoff.address || ''));
    }

    // Fit bounds to show both markers
    const bounds = L.latLngBounds([
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng]
    ]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [pickup, dropoff]);

  // Update driver marker (blue)
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;

    const blueIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: blueIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>Conducteur</b>');
    }
  }, [driverLocation]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
}
