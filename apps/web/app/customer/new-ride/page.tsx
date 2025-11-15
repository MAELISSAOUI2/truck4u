'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin,
  Package,
  ArrowLeft,
  X,
  DollarSign,
  Clock,
  Navigation,
} from 'lucide-react';

// Configure Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJ1Y2s0dSIsImEiOiJjbTEyMzQ1Njc4OTAxMmxxZjNkaDV6Z2huIn0.demo';

const VEHICLE_TYPES = [
  { value: 'PICKUP', label: 'Pickup', icon: '🚙', basePrice: 20, capacity: '500kg' },
  { value: 'VAN', label: 'Camionnette', icon: '🚐', basePrice: 35, capacity: '1 tonne' },
  { value: 'SMALL_TRUCK', label: 'Petit Camion', icon: '🚚', basePrice: 60, capacity: '3 tonnes' },
  { value: 'MEDIUM_TRUCK', label: 'Camion Moyen', icon: '🚛', basePrice: 100, capacity: '8 tonnes' },
];

export default function NewRidePage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: 36.8065,
    pickupLng: 10.1815,
    deliveryAddress: '',
    deliveryLat: 36.8188,
    deliveryLng: 10.1658,
    vehicleType: 'VAN',
    cargoDescription: '',
    cargoWeight: '',
    numberOfHelpers: 0,
    isUrgent: false,
  });

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }

    // Initialize map
    if (mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [formData.pickupLng, formData.pickupLat],
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Create custom markers
      const pickupEl = document.createElement('div');
      pickupEl.className = 'custom-marker pickup-marker';
      pickupEl.innerHTML = '📍';
      pickupEl.style.fontSize = '32px';

      const deliveryEl = document.createElement('div');
      deliveryEl.className = 'custom-marker delivery-marker';
      deliveryEl.innerHTML = '🏁';
      deliveryEl.style.fontSize = '32px';

      pickupMarker.current = new mapboxgl.Marker(pickupEl)
        .setLngLat([formData.pickupLng, formData.pickupLat])
        .addTo(map.current);

      deliveryMarker.current = new mapboxgl.Marker(deliveryEl)
        .setLngLat([formData.deliveryLng, formData.deliveryLat])
        .addTo(map.current);

      // Fit bounds to show both markers
      const bounds = new mapboxgl.LngLatBounds()
        .extend([formData.pickupLng, formData.pickupLat])
        .extend([formData.deliveryLng, formData.deliveryLat]);

      map.current.fitBounds(bounds, { padding: 80 });

      // Draw route
      drawRoute();
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [token]);

  // Update map when addresses change
  useEffect(() => {
    if (map.current && pickupMarker.current && deliveryMarker.current) {
      pickupMarker.current.setLngLat([formData.pickupLng, formData.pickupLat]);
      deliveryMarker.current.setLngLat([formData.deliveryLng, formData.deliveryLat]);

      const bounds = new mapboxgl.LngLatBounds()
        .extend([formData.pickupLng, formData.pickupLat])
        .extend([formData.deliveryLng, formData.deliveryLat]);

      map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
      drawRoute();
    }
  }, [formData.pickupLat, formData.pickupLng, formData.deliveryLat, formData.deliveryLng]);

  const drawRoute = async () => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${formData.pickupLng},${formData.pickupLat};${formData.deliveryLng},${formData.deliveryLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        setDistance((route.distance / 1000).toFixed(1) as any);
        setDuration(Math.round(route.duration / 60));

        const geojson = {
          type: 'Feature' as const,
          properties: {},
          geometry: route.geometry,
        };

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson as any);
        } else {
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: {
              type: 'geojson',
              data: geojson as any,
            },
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3B82F6',
              'line-width': 5,
              'line-opacity': 0.75,
            },
          });
        }
      }
    } catch (err) {
      console.error('Error fetching route:', err);
    }
  };

  const geocodeAddress = async (address: string, isPickup: boolean) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&country=TN&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features[0]) {
        const [lng, lat] = data.features[0].center;

        if (isPickup) {
          setFormData(prev => ({ ...prev, pickupLat: lat, pickupLng: lng }));
        } else {
          setFormData(prev => ({ ...prev, deliveryLat: lat, deliveryLng: lng }));
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  // Debounced geocoding
  useEffect(() => {
    if (formData.pickupAddress.length > 5) {
      const timeout = setTimeout(() => geocodeAddress(formData.pickupAddress, true), 800);
      return () => clearTimeout(timeout);
    }
  }, [formData.pickupAddress]);

  useEffect(() => {
    if (formData.deliveryAddress.length > 5) {
      const timeout = setTimeout(() => geocodeAddress(formData.deliveryAddress, false), 800);
      return () => clearTimeout(timeout);
    }
  }, [formData.deliveryAddress]);

  const calculatePrice = () => {
    const vehicle = VEHICLE_TYPES.find(v => v.value === formData.vehicleType);
    if (!vehicle) return 0;

    let price = vehicle.basePrice;
    price += distance * 1.5; // 1.5 DT per km
    price += formData.numberOfHelpers * 15;
    if (formData.isUrgent) price *= 1.2;

    return Math.round(price);
  };

  const handleSubmit = async () => {
    if (!formData.pickupAddress || !formData.deliveryAddress || !formData.cargoDescription) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await rideApi.create({
        ...formData,
        estimatedPrice: calculatePrice(),
        estimatedDistance: distance,
        estimatedDuration: duration,
      });

      router.push(`/customer/rides/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const estimatedPrice = calculatePrice();

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={() => router.push('/customer/dashboard')}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Nouvelle course</h1>
        <div className="w-20"></div>
      </header>

      {/* Main Content - Map + Form */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map - Left side on desktop, top on mobile */}
        <div className="lg:w-1/2 h-64 lg:h-full relative">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Route Info Overlay */}
          {distance > 0 && (
            <div className="absolute top-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-xl">
                  <Navigation className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="text-xl font-bold text-gray-900">{distance} km</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-xl">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Durée</p>
                  <p className="text-xl font-bold text-gray-900">{duration} min</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form - Right side on desktop, bottom on mobile */}
        <div className="lg:w-1/2 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Addresses */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Adresse de départ
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-green-600" />
                  <input
                    type="text"
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
                    placeholder="Ex: Avenue Habib Bourguiba, Tunis"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Adresse de livraison
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-red-600" />
                  <input
                    type="text"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
                    placeholder="Ex: Zone Industrielle, Sousse"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Type de véhicule
              </label>
              <div className="grid grid-cols-2 gap-3">
                {VEHICLE_TYPES.map((vehicle) => (
                  <button
                    key={vehicle.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, vehicleType: vehicle.value })}
                    className={`p-4 border-2 rounded-xl transition text-left ${
                      formData.vehicleType === vehicle.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{vehicle.icon}</div>
                    <div className="font-bold text-sm text-gray-900">{vehicle.label}</div>
                    <div className="text-xs text-gray-600">{vehicle.capacity}</div>
                    <div className="text-sm font-semibold text-blue-600 mt-1">
                      {vehicle.basePrice} DT
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cargo Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <Package className="inline w-4 h-4 mr-1" />
                Description de la marchandise
              </label>
              <textarea
                value={formData.cargoDescription}
                onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition resize-none"
                placeholder="Ex: 20 cartons de produits alimentaires"
              />
            </div>

            {/* Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Poids estimé (kg)
                </label>
                <input
                  type="number"
                  value={formData.cargoWeight}
                  onChange={(e) => setFormData({ ...formData, cargoWeight: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
                  placeholder="500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Convoyeurs
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, numberOfHelpers: Math.max(0, formData.numberOfHelpers - 1) })}
                    className="w-10 h-10 bg-gray-100 rounded-lg font-bold hover:bg-gray-200"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center font-bold text-xl">{formData.numberOfHelpers}</div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, numberOfHelpers: formData.numberOfHelpers + 1 })}
                    className="w-10 h-10 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.numberOfHelpers * 15} DT
                </p>
              </div>
            </div>

            {/* Urgent Option */}
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition">
              <input
                type="checkbox"
                checked={formData.isUrgent}
                onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="font-semibold text-gray-900">Course urgente</span>
                <p className="text-sm text-gray-600">+20% sur le tarif</p>
              </div>
            </label>
          </div>

          {/* Bottom Bar with Price & Submit */}
          <div className="mt-auto border-t border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Prix estimé</p>
                <p className="text-3xl font-bold text-gray-900">{estimatedPrice} DT</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.pickupAddress || !formData.deliveryAddress || !formData.cargoDescription}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? 'Création...' : 'Publier la course'}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Le prix final sera confirmé par le transporteur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
