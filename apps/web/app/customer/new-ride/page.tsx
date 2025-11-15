'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  Card,
  Group,
  ActionIcon,
  Paper,
  SimpleGrid,
  Checkbox,
  NumberInput,
  Badge,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconMapPin,
  IconPackage,
  IconClock,
  IconNavigation,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
              'line-color': '#228BE6',
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper p="md" radius={0} withBorder>
        <Container size="xl">
          <Group justify="space-between">
            <ActionIcon
              size="lg"
              variant="subtle"
              color="dark"
              onClick={() => router.push('/customer/dashboard')}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
            <Title order={2} size="1.25rem">Nouvelle course</Title>
            <div style={{ width: 40 }} />
          </Group>
        </Container>
      </Paper>

      {/* Main Content - Map + Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        {/* Map - Left side */}
        <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
          <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

          {/* Route Info Overlay */}
          {distance > 0 && (
            <Paper
              shadow="lg"
              p="md"
              radius="xl"
              withBorder
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                zIndex: 10
              }}
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <ActionIcon size="lg" radius="xl" variant="light" color="blue">
                    <IconNavigation size={20} />
                  </ActionIcon>
                  <div>
                    <Text size="xs" c="dimmed">Distance</Text>
                    <Text size="lg" fw={700}>{distance} km</Text>
                  </div>
                </Group>
                <Group gap="sm">
                  <ActionIcon size="lg" radius="xl" variant="light" color="green">
                    <IconClock size={20} />
                  </ActionIcon>
                  <div>
                    <Text size="xs" c="dimmed">Durée</Text>
                    <Text size="lg" fw={700}>{duration} min</Text>
                  </div>
                </Group>
              </Group>
            </Paper>
          )}
        </div>

        {/* Form - Right side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <Container size="md" py="xl">
            <Stack gap="xl">
              {/* Error */}
              {error && (
                <Paper p="md" radius="md" bg="red.0" withBorder>
                  <Text c="red" size="sm">{error}</Text>
                </Paper>
              )}

              {/* Addresses */}
              <Stack gap="md">
                <TextInput
                  label="Adresse de départ"
                  placeholder="Ex: Avenue Habib Bourguiba, Tunis"
                  size="lg"
                  radius="lg"
                  leftSection={<IconMapPin size={18} style={{ color: '#51cf66' }} />}
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                  required
                />

                <TextInput
                  label="Adresse de livraison"
                  placeholder="Ex: Zone Industrielle, Sousse"
                  size="lg"
                  radius="lg"
                  leftSection={<IconMapPin size={18} style={{ color: '#ff6b6b' }} />}
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  required
                />
              </Stack>

              {/* Vehicle Type */}
              <div>
                <Text size="sm" fw={600} mb="md">Type de véhicule</Text>
                <SimpleGrid cols={2} spacing="md">
                  {VEHICLE_TYPES.map((vehicle) => (
                    <Card
                      key={vehicle.value}
                      shadow="sm"
                      padding="lg"
                      radius="lg"
                      withBorder
                      style={{
                        cursor: 'pointer',
                        borderColor: formData.vehicleType === vehicle.value ? '#228BE6' : undefined,
                        borderWidth: formData.vehicleType === vehicle.value ? 2 : 1,
                        backgroundColor: formData.vehicleType === vehicle.value ? '#E7F5FF' : undefined,
                      }}
                      onClick={() => setFormData({ ...formData, vehicleType: vehicle.value })}
                    >
                      <Stack gap="xs">
                        <div style={{ fontSize: '2rem' }}>{vehicle.icon}</div>
                        <Text fw={700} size="sm">{vehicle.label}</Text>
                        <Text size="xs" c="dimmed">{vehicle.capacity}</Text>
                        <Badge color="blue" variant="light">{vehicle.basePrice} DT</Badge>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </div>

              {/* Cargo Description */}
              <Textarea
                label="Description de la marchandise"
                placeholder="Ex: 20 cartons de produits alimentaires"
                size="md"
                radius="lg"
                rows={3}
                value={formData.cargoDescription}
                onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                required
              />

              {/* Weight and Helpers */}
              <SimpleGrid cols={2} spacing="md">
                <TextInput
                  label="Poids estimé (kg)"
                  placeholder="500"
                  size="md"
                  radius="lg"
                  type="number"
                  value={formData.cargoWeight}
                  onChange={(e) => setFormData({ ...formData, cargoWeight: e.target.value })}
                />

                <div>
                  <Text size="sm" fw={500} mb="xs">Convoyeurs</Text>
                  <Group gap="xs">
                    <ActionIcon
                      size="lg"
                      radius="lg"
                      variant="light"
                      color="gray"
                      onClick={() => setFormData({ ...formData, numberOfHelpers: Math.max(0, formData.numberOfHelpers - 1) })}
                    >
                      <IconMinus size={18} />
                    </ActionIcon>
                    <Text size="xl" fw={700} style={{ flex: 1, textAlign: 'center' }}>
                      {formData.numberOfHelpers}
                    </Text>
                    <ActionIcon
                      size="lg"
                      radius="lg"
                      color="dark"
                      onClick={() => setFormData({ ...formData, numberOfHelpers: formData.numberOfHelpers + 1 })}
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {formData.numberOfHelpers * 15} DT
                  </Text>
                </div>
              </SimpleGrid>

              {/* Urgent Option */}
              <Paper p="md" radius="lg" withBorder style={{ cursor: 'pointer' }}>
                <Checkbox
                  label={
                    <div>
                      <Text fw={600}>Course urgente</Text>
                      <Text size="sm" c="dimmed">+20% sur le tarif</Text>
                    </div>
                  }
                  checked={formData.isUrgent}
                  onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  size="md"
                />
              </Paper>
            </Stack>
          </Container>

          {/* Bottom Bar with Price & Submit */}
          <Paper p="xl" radius={0} withBorder style={{ marginTop: 'auto' }}>
            <Container size="md">
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="sm" c="dimmed">Prix estimé</Text>
                  <Title order={2} size="2rem">{estimatedPrice} DT</Title>
                </div>
                <Button
                  size="xl"
                  radius="xl"
                  color="dark"
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={!formData.pickupAddress || !formData.deliveryAddress || !formData.cargoDescription}
                  rightSection={<IconPackage size={20} />}
                >
                  Publier la course
                </Button>
              </Group>
              <Text size="xs" c="dimmed" ta="center">
                Le prix final sera confirmé par le transporteur
              </Text>
            </Container>
          </Paper>
        </div>
      </div>
    </div>
  );
}
