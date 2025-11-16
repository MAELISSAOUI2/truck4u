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
  Button,
  Paper,
  ActionIcon,
  Avatar,
  Badge,
  Divider,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconStar,
  IconTruck,
  IconCash,
  IconPhone,
  IconMail,
  IconId,
  IconLogout,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';

export default function DriverProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      router.push('/driver/login');
      return;
    }

    setLoading(false);
  }, [token, user]);

  const handleLogout = () => {
    logout();
    router.push('/driver/login');
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
        <Container size="md">
          <Group>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => router.back()}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={1} size="2rem">
              Mon profil
            </Title>
          </Group>
        </Container>
      </Paper>

      <Container size="md" py="xl">
        <Stack gap="xl">
          {/* Profile Header */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Stack align="center" gap="md">
              <Avatar size={120} color="dark" radius={120}>
                <IconTruck size={60} />
              </Avatar>
              <div style={{ textAlign: 'center' }}>
                <Title order={2} size="1.75rem">
                  {user?.name || 'Transporteur'}
                </Title>
                <Group justify="center" gap="xs" mt={8}>
                  <IconStar size={18} fill="#FFD700" color="#FFD700" />
                  <Text size="lg" c="dimmed">
                    {user?.rating?.toFixed(1) || '5.0'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    ({user?.totalRides || 0} courses)
                  </Text>
                </Group>
              </div>
              <Group gap="xs">
                <Badge size="lg" variant="filled" color="green">
                  Vérifié
                </Badge>
                <Badge size="lg" variant="light" color="blue">
                  Professionnel
                </Badge>
              </Group>
            </Stack>
          </Card>

          {/* Contact Information */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Informations de contact
            </Title>
            <Stack gap="md">
              {user?.phone && (
                <Group gap="md">
                  <IconPhone size={20} />
                  <div>
                    <Text size="xs" c="dimmed">
                      Téléphone
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.phone}
                    </Text>
                  </div>
                </Group>
              )}

              {user?.email && (
                <Group gap="md">
                  <IconMail size={20} />
                  <div>
                    <Text size="xs" c="dimmed">
                      Email
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.email}
                    </Text>
                  </div>
                </Group>
              )}

              <Group gap="md">
                <IconId size={20} />
                <div>
                  <Text size="xs" c="dimmed">
                    ID Transporteur
                  </Text>
                  <Text size="sm" fw={500}>
                    #{user?.id.slice(0, 8).toUpperCase()}
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {/* Vehicle Information */}
          {user?.vehicleType && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Title order={3} size="1.25rem" mb="md">
                Véhicule
              </Title>
              <Stack gap="md">
                <Group gap="md">
                  <IconTruck size={20} />
                  <div>
                    <Text size="xs" c="dimmed">
                      Type
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.vehicleType}
                    </Text>
                  </div>
                </Group>

                {user.vehiclePlate && (
                  <Group gap="md">
                    <IconId size={20} />
                    <div>
                      <Text size="xs" c="dimmed">
                        Immatriculation
                      </Text>
                      <Text size="sm" fw={500}>
                        {user.vehiclePlate}
                      </Text>
                    </div>
                  </Group>
                )}
              </Stack>
            </Card>
          )}

          {/* Statistics */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Statistiques
            </Title>
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <IconTruck size={20} color="#228be6" />
                  <Text size="sm">Courses totales</Text>
                </Group>
                <Text size="lg" fw={700}>
                  {user?.totalRides || 0}
                </Text>
              </Group>

              <Divider />

              <Group justify="space-between">
                <Group gap="xs">
                  <IconStar size={20} fill="#FFD700" color="#FFD700" />
                  <Text size="sm">Note moyenne</Text>
                </Group>
                <Text size="lg" fw={700}>
                  {user?.rating?.toFixed(1) || '5.0'} / 5.0
                </Text>
              </Group>

              <Divider />

              <Group justify="space-between">
                <Group gap="xs">
                  <IconCash size={20} color="#40c057" />
                  <Text size="sm">Taux d'acceptation</Text>
                </Group>
                <Text size="lg" fw={700}>
                  {user?.acceptanceRate || 95}%
                </Text>
              </Group>
            </Stack>
          </Card>

          {/* Actions */}
          <Stack gap="md">
            <Button
              variant="light"
              color="blue"
              size="lg"
              fullWidth
              onClick={() => router.push('/driver/earnings')}
              leftSection={<IconCash size={20} />}
            >
              Voir mes revenus
            </Button>

            <Button
              variant="outline"
              color="red"
              size="lg"
              fullWidth
              onClick={handleLogout}
              leftSection={<IconLogout size={20} />}
            >
              Déconnexion
            </Button>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}
