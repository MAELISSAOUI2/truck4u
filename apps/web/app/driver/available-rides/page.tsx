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
  Paper,
  Loader,
  Center,
  TextInput,
  Select,
  ActionIcon,
} from '@mantine/core';
import {
  IconMapPin,
  IconPackage,
  IconClock,
  IconArrowLeft,
  IconSearch,
  IconFilter,
  IconChevronRight,
  IconTruck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';

const VEHICLE_LABELS: Record<string, string> = {
  CAMIONNETTE: 'Camionnette',
  FOURGON: 'Fourgon',
  CAMION_3_5T: 'Camion 3.5T',
  CAMION_LOURD: 'Camion Lourd',
};

export default function AvailableRidesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>('ALL');

  useEffect(() => {
    if (!token) {
      router.push('/driver/login');
      return;
    }

    loadAvailableRides();

    // Refresh every 30 seconds
    const interval = setInterval(loadAvailableRides, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const loadAvailableRides = async () => {
    try {
      const response = await driverApi.getAvailableRides();
      setRides(response.data?.rides || []);
    } catch (error) {
      console.error('Error loading available rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    const matchesSearch =
      ride.pickup?.address?.toLowerCase().includes(search.toLowerCase()) ||
      ride.dropoff?.address?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'ALL' || ride.vehicleType === filter;

    return matchesSearch && matchesFilter;
  });

  const calculateDistance = (pickup: any, dropoff: any) => {
    if (!pickup || !dropoff) return 0;
    const R = 6371; // Earth radius in km
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
                Courses disponibles
              </Title>
              <Text c="dimmed">
                {filteredRides.length} demande{filteredRides.length > 1 ? 's' : ''} de transport
              </Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Filters */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group>
              <TextInput
                placeholder="Rechercher par adresse..."
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                placeholder="Type de véhicule"
                data={[
                  { value: 'ALL', label: 'Tous les véhicules' },
                  { value: 'CAMIONNETTE', label: 'Camionnette' },
                  { value: 'FOURGON', label: 'Fourgon' },
                  { value: 'CAMION_3_5T', label: 'Camion 3.5T' },
                  { value: 'CAMION_LOURD', label: 'Camion Lourd' },
                ]}
                value={filter}
                onChange={(value) => setFilter(value)}
                leftSection={<IconFilter size={16} />}
                style={{ minWidth: 200 }}
              />
            </Group>
          </Card>

          {/* Rides List */}
          {filteredRides.length === 0 ? (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Stack align="center" gap="md" py="xl">
                <IconPackage size={48} color="#adb5bd" />
                <Title order={3} size="1.25rem" ta="center">
                  Aucune course disponible
                </Title>
                <Text size="sm" c="dimmed" ta="center" maw={400}>
                  {search || filter !== 'ALL'
                    ? 'Aucune course ne correspond à vos critères de recherche'
                    : 'Aucune nouvelle demande pour le moment. Revenez plus tard !'}
                </Text>
                {(search || filter !== 'ALL') && (
                  <Button
                    variant="light"
                    onClick={() => {
                      setSearch('');
                      setFilter('ALL');
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </Stack>
            </Card>
          ) : (
            <Stack gap="md">
              {filteredRides.map((ride) => {
                const distance = calculateDistance(ride.pickup, ride.dropoff);
                const timeAgo = Math.floor(
                  (Date.now() - new Date(ride.createdAt).getTime()) / 60000
                );

                return (
                  <Card
                    key={ride.id}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/driver/available-rides/${ride.id}`)}
                  >
                    <Stack gap="md">
                      {/* Header */}
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Badge variant="dot" color="green" size="lg">
                            NOUVELLE
                          </Badge>
                          {ride.isExpress && (
                            <Badge variant="filled" color="orange" size="lg">
                              ⚡ EXPRESS
                            </Badge>
                          )}
                          <Text size="xs" c="dimmed">
                            Il y a {timeAgo} min
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <Badge variant="light" color="blue" size="lg">
                            {VEHICLE_LABELS[ride.vehicleType] || ride.vehicleType}
                          </Badge>
                          {ride._count?.bids > 0 && (
                            <Badge variant="outline" color="orange">
                              {ride._count.bids} offre{ride._count.bids > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </Group>
                      </Group>

                      {/* Route */}
                      <Stack gap="sm">
                        <Group gap="xs">
                          <IconMapPin size={18} />
                          <div style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed">
                              Départ
                            </Text>
                            <Text size="sm" fw={500} lineClamp={1}>
                              {ride.pickup?.address || 'Adresse de départ'}
                            </Text>
                          </div>
                        </Group>

                        <Group gap="xs">
                          <IconMapPin size={18} color="#228BE6" />
                          <div style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed">
                              Arrivée
                            </Text>
                            <Text size="sm" fw={500} lineClamp={1}>
                              {ride.dropoff?.address || 'Adresse de destination'}
                            </Text>
                          </div>
                        </Group>
                      </Stack>

                      {/* Details */}
                      <Group justify="space-between" wrap="wrap">
                        <Group gap="lg">
                          <Group gap={4}>
                            <IconTruck size={16} color="#495057" />
                            <Text size="sm" c="dimmed">
                              {distance} km
                            </Text>
                          </Group>
                          {ride.loadAssistance && (
                            <Group gap={4}>
                              <IconPackage size={16} color="#495057" />
                              <Text size="sm" c="dimmed">
                                Aide au chargement
                              </Text>
                            </Group>
                          )}
                          {ride.serviceType === 'SCHEDULED' && ride.scheduledFor && (
                            <Group gap={4}>
                              <IconClock size={16} color="#495057" />
                              <Text size="sm" c="dimmed">
                                {new Date(ride.scheduledFor).toLocaleDateString('fr-FR')}
                              </Text>
                            </Group>
                          )}
                        </Group>

                        <Button
                          rightSection={<IconChevronRight size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/driver/available-rides/${ride.id}`);
                          }}
                        >
                          Faire une offre
                        </Button>
                      </Group>
                    </Stack>
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
