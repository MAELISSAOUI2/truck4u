'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Badge,
  Button,
  TextInput,
  Loader,
  Paper,
  Grid,
  ActionIcon,
} from '@mantine/core';
import {
  IconSearch,
  IconMapPin,
  IconClock,
  IconTruck,
  IconChevronRight,
  IconFilter,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';

const STATUS_CONFIG: any = {
  PENDING_BIDS: { label: 'En attente', color: 'blue' },
  BID_ACCEPTED: { label: 'Offre acceptee', color: 'green' },
  DRIVER_ARRIVING: { label: 'En route', color: 'orange' },
  PICKUP_ARRIVED: { label: 'Arrive au depart', color: 'cyan' },
  LOADING: { label: 'Chargement', color: 'violet' },
  IN_TRANSIT: { label: 'En transit', color: 'grape' },
  DROPOFF_ARRIVED: { label: 'Arrive a destination', color: 'lime' },
  COMPLETED: { label: 'Terminee', color: 'teal' },
  CANCELLED: { label: 'Annulee', color: 'red' },
};

const VEHICLE_LABELS: any = {
  CAMIONNETTE: 'Camionnette',
  FOURGON: 'Fourgon',
  CAMION_3_5T: 'Camion 3.5T',
  CAMION_LOURD: 'Camion Lourd',
};

export default function RidesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

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
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    const matchesSearch =
      ride.pickup?.address?.toLowerCase().includes(search.toLowerCase()) ||
      ride.dropoff?.address?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'ALL' ||
      ride.status === filter ||
      (filter === 'IN_PROGRESS' && ['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(ride.status));

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: rides.length,
    pending: rides.filter((r) => ['PENDING_BIDS', 'BID_ACCEPTED'].includes(r.status)).length,
    inProgress: rides.filter((r) => ['DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(r.status)).length,
    completed: rides.filter((r) => r.status === 'COMPLETED').length,
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Chargement...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Paper p="xl" radius={0} withBorder>
        <Container size="lg">
          <Title order={1} size="2rem" mb="md">
            Mes Courses
          </Title>
          <Text c="dimmed">
            Consultez l'historique de toutes vos courses
          </Text>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text size="sm" c="dimmed" mb={4}>Total</Text>
                <Text size="2rem" fw={700}>{stats.total}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text size="sm" c="dimmed" mb={4}>En attente</Text>
                <Text size="2rem" fw={700} c="blue">{stats.pending}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text size="sm" c="dimmed" mb={4}>En cours</Text>
                <Text size="2rem" fw={700} c="orange">{stats.inProgress}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text size="sm" c="dimmed" mb={4}>Terminees</Text>
                <Text size="2rem" fw={700} c="green">{stats.completed}</Text>
              </Card>
            </Grid.Col>
          </Grid>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <TextInput
                placeholder="Rechercher par adresse..."
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1, maxWidth: 400 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Group gap="xs">
                <Button
                  variant={filter === 'ALL' ? 'filled' : 'light'}
                  onClick={() => setFilter('ALL')}
                  size="sm"
                >
                  Toutes
                </Button>
                <Button
                  variant={filter === 'PENDING_BIDS' ? 'filled' : 'light'}
                  onClick={() => setFilter('PENDING_BIDS')}
                  size="sm"
                  color="blue"
                >
                  En attente
                </Button>
                <Button
                  variant={filter === 'IN_PROGRESS' ? 'filled' : 'light'}
                  onClick={() => setFilter('IN_PROGRESS')}
                  size="sm"
                  color="orange"
                >
                  En cours
                </Button>
                <Button
                  variant={filter === 'COMPLETED' ? 'filled' : 'light'}
                  onClick={() => setFilter('COMPLETED')}
                  size="sm"
                  color="green"
                >
                  Terminees
                </Button>
              </Group>
            </Group>

            <Stack gap="md">
              {filteredRides.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  Aucune course trouvee
                </Text>
              ) : (
                filteredRides.map((ride) => (
                  <Card
                    key={ride.id}
                    shadow="xs"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/customer/rides/${ride.id}`)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Badge color={STATUS_CONFIG[ride.status]?.color || 'gray'}>
                            {STATUS_CONFIG[ride.status]?.label || ride.status}
                          </Badge>
                          <Badge variant="light" color="blue">
                            {VEHICLE_LABELS[ride.vehicleType] || ride.vehicleType}
                          </Badge>
                          {ride._count?.bids > 0 && (
                            <Badge variant="light" color="green">
                              {ride._count.bids} offre{ride._count.bids > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </Group>

                        <Group gap="xs">
                          <IconMapPin size={16} />
                          <Text size="sm" lineClamp={1}>{ride.pickup?.address || 'Adresse de depart'}</Text>
                        </Group>

                        <Group gap="xs">
                          <IconMapPin size={16} color="#228BE6" />
                          <Text size="sm" lineClamp={1}>{ride.dropoff?.address || 'Adresse de destination'}</Text>
                        </Group>

                        <Group gap="md">
                          <Group gap={4}>
                            <IconClock size={14} />
                            <Text size="xs" c="dimmed">
                              {new Date(ride.createdAt).toLocaleDateString('fr-FR')}
                            </Text>
                          </Group>
                          {ride.acceptedBid && (
                            <Group gap={4}>
                              <IconTruck size={14} />
                              <Text size="xs" c="dimmed">
                                {ride.acceptedBid.driver?.name || 'Driver'}
                              </Text>
                            </Group>
                          )}
                        </Group>
                      </Stack>

                      <ActionIcon variant="subtle" color="gray">
                        <IconChevronRight size={20} />
                      </ActionIcon>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}
