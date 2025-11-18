'use client';

import { useEffect, useState, useRef } from 'react';
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
  ActionIcon,
  Loader,
  Center,
  Stepper,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconMapPin,
  IconArrowLeft,
  IconUser,
  IconPhone,
  IconCheck,
  IconTruckDelivery,
  IconPackageImport,
  IconPackageExport,
  IconRoute,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import { updateDriverLocation, connectSocket, onPaymentConfirmed } from '@/lib/socket';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJ1Y2s0dSIsImEiOiJjbTEyMzQ1Njc4OTAxMmxxZjNkaDV6Z2huIn0.demo';

const STATUS_FLOW = [
  'BID_ACCEPTED',
  'DRIVER_ARRIVING',
  'PICKUP_ARRIVED',
  'LOADING',
  'IN_TRANSIT',
  'DROPOFF_ARRIVED',
  'COMPLETED',
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; action: string }> = {
  BID_ACCEPTED: {
    label: 'Offre acceptée - En attente de paiement',
    icon: IconCheck,
    action: 'Démarrer la course',
  },
  DRIVER_ARRIVING: {
    label: 'En route vers le départ',
    icon: IconTruckDelivery,
    action: 'Je suis arrivé au point de départ',
  },
  PICKUP_ARRIVED: {
    label: 'Arrivé au départ',
    icon: IconPackageImport,
    action: 'Commencer le chargement',
  },
  LOADING: {
    label: 'Chargement en cours',
    icon: IconPackageImport,
    action: 'Chargement terminé, départ!',
  },
  IN_TRANSIT: {
    label: 'En transit vers la destination',
    icon: IconRoute,
    action: 'Je suis arrivé à destination',
  },
  DROPOFF_ARRIVED: {
    label: 'Arrivé à destination',
    icon: IconPackageExport,
    action: 'Terminer la course',
  },
  COMPLETED: {
    label: 'Course terminée',
    icon: IconCheck,
    action: '',
  },
};

