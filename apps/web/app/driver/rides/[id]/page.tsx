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
  Modal,
  Textarea,
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
  IconMessageCircle,
  IconClock,
  IconPackage,
  IconAlertCircle,
  IconX,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi, cancellationApi, driverApi } from '@/lib/api';
import { updateDriverLocation, connectSocket, onPaymentConfirmed, onRideRated, onETAUpdated, onNotification, onRideCancelled } from '@/lib/socket';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ChatBox from '@/components/ChatBox';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJ1Y2s0dSIsImEiOiJjbTEyMzQ1Njc4OTAxMmxxZjNkaDV6Z2huIn0.demo';

const STATUS_FLOW = [
  'BID_ACCEPTED',
  'DRIVER_ARRIVING',
  'PICKUP_ARRIVED',
  'LOADING',
  'IN_TRANSIT',
  'DROPOFF_ARRIVED',
  // Note: COMPLETED is handled by confirmation workflow, not direct status update
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
    action: 'Confirmer la livraison',
  },
  COMPLETED: {
    label: 'Course terminée',
    icon: IconCheck,
    action: '',
  },
};

// Helper functions for ETA display
const formatETA = (datetime: string | null): string => {
  if (!datetime) return 'Non disponible';

  const eta = new Date(datetime);
  const now = new Date();
  const diffMs = eta.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 0) {
    return 'Maintenant';
  } else if (diffMinutes === 0) {
    return 'Moins d\'une minute';
  } else if (diffMinutes < 60) {
    return `Dans ${diffMinutes} min`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `Dans ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  }
};

const formatTime = (datetime: string | null): string => {
  if (!datetime) return '--:--';
  return new Date(datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [driverStrikes, setDriverStrikes] = useState(0);

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
    const unsubscribe1 = onPaymentConfirmed((data: any) => {
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

    // Listen for ride rating
    const unsubscribe2 = onRideRated((data: any) => {
      console.log('⭐ Ride rated:', data);

      // Show notification
      notifications.show({
        title: 'Course évaluée !',
        message: data.message || `Le client vous a noté ${data.rating}/5 étoiles`,
        color: 'green',
        autoClose: 3000,
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/driver/dashboard');
      }, 2000);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [token, user, params.id, router]);

  // Listen for intelligent GPS notifications
  useEffect(() => {
    if (!user || !token) return;

    const unsubscribe = onNotification((data: any) => {
      console.log('📢 GPS Notification received:', data);

      notifications.show({
        title: data.title || 'Notification',
        message: data.message,
        color: data.type?.includes('error') ? 'red' : 'blue',
        icon: <span style={{ fontSize: '20px' }}>{data.icon || '🔔'}</span>,
        autoClose: 5000,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user, token]);

  // Listen for ETA updates
  useEffect(() => {
    if (!params.id) return;

    const unsubscribe = onETAUpdated((etaData: any) => {
      console.log('⏱️ ETA updated:', etaData);

      setRide((prev: any) => ({
        ...prev,
        estimatedPickupTime: etaData.estimatedPickupTime,
        estimatedDeliveryTime: etaData.estimatedDeliveryTime,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [params.id]);

  // Listen for ride cancellation by customer
  useEffect(() => {
    if (!params.id || !user) return;

    const unsubscribe = onRideCancelled((data: any) => {
      console.log('🚫 Ride cancelled by customer:', data);

      // Show notification to driver
      notifications.show({
        title: '⚠️ Course annulée',
        message: 'Le client a annulé la course.',
        color: 'orange',
        autoClose: 5000,
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/driver/dashboard');
      }, 2000);
    });

    return () => {
      unsubscribe();
    };
  }, [params.id, user]);

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
          driverId: user?.id || '',
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

    // Draw route
    drawRoute();
  };

  const drawRoute = async () => {
    if (!map.current || !ride) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${ride.pickup.lng},${ride.pickup.lat};${ride.dropoff.lng},${ride.dropoff.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
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

  const handleCancelRide = async () => {
    setCancelling(true);
    try {
      const response = await cancellationApi.cancelAsDriver(params.id as string, cancelReason);

      const { strikeCount, accountDeactivated } = response.data;

      if (accountDeactivated) {
        notifications.show({
          title: '❌ Compte désactivé',
          message: 'Votre compte a été désactivé après 3 annulations. Contactez le support.',
          color: 'red',
          autoClose: false,
        });
      } else if (strikeCount === 2) {
        notifications.show({
          title: '⚠️ Dernier avertissement!',
          message: 'Strike 2/3. Une autre annulation désactivera votre compte!',
          color: 'orange',
          autoClose: 10000,
        });
      } else {
        notifications.show({
          title: 'Course annulée',
          message: `Strike ${strikeCount}/3 enregistré.`,
          color: 'orange',
          autoClose: 5000,
        });
      }

      setCancelModalOpen(false);
      setCancelReason('');

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/driver/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error cancelling ride:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible d\'annuler la course',
        color: 'red',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleNextStatus = async () => {
    // Special case: DROPOFF_ARRIVED should confirm completion, not go to COMPLETED directly
    if (ride.status === 'DROPOFF_ARRIVED') {
      setUpdating(true);
      try {
        await rideApi.confirmCompletionDriver(params.id as string);

        notifications.show({
          title: 'Livraison confirmée',
          message: 'En attente de la confirmation client. Vous serez notifié une fois la course terminée.',
          color: 'green',
          icon: <IconCheck />,
        });

        // Reload to show waiting state
        await loadRideDetails();
      } catch (error: any) {
        console.error('Error confirming completion:', error);
        notifications.show({
          title: 'Erreur',
          message: error.response?.data?.message || 'Impossible de confirmer la livraison',
          color: 'red',
        });
      } finally {
        setUpdating(false);
      }
      return;
    }

    // Normal status progression for other statuses
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

          {/* ETA Card - Show when ride is in progress */}
          {ride && ['BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT'].includes(ride.status) && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder style={{ backgroundColor: '#E7F5FF' }}>
              <Title order={3} size="1.25rem" mb="md">Temps estimés ⏱️</Title>
              <Stack gap="md">
                {/* Pickup ETA - Show until pickup is complete */}
                {!ride.actualPickupTime && ride.estimatedPickupTime && (
                  <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'white' }}>
                    <Group justify="space-between">
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>Votre arrivée au point de départ</Text>
                        <Group gap="xs">
                          <IconClock size={20} color="#228BE6" />
                          <Text size="lg" fw={600} c="blue">
                            {formatETA(ride.estimatedPickupTime)}
                          </Text>
                        </Group>
                      </div>
                      <Badge size="lg" variant="light" color="blue">
                        {formatTime(ride.estimatedPickupTime)}
                      </Badge>
                    </Group>
                  </Paper>
                )}

                {/* Delivery ETA - Show after pickup */}
                {ride.estimatedDeliveryTime && (
                  <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'white' }}>
                    <Group justify="space-between">
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>
                          {ride.actualPickupTime ? 'Livraison estimée' : 'Arrivée finale estimée'}
                        </Text>
                        <Group gap="xs">
                          <IconPackage size={20} color="#40C057" />
                          <Text size="lg" fw={600} c="green">
                            {formatETA(ride.estimatedDeliveryTime)}
                          </Text>
                        </Group>
                      </div>
                      <Badge size="lg" variant="light" color="green">
                        {formatTime(ride.estimatedDeliveryTime)}
                      </Badge>
                    </Group>
                  </Paper>
                )}

                {/* Show Express badge if applicable */}
                {ride.isExpress && (
                  <Paper p="sm" radius="md" style={{ backgroundColor: '#FFF3E0', borderLeft: '4px solid #FF9800' }}>
                    <Group gap="xs">
                      <Text size="sm" fw={600} c="orange">⚡ Livraison Express</Text>
                      <Text size="sm" c="dimmed">Priorité maximale</Text>
                    </Group>
                  </Paper>
                )}
              </Stack>
            </Card>
          )}

          {/* Cancel Button - Show when cancellable */}
          {ride && !['COMPLETED', 'CANCELLED', 'PENDING_BIDS'].includes(ride.status) && (
            <Card shadow="sm" padding="lg" radius="lg" withBorder style={{ borderColor: '#FA5252' }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={600} size="lg" c="red">⚠️ Annuler la course</Text>
                    <Text size="sm" c="dimmed">
                      {driverStrikes === 0 && 'Strike 1/3 sera enregistré'}
                      {driverStrikes === 1 && '⚠️ Strike 2/3 - Attention!'}
                      {driverStrikes === 2 && '🚨 DERNIER AVERTISSEMENT - Strike 3/3 = Désactivation'}
                    </Text>
                  </div>
                  <Button
                    color="red"
                    variant="light"
                    onClick={() => setCancelModalOpen(true)}
                  >
                    Annuler
                  </Button>
                </Group>
              </Stack>
            </Card>
          )}

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
                ) : ride.status === 'DROPOFF_ARRIVED' && ride.proofPhotos?.driverConfirmedCompletion ? (
                  <Paper p="md" withBorder style={{ background: '#e7f5ff' }}>
                    <Group gap="xs">
                      <IconCheck size={20} color="green" />
                      <div>
                        <Text size="sm" fw={600}>Livraison confirmée</Text>
                        <Text size="xs" c="dimmed">
                          En attente de la confirmation du client. Vous recevrez vos gains une fois confirmé.
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

              {/* Show customer phone only after payment (DRIVER_ARRIVING onwards) */}
              {ride.customer?.phone && ride.status !== 'BID_ACCEPTED' && (
                <Group gap="md">
                  <IconPhone size={20} />
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">
                      Téléphone
                    </Text>
                    <Text size="sm" fw={500}>
                      <a href={`tel:${ride.customer.phone}`} style={{ color: 'inherit' }}>
                        {ride.customer.phone}
                      </a>
                    </Text>
                  </div>
                  <Group gap="xs">
                    <Button
                      variant="light"
                      size="sm"
                      component="a"
                      href={`tel:${ride.customer.phone}`}
                      leftSection={<IconPhone size={16} />}
                    >
                      Appeler
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      color="blue"
                      onClick={() => setChatModalOpen(true)}
                      leftSection={<IconMessageCircle size={16} />}
                    >
                      Message
                    </Button>
                  </Group>
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

      {/* Chat Modal */}
      {ride?.customer && (
        <ChatBox
          opened={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          rideId={params.id as string}
          userType="DRIVER"
          token={token!}
        />
      )}

      {/* Cancel Ride Modal */}
      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={
          <Group gap="xs">
            <IconAlertCircle size={24} color="#FA5252" />
            <Text fw={600} size="lg">Annuler la course</Text>
          </Group>
        }
        size="md"
        centered
      >
        <Stack gap="md">
          {/* Strike Warning */}
          {driverStrikes === 0 && (
            <Paper p="md" radius="md" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
              <Group gap="xs" align="flex-start">
                <IconAlertCircle size={20} color="#ff9800" />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={600} c="#856404">Strike 1/3 sera enregistré</Text>
                  <Text size="xs" c="#856404">
                    Cette annulation comptera comme votre premier avertissement.
                  </Text>
                </div>
              </Group>
            </Paper>
          )}

          {driverStrikes === 1 && (
            <Paper p="md" radius="md" style={{ backgroundColor: '#ffe0b2', border: '1px solid #ff9800' }}>
              <Group gap="xs" align="flex-start">
                <IconAlertCircle size={20} color="#f57c00" />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={600} c="#e65100">⚠️ Strike 2/3 - Attention!</Text>
                  <Text size="xs" c="#e65100">
                    Vous avez déjà 1 strike. Cette annulation en ajoutera un deuxième.
                  </Text>
                </div>
              </Group>
            </Paper>
          )}

          {driverStrikes === 2 && (
            <Paper p="md" radius="md" style={{ backgroundColor: '#ffcdd2', border: '2px solid #f44336' }}>
              <Group gap="xs" align="flex-start">
                <IconX size={20} color="#d32f2f" />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={700} c="#b71c1c">🚨 DERNIER AVERTISSEMENT!</Text>
                  <Text size="xs" c="#b71c1c" fw={600}>
                    Vous avez déjà 2 strikes. Cette annulation désactivera AUTOMATIQUEMENT votre compte!
                  </Text>
                </div>
              </Group>
            </Paper>
          )}

          {/* Consequences */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" fw={600}>Conséquences de l'annulation:</Text>
              <Text size="xs" c="dimmed">
                • Le client sera remboursé intégralement
              </Text>
              <Text size="xs" c="dimmed">
                • Un strike sera enregistré sur votre compte
              </Text>
              <Text size="xs" c="dimmed">
                • Les strikes se réinitialisent chaque mois
              </Text>
              {driverStrikes === 2 && (
                <Text size="xs" c="red" fw={600}>
                  • Votre compte sera DÉSACTIVÉ immédiatement
                </Text>
              )}
            </Stack>
          </Paper>

          {/* Reason */}
          <Textarea
            label="Raison de l'annulation (optionnel)"
            placeholder="Ex: Problème technique, urgence personnelle..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.currentTarget.value)}
            minRows={3}
            maxRows={5}
          />

          {/* Actions */}
          <Group justify="space-between" mt="md">
            <Button
              variant="light"
              color="gray"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
            >
              Retour
            </Button>
            <Button
              color="red"
              onClick={handleCancelRide}
              loading={cancelling}
              leftSection={<IconX size={16} />}
            >
              {driverStrikes === 2 ? 'Confirmer et désactiver compte' : 'Confirmer l\'annulation'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
