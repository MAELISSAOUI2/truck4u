'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Table,
  Badge,
  Group,
  Select,
  Pagination,
  Card,
  rem,
} from '@mantine/core';
import { IconPlus, IconEye, IconPackage } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  SEARCHING_DRIVER: 'blue',
  DRIVER_ASSIGNED: 'cyan',
  DRIVER_EN_ROUTE: 'yellow',
  AT_PICKUP: 'orange',
  PICKED_UP: 'lime',
  IN_DELIVERY: 'teal',
  ARRIVED_DESTINATION: 'grape',
  DELIVERED: 'green',
  CANCELLED: 'red',
  FAILED: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SEARCHING_DRIVER: 'Recherche livreur',
  DRIVER_ASSIGNED: 'Livreur assigné',
  DRIVER_EN_ROUTE: 'En route pickup',
  AT_PICKUP: 'Au pickup',
  PICKED_UP: 'Colis récupéré',
  IN_DELIVERY: 'En livraison',
  ARRIVED_DESTINATION: 'Arrivé destination',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
  FAILED: 'Échoué',
};

export default function BusinessOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    const token = localStorage.getItem('businessToken');

    if (!token) {
      router.push('/business/register');
      return;
    }

    setLoading(true);

    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/business/orders?page=${page}&limit=10`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setTotalPages(data.pagination.pages);
      } else {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger les commandes',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur de connexion',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Mes Commandes</Title>
            <Text c="dimmed">Gérez toutes vos commandes de livraison</Text>
          </div>
          <Button
            leftSection={<IconPlus size={20} />}
            onClick={() => router.push('/business/orders/new')}
          >
            Nouvelle commande
          </Button>
        </Group>

        {/* Filters */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group>
            <Select
              placeholder="Filtrer par statut"
              data={[
                { value: '', label: 'Tous les statuts' },
                { value: 'DRAFT', label: 'Brouillon' },
                { value: 'SEARCHING_DRIVER', label: 'En recherche' },
                { value: 'DRIVER_ASSIGNED', label: 'Livreur assigné' },
                { value: 'IN_DELIVERY', label: 'En livraison' },
                { value: 'DELIVERED', label: 'Livrés' },
                { value: 'CANCELLED', label: 'Annulés' },
              ]}
              value={statusFilter || ''}
              onChange={(value) => {
                setStatusFilter(value || null);
                setPage(1);
              }}
              clearable
              style={{ width: 200 }}
            />
          </Group>
        </Card>

        {/* Orders Table */}
        {loading ? (
          <Text>Chargement...</Text>
        ) : orders.length === 0 ? (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <IconPackage size={48} color="gray" />
              <Text c="dimmed">Aucune commande trouvée</Text>
              <Button onClick={() => router.push('/business/orders/new')}>
                Créer ma première commande
              </Button>
            </Stack>
          </Card>
        ) : (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>N° Commande</Table.Th>
                  <Table.Th>Destinataire</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>COD</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Livreur</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orders.map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td>
                      <Text fw={500}>{order.orderNumber}</Text>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{order.recipientName}</Text>
                        <Text size="xs" c="dimmed">{order.recipientPhone}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(order.createdAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {order.hasCOD ? (
                        <Text size="sm" fw={500}>{order.codAmount?.toFixed(2)} DT</Text>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLORS[order.status]} variant="light">
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {order.driver ? (
                        <div>
                          <Text size="sm" fw={500}>
                            {order.driver.firstName} {order.driver.lastName}
                          </Text>
                          <Text size="xs" c="dimmed">★ {order.driver.rating?.toFixed(1)}</Text>
                        </div>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Button
                        variant="light"
                        size="xs"
                        leftSection={<IconEye size={14} />}
                        onClick={() => router.push(`/business/orders/${order.id}`)}
                      >
                        Voir
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="xl">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                />
              </Group>
            )}
          </Card>
        )}
      </Stack>
    </Container>
  );
}
