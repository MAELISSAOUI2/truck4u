'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Paper,
  Divider,
  NumberInput,
  Textarea,
  ActionIcon,
  Loader,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconMapPin,
  IconPackage,
  IconClock,
  IconArrowLeft,
  IconUser,
  IconTruck,
  IconWeight,
  IconUsers,
  IconCalendar,
  IconCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJ1Y2s0dSIsImEiOiJjbTEyMzQ1Njc4OTAxMmxxZjNkaDV6Z2huIn0.demo';

const VEHICLE_LABELS: Record<string, string> = {
  CAMIONNETTE: 'Camionnette',
  FOURGON: 'Fourgon',
  CAMION_3_5T: 'Camion 3.5T',
  CAMION_LOURD: 'Camion Lourd',
};

export default function AvailableRideDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bid form
  const [bidAmount, setBidAmount] = useState<number | string>('');
  const [estimatedArrival, setEstimatedArrival] = useState<number | string>(30);
  const [message, setMessage] = useState('');

  // Helper function for distance calculation
  const calculateDistance = (pickup: any, dropoff: any) => {
    if (!pickup || !dropoff) return 0;
    const R = 6371;
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLon = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickup.lat * Math.PI) / 180) *
        Math.cos((dropoff.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  useEffect(() => {
    if (!token) {
      router.push('/driver/login');
      return;
    }

    loadRideDetails();
  }, [params.id, token]);

  useEffect(() => {
    if (ride && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [ride]);

  // Calculate distance using useMemo to avoid recalculation
  const distance = useMemo(() => {
    if (!ride) return 0;
    return calculateDistance(ride.pickup, ride.dropoff);
  }, [ride]);

  // Calculate suggested arrival time based on distance (40 km/h average + 15% buffer)
  const suggestedArrivalTime = useMemo(() => {
    if (distance === 0) return 30;
    const timeHours = distance / 40; // 40 km/h average speed
    const timeMinutes = Math.round(timeHours * 60 * 1.15); // Add 15% buffer
    return Math.max(5, timeMinutes); // At least 5 minutes
  }, [distance]);

  // Auto-set suggested time when ride loads
  useEffect(() => {
    if (ride && suggestedArrivalTime > 0) {
      setEstimatedArrival(suggestedArrivalTime);
    }
  }, [ride, suggestedArrivalTime]);

  const loadRideDetails = async () => {
    try {
      const response = await rideApi.getById(params.id as string);
      setRide(response.data);

      // Calculate suggested price (simple estimation)
      const distance = calculateDistance(response.data.pickup, response.data.dropoff);
      const basePricePerKm = 2.5;
      const suggestedPrice = Math.round(distance * basePricePerKm + 10);
      setBidAmount(suggestedPrice);
    } catch (error) {
      console.error('Error loading ride:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les détails de la course',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!ride || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [ride.pickup.lng, ride.pickup.lat],
      zoom: 11,
    });

    // Add pickup marker
    new mapboxgl.Marker({ color: '#228BE6' })
      .setLngLat([ride.pickup.lng, ride.pickup.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Départ</strong><br/>${ride.pickup.address}`))
      .addTo(map.current);

    // Add dropoff marker
    new mapboxgl.Marker({ color: '#40C057' })
      .setLngLat([ride.dropoff.lng, ride.dropoff.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Arrivée</strong><br/>${ride.dropoff.address}`))
      .addTo(map.current);

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([ride.pickup.lng, ride.pickup.lat]);
    bounds.extend([ride.dropoff.lng, ride.dropoff.lat]);
    map.current.fitBounds(bounds, { padding: 50 });
  };

  const handleSubmitBid = async () => {
    if (!bidAmount || Number(bidAmount) <= 0) {
      notifications.show({
        title: 'Montant requis',
        message: 'Veuillez entrer un montant valide',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      await rideApi.submitBid(params.id as string, {
        proposedPrice: Number(bidAmount),
        estimatedArrival: Number(estimatedArrival) || 30,
        message: message || undefined,
      });

      notifications.show({
        title: 'Offre envoyée !',
        message: 'Le client sera notifié de votre offre',
        color: 'green',
        icon: <IconCheck />,
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/driver/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de soumettre l\'offre',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  if (!ride) {
    return (
      <Container size="sm" py="xl">
        <Text ta="center">Course non trouvée</Text>
      </Container>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="xl" radius={0} withBorder>
        <Container size="lg">
          <Group>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => router.back()}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={1} size="2rem">
                Détails de la course
              </Title>
              <Text c="dimmed">#{ride.id.slice(0, 8)}</Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Map */}
          <Card shadow="sm" padding={0} radius="lg" withBorder>
            <div
              ref={mapContainer}
              style={{ width: '100%', height: 300, borderRadius: '8px' }}
            />
          </Card>

          {/* Route Details */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Itinéraire
            </Title>
            <Stack gap="md">
              <Group gap="xs" align="flex-start">
                <IconMapPin size={20} />
                <div style={{ flex: 1 }}>
                  <Text size="xs" c="dimmed">
                    Départ
                  </Text>
                  <Text size="sm" fw={500}>
                    {ride.pickup?.address}
                  </Text>
                </div>
              </Group>

              <Group gap="xs" align="flex-start">
                <IconMapPin size={20} color="#228BE6" />
                <div style={{ flex: 1 }}>
                  <Text size="xs" c="dimmed">
                    Arrivée
                  </Text>
                  <Text size="sm" fw={500}>
                    {ride.dropoff?.address}
                  </Text>
                </div>
              </Group>

              <Divider />

              <Group gap="lg" wrap="wrap">
                <Group gap={4}>
                  <IconTruck size={16} />
                  <Text size="sm">
                    <strong>{distance} km</strong> de distance
                  </Text>
                </Group>
                <Group gap={4}>
                  <Badge variant="light" color="blue">
                    {VEHICLE_LABELS[ride.vehicleType]}
                  </Badge>
                </Group>
              </Group>
            </Stack>
          </Card>

          {/* Ride Information */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Informations
            </Title>
            <Stack gap="md">
              <Group gap="md" wrap="wrap">
                {ride.customer && (
                  <Group gap={4}>
                    <IconUser size={16} />
                    <Text size="sm">
                      Client : <strong>{ride.customer.name}</strong>
                    </Text>
                  </Group>
                )}

                {ride.description && (
                  <Group gap={4}>
                    <IconPackage size={16} />
                    <Text size="sm">{ride.description}</Text>
                  </Group>
                )}

                {ride.cargoWeight && (
                  <Group gap={4}>
                    <IconWeight size={16} />
                    <Text size="sm">
                      Poids : <strong>{ride.cargoWeight} kg</strong>
                    </Text>
                  </Group>
                )}

                {ride.loadAssistance && (
                  <Group gap={4}>
                    <IconUsers size={16} />
                    <Text size="sm">Aide au chargement requise</Text>
                  </Group>
                )}

                {ride.serviceType === 'SCHEDULED' && ride.scheduledFor && (
                  <Group gap={4}>
                    <IconCalendar size={16} />
                    <Text size="sm">
                      Prévu le : <strong>{new Date(ride.scheduledFor).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</strong>
                    </Text>
                  </Group>
                )}
              </Group>

              {ride._count?.bids > 0 && (
                <>
                  <Divider />
                  <Badge variant="outline" color="orange" size="lg">
                    {ride._count.bids} transporteur{ride._count.bids > 1 ? 's ont' : ' a'} déjà fait une offre
                  </Badge>
                </>
              )}
            </Stack>
          </Card>

          {/* Bid Form */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Faites votre offre
            </Title>
            <Stack gap="md">
              <NumberInput
                label="Montant proposé (DT)"
                placeholder="Ex: 45"
                required
                size="lg"
                min={10}
                max={1000}
                value={bidAmount}
                onChange={setBidAmount}
                leftSection={<IconCash size={18} />}
                description={`Distance estimée : ${distance} km`}
              />

              <NumberInput
                label="Temps d'arrivée estimé (minutes)"
                placeholder="Ex: 30"
                required
                size="lg"
                min={5}
                max={180}
                value={estimatedArrival}
                onChange={setEstimatedArrival}
                leftSection={<IconClock size={18} />}
                description={
                  <Text size="sm" c="dimmed">
                    Suggestion basée sur {distance}km: <Text span fw={600} c="blue">{suggestedArrivalTime} min</Text>
                    {estimatedArrival !== suggestedArrivalTime && (
                      <Text span c="orange"> • Vous avez ajusté le temps</Text>
                    )}
                  </Text>
                }
              />

              <Textarea
                label="Message au client (optionnel)"
                placeholder="Ex: Je suis proche de vous, je peux arriver rapidement..."
                size="lg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  variant="light"
                  onClick={() => router.back()}
                >
                  Annuler
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmitBid}
                  loading={submitting}
                  leftSection={<IconCheck size={18} />}
                >
                  Envoyer l'offre
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}

function IconCash({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
