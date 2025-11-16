'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Card,
  Group,
  ActionIcon,
  Paper,
  Badge,
  Timeline,
  Modal,
  Rating,
  Textarea,
  Stepper,
  Avatar,
  Divider,
  Indicator,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconMapPin,
  IconPackage,
  IconClock,
  IconPhone,
  IconMessageCircle,
  IconX,
  IconCheck,
  IconTruck,
  IconAlertCircle,
  IconBell,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import { connectSocket, onNewBid, trackRide, stopTracking, onDriverMoved, onRideStatusChanged } from '@/lib/socket';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Configure Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJ1Y2s0dSIsImEiOiJjbTEyMzQ1Njc4OTAxMmxxZjNkaDV6Z2huIn0.demo';

const STATUS_CONFIG = {
  PENDING_BIDS: {
    label: 'En attente d\'offres',
    color: 'blue',
    step: 0,
    description: 'Les transporteurs reçoivent votre demande',
  },
  BID_ACCEPTED: {
    label: 'Offre acceptée',
    color: 'green',
    step: 1,
    description: 'Paiement en attente de confirmation',
  },
  DRIVER_ARRIVING: {
    label: 'Transporteur en route',
    color: 'orange',
    step: 2,
    description: 'Le transporteur arrive au point de départ',
  },
  PICKUP_ARRIVED: {
    label: 'Arrivé au départ',
    color: 'cyan',
    step: 3,
    description: 'Chargement en préparation',
  },
  LOADING: {
    label: 'Chargement',
    color: 'violet',
    step: 4,
    description: 'Chargement de la marchandise',
  },
  IN_TRANSIT: {
    label: 'En transit',
    color: 'grape',
    step: 5,
    description: 'Transport en cours vers la destination',
  },
  DROPOFF_ARRIVED: {
    label: 'Arrivé à destination',
    color: 'lime',
    step: 6,
    description: 'Déchargement en cours',
  },
  COMPLETED: {
    label: 'Terminée',
    color: 'teal',
    step: 7,
    description: 'Course terminée avec succès',
  },
  CANCELLED: {
    label: 'Annulée',
    color: 'red',
    step: -1,
    description: 'Course annulée',
  },
};

