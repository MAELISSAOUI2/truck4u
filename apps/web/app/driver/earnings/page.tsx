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
  SimpleGrid,
  Select,
  Table,
  Badge,
  Loader,
  Center,
  Button,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCash,
  IconTrendingUp,
  IconCalendar,
  IconReceipt,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function DriverEarningsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token || user?.userType !== 'driver') {
      router.push('/driver/login');
      return;
    }

    loadEarnings();
  }, [period, token]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const response = await driverApi.getEarningsHistory(period);
      setData(response.data);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger l\'historique des revenus',
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

  const summary = data?.summary || { gross: 0, fees: 0, net: 0 };
  const earnings = data?.earnings || [];

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
                Mes Revenus
              </Title>
              <Text c="dimmed" size="sm">
                Historique et statistiques de vos gains
              </Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Period selector */}
          <Group justify="space-between">
            <Title order={2} size="1.5rem">
              Résumé des revenus
            </Title>
            <Select
              value={period}
              onChange={(val) => setPeriod(val || 'month')}
              data={[
                { value: 'week', label: 'Cette semaine' },
                { value: 'month', label: 'Ce mois' },
                { value: 'year', label: 'Cette année' },
              ]}
              w={200}
            />
          </Group>

          {/* Summary cards */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group gap="xs" mb="xs">
                <IconCash size={24} color="#40C057" />
                <Text size="sm" c="dimmed" fw={500}>
                  Revenu brut
                </Text>
              </Group>
              <Title order={2} size="2rem">
                {summary.gross.toFixed(2)} DT
              </Title>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group gap="xs" mb="xs">
                <IconReceipt size={24} color="#FA5252" />
                <Text size="sm" c="dimmed" fw={500}>
                  Frais plateforme
                </Text>
              </Group>
              <Title order={2} size="2rem" c="red">
                -{summary.fees.toFixed(2)} DT
              </Title>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#228BE6', color: 'white' }}>
              <Group gap="xs" mb="xs">
                <IconTrendingUp size={24} color="white" />
                <Text size="sm" fw={500} c="white">
                  Revenu net
                </Text>
              </Group>
              <Title order={2} size="2rem" c="white">
                {summary.net.toFixed(2)} DT
              </Title>
            </Card>
          </SimpleGrid>

          {/* Earnings table */}
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Historique des transactions
            </Title>

            {earnings.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <IconReceipt size={48} color="#CED4DA" />
                  <Text c="dimmed">Aucune transaction pour cette période</Text>
                </Stack>
              </Center>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Course</Table.Th>
                    <Table.Th>Montant brut</Table.Th>
                    <Table.Th>Frais</Table.Th>
                    <Table.Th>Net</Table.Th>
                    <Table.Th>Statut</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {earnings.map((earning: any) => (
                    <Table.Tr key={earning.id}>
                      <Table.Td>
                        <Group gap="xs">
                          <IconCalendar size={16} />
                          <Text size="sm">
                            {new Date(earning.paidAt).toLocaleDateString('fr-FR')}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          Course #{earning.rideId?.slice(0, 8)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {earning.grossAmount.toFixed(2)} DT
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="red">
                          -{earning.platformFee.toFixed(2)} DT
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} c="green">
                          {earning.netEarnings.toFixed(2)} DT
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="green" variant="light">
                          Payé
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>

          {/* Info */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#F3F0FF' }}>
            <Group gap="xs" mb="xs">
              <IconReceipt size={20} color="#7950F2" />
              <Text size="sm" fw={600} c="violet">
                Information sur les frais
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Les frais de plateforme sont de 10% du montant de la course. Les paiements sont
              effectués chaque semaine sur votre compte bancaire enregistré.
            </Text>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}
