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
import { rideApi, paymentApi, cancellationApi } from '@/lib/api';
import { connectSocket, onNewBid, onNotification, onRideCancelled } from '@/lib/socket';
import ChatBox from '@/components/ChatBox';
import { TripMap } from '@/components/map/TripMap';
import { useTripTracking } from '@/hooks/useTripTracking';
import type { GeoJSONLineString } from '@/types/geolocation';

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

// Helper function to format ETA in a human-readable way
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

// Helper function to format time only
const formatTime = (datetime: string | null): string => {
  if (!datetime) return '--:--';
  return new Date(datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export default function RideDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { token, user } = useAuthStore();

  const [ride, setRide] = useState<any>(null);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSONLineString | null>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [gracePeriodRemaining, setGracePeriodRemaining] = useState<number | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingPunctuality, setRatingPunctuality] = useState(5);
  const [ratingCare, setRatingCare] = useState(5);
  const [ratingCommunication, setRatingCommunication] = useState(5);
  const [review, setReview] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBidForPayment, setSelectedBidForPayment] = useState<any>(null);
  const [confirmDeliveryModalOpen, setConfirmDeliveryModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  // Real-time trip tracking
  const {
    driverLocation,
    status: trackingStatus,
    isConnected,
    eta,
  } = useTripTracking(params.id as string | null, {
    userRole: 'customer',
    onStatusChange: (newStatus) => {
      console.log('📦 Ride status changed:', newStatus);
      setRide((prev: any) => ({
        ...prev,
        status: newStatus,
      }));

      // Show notification
      const statusInfo = STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG];
      if (statusInfo) {
        notifications.show({
          title: `Statut mis à jour`,
          message: statusInfo.description,
          color: statusInfo.color,
          autoClose: 4000,
        });
      }
    },
    onETAUpdate: (etaData) => {
      console.log('⏱️ ETA updated:', etaData);
      setRide((prev: any) => ({
        ...prev,
        estimatedPickupTime: etaData.estimatedPickupTime,
        estimatedDeliveryTime: etaData.estimatedDeliveryTime,
      }));
    },
  });

  // Initial load
  useEffect(() => {
    if (!token || !user) {
      router.push('/customer/login');
      return;
    }

    loadRideDetails();
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

  // Calculate grace period remaining time
  useEffect(() => {
    if (!ride || ride.status === 'PENDING_BIDS' || ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      setGracePeriodRemaining(null);
      return;
    }

    // Use ride.updatedAt as approximate bid acceptance time
    const bidAcceptedAt = new Date(ride.updatedAt);
    const fiveMinutesLater = new Date(bidAcceptedAt.getTime() + 5 * 60 * 1000);

    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, fiveMinutesLater.getTime() - now.getTime());
      setGracePeriodRemaining(Math.floor(remaining / 1000)); // in seconds
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [ride]);

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

  // Listen for ride cancellation by driver
  useEffect(() => {
    if (!params.id || !user) return;

    const unsubscribe = onRideCancelled((data: any) => {
      console.log('🚫 Ride cancelled by driver:', data);

      // Show notification to customer
      notifications.show({
        title: '⚠️ Course annulée',
        message: 'Le chauffeur a annulé la course. Vous serez remboursé intégralement.',
        color: 'orange',
        autoClose: 7000,
      });

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/customer/dashboard');
      }, 3000);
    });

    return () => {
      unsubscribe();
    };
  }, [params.id, user]);

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
        autoClose: data.type === 'driver_approaching' || data.type === 'delivery_approaching' ? 8000 : 5000,
      });

      // Play sound for important notifications
      if (data.type === 'driver_arrived_pickup' || data.type === 'delivery_arrived') {
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(() => {});
        } catch (error) {
          // Ignore sound errors
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, token]);

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

      // Fetch route geometry for map
      if (response.data.pickup && response.data.dropoff) {
        fetchRouteGeometry(response.data.pickup, response.data.dropoff);
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

  const fetchRouteGeometry = async (pickup: any, dropoff: any) => {
    try {
      const response = await fetch('/api/routing/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, dropoff }),
      });
      const data = await response.json();

      if (data.route?.geometry) {
        setRouteGeometry(data.route.geometry);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
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
    setCancelling(true);
    try {
      const response = await cancellationApi.cancelAsCustomer(params.id as string, cancelReason);

      notifications.show({
        title: 'Course annulée',
        message: response.data.message,
        color: response.data.cancellation.wasWithinGracePeriod ? 'green' : 'orange',
        autoClose: 5000,
      });

      setCancelModalOpen(false);
      setCancelReason('');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/customer/dashboard');
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

  const handleSubmitRating = async () => {
    try {
      await rideApi.rate(
        params.id as string,
        {
          punctuality: ratingPunctuality,
          care: ratingCare,
          communication: ratingCommunication,
        },
        review
      );
      setRatingModalOpen(false);

      const overallRating = ((ratingPunctuality + ratingCare + ratingCommunication) / 3).toFixed(1);

      notifications.show({
        title: 'Merci pour votre évaluation !',
        message: `Vous avez noté le conducteur ${overallRating}/5 étoiles`,
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
            <Paper shadow="sm" radius="lg" withBorder style={{ height: '600px', overflow: 'hidden', position: 'relative' }}>
              {ride && (
                <TripMap
                  pickup={ride.pickup}
                  dropoff={ride.dropoff}
                  route={routeGeometry || undefined}
                  driverLocation={driverLocation || undefined}
                  height="100%"
                  showRoute={!!routeGeometry}
                  fitBounds
                />
              )}
              {!ride && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Text c="dimmed">Chargement de la carte...</Text>
                </div>
              )}
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

              {/* Cancel Button - Show when cancellable */}
              {ride && !['COMPLETED', 'CANCELLED', 'PENDING_BIDS'].includes(ride.status) && (
                <Card shadow="sm" padding="lg" radius="lg" withBorder style={{ borderColor: '#FA5252' }}>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <div>
                        <Text fw={600} size="lg">Annuler la course</Text>
                        {gracePeriodRemaining !== null && gracePeriodRemaining > 0 && (
                          <Text size="sm" c="green">
                            ✓ Annulation gratuite • Encore {Math.floor(gracePeriodRemaining / 60)}:{(gracePeriodRemaining % 60).toString().padStart(2, '0')}
                          </Text>
                        )}
                        {gracePeriodRemaining !== null && gracePeriodRemaining <= 0 && (
                          <Text size="sm" c="orange">
                            ⚠️ Frais d'annulation: 5 DT
                          </Text>
                        )}
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
                            <Text size="xs" c="dimmed" mb={4}>Arrivée au point de départ</Text>
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
                      <ActionIcon
                        size="lg"
                        radius="xl"
                        color="blue"
                        variant="light"
                        onClick={() => setChatModalOpen(true)}
                      >
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
                                  <Badge
                                    size="lg"
                                    variant="light"
                                    color="blue"
                                    leftSection={<IconClock size={14} />}
                                  >
                                    Arrivée: {bid.estimatedDuration || 'N/A'} min
                                  </Badge>
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
                                <Text size="xs" c="dimmed">
                                  +20 DT frais = {bid.amount + 20} DT
                                </Text>
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
        size="lg"
      >
        <Stack gap="lg">
          {/* Grace period timer */}
          {gracePeriodRemaining !== null && gracePeriodRemaining > 0 && (
            <Paper p="md" withBorder style={{ backgroundColor: '#E7F5FF', borderColor: '#228BE6' }}>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconClock size={20} color="#228BE6" />
                  <Text fw={600} c="blue">Période de grâce active</Text>
                </Group>
                <Text size="lg" fw={700} c="blue" ta="center">
                  {Math.floor(gracePeriodRemaining / 60)}:{(gracePeriodRemaining % 60).toString().padStart(2, '0')}
                </Text>
                <Text size="sm" c="dimmed">
                  Annulation gratuite pendant encore {Math.floor(gracePeriodRemaining / 60)} min {gracePeriodRemaining % 60} sec
                </Text>
              </Stack>
            </Paper>
          )}

          {/* Warning about fees */}
          {gracePeriodRemaining !== null && gracePeriodRemaining <= 0 && (
            <Paper p="md" withBorder style={{ backgroundColor: '#FFF3E0', borderColor: '#FF9800' }}>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconAlertCircle size={20} color="#FF9800" />
                  <Text fw={600} c="orange">Frais d'annulation tardive</Text>
                </Group>
                <Text size="sm">
                  La période de grâce de 5 minutes est terminée. <strong>5 DT</strong> seront prélevés comme frais d'annulation.
                </Text>
              </Stack>
            </Paper>
          )}

          {/* Confirmation text */}
          <Text>Êtes-vous sûr de vouloir annuler cette course ?</Text>

          {/* Reason (optional) */}
          <Textarea
            label="Raison (optionnel)"
            placeholder="Ex: Changement de plan, problème de disponibilité..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />

          {/* Refund info */}
          <Paper p="sm" withBorder style={{ backgroundColor: '#F8F9FA' }}>
            <Text size="sm" c="dimmed">
              {gracePeriodRemaining && gracePeriodRemaining > 0
                ? "✓ Remboursement intégral des frais de plateforme (20 DT)"
                : "✓ Remboursement: 20 DT - 5 DT = 15 DT"}
            </Text>
          </Paper>

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason('');
              }}
              disabled={cancelling}
            >
              Annuler l'annulation
            </Button>
            <Button
              color="red"
              onClick={handleCancelRide}
              loading={cancelling}
              leftSection={<IconX size={18} />}
            >
              Confirmer l'annulation
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
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Prix conducteur</Text>
                <Text size="sm" fw={500}>{ride?.finalPrice || selectedBidForPayment?.amount || 0} DT</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Frais plateforme</Text>
                <Text size="sm" fw={500} c="blue">+20 DT</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text fw={600}>Total à payer</Text>
                <Title order={2}>{(ride?.finalPrice || selectedBidForPayment?.amount || 0) + 20} DT</Title>
              </Group>
            </Stack>
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
            </Text>
            <Divider my="xs" />
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Prix conducteur</Text>
                <Text size="xs">{ride?.finalPrice} DT</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Frais plateforme</Text>
                <Text size="xs" c="blue">+20 DT</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" fw={600}>Total</Text>
                <Text size="sm" fw={600}>{(ride?.finalPrice || 0) + 20} DT</Text>
              </Group>
            </Stack>
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
        title="Évaluer le conducteur"
        centered
        size="md"
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            Évaluez votre expérience selon ces critères
          </Text>

          {/* Punctuality */}
          <div>
            <Group gap="xs" mb="xs">
              <Text size="sm" fw={500}>🕐 Ponctualité</Text>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">
              A-t-il respecté les délais ?
            </Text>
            <Rating value={ratingPunctuality} onChange={setRatingPunctuality} size="lg" />
          </div>

          <Divider />

          {/* Care */}
          <div>
            <Group gap="xs" mb="xs">
              <Text size="sm" fw={500}>📦 Soin</Text>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">
              A-t-il manipulé la marchandise avec précaution ?
            </Text>
            <Rating value={ratingCare} onChange={setRatingCare} size="lg" />
          </div>

          <Divider />

          {/* Communication */}
          <div>
            <Group gap="xs" mb="xs">
              <Text size="sm" fw={500}>💬 Communication</Text>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">
              Était-il réactif et clair ?
            </Text>
            <Rating value={ratingCommunication} onChange={setRatingCommunication} size="lg" />
          </div>

          <Divider />

          {/* Overall */}
          <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>Note globale</Text>
              <Badge size="lg" variant="filled" color="blue">
                {((ratingPunctuality + ratingCare + ratingCommunication) / 3).toFixed(1)}/5
              </Badge>
            </Group>
          </Paper>

          <Textarea
            label="Commentaire (optionnel)"
            placeholder="Partagez votre expérience..."
            rows={3}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />

          <Button fullWidth color="dark" size="lg" onClick={handleSubmitRating}>
            Envoyer l'évaluation
          </Button>
        </Stack>
      </Modal>

      {/* Chat Modal */}
      {ride?.driver && (
        <ChatBox
          opened={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          rideId={params.id as string}
          userType="CUSTOMER"
          token={token!}
        />
      )}
    </div>
  );
}
