'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Progress,
  Badge,
  Loader,
  Center,
  Button,
  SimpleGrid,
  ThemeIcon,
  List,
  Divider,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTrophy,
  IconStar,
  IconCheck,
  IconTruck,
  IconPercentage,
  IconChartLine,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function DriverTierPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tierData, setTierData] = useState<any>(null);

  useEffect(() => {
    if (!token || user?.userType !== 'driver') {
      router.push('/driver/login');
      return;
    }

    loadTierInfo();
  }, [token, user]);

  const loadTierInfo = async () => {
    setLoading(true);
    try {
      const response = await driverApi.getTierInfo();
      setTierData(response.data);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de charger les informations de tier',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!tierData) {
    return null;
  }

  const { currentTier, nextTier, progress, allTiers } = tierData;

  const getTierGradient = (tierName: string) => {
    switch (tierName) {
      case 'Bronze':
        return 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)';
      case 'Silver':
        return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)';
      case 'Gold':
        return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="xl" radius={0} withBorder>
        <Container size="lg">
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={20} />}
              onClick={() => router.back()}
            >
              Retour
            </Button>
            <div>
              <Title order={1} size="2rem">
                Mon Niveau
              </Title>
              <Text c="dimmed" size="sm">
                Progressez et débloquez des avantages exclusifs
              </Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Current Tier Card */}
          <Card
            shadow="lg"
            padding="xl"
            radius="lg"
            withBorder
            style={{ background: getTierGradient(currentTier.name) }}
          >
            <Stack gap="md" align="center">
              <Text size="6rem" style={{ lineHeight: 1 }}>
                {currentTier.icon}
              </Text>
              <Title order={2} size="2.5rem" c="white" ta="center">
                Niveau {currentTier.name}
              </Title>
              <Badge size="xl" variant="white" radius="md">
                Frais plateforme: {currentTier.platformFee}%
              </Badge>
            </Stack>
          </Card>

          {/* Progress to Next Tier */}
          {nextTier && progress && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Stack gap="lg">
                <Group justify="space-between">
                  <Title order={3} size="1.25rem">
                    Progression vers {nextTier.name} {nextTier.icon}
                  </Title>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                  {/* Rides Progress */}
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconTruck size={18} color="#228be6" />
                        <Text size="sm" fw={500}>
                          Courses complétées
                        </Text>
                      </Group>
                      <Text size="sm" fw={600} c="blue">
                        {progress.rides.current}/{progress.rides.required}
                      </Text>
                    </Group>
                    <Progress
                      value={progress.rides.percentage}
                      color="blue"
                      size="lg"
                      radius="xl"
                    />
                    <Text size="xs" c="dimmed" mt="xs">
                      {Math.round(progress.rides.percentage)}% complété
                    </Text>
                  </div>

                  {/* Rating Progress */}
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconStar size={18} color="#ffd700" />
                        <Text size="sm" fw={500}>
                          Note moyenne
                        </Text>
                      </Group>
                      <Text size="sm" fw={600} c="yellow">
                        {progress.rating.current.toFixed(1)}/{progress.rating.required}
                      </Text>
                    </Group>
                    <Progress
                      value={progress.rating.percentage}
                      color="yellow"
                      size="lg"
                      radius="xl"
                    />
                    <Text size="xs" c="dimmed" mt="xs">
                      {Math.round(progress.rating.percentage)}% complété
                    </Text>
                  </div>

                  {/* Acceptance Rate Progress */}
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconChartLine size={18} color="#40c057" />
                        <Text size="sm" fw={500}>
                          Taux d'acceptation
                        </Text>
                      </Group>
                      <Text size="sm" fw={600} c="green">
                        {progress.acceptanceRate.current.toFixed(0)}%/{progress.acceptanceRate.required}%
                      </Text>
                    </Group>
                    <Progress
                      value={progress.acceptanceRate.percentage}
                      color="green"
                      size="lg"
                      radius="xl"
                    />
                    <Text size="xs" c="dimmed" mt="xs">
                      {Math.round(progress.acceptanceRate.percentage)}% complété
                    </Text>
                  </div>
                </SimpleGrid>
              </Stack>
            </Card>
          )}

          {/* All Tiers Comparison */}
          <Title order={2} size="1.75rem" mt="md">
            Tous les niveaux
          </Title>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {Object.entries(allTiers).map(([key, tier]: [string, any]) => {
              const isCurrentTier = tier.name === currentTier.name;
              return (
                <Card
                  key={key}
                  shadow="sm"
                  padding="xl"
                  radius="lg"
                  withBorder
                  style={{
                    borderWidth: isCurrentTier ? 3 : 1,
                    borderColor: isCurrentTier ? tier.color : undefined,
                  }}
                >
                  <Stack gap="md">
                    <Center>
                      <Text size="4rem" style={{ lineHeight: 1 }}>
                        {tier.icon}
                      </Text>
                    </Center>

                    <div>
                      <Title order={3} size="1.5rem" ta="center">
                        {tier.name}
                      </Title>
                      {isCurrentTier && (
                        <Badge
                          size="md"
                          variant="filled"
                          color="blue"
                          fullWidth
                          mt="xs"
                        >
                          Niveau actuel
                        </Badge>
                      )}
                    </div>

                    <Divider />

                    <div>
                      <Text size="sm" fw={600} mb="xs">
                        Conditions requises:
                      </Text>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <IconTruck size={16} />
                          <Text size="sm">
                            {tier.requirements.rides}+ courses
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconStar size={16} />
                          <Text size="sm">
                            Note {tier.requirements.rating}+
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconPercentage size={16} />
                          <Text size="sm">
                            {tier.requirements.acceptanceRate}%+ acceptation
                          </Text>
                        </Group>
                      </Stack>
                    </div>

                    <Divider />

                    <div>
                      <Text size="sm" fw={600} mb="xs">
                        Avantages:
                      </Text>
                      <List
                        spacing="xs"
                        size="sm"
                        center
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={12} />
                          </ThemeIcon>
                        }
                      >
                        {tier.benefits.map((benefit: string, idx: number) => (
                          <List.Item key={idx}>{benefit}</List.Item>
                        ))}
                      </List>
                    </div>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          {/* Info Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#E7F5FF' }}>
            <Group gap="xs" mb="xs">
              <IconTrophy size={20} color="#228be6" />
              <Text size="sm" fw={600} c="blue">
                Comment progresser ?
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Votre niveau est calculé automatiquement en fonction de vos performances.
              Complétez plus de courses, maintenez une note élevée et acceptez les demandes
              pour débloquer des frais de plateforme réduits et des avantages exclusifs.
            </Text>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}
