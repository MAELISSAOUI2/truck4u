'use client';

import { useState, useEffect } from 'react';
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
  Paper,
  ActionIcon,
  TextInput,
  SimpleGrid,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSearch,
  IconMapPin,
  IconClock,
  IconTruck,
  IconCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_BIDS: { label: 'En attente d\'offres', color: 'yellow' },
  BID_ACCEPTED: { label: 'Offre acceptée', color: 'cyan' },
  DRIVER_ARRIVING: { label: 'En route', color: 'blue' },
  PICKUP_ARRIVED: { label: 'Arrivé', color: 'indigo' },
  LOADING: { label: 'Chargement', color: 'violet' },
  IN_TRANSIT: { label: 'En cours', color: 'grape' },
  DROPOFF_ARRIVED: { label: 'Livraison', color: 'lime' },
  COMPLETED: { label: 'Terminée', color: 'green' },
  CANCELLED: { label: 'Annulée', color: 'red' },
};

export default function RidesListPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadRides();
  }, [token]);

  const loadRides = async () => {
    try {
      const response = await rideApi.getHistory();
      setRides(response.data || []);
    } catch (error) {
      console.error('Failed to load rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    const matchesFilter = filter === 'ALL' || ride.status === filter;
    const matchesSearch =
      ride.pickup?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoff?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: rides.length,
    pending: rides.filter((r) => r.status === 'PENDING_BIDS').length,
    active: rides.filter((r) =>
      ['BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(r.status)
    ).length,
    completed: rides.filter((r) => r.status === 'COMPLETED').length,
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
      <Paper p="md" radius={0} withBorder>
        <Container size="lg">
          <Group justify="space-between">
            <Group gap="md">
              <ActionIcon
                size="lg"
                variant="subtle"
                color="dark"
                onClick={() => router.push('/customer/dashboard')}
              >
                <IconArrowLeft size={24} />
              </ActionIcon>
              <div>
                <Title order={2} size="1.5rem">Mes Courses</Title>
                <Text size="sm" c="dimmed">{rides.length} course{rides.length > 1 ? 's' : ''}</Text>
              </div>
            </Group>
            <Button
              color="dark"
              radius="xl"
              onClick={() => router.push('/customer/new-ride')}
            >
              Nouvelle course
            </Button>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Stats */}
          <SimpleGrid cols={4} spacing="md">
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconTruck size={28} />
                <Title order={3} size="1.5rem">{stats.total}</Title>
                <Text size="xs" c="dimmed">Total</Text>
              </Stack>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconClock size={28} style={{ color: '#fab005' }} />
                <Title order={3} size="1.5rem" c="yellow">{stats.pending}</Title>
                <Text size="xs" c="dimmed">En attente</Text>
              </Stack>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconTruck size={28} style={{ color: '#228be6' }} />
                <Title order={3} size="1.5rem" c="blue">{stats.active}</Title>
                <Text size="xs" c="dimmed">En cours</Text>
              </Stack>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs" align="center">
                <IconCheck size={28} style={{ color: '#51cf66' }} />
                <Title order={3} size="1.5rem" c="green">{stats.completed}</Title>
                <Text size="xs" c="dimmed">Terminées</Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          {/* Search & Filters */}
          <Group gap="md">
            <TextInput
              placeholder="Rechercher une course..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              radius="xl"
              style={{ flex: 1 }}
            />
            <Group gap="xs">
              {['ALL', 'PENDING_BIDS', 'IN_TRANSIT', 'COMPLETED'].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'filled' : 'light'}
                  color={filter === status ? 'dark' : 'gray'}
                  radius="xl"
                  size="sm"
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? 'Toutes' :
                   status === 'PENDING_BIDS' ? 'En attente' :
                   status === 'IN_TRANSIT' ? 'En cours' : 'Terminées'}
                </Button>
              ))}
            </Group>
          </Group>

          {/* Rides List */}
          {filteredRides.length === 0 ? (
            <Card shadow="sm" padding="xl" radius="lg">
              <Stack gap="md" align="center">
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#f1f3f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconTruck size={40} color="#adb5bd" />
                </div>
                <Title order={3}>Aucune course trouvée</Title>
                <Text c="dimmed" ta="center">
                  {filter === 'ALL'
                    ? 'Vous n\'avez pas encore créé de course'
                    : 'Aucune course avec ce statut'}
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
              {filteredRides.map((ride: any) => {
                const status = STATUS_CONFIG[ride.status] || { label: ride.status, color: 'gray' };

                return (
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
                        <Badge size="lg" variant="light" color={status.color}>
                          {status.label}
                        </Badge>
                        {ride.status === 'PENDING_BIDS' && ride.bidsCount > 0 && (
                          <Badge size="sm" color="blue" variant="filled">
                            {ride.bidsCount} offre{ride.bidsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </Group>

                    <Stack gap="sm">
                      <Group gap="sm" wrap="nowrap">
                        <IconMapPin size={16} color="#51cf66" />
                        <Text size="sm" fw={500} style={{ flex: 1 }}>
                          {ride.pickup?.address || 'Adresse de départ'}
                        </Text>
                      </Group>
                      <Group gap="sm" wrap="nowrap">
                        <IconMapPin size={16} color="#ff6b6b" />
                        <Text size="sm" fw={500} style={{ flex: 1 }}>
                          {ride.dropoff?.address || 'Adresse d\'arrivée'}
                        </Text>
                      </Group>
                    </Stack>

                    <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
                      <Text size="sm" c="dimmed">
                        {ride.vehicleType?.replace('_', ' ') || 'Véhicule'}
                      </Text>
                      {ride.estimatedMinPrice && (
                        <Text size="md" fw={700}>
                          {ride.estimatedMinPrice} - {ride.estimatedMaxPrice} DT
                        </Text>
                      )}
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Container>
    </div>
  );
}
