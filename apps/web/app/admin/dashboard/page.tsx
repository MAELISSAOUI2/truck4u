'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Paper,
  Stack,
  Group,
  Card,
  Button,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconUsers,
  IconPackage,
  IconCurrencyDollar,
  IconTruck,
  IconCheck,
  IconClock,
  IconChevronRight,
} from '@tabler/icons-react';

interface DashboardStats {
  drivers: {
    total: number;
    active: number;
    pending: number;
  };
  customers: {
    total: number;
  };
  rides: {
    total: number;
    today: number;
    active: number;
    completedToday: number;
  };
  revenue: {
    total: number;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats/overview`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '70vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">Dashboard</Title>
          <Text c="dimmed">Vue d'ensemble de la plateforme</Text>
        </div>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <Paper p="xl" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <IconTruck size={32} stroke={1.5} style={{ color: '#228be6' }} />
              <Text size="xl" fw={700}>{stats?.drivers.total || 0}</Text>
            </Group>
            <Text size="sm" fw={600} mb={4}>Conducteurs</Text>
            <Text size="xs" c="dimmed">
              <Text component="span" c="green" fw={600}>{stats?.drivers.active || 0}</Text> actifs,{' '}
              <Text component="span" c="yellow" fw={600}>{stats?.drivers.pending || 0}</Text> en attente
            </Text>
          </Paper>

          <Paper p="xl" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <IconUsers size={32} stroke={1.5} style={{ color: '#82c91e' }} />
              <Text size="xl" fw={700}>{stats?.customers.total || 0}</Text>
            </Group>
            <Text size="sm" fw={600} mb={4}>Clients</Text>
            <Text size="xs" c="dimmed">Total des utilisateurs</Text>
          </Paper>

          <Paper p="xl" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <IconPackage size={32} stroke={1.5} style={{ color: '#fab005' }} />
              <Text size="xl" fw={700}>{stats?.rides.today || 0}</Text>
            </Group>
            <Text size="sm" fw={600} mb={4}>Courses aujourd'hui</Text>
            <Text size="xs" c="dimmed">
              <Text component="span" c="blue" fw={600}>{stats?.rides.active || 0}</Text> en cours,{' '}
              <Text component="span" c="green" fw={600}>{stats?.rides.completedToday || 0}</Text> terminées
            </Text>
          </Paper>

          <Paper p="xl" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <IconCurrencyDollar size={32} stroke={1.5} style={{ color: '#f06595' }} />
              <Text size="xl" fw={700}>{(stats?.revenue.total || 0).toFixed(2)}</Text>
            </Group>
            <Text size="sm" fw={600} mb={4}>Revenu total (TND)</Text>
            <Text size="xs" c="dimmed">Commission plateforme</Text>
          </Paper>
        </SimpleGrid>

        {/* Quick Actions */}
        <div>
          <Title order={2} size="h3" mb="md">Actions rapides</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => router.push('/admin/kyc')}
            >
              <Group>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#228be6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconCheck size={24} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <Text fw={600} mb={4}>Vérifier KYC</Text>
                  <Text size="sm" c="dimmed">{stats?.drivers.pending || 0} en attente</Text>
                </div>
                <IconChevronRight size={20} color="#adb5bd" />
              </Group>
            </Card>

            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => router.push('/admin/drivers')}
            >
              <Group>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#82c91e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconUsers size={24} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <Text fw={600} mb={4}>Gérer conducteurs</Text>
                  <Text size="sm" c="dimmed">Voir tous les conducteurs</Text>
                </div>
                <IconChevronRight size={20} color="#adb5bd" />
              </Group>
            </Card>

            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => router.push('/admin/rides')}
            >
              <Group>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#fab005',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconClock size={24} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <Text fw={600} mb={4}>Courses actives</Text>
                  <Text size="sm" c="dimmed">{stats?.rides.active || 0} en cours</Text>
                </div>
                <IconChevronRight size={20} color="#adb5bd" />
              </Group>
            </Card>
          </SimpleGrid>
        </div>

        {/* Recent Activity */}
        <Paper p="xl" radius="md" withBorder>
          <Title order={3} size="h4" mb="md">Activité récente</Title>
          <Center py="xl">
            <Stack gap="xs" align="center">
              <IconClock size={48} color="#adb5bd" />
              <Text c="dimmed">Aucune activité récente à afficher</Text>
            </Stack>
          </Center>
        </Paper>
      </Stack>
    </Container>
  );
}
