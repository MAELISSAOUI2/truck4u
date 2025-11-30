'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Paper,
  Progress,
  Switch,
  Avatar,
  Divider,
  Loader,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconTruck,
  IconCash,
  IconStar,
  IconMapPin,
  IconClock,
  IconPackage,
  IconChevronRight,
  IconBell,
  IconSettings,
  IconLogout,
  IconCalculator,
  IconCalendar,
  IconRoute,
} from '@tabler/icons-react';
import { useAuthStore, useDriverStore } from '@/lib/store';
import { driverApi, rideApi } from '@/lib/api';
import { connectSocket, driverOnline, driverOffline, onBidAccepted, onRideRequest, onRideRated, disconnectSocket } from '@/lib/socket';

const STATUS_COLORS: Record<string, string> = {
  DRIVER_ARRIVING: 'orange',
  PICKUP_ARRIVED: 'cyan',
  LOADING: 'violet',
  IN_TRANSIT: 'grape',
  DROPOFF_ARRIVED: 'lime',
  COMPLETED: 'teal',
};

export default function DriverDashboard() {
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const { isOnline, setIsOnline } = useDriverStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRides: 0,
    activeRides: 0,
    completedToday: 0,
    rating: 0,
    earnings: {
      today: 0,
      week: 0,
      month: 0,
    },
  });
  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [availableRides, setAvailableRides] = useState<any[]>([]);

  useEffect(() => {
    // Wait for Zustand to rehydrate from localStorage before checking auth
    if (!_hasHydrated) return;

    if (!token || !user) {
      router.push('/driver/login');
      return;
    }

    // Check verification status - only APPROVED drivers can access dashboard
    if (user.verificationStatus === 'PENDING_DOCUMENTS' || user.verificationStatus === 'REJECTED') {
      router.push('/driver/kyc');
      return;
    }

    if (user.verificationStatus === 'PENDING_REVIEW') {
      router.push('/driver/pending');
      return;
    }

    loadDashboardData();
  }, [token, user, _hasHydrated]);

  // Listen for bid accepted - redirect to ride page
  useEffect(() => {
    if (!token || !user) return;

    console.log('🎧 Setting up bid_accepted listener for driver:', user.id);

    // Connect socket
    connectSocket(user.id, 'driver', token);

    // Listen for bid acceptance
    const unsubscribe = onBidAccepted((data: any) => {
      console.log('✅ Bid accepted!', data);

      notifications.show({
        title: 'Offre acceptée ! 🎉',
        message: 'Le client a accepté votre offre. Redirection vers la course...',
        color: 'green',
        autoClose: 3000,
      });

      // Redirect to ride page after short delay
      setTimeout(() => {
        router.push(`/driver/rides/${data.rideId}`);
      }, 1500);
    });

    return () => {
      unsubscribe();
    };
  }, [token, user]);

  // Listen for new ride requests in real-time
  useEffect(() => {
    if (!token || !user || !isOnline) return;

    console.log('🎧 Setting up ride_request listener for driver:', user.id);

    // Listen for new ride requests
    const unsubscribe = onRideRequest((data: any) => {
      console.log('🚨 New ride request received!', data);

      notifications.show({
        title: '🚛 Nouvelle course disponible!',
        message: `${data.pickup.address} → ${data.dropoff.address} (${data.distance}km)`,
        color: 'blue',
        autoClose: false,
        onClick: () => {
          router.push('/driver/dashboard');
        }
      });

      // Refresh available rides list
      loadDashboardData();
    });

    return () => {
      unsubscribe();
    };
  }, [token, user, isOnline]);

  // Listen for ride ratings
  useEffect(() => {
    if (!token || !user) return;

    console.log('🎧 Setting up ride_rated listener for driver:', user.id);

    const unsubscribe = onRideRated((data: any) => {
      console.log('⭐ Ride rated!', data);

      // Update stats with new rating
      setStats(prev => ({
        ...prev,
        rating: data.newAverageRating || prev.rating,
      }));

      // Update user rating in auth store
      const { updateUser } = useAuthStore.getState();
      updateUser({ rating: data.newAverageRating });

      // Show notification
      notifications.show({
        title: '⭐ Nouvelle évaluation',
        message: data.message || `Note : ${data.overallRating}/5`,
        color: 'yellow',
        autoClose: 5000,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [token, user]);

  const loadDashboardData = async () => {
    try {
      // Load active rides
      const ridesResponse = await rideApi.getHistory();
      const rides = ridesResponse.data?.rides || [];

      const active = rides.filter((r: any) =>
        ['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(r.status)
      );

      const completedToday = rides.filter((r: any) => {
        if (r.status !== 'COMPLETED') return false;
        const today = new Date().setHours(0, 0, 0, 0);
        const rideDate = new Date(r.completedAt || r.updatedAt).setHours(0, 0, 0, 0);
        return today === rideDate;
      });

      setActiveRides(active);

      // Load available rides
      try {
        const availableResponse = await driverApi.getAvailableRides();
        setAvailableRides(availableResponse.data?.rides || []);
      } catch (error) {
        console.log('No available rides');
      }

      // Calculate stats
      setStats({
        totalRides: rides.length,
        activeRides: active.length,
        completedToday: completedToday.length,
        rating: user?.rating || 0,
        earnings: {
          today: completedToday.reduce((sum: number, r: any) => sum + (r.finalPrice || 0), 0),
          week: 0, // TODO: Calculate from API
          month: 0, // TODO: Calculate from API
        },
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      if (!isOnline && user) {
        // Get current location
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            // Connect socket and go online
            connectSocket(user.id, 'driver', token!);
            driverOnline(user.id, location);

            // Update availability with location
            await driverApi.updateAvailability(true, location);
            setIsOnline(true);

            notifications.show({
              title: 'En ligne',
              message: 'Vous êtes maintenant en ligne et visible aux clients',
              color: 'green',
            });

            // Reload data to show available rides
            loadDashboardData();
          },
          (error) => {
            notifications.show({
              title: 'Géolocalisation requise',
              message: 'Veuillez activer la géolocalisation pour vous mettre en ligne',
              color: 'red',
            });
            console.error('Geolocation error:', error);
          }
        );
      } else if (user) {
        // Go offline
        driverOffline(user.id);
        await driverApi.updateAvailability(false);
        setIsOnline(false);

        notifications.show({
          title: 'Hors ligne',
          message: 'Vous êtes maintenant hors ligne',
          color: 'gray',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de changer le statut',
        color: 'red',
      });
      console.error('Error toggling availability:', error);
    }
  };

  const handleLogout = () => {
    // Disconnect driver if online
    if (isOnline && user) {
      driverOffline(user.id);
    }
    disconnectSocket();
    setIsOnline(false);
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="xl" radius={0} withBorder>
        <Container size="lg">
          <Group justify="space-between">
            <div>
              <Group gap="md">
                <Avatar size="lg" color="dark" radius="xl">
                  {user?.name?.charAt(0) || 'D'}
                </Avatar>
                <div>
                  <Title order={2} size="1.75rem">
                    Bonjour, {user?.name}!
                  </Title>
                  <Group gap="xs" mt={4}>
                    <IconStar size={16} fill="#FFD700" color="#FFD700" />
                    <Text size="sm" c="dimmed">
                      {stats.rating.toFixed(1)} • {stats.totalRides} courses
                    </Text>
                  </Group>
                </div>
              </Group>
            </div>
            <Group gap="md">
              <Button
                variant="light"
                leftSection={<IconSettings size={18} />}
                onClick={() => router.push('/driver/profile')}
              >
                Profil
              </Button>
              <Button
                variant="outline"
                color="red"
                leftSection={<IconLogout size={18} />}
                onClick={handleLogout}
              >
                Déconnexion
              </Button>
              <Paper p="md" radius="md" withBorder>
                <Group gap="sm">
                  <Switch
                    size="lg"
                    checked={isOnline}
                    onChange={handleToggleOnline}
                    color="green"
                    onLabel="EN LIGNE"
                    offLabel="HORS LIGNE"
                  />
                  <div>
                    <Text size="xs" c="dimmed">Statut</Text>
                    <Badge color={isOnline ? 'green' : 'gray'} variant="dot">
                      {isOnline ? 'Disponible' : 'Indisponible'}
                    </Badge>
                  </div>
                </Group>
              </Paper>
            </Group>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Stats Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text c="dimmed" size="sm">Aujourd'hui</Text>
                <IconCash size={20} color="#40c057" />
              </Group>
              <Title order={2} size="2rem">{stats.earnings.today} DT</Title>
              <Text size="xs" c="dimmed" mt={4}>
                {stats.completedToday} course{stats.completedToday > 1 ? 's' : ''}
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text c="dimmed" size="sm">En cours</Text>
                <IconTruck size={20} color="#228be6" />
              </Group>
              <Title order={2} size="2rem">{stats.activeRides}</Title>
              <Text size="xs" c="dimmed" mt={4}>
                Course{stats.activeRides > 1 ? 's' : ''} active{stats.activeRides > 1 ? 's' : ''}
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text c="dimmed" size="sm">Disponibles</Text>
                <IconPackage size={20} color="#fd7e14" />
              </Group>
              <Title order={2} size="2rem">{availableRides.length}</Title>
              <Text size="xs" c="dimmed" mt={4}>
                Nouvelle{availableRides.length > 1 ? 's' : ''} demande{availableRides.length > 1 ? 's' : ''}
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text c="dimmed" size="sm">Note moyenne</Text>
                <IconStar size={20} fill="#FFD700" color="#FFD700" />
              </Group>
              <Title order={2} size="2rem">{stats.rating.toFixed(1)}</Title>
              <Text size="xs" c="dimmed" mt={4}>
                Sur {stats.totalRides} course{stats.totalRides > 1 ? 's' : ''}
              </Text>
            </Card>
          </SimpleGrid>

          {/* Active Rides */}
          {activeRides.length > 0 && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3} size="1.25rem">Courses en cours</Title>
                <Badge size="lg" variant="filled" color="blue" circle>
                  {activeRides.length}
                </Badge>
              </Group>
              <Stack gap="md">
                {activeRides.map((ride) => (
                  <Paper
                    key={ride.id}
                    p="md"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/driver/rides/${ride.id}`)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Badge color={STATUS_COLORS[ride.status] || 'gray'}>
                            {ride.status}
                          </Badge>
                          <Text size="sm" fw={500}>
                            #{ride.id.slice(0, 8)}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconMapPin size={14} />
                          <Text size="sm" lineClamp={1}>
                            {ride.pickup?.address}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconMapPin size={14} color="#228BE6" />
                          <Text size="sm" lineClamp={1}>
                            {ride.dropoff?.address}
                          </Text>
                        </Group>
                        <Group gap="md">
                          <Text size="xs" c="dimmed">
                            {ride.customer?.name}
                          </Text>
                          <Text size="sm" fw={700} c="dark">
                            {ride.finalPrice || ride.winningBid?.amount || 0} DT
                          </Text>
                        </Group>
                      </Stack>
                      <IconChevronRight size={20} color="#adb5bd" />
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}

          {/* Available Rides */}
          {isOnline && availableRides.length > 0 && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3} size="1.25rem">Nouvelles demandes</Title>
                <Button
                  variant="light"
                  rightSection={<IconChevronRight size={16} />}
                  onClick={() => router.push('/driver/available-rides')}
                >
                  Voir tout
                </Button>
              </Group>
              <Stack gap="md">
                {availableRides.slice(0, 3).map((ride) => (
                  <Paper
                    key={ride.id}
                    p="md"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/driver/available-rides/${ride.id}`)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Badge variant="dot" color="blue">Nouvelle</Badge>
                          <Text size="xs" c="dimmed">
                            Il y a {Math.floor((Date.now() - new Date(ride.createdAt).getTime()) / 60000)} min
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconMapPin size={14} />
                          <Text size="sm" lineClamp={1}>
                            {ride.pickup?.address}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconMapPin size={14} color="#228BE6" />
                          <Text size="sm" lineClamp={1}>
                            {ride.dropoff?.address}
                          </Text>
                        </Group>
                        <Group gap="md">
                          <Badge variant="light">{ride.vehicleType}</Badge>
                          <Text size="xs" c="dimmed">
                            {ride._count?.bids || 0} offre{(ride._count?.bids || 0) > 1 ? 's' : ''}
                          </Text>
                        </Group>
                      </Stack>
                      <IconChevronRight size={20} color="#adb5bd" />
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}

          {/* Tier Card */}
          {user?.tier && (
            <Card
              shadow="sm"
              padding="xl"
              radius="lg"
              withBorder
              style={{
                background:
                  user.tier === 'GOLD'
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : user.tier === 'SILVER'
                    ? 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)'
                    : 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Group gap="xs" mb="xs">
                      <Text size="3rem" style={{ lineHeight: 1 }}>
                        {user.tier === 'GOLD' ? '🥇' : user.tier === 'SILVER' ? '🥈' : '🥉'}
                      </Text>
                      <div>
                        <Title order={3} size="1.25rem" c="white">
                          Niveau {user.tier === 'GOLD' ? 'Gold' : user.tier === 'SILVER' ? 'Silver' : 'Bronze'}
                        </Title>
                        <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                          Frais plateforme: {user.tier === 'GOLD' ? '6' : user.tier === 'SILVER' ? '8' : '10'}%
                        </Text>
                      </div>
                    </Group>
                  </div>
                </Group>
                <Button
                  variant="white"
                  size="md"
                  rightSection={<IconChevronRight size={18} />}
                  onClick={() => router.push('/driver/tier')}
                >
                  Voir ma progression
                </Button>
              </Stack>
            </Card>
          )}

          {/* Schedule Card */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card shadow="sm" padding="xl" radius="lg" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Group gap="xs" mb="xs">
                      <IconCalculator size={24} color="white" />
                      <Title order={3} size="1.25rem" c="white">
                        Simulateur de gains
                      </Title>
                    </Group>
                    <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                      Calculez vos revenus potentiels
                    </Text>
                  </div>
                </Group>
                <Button
                  variant="white"
                  size="md"
                  rightSection={<IconChevronRight size={18} />}
                  onClick={() => router.push('/driver/earnings/simulator')}
                >
                  Essayer le simulateur
                </Button>
              </Stack>
            </Card>

            <Card shadow="sm" padding="xl" radius="lg" withBorder style={{ background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Group gap="xs" mb="xs">
                      <IconCalendar size={24} color="white" />
                      <Title order={3} size="1.25rem" c="white">
                        Planning Intelligent
                      </Title>
                    </Group>
                    <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                      Gérez votre disponibilité et optimisez votre temps
                    </Text>
                  </div>
                </Group>
                <Button
                  variant="white"
                  size="md"
                  rightSection={<IconChevronRight size={18} />}
                  onClick={() => router.push('/driver/schedule')}
                >
                  Gérer mon planning
                </Button>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* Return Loads Card */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Group gap="xs" mb="xs">
                    <IconRoute size={24} color="white" />
                    <Title order={3} size="1.25rem" c="white">
                      Mode retour à vide
                    </Title>
                  </Group>
                  <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                    Trouvez des chargements le long de votre trajet retour et maximisez vos gains
                  </Text>
                </div>
              </Group>
              <Button
                variant="white"
                size="md"
                rightSection={<IconChevronRight size={18} />}
                onClick={() => router.push('/driver/return-loads')}
              >
                Voir les opportunités
              </Button>
            </Stack>
          </Card>

          {/* No active rides message */}
          {!isOnline && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Stack align="center" gap="md" py="xl">
                <IconBell size={48} color="#adb5bd" />
                <Title order={3} size="1.25rem" ta="center">
                  Vous êtes hors ligne
                </Title>
                <Text size="sm" c="dimmed" ta="center" maw={400}>
                  Activez votre statut "En ligne" pour recevoir des demandes de transport
                </Text>
                <Button
                  size="lg"
                  color="green"
                  onClick={handleToggleOnline}
                  leftSection={<IconTruck size={20} />}
                >
                  Passer en ligne
                </Button>
              </Stack>
            </Card>
          )}
        </Stack>
      </Container>
    </div>
  );
}
