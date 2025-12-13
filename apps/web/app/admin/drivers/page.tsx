'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Table,
  TextInput,
  Select,
  Badge,
  Button,
  Pagination,
  Loader,
  Center,
  ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconEye,
  IconBan,
  IconCircleCheck,
} from '@tabler/icons-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehiclePlate?: string;
  verificationStatus: string;
  rating: number;
  totalRides: number;
  totalEarnings: number;
  isAvailable: boolean;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_DOCUMENTS: 'gray',
  PENDING_REVIEW: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  SUSPENDED: 'red'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_DOCUMENTS: 'Documents manquants',
  PENDING_REVIEW: 'En vérification',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  SUSPENDED: 'Suspendu'
};

export default function AdminDriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDrivers();
  }, [page, statusFilter, searchTerm]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les conducteurs',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (driverId: string) => {
    const reason = prompt('Raison de la suspension:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers/${driverId}/suspend`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Conducteur suspendu',
          color: 'orange'
        });
        fetchDrivers();
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de la suspension',
        color: 'red'
      });
    }
  };

  const handleActivate = async (driverId: string) => {
    if (!confirm('Réactiver ce conducteur ?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers/${driverId}/activate`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Conducteur réactivé',
          color: 'green'
        });
        fetchDrivers();
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de la réactivation',
        color: 'red'
      });
    }
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">Conducteurs</Title>
          <Text c="dimmed">Gérer tous les conducteurs de la plateforme</Text>
        </div>

        {/* Filters */}
        <Paper p="md" radius="md" withBorder>
          <Group>
            <TextInput
              placeholder="Nom, téléphone, email, plaque..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Statut"
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              data={[
                { value: 'PENDING_DOCUMENTS', label: 'Documents manquants' },
                { value: 'PENDING_REVIEW', label: 'En vérification' },
                { value: 'APPROVED', label: 'Approuvé' },
                { value: 'REJECTED', label: 'Rejeté' },
                { value: 'SUSPENDED', label: 'Suspendu' }
              ]}
              style={{ width: 200 }}
            />
          </Group>
        </Paper>

        {/* Table */}
        <Paper radius="md" withBorder>
          {loading ? (
            <Center p="xl">
              <Loader size="lg" color="dark" />
            </Center>
          ) : drivers.length === 0 ? (
            <Center p="xl">
              <Text c="dimmed">Aucun conducteur trouvé</Text>
            </Center>
          ) : (
            <>
              <Table.ScrollContainer minWidth={800}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Conducteur</Table.Th>
                      <Table.Th>Véhicule</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th>Note</Table.Th>
                      <Table.Th>Courses</Table.Th>
                      <Table.Th>Gains</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {drivers.map((driver) => (
                      <Table.Tr key={driver.id}>
                        <Table.Td>
                          <div>
                            <Text fw={600}>{driver.name}</Text>
                            <Text size="sm" c="dimmed">{driver.phone}</Text>
                            {driver.email && (
                              <Text size="xs" c="dimmed">{driver.email}</Text>
                            )}
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm">{driver.vehicleType}</Text>
                            {driver.vehiclePlate && (
                              <Text size="xs" c="dimmed">{driver.vehiclePlate}</Text>
                            )}
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Badge color={STATUS_COLORS[driver.verificationStatus]}>
                              {STATUS_LABELS[driver.verificationStatus]}
                            </Badge>
                            {driver.isAvailable && driver.verificationStatus === 'APPROVED' && (
                              <Text size="xs" c="green">● Disponible</Text>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <Text fw={600}>{driver.rating.toFixed(1)}</Text>
                            <Text size="sm" c="yellow">★</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>{driver.totalRides}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>{driver.totalEarnings.toFixed(2)} TND</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => router.push(`/admin/kyc?driver=${driver.id}`)}
                              title="Voir"
                            >
                              <IconEye size={18} />
                            </ActionIcon>
                            {driver.verificationStatus === 'APPROVED' && (
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => handleSuspend(driver.id)}
                                title="Suspendre"
                              >
                                <IconBan size={18} />
                              </ActionIcon>
                            )}
                            {driver.verificationStatus === 'SUSPENDED' && (
                              <ActionIcon
                                variant="subtle"
                                color="green"
                                onClick={() => handleActivate(driver.id)}
                                title="Activer"
                              >
                                <IconCircleCheck size={18} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {totalPages > 1 && (
                <Group justify="center" p="md">
                  <Pagination value={page} onChange={setPage} total={totalPages} />
                </Group>
              )}
            </>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
