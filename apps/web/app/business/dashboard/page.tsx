'use client';

import { use Effect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Card,
  Group,
  SimpleGrid,
  Badge,
  Progress,
  Alert,
  rem,
} from '@mantine/core';
import {
  IconPackage,
  IconTruck,
  IconCoin,
  IconStar,
  IconPlus,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('businessToken');

    if (!token) {
      router.push('/business/register');
      return;
    }

    try {
      const [profileRes, limitsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business/limits`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (profileRes.ok && limitsRes.ok) {
        setProfile(await profileRes.json());
        setLimits(await limitsRes.json());
      } else {
        localStorage.removeItem('businessToken');
        router.push('/business/register');
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les données',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile || !limits) {
    return <Container><Text>Chargement...</Text></Container>;
  }

  const codUsagePercent = (limits.usage.todayCOD / limits.limits.maxDailyCOD) * 100;
  const ordersUsagePercent = (limits.usage.todayOrders / limits.limits.maxDailyOrders) * 100;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Bienvenue, {profile.ownerFirstName}</Title>
            <Text c="dimmed">{profile.businessName}</Text>
          </div>
          <Badge size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            {limits.trustLevel}
          </Badge>
        </Group>

        {/* Quick Actions */}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Button
            size="lg"
            leftSection={<IconPlus size={20} />}
            onClick={() => router.push('/business/orders/new')}
          >
            Nouvelle commande
          </Button>
          <Button
            size="lg"
            variant="outline"
            leftSection={<IconPackage size={20} />}
            onClick={() => router.push('/business/orders')}
          >
            Mes commandes
          </Button>
        </SimpleGrid>

        {/* Trust Level Progress */}
        {limits.trustLevel === 'STARTER' && (
          <Alert icon={<IconAlertCircle size={16} />} title="Augmentez vos limites" color="blue">
            Effectuez 3 commandes pour passer au niveau VERIFIED (1000 DT COD/jour)
          </Alert>
        )}

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="apart">
                <Text size="sm" c="dimmed">Total Commandes</Text>
                <IconPackage size={20} color="gray" />
              </Group>
              <Text size="xl" fw={700}>{profile.totalOrders}</Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="apart">
                <Text size="sm" c="dimmed">Livrées</Text>
                <IconTruck size={20} color="green" />
              </Group>
              <Text size="xl" fw={700}>{profile.completedOrders}</Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="apart">
                <Text size="sm" c="dimmed">COD Collecté</Text>
                <IconCoin size={20} color="gold" />
              </Group>
              <Text size="xl" fw={700}>{profile.totalCODCollected.toFixed(2)} DT</Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="apart">
                <Text size="sm" c="dimmed">Note</Text>
                <IconStar size={20} color="gold" />
              </Group>
              <Text size="xl" fw={700}>{profile.rating.toFixed(1)} / 5</Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Daily Limits */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={4}>Limites Quotidiennes</Title>

            <div>
              <Group justify="apart" mb="xs">
                <Text size="sm">COD utilisé aujourd'hui</Text>
                <Text size="sm" fw={500}>
                  {limits.usage.todayCOD.toFixed(2)} / {limits.limits.maxDailyCOD} DT
                </Text>
              </Group>
              <Progress value={codUsagePercent} color={codUsagePercent > 80 ? 'red' : 'blue'} />
            </div>

            <div>
              <Group justify="apart" mb="xs">
                <Text size="sm">Commandes aujourd'hui</Text>
                <Text size="sm" fw={500}>
                  {limits.usage.todayOrders} / {limits.limits.maxDailyOrders}
                </Text>
              </Group>
              <Progress value={ordersUsagePercent} color={ordersUsagePercent > 80 ? 'red' : 'blue'} />
            </div>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
