'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Paper,
  Grid,
  Card,
  Group,
  RingProgress,
  Center,
  Loader,
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCash,
  IconTruck,
  IconUsers,
  IconPackage,
  IconTrendingUp,
  IconCalendar,
} from '@tabler/icons-react';

interface Analytics {
  rides: {
    total: number;
    completed: number;
    active: number;
    cancelled: number;
    completionRate: number;
  };
  revenue: {
    totalRevenue: number;
    platformFees: number;
    driverEarnings: number;
    averageRideValue: number;
  };
  users: {
    totalCustomers: number;
    totalDrivers: number;
    activeDrivers: number;
    approvedDrivers: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d'); // 7d, 30d, 90d, all

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics?period=${period}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else if (res.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les analytiques',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '50vh' }}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container size="xl" py="xl">
        <Text>Erreur de chargement des données</Text>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Analytiques</Title>
            <Text c="dimmed">Rapports et statistiques détaillés</Text>
          </div>
          <Select
            value={period}
            onChange={(value) => value && setPeriod(value)}
            data={[
              { value: '7d', label: '7 derniers jours' },
              { value: '30d', label: '30 derniers jours' },
              { value: '90d', label: '90 derniers jours' },
              { value: 'all', label: 'Tout' },
            ]}
            leftSection={<IconCalendar size={16} />}
          />
        </Group>

        {/* Revenue Cards */}
        <div>
          <Text size="lg" fw={600} mb="md">
            Revenus
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between">
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Revenus Totaux
                    </Text>
                    <Text fw={700} size="xl">
                      {analytics.revenue.totalRevenue.toFixed(2)} DT
                    </Text>
                  </div>
                  <IconCash size={32} color="#228be6" stroke={1.5} />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between">
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Frais Plateforme
                    </Text>
                    <Text fw={700} size="xl" c="teal">
                      {analytics.revenue.platformFees.toFixed(2)} DT
                    </Text>
                    <Text size="xs" c="dimmed">
                      20 DT × {analytics.rides.completed} courses
                    </Text>
                  </div>
                  <IconTrendingUp size={32} color="#12b886" stroke={1.5} />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between">
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Gains Conducteurs
                    </Text>
                    <Text fw={700} size="xl">
                      {analytics.revenue.driverEarnings.toFixed(2)} DT
                    </Text>
                  </div>
                  <IconTruck size={32} color="#fa5252" stroke={1.5} />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between">
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Valeur Moyenne
                    </Text>
                    <Text fw={700} size="xl">
                      {analytics.revenue.averageRideValue.toFixed(2)} DT
                    </Text>
                    <Text size="xs" c="dimmed">
                      par course
                    </Text>
                  </div>
                  <IconPackage size={32} color="#fab005" stroke={1.5} />
                </Group>
              </Card>
            </Grid.Col>
          </Grid>
        </div>

        {/* Rides Stats */}
        <div>
          <Text size="lg" fw={600} mb="md">
            Courses
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Total des Courses
                    </Text>
                    <Text size="xl" fw={700}>
                      {analytics.rides.total}
                    </Text>
                  </Group>
                  <Group>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Terminées
                        </Text>
                        <Text size="sm" fw={500} c="green">
                          {analytics.rides.completed}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          En cours
                        </Text>
                        <Text size="sm" fw={500} c="blue">
                          {analytics.rides.active}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Annulées
                        </Text>
                        <Text size="sm" fw={500} c="red">
                          {analytics.rides.cancelled}
                        </Text>
                      </Group>
                    </Stack>
                    <Center>
                      <RingProgress
                        size={120}
                        thickness={12}
                        sections={[
                          {
                            value: (analytics.rides.completed / analytics.rides.total) * 100,
                            color: 'teal',
                          },
                          {
                            value: (analytics.rides.active / analytics.rides.total) * 100,
                            color: 'blue',
                          },
                          {
                            value: (analytics.rides.cancelled / analytics.rides.total) * 100,
                            color: 'red',
                          },
                        ]}
                        label={
                          <Text c="teal" fw={700} ta="center" size="lg">
                            {analytics.rides.completionRate.toFixed(1)}%
                          </Text>
                        }
                      />
                    </Center>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Utilisateurs
                    </Text>
                    <IconUsers size={24} />
                  </Group>
                  <Grid>
                    <Grid.Col span={6}>
                      <Paper p="md" withBorder>
                        <Stack gap="xs" align="center">
                          <Text size="xs" c="dimmed" tt="uppercase">
                            Clients
                          </Text>
                          <Text size="xl" fw={700}>
                            {analytics.users.totalCustomers}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Paper p="md" withBorder>
                        <Stack gap="xs" align="center">
                          <Text size="xs" c="dimmed" tt="uppercase">
                            Conducteurs
                          </Text>
                          <Text size="xl" fw={700}>
                            {analytics.users.totalDrivers}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Paper p="md" withBorder>
                        <Stack gap="xs" align="center">
                          <Text size="xs" c="dimmed" tt="uppercase">
                            Actifs
                          </Text>
                          <Text size="xl" fw={700} c="blue">
                            {analytics.users.activeDrivers}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Paper p="md" withBorder>
                        <Stack gap="xs" align="center">
                          <Text size="xs" c="dimmed" tt="uppercase">
                            Approuvés
                          </Text>
                          <Text size="xl" fw={700} c="green">
                            {analytics.users.approvedDrivers}
                          </Text>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </div>

        {/* Period Info */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Période analysée
            </Text>
            <Text size="sm" fw={500}>
              {new Date(analytics.period.startDate).toLocaleDateString('fr-FR')} -{' '}
              {new Date(analytics.period.endDate).toLocaleDateString('fr-FR')}
            </Text>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
