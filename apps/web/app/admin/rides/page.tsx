'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Paper,
  Table,
  Badge,
  Button,
  Group,
  TextInput,
  Select,
  Pagination,
  Loader,
  Center,
  Modal,
  Tabs,
  Grid,
  Card,
  Divider,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconEye,
  IconPackage,
  IconCar,
  IconClock,
  IconMapPin,
  IconCash,
  IconFilter,
  IconRefresh,
} from '@tabler/icons-react';

interface Ride {
  id: string;
  status: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  customer: { id: string; name: string; phone: string };
  driver?: { id: string; name: string; phone: string };
  vehicleType: string;
  finalPrice?: number;
  distance: number;
  estimatedDuration: number;
  payment?: {
    method: string;
    status: string;
    totalAmount: number;
    platformFee: number;
    driverAmount: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_BIDS: { label: 'En attente d\'offres', color: 'blue' },
  BID_ACCEPTED: { label: 'Offre acceptée', color: 'green' },
  DRIVER_ARRIVING: { label: 'Conducteur en route', color: 'orange' },
  PICKUP_ARRIVED: { label: 'Arrivé au départ', color: 'cyan' },
  LOADING: { label: 'Chargement', color: 'violet' },
  IN_TRANSIT: { label: 'En transit', color: 'grape' },
  DROPOFF_ARRIVED: { label: 'Arrivé à destination', color: 'lime' },
  COMPLETED: { label: 'Terminée', color: 'teal' },
  CANCELLED: { label: 'Annulée', color: 'red' },
};

export default function AdminRidesPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [filteredRides, setFilteredRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    platformRevenue: 0,
  });

  useEffect(() => {
    loadRides();
  }, []);

  useEffect(() => {
    filterRides();
  }, [rides, searchQuery, statusFilter]);

  const loadRides = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/rides`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRides(data.rides || []);
        calculateStats(data.rides || []);
      } else if (res.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Error loading rides:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les courses',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ridesData: Ride[]) => {
    const completed = ridesData.filter((r) => r.status === 'COMPLETED');
    const active = ridesData.filter((r) =>
      ['BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED'].includes(
        r.status
      )
    );
    const cancelled = ridesData.filter((r) => r.status === 'CANCELLED');

    const totalRevenue = completed.reduce((sum, r) => sum + (r.payment?.totalAmount || 0), 0);
    const platformRevenue = completed.reduce((sum, r) => sum + (r.payment?.platformFee || 0), 0);

    setStats({
      total: ridesData.length,
      active: active.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalRevenue,
      platformRevenue,
    });
  };

  const filterRides = () => {
    let filtered = [...rides];

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer.phone.includes(searchQuery) ||
          r.driver?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.pickup.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.dropoff.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRides(filtered);
  };

  const viewRideDetails = (ride: Ride) => {
    setSelectedRide(ride);
    openDetails();
  };

  const paginatedRides = filteredRides.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '50vh' }}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Group justify="space-between" mb="xs">
            <div>
              <Title order={1}>Courses</Title>
              <Text c="dimmed">Gérer toutes les courses de la plateforme</Text>
            </div>
            <Button leftSection={<IconRefresh size={16} />} onClick={loadRides} variant="light">
              Actualiser
            </Button>
          </Group>
        </div>

        {/* Stats Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Total Courses
                </Text>
                <Text size="xl" fw={700}>
                  {stats.total}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Courses Actives
                </Text>
                <Text size="xl" fw={700} c="blue">
                  {stats.active}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Courses Terminées
                </Text>
                <Text size="xl" fw={700} c="green">
                  {stats.completed}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Revenus Plateforme
                </Text>
                <Text size="xl" fw={700} c="teal">
                  {stats.platformRevenue.toFixed(2)} DT
                </Text>
                <Text size="xs" c="dimmed">
                  Total: {stats.totalRevenue.toFixed(2)} DT
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Group>
            <TextInput
              placeholder="Rechercher par ID, client, conducteur, adresse..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Filtrer par statut"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: '', label: 'Tous les statuts' },
                ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
                  value,
                  label: config.label,
                })),
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              style={{ minWidth: 200 }}
            />
          </Group>
        </Paper>

        {/* Rides Table */}
        <Paper withBorder>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID Course</Table.Th>
                <Table.Th>Client</Table.Th>
                <Table.Th>Conducteur</Table.Th>
                <Table.Th>Trajet</Table.Th>
                <Table.Th>Prix</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedRides.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <IconPackage size={48} color="#adb5bd" />
                        <Text c="dimmed">Aucune course trouvée</Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedRides.map((ride) => (
                  <Table.Tr key={ride.id}>
                    <Table.Td>
                      <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>
                        {ride.id.substring(0, 8)}...
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>
                          {ride.customer.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ride.customer.phone}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      {ride.driver ? (
                        <div>
                          <Text size="sm" fw={500}>
                            {ride.driver.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {ride.driver.phone}
                          </Text>
                        </div>
                      ) : (
                        <Text size="sm" c="dimmed">
                          Non assigné
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <div style={{ maxWidth: 200 }}>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          📍 {ride.pickup.address}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          🏁 {ride.dropoff.address}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ride.distance.toFixed(1)} km
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      {ride.finalPrice ? (
                        <div>
                          <Text size="sm" fw={500}>
                            {ride.finalPrice} DT
                          </Text>
                          {ride.payment && (
                            <Text size="xs" c="dimmed">
                              +20 DT frais = {ride.payment.totalAmount} DT
                            </Text>
                          )}
                        </div>
                      ) : (
                        <Text size="sm" c="dimmed">
                          En attente
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_CONFIG[ride.status]?.color || 'gray'} variant="light">
                        {STATUS_CONFIG[ride.status]?.label || ride.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{new Date(ride.createdAt).toLocaleDateString('fr-FR')}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(ride.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Voir détails">
                        <ActionIcon variant="subtle" onClick={() => viewRideDetails(ride)}>
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>

          {filteredRides.length > pageSize && (
            <>
              <Divider />
              <Group justify="center" p="md">
                <Pagination
                  total={Math.ceil(filteredRides.length / pageSize)}
                  value={currentPage}
                  onChange={setCurrentPage}
                />
              </Group>
            </>
          )}
        </Paper>

        {/* Ride Details Modal */}
        <Modal opened={detailsOpened} onClose={closeDetails} title="Détails de la course" size="lg">
          {selectedRide && (
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  ID: {selectedRide.id}
                </Text>
                <Badge color={STATUS_CONFIG[selectedRide.status]?.color || 'gray'}>
                  {STATUS_CONFIG[selectedRide.status]?.label || selectedRide.status}
                </Badge>
              </Group>

              <Divider />

              <div>
                <Text fw={600} mb="xs">
                  Client
                </Text>
                <Group>
                  <Text>
                    {selectedRide.customer.name} - {selectedRide.customer.phone}
                  </Text>
                </Group>
              </div>

              {selectedRide.driver && (
                <div>
                  <Text fw={600} mb="xs">
                    Conducteur
                  </Text>
                  <Group>
                    <Text>
                      {selectedRide.driver.name} - {selectedRide.driver.phone}
                    </Text>
                  </Group>
                </div>
              )}

              <div>
                <Text fw={600} mb="xs">
                  Trajet
                </Text>
                <Stack gap="xs">
                  <Group>
                    <IconMapPin size={16} color="green" />
                    <Text size="sm">{selectedRide.pickup.address}</Text>
                  </Group>
                  <Group>
                    <IconMapPin size={16} color="red" />
                    <Text size="sm">{selectedRide.dropoff.address}</Text>
                  </Group>
                  <Group>
                    <IconCar size={16} />
                    <Text size="sm">
                      Distance: {selectedRide.distance.toFixed(1)} km - Durée estimée:{' '}
                      {selectedRide.estimatedDuration} min
                    </Text>
                  </Group>
                </Stack>
              </div>

              {selectedRide.payment && (
                <div>
                  <Text fw={600} mb="xs">
                    Paiement
                  </Text>
                  <Paper p="md" withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm">Prix conducteur</Text>
                        <Text size="sm" fw={500}>
                          {selectedRide.payment.driverAmount.toFixed(2)} DT
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">Frais plateforme</Text>
                        <Text size="sm" fw={500} c="blue">
                          +{selectedRide.payment.platformFee.toFixed(2)} DT
                        </Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text fw={600}>Total</Text>
                        <Text fw={700} size="lg">
                          {selectedRide.payment.totalAmount.toFixed(2)} DT
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Méthode
                        </Text>
                        <Badge>{selectedRide.payment.method}</Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Statut
                        </Text>
                        <Badge color={selectedRide.payment.status === 'COMPLETED' ? 'green' : 'orange'}>
                          {selectedRide.payment.status}
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>
                </div>
              )}

              <div>
                <Text fw={600} mb="xs">
                  Dates
                </Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Créée
                    </Text>
                    <Text size="sm">{new Date(selectedRide.createdAt).toLocaleString('fr-FR')}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Mise à jour
                    </Text>
                    <Text size="sm">{new Date(selectedRide.updatedAt).toLocaleString('fr-FR')}</Text>
                  </Group>
                  {selectedRide.completedAt && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Terminée
                      </Text>
                      <Text size="sm">{new Date(selectedRide.completedAt).toLocaleString('fr-FR')}</Text>
                    </Group>
                  )}
                </Stack>
              </div>
            </Stack>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}
