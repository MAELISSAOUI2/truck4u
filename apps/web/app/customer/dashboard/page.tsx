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
  Avatar,
  SimpleGrid,
  Loader,
  Center,
  ActionIcon,
  Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPackage,
  IconClock,
  IconCheck,
  IconPlus,
  IconChevronRight,
  IconUser,
  IconTruck,
  IconMapPin,
  IconLogout,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import { NotificationBell } from '@/app/components/notifications';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadData();

    // Refresh data when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Page became visible, refreshing data...');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  const loadData = async () => {
    try {
      console.log('🔍 Loading rides data...');
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      console.log('👤 User:', user);

      const ridesRes = await rideApi.getHistory();

      console.log('📦 API Response:', ridesRes);
      console.log('📊 Rides data:', ridesRes.data);

      // L'API retourne { rides: [...] }
      const ridesArray = ridesRes.data.rides || ridesRes.data || [];
      console.log('🔢 Number of rides:', ridesArray.length);

      if (ridesArray.length > 0) {
        console.log('🎯 First ride example:', ridesArray[0]);
        console.log('📋 All ride statuses:', ridesArray.map((r: any) => r.status));
      }

      // Transform rides to add convenience fields
      const transformedRides = ridesArray.map((ride: any) => ({
        ...ride,
        pickupAddress: typeof ride.pickup === 'object' ? ride.pickup.address : ride.pickup,
        deliveryAddress: typeof ride.dropoff === 'object' ? ride.dropoff.address : ride.dropoff,
        bidsCount: ride._count?.bids || 0,
        estimatedPrice: ride.estimatedMaxPrice || ride.estimatedMinPrice,
      }));

      setRides(transformedRides);
    } catch (error: any) {
      console.error('❌ Failed to load rides:', error);
      console.error('📄 Error details:', error.response?.data);
      console.error('🔴 Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: rides.length,
    pending: rides.filter(r => r.status === 'PENDING_BIDS').length,
    inProgress: rides.filter(r => ['BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(r.status)).length,
    completed: rides.filter(r => r.status === 'COMPLETED').length,
  };

  // Debug stats
  console.log('📊 Dashboard Stats:', stats);
  console.log('📝 Rides breakdown by status:', {
    PENDING_BIDS: rides.filter(r => r.status === 'PENDING_BIDS').length,
    BID_ACCEPTED: rides.filter(r => r.status === 'BID_ACCEPTED').length,
    IN_PROGRESS: rides.filter(r => ['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(r.status)).length,
    COMPLETED: rides.filter(r => r.status === 'COMPLETED').length,
    CANCELLED: rides.filter(r => r.status === 'CANCELLED').length,
  });

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <Paper p="xl" radius={0} withBorder>
        <Container size="md">
          <Group justify="space-between" mb="xl">
            <div>
              <Text size="sm" c="dimmed" mb={4}>Bonjour,</Text>
              <Title order={1} size="2rem">{user?.name?.split(' ')[0] || 'Client'}</Title>
            </div>
            <Group gap="sm">
              <NotificationBell />
              <ActionIcon
                size="xl"
                radius="xl"
                variant="light"
                color="dark"
                onClick={() => router.push('/customer/profile')}
                title="Profil"
              >
                <IconUser size={24} />
              </ActionIcon>
              <ActionIcon
                size="xl"
                radius="xl"
                variant="light"
                color="red"
                onClick={handleLogout}
                title="Déconnexion"
              >
                <IconLogout size={24} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Stats */}
          <SimpleGrid cols={4} spacing="md">
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconPackage size={32} stroke={1.5} />
                <Title order={2} size="1.75rem">{stats.total}</Title>
                <Text size="xs" c="dimmed">Total</Text>
              </Stack>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconClock size={32} stroke={1.5} style={{ color: '#fab005' }} />
                <Title order={2} size="1.75rem" c="yellow">{stats.pending}</Title>
                <Text size="xs" c="dimmed">En attente</Text>
              </Stack>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconTruck size={32} stroke={1.5} style={{ color: '#228be6' }} />
                <Title order={2} size="1.75rem" c="blue">{stats.inProgress}</Title>
                <Text size="xs" c="dimmed">En cours</Text>
              </Stack>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconCheck size={32} stroke={1.5} style={{ color: '#51cf66' }} />
                <Title order={2} size="1.75rem" c="green">{stats.completed}</Title>
                <Text size="xs" c="dimmed">Terminées</Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container size="md" mt="xl">
        <Stack gap="xl">
          {/* CTA Card */}
          <Card 
            shadow="sm" 
            padding="xl" 
            radius="lg"
            style={{ background: 'linear-gradient(135deg, #000 0%, #333 100%)', cursor: 'pointer' }}
            onClick={() => router.push('/customer/new-ride')}
          >
            <Group justify="space-between" align="flex-start">
              <Stack gap="xs">
                <Title order={2} c="white">Nouvelle course</Title>
                <Text c="gray.3">Trouvez un transporteur en quelques minutes</Text>
                <Group gap="xs" mt="xs">
                  <IconTruck size={16} color="white" />
                  <Text size="sm" c="white">Tous types de véhicules</Text>
                </Group>
              </Stack>
              <ActionIcon size="xl" radius="xl" variant="white" color="dark">
                <IconPlus size={24} />
              </ActionIcon>
            </Group>
          </Card>

          {/* Recent Activity */}
          <div>
            <Group justify="space-between" mb="md">
              <Title order={3}>Activité récente</Title>
              {rides.length > 0 && (
                <Button 
                  variant="subtle" 
                  color="dark"
                  onClick={() => router.push('/customer/rides')}
                >
                  Tout voir
                </Button>
              )}
            </Group>

            {rides.length === 0 ? (
              <Card shadow="sm" padding="xl" radius="lg">
                <Stack gap="md" align="center">
                  <div style={{ 
                    width: 64, 
                    height: 64, 
                    borderRadius: '50%', 
                    background: '#f1f3f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconPackage size={32} color="#adb5bd" />
                  </div>
                  <Title order={4}>Aucune course</Title>
                  <Text c="dimmed" ta="center">
                    Commencez par créer votre première demande
                  </Text>
                  <Button 
                    size="md" 
                    radius="xl" 
                    color="dark"
                    onClick={() => router.push('/customer/new-ride')}
                  >
                    Créer une course
                  </Button>
                </Stack>
              </Card>
            ) : (
              <Stack gap="md">
                {rides.slice(0, 5).map((ride: any) => (
                  <Card
                    key={ride.id}
                    shadow="sm"
                    padding="lg"
                    radius="lg"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/customer/rides/${ride.id}`)}
                  >
                    <Group justify="space-between" mb="md">
                      <Group gap="xs">
                        <Badge
                          size="lg"
                          variant="light"
                          color={
                            ride.status === 'COMPLETED' ? 'green' :
                            ride.status === 'CANCELLED' ? 'red' :
                            ['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(ride.status) ? 'blue' :
                            ride.status === 'BID_ACCEPTED' ? 'cyan' :
                            'yellow'
                          }
                        >
                          {ride.status === 'COMPLETED' ? 'Terminée' :
                           ride.status === 'CANCELLED' ? 'Annulée' :
                           ride.status === 'PENDING_BIDS' ? 'En attente d\'offres' :
                           ride.status === 'BID_ACCEPTED' ? 'Offre acceptée' :
                           ['DRIVER_ARRIVING', 'PICKUP_ARRIVED'].includes(ride.status) ? 'En route' :
                           ['LOADING', 'IN_TRANSIT'].includes(ride.status) ? 'En cours' :
                           ride.status === 'DROPOFF_ARRIVED' ? 'Livraison' : 'En attente'}
                        </Badge>
                        {ride.status === 'PENDING_BIDS' && ride.bidsCount > 0 && (
                          <Badge size="sm" color="blue" variant="filled">
                            {ride.bidsCount} offre{ride.bidsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </Group>
                      <IconChevronRight size={20} color="#adb5bd" />
                    </Group>

                    <Stack gap="sm">
                      <Group gap="sm" wrap="nowrap">
                        <div style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: '#51cf66',
                          marginTop: 4,
                          flexShrink: 0
                        }} />
                        <Text size="sm" fw={600} style={{ flex: 1 }}>{ride.pickupAddress}</Text>
                      </Group>
                      <Group gap="sm" wrap="nowrap">
                        <div style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: '#ff6b6b',
                          marginTop: 4,
                          flexShrink: 0
                        }} />
                        <Text size="sm" fw={600} style={{ flex: 1 }}>{ride.deliveryAddress}</Text>
                      </Group>
                    </Stack>

                    <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
                      <Text size="xs" c="dimmed">
                        {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </Text>
                      {(ride.finalPrice || ride.estimatedPrice) && (
                        <Text size="md" fw={700}>
                          {ride.finalPrice || ride.estimatedPrice} DT
                        </Text>
                      )}
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </div>
        </Stack>
      </Container>

      {/* Bottom Navigation */}
      <Paper 
        p="md" 
        radius={0} 
        withBorder 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0,
          zIndex: 100
        }}
      >
        <Group justify="space-around">
          <Stack gap={4} align="center">
            <IconPackage size={24} />
            <Text size="xs" fw={600}>Accueil</Text>
          </Stack>
          <Stack gap={4} align="center" style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => router.push('/customer/rides')}>
            <IconClock size={24} />
            <Text size="xs">Courses</Text>
          </Stack>
          <Stack gap={4} align="center" style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => router.push('/customer/profile')}>
            <IconUser size={24} />
            <Text size="xs">Profil</Text>
          </Stack>
        </Group>
      </Paper>
    </div>
  );
}