export default function DriverRideDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { token, user } = useAuthStore();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const locationWatchId = useRef<number | null>(null);

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/driver/login');
      return;
    }

    loadRideDetails();

    // Start sharing location
    startLocationSharing();

    return () => {
      // Stop sharing location when leaving page
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, [params.id, token]);

  useEffect(() => {
    if (ride && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [ride]);

  // Listen for payment confirmation
  useEffect(() => {
    console.log('🔍 Payment listener useEffect running');
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    console.log('👤 User:', user);
    console.log('🆔 User ID:', user?.id);

    if (!token || !user) {
      console.log('⚠️ Missing token or user, not connecting socket');
      return;
    }

    console.log('🔌 Connecting socket for driver:', user.id);
    // Connect socket
    connectSocket(user.id, 'driver', token);

    // Listen for payment confirmation
    const unsubscribe = onPaymentConfirmed((data: any) => {
      console.log('💳 Payment confirmed:', data);

      // Show notification
      notifications.show({
        title: 'Paiement confirmé !',
        message: data.message || 'Le client a confirmé le paiement. Vous pouvez démarrer la course.',
        color: 'green',
        autoClose: 5000,
      });

      // Reload ride details to get updated payment info
      loadRideDetails();
    });

    return () => {
      unsubscribe();
    };
  }, [token, user, params.id]);

  const loadRideDetails = async () => {
    try {
      const response = await rideApi.getById(params.id as string);
      setRide(response.data);
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

  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          rideId: params.id as string,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: Date.now(),
        };

        // Send location via Socket.io
        updateDriverLocation(locationData);

        console.log('📍 Location shared:', locationData);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  };

  const initializeMap = () => {
    if (!ride || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [ride.pickup.lng, ride.pickup.lat],
      zoom: 12,
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

  const handleNextStatus = async () => {
    const currentIndex = STATUS_FLOW.indexOf(ride.status);
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[currentIndex + 1];

    setUpdating(true);
    try {
      await rideApi.updateStatus(params.id as string, nextStatus);

      // Reload ride details
      await loadRideDetails();

      notifications.show({
        title: 'Statut mis à jour',
        message: STATUS_CONFIG[nextStatus].label,
        color: 'green',
        icon: <IconCheck />,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de mettre à jour le statut',
        color: 'red',
      });
    } finally {
      setUpdating(false);
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

  const currentStatusIndex = STATUS_FLOW.indexOf(ride.status);
  const StatusIcon = STATUS_CONFIG[ride.status]?.icon || IconTruckDelivery;

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
            <div style={{ flex: 1 }}>
              <Title order={1} size="2rem">
                Course en cours
              </Title>
              <Text c="dimmed">#{ride.id.slice(0, 8)}</Text>
            </div>
            <Badge size="lg" variant="filled" color="blue">
              {ride.finalPrice || ride.winningBid?.amount || 0} DT
            </Badge>
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

          {/* Progress Stepper */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Statut de la course
            </Title>
            <Stepper
              active={currentStatusIndex}
              orientation="vertical"
              size="sm"
            >
              {STATUS_FLOW.map((status, index) => {
                const Icon = STATUS_CONFIG[status].icon;
                return (
                  <Stepper.Step
                    key={status}
                    label={STATUS_CONFIG[status].label}
                    icon={<Icon size={18} />}
                    description={
                      index === currentStatusIndex
                        ? 'Étape actuelle'
                        : index < currentStatusIndex
                        ? 'Terminé'
                        : 'En attente'
                    }
                    color={index <= currentStatusIndex ? 'blue' : 'gray'}
                  />
                );
              })}
            </Stepper>

            {ride.status !== 'COMPLETED' && (
              <>
                <Divider my="xl" />
                {ride.status === 'BID_ACCEPTED' && !ride.payment ? (
                  <Paper p="md" withBorder style={{ background: '#fff3cd' }}>
                    <Group gap="xs">
                      <IconCheck size={20} color="orange" />
                      <div>
                        <Text size="sm" fw={600}>En attente du paiement client</Text>
                        <Text size="xs" c="dimmed">
                          Le client doit confirmer le mode de paiement avant que vous puissiez démarrer.
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                ) : (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleNextStatus}
                    loading={updating}
                    rightSection={<IconCheck size={18} />}
                    disabled={ride.status === 'BID_ACCEPTED' && !ride.payment}
                  >
                    {STATUS_CONFIG[ride.status]?.action}
                  </Button>
                )}
              </>
            )}
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
            </Stack>
          </Card>

          {/* Customer Info */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Informations client
            </Title>
            <Stack gap="md">
              <Group gap="md">
                <IconUser size={20} />
                <div>
                  <Text size="xs" c="dimmed">
                    Nom
                  </Text>
                  <Text size="sm" fw={500}>
                    {ride.customer?.name || 'Client'}
                  </Text>
                </div>
              </Group>

              {ride.customer?.phone && (
                <Group gap="md">
                  <IconPhone size={20} />
                  <div>
                    <Text size="xs" c="dimmed">
                      Téléphone
                    </Text>
                    <Text size="sm" fw={500}>
                      <a href={`tel:${ride.customer.phone}`} style={{ color: 'inherit' }}>
                        {ride.customer.phone}
                      </a>
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    size="sm"
                    component="a"
                    href={`tel:${ride.customer.phone}`}
                    leftSection={<IconPhone size={16} />}
                  >
                    Appeler
                  </Button>
                </Group>
              )}

              {ride.description && (
                <div>
                  <Text size="xs" c="dimmed" mb={4}>
                    Description
                  </Text>
                  <Text size="sm">{ride.description}</Text>
                </div>
              )}
            </Stack>
          </Card>

          {/* Completed Message */}
          {ride.status === 'COMPLETED' && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder style={{ backgroundColor: '#e7f5ff' }}>
              <Stack align="center" gap="md">
                <IconCheck size={48} color="#228be6" />
                <Title order={3} size="1.25rem" ta="center">
                  Course terminée avec succès !
                </Title>
                <Text size="sm" c="dimmed" ta="center">
                  Le paiement sera traité et vous recevrez vos gains
                </Text>
                <Button
                  onClick={() => router.push('/driver/dashboard')}
                  variant="light"
                >
                  Retour au tableau de bord
                </Button>
              </Stack>
            </Card>
          )}
        </Stack>
      </Container>
    </div>
  );
}