export default function RideDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  const [ride, setRide] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const { user } = useAuthStore();

  // Connect to socket and setup real-time listeners
  useEffect(() => {
    if (!token || !user) {
      router.push('/customer/login');
      return;
    }

    // Connect socket
    const socket = connectSocket(user.id, 'customer', token);

    // Track this ride for real-time updates
    if (params.id) {
      trackRide(params.id as string, user.id);
    }

    loadRideDetails();

    // Cleanup
    return () => {
      if (params.id) {
        stopTracking(params.id as string);
      }
    };
  }, [params.id, token, user]);

  // Listen for new bids
  useEffect(() => {
    if (!params.id) return;

    const unsubscribe = onNewBid((bidData: any) => {
      console.log('🎯 New bid received:', bidData);

      // Add to bids list
      setBids((prev) => {
        const exists = prev.find(b => b.id === bidData.bidId);
        if (exists) return prev;

        return [...prev, {
          id: bidData.bidId,
          rideId: bidData.rideId,
          driver: bidData.driver,
          amount: bidData.proposedPrice,
          estimatedDuration: bidData.estimatedArrival,
          message: bidData.message,
          createdAt: bidData.createdAt,
        }];
      });

      // Mark as new
      setNewBidIds((prev) => new Set(prev).add(bidData.bidId));

      // Show notification
      notifications.show({
        title: '🎉 Nouvelle offre reçue !',
        message: `${bidData.driver?.name} vous propose ${bidData.proposedPrice} DT`,
        color: 'green',
        icon: <IconBell />,
        autoClose: 5000,
      });

      // Play sound (optional)
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {});
      } catch (error) {
        // Ignore sound errors
      }
    });

    return () => {
      unsubscribe();
    };
  }, [params.id]);

  // Listen for driver location updates
  useEffect(() => {
    if (!params.id) return;

    const unsubscribe = onDriverMoved((locationData: any) => {
      console.log('📍 Driver location updated:', locationData);
      updateDriverPosition({ lat: locationData.lat, lng: locationData.lng });
    });

    return () => {
      unsubscribe();
    };
  }, [params.id]);

  // Listen for ride status changes
  useEffect(() => {
    if (!params.id) return;

    const unsubscribe = onRideStatusChanged((statusData: any) => {
      console.log('📦 Ride status changed:', statusData);

      setRide((prev: any) => ({
        ...prev,
        status: statusData.status,
      }));

      // Show notification
      const statusInfo = STATUS_CONFIG[statusData.status as keyof typeof STATUS_CONFIG];
      if (statusInfo) {
        notifications.show({
          title: `Statut mis à jour`,
          message: statusInfo.description,
          color: statusInfo.color,
          autoClose: 4000,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [params.id]);

  useEffect(() => {
    if (ride && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [ride]);

  const loadRideDetails = async () => {
    try {
      const response = await rideApi.getById(params.id as string);
      setRide(response.data);

      // Load bids if pending
      if (response.data.status === 'PENDING_BIDS') {
        const bidsResponse = await rideApi.getBids(params.id as string);
        setBids(bidsResponse.data || []);
      }

      // Update driver position on map if in transit
      if (response.data.driver && ['DRIVER_ARRIVING', 'IN_TRANSIT'].includes(response.data.status)) {
        updateDriverPosition(response.data.driver.currentLocation);
      }
    } catch (error) {
      console.error('Error loading ride:', error);
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
      zoom: 12,
    });

    // Add pickup marker
    const pickupEl = document.createElement('div');
    pickupEl.innerHTML = '📍';
    pickupEl.style.fontSize = '32px';
    new mapboxgl.Marker(pickupEl)
      .setLngLat([ride.pickup.lng, ride.pickup.lat])
      .addTo(map.current);

    // Add dropoff marker
    const dropoffEl = document.createElement('div');
    dropoffEl.innerHTML = '🏁';
    dropoffEl.style.fontSize = '32px';
    new mapboxgl.Marker(dropoffEl)
      .setLngLat([ride.dropoff.lng, ride.dropoff.lat])
      .addTo(map.current);

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds()
      .extend([ride.pickup.lng, ride.pickup.lat])
      .extend([ride.dropoff.lng, ride.dropoff.lat]);
    map.current.fitBounds(bounds, { padding: 80 });

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
            paint: { 'line-color': '#000', 'line-width': 4, 'line-opacity': 0.8 },
          });
        }
      }
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  };

  const updateDriverPosition = (location: any) => {
    if (!map.current || !location) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([location.lng, location.lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = '🚚';
      el.style.fontSize = '32px';
      driverMarker.current = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .addTo(map.current);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    try {
      await rideApi.acceptBid(params.id as string, bidId);
      // Redirect to payment
      router.push(`/customer/payment/${params.id}?bidId=${bidId}`);
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'acceptation');
    }
  };

  const handleCancelRide = async () => {
    try {
      await rideApi.cancel(params.id as string);
      setCancelModalOpen(false);
      router.push('/customer/dashboard');
    } catch (error: any) {
      console.error('Error cancelling ride:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleSubmitRating = async () => {
    try {
      await rideApi.rate(params.id as string, rating, review);
      setRatingModalOpen(false);
      loadRideDetails();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'évaluation');
    }
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Text>Chargement...</Text>
      </Container>
    );
  }

  if (!ride) {
    return (
      <Container size="lg" py="xl">
        <Text>Course introuvable</Text>
      </Container>
    );
  }

  const statusConfig = STATUS_CONFIG[ride.status as keyof typeof STATUS_CONFIG];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
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
            <div style={{ textAlign: 'center' }}>
              <Text size="sm" c="dimmed">Course #{ride.id.slice(0, 8)}</Text>
              <Badge color={statusConfig.color} size="lg" mt={4}>
                {statusConfig.label}
              </Badge>
            </div>
            <div style={{ width: 40 }} />
          </Group>
        </Container>
      </Paper>

      <Container size="xl" py="xl">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Map */}
          <div>
            <Paper shadow="sm" radius="lg" withBorder style={{ height: '600px', overflow: 'hidden' }}>
              <div ref={mapContainer} style={{ height: '100%' }} />
            </Paper>
          </div>

          {/* Right: Details */}
          <div>
            <Stack gap="lg">
              {/* Status Stepper */}
              <Card shadow="sm" padding="xl" radius="lg" withBorder>
                <Title order={3} size="1.25rem" mb="md">Progression</Title>
                <Stepper active={statusConfig.step} orientation="vertical" size="sm">
                  <Stepper.Step label="En attente" description="Recherche de transporteurs" />
                  <Stepper.Step label="Offre acceptée" description="Paiement confirmé" />
                  <Stepper.Step label="En route" description="Vers point de départ" />
                  <Stepper.Step label="Chargement" description="Préparation" />
                  <Stepper.Step label="Transport" description="En cours" />
                  <Stepper.Step label="Livraison" description="Déchargement" />
                  <Stepper.Step label="Terminé" description="Course complétée" />
                </Stepper>
              </Card>

              {/* Addresses */}
              <Card shadow="sm" padding="xl" radius="lg" withBorder>
                <Stack gap="md">
                  <div>
                    <Group gap="xs" mb={4}>
                      <IconMapPin size={18} color="#51cf66" />
                      <Text size="sm" fw={600}>Départ</Text>
                    </Group>
                    <Text size="sm" pl={26}>{ride.pickup.address}</Text>
                  </div>
                  <Divider />
                  <div>
                    <Group gap="xs" mb={4}>
                      <IconMapPin size={18} color="#ff6b6b" />
                      <Text size="sm" fw={600}>Arrivée</Text>
                    </Group>
                    <Text size="sm" pl={26}>{ride.dropoff.address}</Text>
                  </div>
                </Stack>
              </Card>

              {/* Driver Info (if assigned) */}
              {ride.driver && (
                <Card shadow="sm" padding="xl" radius="lg" withBorder>
                  <Group justify="space-between" mb="md">
                    <Group gap="md">
                      <Avatar size="lg" radius="xl" color="dark">
                        <IconTruck size={24} />
                      </Avatar>
                      <div>
                        <Text fw={700}>{ride.driver.name}</Text>
                        <Group gap="xs">
                          <Rating value={ride.driver.rating || 5} readOnly size="sm" />
                          <Text size="sm" c="dimmed">({ride.driver.totalRides || 0} courses)</Text>
                        </Group>
                      </div>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon size="lg" radius="xl" color="green" variant="light">
                        <IconPhone size={20} />
                      </ActionIcon>
                      <ActionIcon size="lg" radius="xl" color="blue" variant="light">
                        <IconMessageCircle size={20} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {ride.vehicleType} • {ride.driver.vehicleNumber}
                  </Text>
                </Card>
              )}

              {/* Bids (if pending) */}
              {ride.status === 'PENDING_BIDS' && bids.length > 0 && (
                <Card shadow="sm" padding="xl" radius="lg" withBorder>
                  <Group justify="space-between" mb="md">
                    <Title order={3} size="1.25rem">Offres reçues</Title>
                    <Badge size="lg" variant="filled" color="blue" circle>
                      {bids.length}
                    </Badge>
                  </Group>
                  <Stack gap="md">
                    {bids.map((bid) => {
                      const isNew = newBidIds.has(bid.id);
                      return (
                        <Indicator
                          key={bid.id}
                          label="NOUVEAU!"
                          color="green"
                          size={16}
                          disabled={!isNew}
                          position="top-end"
                          offset={10}
                        >
                          <Paper
                            p="md"
                            radius="md"
                            withBorder
                            style={{
                              borderColor: isNew ? '#40c057' : undefined,
                              borderWidth: isNew ? 2 : 1,
                              transition: 'all 0.3s ease',
                            }}
                          >
                            <Group justify="space-between" align="flex-start">
                              <div>
                                <Group gap="xs">
                                  <Text fw={700}>{bid.driver?.name || 'Driver'}</Text>
                                  {bid.driver?.verified && (
                                    <Badge size="xs" color="blue" variant="dot">
                                      Vérifié
                                    </Badge>
                                  )}
                                </Group>
                                <Group gap="xs" mt={4}>
                                  <Rating value={bid.driver?.rating || 5} readOnly size="xs" />
                                  <Text size="xs" c="dimmed">
                                    ({bid.driver?.totalRides || 0} courses)
                                  </Text>
                                </Group>
                                <Group gap="md" mt="sm">
                                  <Group gap={4}>
                                    <IconClock size={14} />
                                    <Text size="xs" c="dimmed">
                                      ETA: {bid.estimatedDuration || 'N/A'} min
                                    </Text>
                                  </Group>
                                  {bid.driver?.vehicleType && (
                                    <Group gap={4}>
                                      <IconTruck size={14} />
                                      <Text size="xs" c="dimmed">
                                        {bid.driver.vehicleType}
                                      </Text>
                                    </Group>
                                  )}
                                </Group>
                                {bid.message && (
                                  <Text size="sm" c="dimmed" mt="sm" style={{ fontStyle: 'italic' }}>
                                    "{bid.message}"
                                  </Text>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <Title order={3} size="1.5rem" c="dark">
                                  {bid.amount} DT
                                </Title>
                                <Group gap="xs" mt="xs">
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="red"
                                    onClick={() => {
                                      // Remove from new bids
                                      setNewBidIds((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(bid.id);
                                        return newSet;
                                      });
                                      notifications.show({
                                        title: 'Offre refusée',
                                        message: 'L\'offre a été refusée',
                                        color: 'red',
                                      });
                                    }}
                                  >
                                    Refuser
                                  </Button>
                                  <Button
                                    size="sm"
                                    radius="md"
                                    color="dark"
                                    onClick={() => {
                                      handleAcceptBid(bid.id);
                                      // Remove from new bids
                                      setNewBidIds((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(bid.id);
                                        return newSet;
                                      });
                                    }}
                                  >
                                    Accepter
                                  </Button>
                                </Group>
                              </div>
                            </Group>
                          </Paper>
                        </Indicator>
                      );
                    })}
                  </Stack>
                </Card>
              )}

              {/* Actions */}
              <Card shadow="sm" padding="xl" radius="lg" withBorder>
                <Stack gap="md">
                  {ride.status === 'PENDING_BIDS' && (
                    <Button
                      variant="light"
                      color="red"
                      fullWidth
                      radius="xl"
                      leftSection={<IconX size={18} />}
                      onClick={() => setCancelModalOpen(true)}
                    >
                      Annuler la course
                    </Button>
                  )}

                  {ride.status === 'COMPLETED' && !ride.rating && (
                    <Button
                      fullWidth
                      radius="xl"
                      color="dark"
                      onClick={() => setRatingModalOpen(true)}
                    >
                      Évaluer la course
                    </Button>
                  )}
                </Stack>
              </Card>
            </Stack>
          </div>
        </div>
      </Container>

      {/* Cancel Modal */}
      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Annuler la course"
        centered
      >
        <Stack gap="md">
          <Text>Êtes-vous sûr de vouloir annuler cette course ?</Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={() => setCancelModalOpen(false)}>
              Non, garder
            </Button>
            <Button color="red" onClick={handleCancelRide}>
              Oui, annuler
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Rating Modal */}
      <Modal
        opened={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        title="Évaluer la course"
        centered
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">Note</Text>
            <Rating value={rating} onChange={setRating} size="xl" />
          </div>
          <Textarea
            label="Commentaire (optionnel)"
            placeholder="Partagez votre expérience..."
            rows={4}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <Button fullWidth color="dark" onClick={handleSubmitRating}>
            Envoyer l'évaluation
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
