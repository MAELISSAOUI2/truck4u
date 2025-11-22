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
import { rideApi, paymentApi } from '@/lib/api';
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBidForPayment, setSelectedBidForPayment] = useState<any>(null);
  const [confirmDeliveryModalOpen, setConfirmDeliveryModalOpen] = useState(false);
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

  // Listen for driver completion confirmation
  useEffect(() => {
    if (!params.id || !user) return;

    const socket = connectSocket(user.id, 'customer', token!);

    const handleDriverConfirmed = (data: any) => {
      console.log('✅ Driver confirmed delivery:', data);

      // Reload ride data to get updated proofPhotos with driver confirmation
      loadRideDetails();

      notifications.show({
        title: 'Livraison confirmée',
        message: 'Le conducteur a confirmé la livraison. Veuillez confirmer la réception.',
        color: 'green',
        autoClose: false,
      });
    };

    socket.on('driver_confirmed_completion', handleDriverConfirmed);

    return () => {
      socket.off('driver_confirmed_completion', handleDriverConfirmed);
    };
  }, [params.id, user, token]);

  useEffect(() => {
    if (ride && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [ride]);

  const loadRideDetails = async () => {
    try {
      const response = await rideApi.getById(params.id as string);
      console.log('✅ Ride loaded successfully:', response.data);
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
    } catch (error: any) {
      console.error('❌ Error loading ride:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de charger la course',
        color: 'red'
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
      const response = await rideApi.acceptBid(params.id as string, bidId);

      notifications.show({
        title: 'Offre acceptée !',
        message: 'Le conducteur a été notifié. Procédez au paiement pour démarrer la course.',
        color: 'green',
      });

      // Find the accepted bid
      const acceptedBid = bids.find(b => b.id === bidId);
      setSelectedBidForPayment(acceptedBid);
      setPaymentModalOpen(true);

      // Reload ride details
      loadRideDetails();
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Erreur lors de l\'acceptation',
        color: 'red',
      });
    }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      await rideApi.rejectBid(params.id as string, bidId);

      // Remove from bids list and new bids
      setBids(prev => prev.filter(b => b.id !== bidId));
      setNewBidIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bidId);
        return newSet;
      });

      notifications.show({
        title: 'Offre refusée',
        message: 'Le conducteur a été notifié',
        color: 'orange',
      });
    } catch (error: any) {
      console.error('Error rejecting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Erreur lors du rejet',
        color: 'red',
      });
    }
  };

  const handlePayment = async (method: 'CASH' | 'CARD' | 'FLOUCI') => {
    try {
      const response = await paymentApi.initiate(params.id as string, method);

      if (method === 'CASH') {
        notifications.show({
          title: 'Paiement en espèces confirmé',
          message: 'Le conducteur confirmera la réception du paiement à la fin de la course.',
          color: 'green',
        });
        setPaymentModalOpen(false);
        loadRideDetails();
      } else if (response.data.paymentUrl) {
        // Redirect to payment gateway
        window.location.href = response.data.paymentUrl;
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Erreur lors du paiement',
        color: 'red',
      });
    }
  };

  const handleConfirmDelivery = async () => {
    try {
      await rideApi.confirmCompletionCustomer(params.id as string);

      notifications.show({
        title: 'Livraison confirmée !',
        message: 'Le paiement a été traité. Vous pouvez maintenant noter le conducteur.',
        color: 'green',
        autoClose: 5000,
      });

      setConfirmDeliveryModalOpen(false);
      loadRideDetails();

      // Open rating modal after a short delay
      setTimeout(() => setRatingModalOpen(true), 1000);
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Erreur lors de la confirmation',
        color: 'red',
      });
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

      notifications.show({
        title: 'Merci pour votre évaluation !',
        message: 'Votre note a été enregistrée avec succès.',
        color: 'green',
        autoClose: 3000,
      });

      // Redirect to dashboard after rating
      setTimeout(() => {
        router.push('/customer/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.message || 'Erreur lors de l\'évaluation',
        color: 'red',
      });
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectBid(bid.id);
                                    }}
                                  >
                                    Refuser
                                  </Button>
                                  <Button
                                    size="sm"
                                    radius="md"
                                    color="dark"
                                    onClick={(e) => {
                                      e.stopPropagation();
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

                  {ride.status === 'BID_ACCEPTED' && !ride.payment && (
                    <Button
                      fullWidth
                      radius="xl"
                      color="green"
                      onClick={() => setPaymentModalOpen(true)}
                    >
                      Effectuer le paiement
                    </Button>
                  )}

                  {ride.status === 'BID_ACCEPTED' && ride.payment?.method === 'CASH' && ride.payment?.status === 'PENDING' && (
                    <Paper p="md" withBorder style={{ background: '#e7f5ff' }}>
                      <Group gap="xs" mb="xs">
                        <IconCheck size={20} color="green" />
                        <Text size="sm" fw={600}>Paiement en espèces confirmé</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Le conducteur confirmera la réception du paiement à la fin de la course.
                      </Text>
                    </Paper>
                  )}

                  {ride.status === 'DROPOFF_ARRIVED' && (
                    <>
                      {ride.proofPhotos?.driverConfirmedCompletion ? (
                        <Paper p="md" withBorder style={{ background: '#f1f3f5' }}>
                          <Group gap="xs" mb="xs">
                            <IconCheck size={20} color="green" />
                            <Text size="sm" fw={600}>Le conducteur a confirmé la livraison</Text>
                          </Group>
                          <Text size="xs" c="dimmed">Veuillez confirmer la réception de votre marchandise</Text>
                        </Paper>
                      ) : (
                        <Paper p="md" withBorder style={{ background: '#fff3cd' }}>
                          <Group gap="xs" mb="xs">
                            <IconClock size={20} color="orange" />
                            <Text size="sm" fw={600}>En attente de confirmation du conducteur</Text>
                          </Group>
                          <Text size="xs" c="dimmed">Le conducteur doit d'abord confirmer la livraison</Text>
                        </Paper>
                      )}
                      {ride.proofPhotos?.driverConfirmedCompletion && (
                        <Button
                          fullWidth
                          radius="xl"
                          color="green"
                          size="lg"
                          leftSection={<IconCheck size={20} />}
                          onClick={() => setConfirmDeliveryModalOpen(true)}
                        >
                          Confirmer la livraison
                        </Button>
                      )}
                    </>
                  )}

                  {ride.status === 'COMPLETED' && !ride.customerRating && (
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

      {/* Payment Modal */}
      <Modal
        opened={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Paiement de la course"
        centered
        size="lg"
      >
        <Stack gap="lg">
          <Paper p="md" withBorder style={{ background: '#f8f9fa' }}>
            <Text size="sm" c="dimmed" mb={4}>Montant à payer</Text>
            <Title order={2}>{ride?.finalPrice || selectedBidForPayment?.amount || 0} DT</Title>
          </Paper>

          {ride?.driver && (
            <Paper p="md" withBorder>
              <Text size="sm" fw={600} mb="xs">Conducteur</Text>
              <Group gap="md">
                <Avatar size="lg" radius="xl" color="dark">
                  <IconTruck size={24} />
                </Avatar>
                <div>
                  <Text fw={600}>{ride.driver.name}</Text>
                  <Group gap="xs">
                    <Rating value={ride.driver.rating || 5} readOnly size="xs" />
                    <Text size="xs" c="dimmed">({ride.driver.totalRides || 0} courses)</Text>
                  </Group>
                </div>
              </Group>
            </Paper>
          )}

          <Text size="sm" c="dimmed">
            Le paiement sera gardé en attente jusqu'à la confirmation de livraison par vous et le conducteur.
          </Text>

          <Stack gap="sm">
            <Button
              fullWidth
              size="lg"
              color="dark"
              leftSection={<IconPackage size={20} />}
              onClick={() => handlePayment('CARD')}
            >
              Payer par carte
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="light"
              color="blue"
              onClick={() => handlePayment('FLOUCI')}
            >
              Payer avec Flouci
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="outline"
              color="gray"
              onClick={() => handlePayment('CASH')}
            >
              Payer en espèces
            </Button>
          </Stack>

          <Text size="xs" c="dimmed" ta="center">
            💳 Paiement sécurisé • 🔒 Montant protégé
          </Text>
        </Stack>
      </Modal>

      {/* Confirm Delivery Modal */}
      <Modal
        opened={confirmDeliveryModalOpen}
        onClose={() => setConfirmDeliveryModalOpen(false)}
        title="Confirmer la livraison"
        centered
      >
        <Stack gap="md">
          <Paper p="md" withBorder style={{ background: '#e7f5ff' }}>
            <Group gap="xs" mb="xs">
              <IconAlertCircle size={20} color="#1971c2" />
              <Text size="sm" fw={600}>Attention</Text>
            </Group>
            <Text size="sm">
              En confirmant, vous attestez avoir reçu votre marchandise en bon état.
              Le paiement de {ride?.finalPrice} DT sera alors traité.
            </Text>
          </Paper>

          <Text size="sm" c="dimmed">
            Avez-vous bien reçu votre marchandise ?
          </Text>

          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={() => setConfirmDeliveryModalOpen(false)}>
              Annuler
            </Button>
            <Button color="green" leftSection={<IconCheck size={18} />} onClick={handleConfirmDelivery}>
              Oui, confirmer
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
