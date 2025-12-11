'use client';

import { useState } from 'react';
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
  NumberInput,
  Button,
  Tabs,
  Divider,
  Progress,
  RingProgress,
  Center,
  Badge,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalculator,
  IconCash,
  IconGasStation,
  IconTool,
  IconTrendingUp,
  IconCalendar,
  IconTruck,
  IconChartPie,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function EarningsSimulatorPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly');

  // Simulation inputs
  const [ridesPerDay, setRidesPerDay] = useState(5);
  const [averageRidePrice, setAverageRidePrice] = useState(50);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(6);
  const [fuelCostPerKm, setFuelCostPerKm] = useState(0.5);
  const [avgDistancePerRide, setAvgDistancePerRide] = useState(15);
  const [maintenanceCostPerMonth, setMaintenanceCostPerMonth] = useState(100);

  // Simulation results
  const [results, setResults] = useState<any>(null);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await driverApi.simulateEarnings({
        ridesPerDay,
        averageRidePrice,
        workDaysPerWeek,
        fuelCostPerKm,
        avgDistancePerRide,
        maintenanceCostPerMonth,
      });

      setResults(response.data);

      notifications.show({
        title: 'Simulation calculée',
        message: 'Vos gains potentiels ont été calculés avec succès',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de calculer la simulation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ period, data }: { period: string; data: any }) => {
    if (!data) return null;

    const profitMargin = data.grossEarnings > 0
      ? ((data.profit / data.grossEarnings) * 100).toFixed(1)
      : 0;

    return (
      <Stack gap="lg">
        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconTruck size={20} color="#228be6" />
              <Text size="xs" c="dimmed" fw={500}>
                Courses
              </Text>
            </Group>
            <Title order={3} size="1.75rem">
              {data.rides}
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              Total {period}
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconCash size={20} color="#40c057" />
              <Text size="xs" c="dimmed" fw={500}>
                Revenu brut
              </Text>
            </Group>
            <Title order={3} size="1.75rem">
              {data.grossEarnings.toFixed(2)}
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              DT {period}
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconTrendingUp size={20} color="#fd7e14" />
              <Text size="xs" c="dimmed" fw={500}>
                Revenu net
              </Text>
            </Group>
            <Title order={3} size="1.75rem">
              {data.netEarnings.toFixed(2)}
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              DT {period}
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#228be6', color: 'white' }}>
            <Group gap="xs" mb="xs">
              <IconChartPie size={20} color="white" />
              <Text size="xs" fw={500} c="white">
                Profit net
              </Text>
            </Group>
            <Title order={3} size="1.75rem" c="white">
              {data.profit.toFixed(2)}
            </Title>
            <Text size="xs" mt={4} c="white">
              DT {period} ({profitMargin}% marge)
            </Text>
          </Card>
        </SimpleGrid>

        {/* Cost Breakdown */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Title order={4} size="1.125rem" mb="lg">
            Répartition des coûts
          </Title>
          <Stack gap="md">
            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconCash size={18} color="#fa5252" />
                  <Text size="sm">Frais plateforme (10%)</Text>
                </Group>
                <Text size="sm" fw={600} c="red">
                  -{data.platformFees.toFixed(2)} DT
                </Text>
              </Group>
              <Progress value={(data.platformFees / data.grossEarnings) * 100} color="red" size="md" />
            </div>

            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconGasStation size={18} color="#fd7e14" />
                  <Text size="sm">Carburant</Text>
                </Group>
                <Text size="sm" fw={600} c="orange">
                  -{data.fuelCost.toFixed(2)} DT
                </Text>
              </Group>
              <Progress value={(data.fuelCost / data.grossEarnings) * 100} color="orange" size="md" />
            </div>

            {data.maintenanceCost && (
              <div>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <IconTool size={18} color="#7950f2" />
                    <Text size="sm">Maintenance</Text>
                  </Group>
                  <Text size="sm" fw={600} c="violet">
                    -{data.maintenanceCost.toFixed(2)} DT
                  </Text>
                </Group>
                <Progress value={(data.maintenanceCost / data.grossEarnings) * 100} color="violet" size="md" />
              </div>
            )}

            <Divider />

            <Group justify="space-between">
              <Group gap="xs">
                <IconTrendingUp size={18} color="#40c057" />
                <Text size="sm" fw={600}>Profit final</Text>
              </Group>
              <Text size="lg" fw={700} c="green">
                {data.profit.toFixed(2)} DT
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* Profit Margin Visualization */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Title order={4} size="1.125rem" mb="lg">
            Marge bénéficiaire
          </Title>
          <Center>
            <RingProgress
              size={200}
              thickness={20}
              sections={[
                { value: parseFloat(profitMargin), color: 'green', tooltip: `Profit: ${profitMargin}%` },
              ]}
              label={
                <Center>
                  <Stack gap={0} align="center">
                    <Text size="xl" fw={700} c="green">
                      {profitMargin}%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Marge
                    </Text>
                  </Stack>
                </Center>
              }
            />
          </Center>
          <Text size="sm" c="dimmed" ta="center" mt="md">
            Vous gardez {profitMargin}% de vos revenus bruts après toutes les dépenses
          </Text>
        </Card>
      </Stack>
    );
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
                Simulateur de gains
              </Title>
              <Text c="dimmed" size="sm">
                Calculez vos revenus potentiels en fonction de vos objectifs
              </Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Input Parameters */}
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Group justify="space-between" mb="lg">
              <Title order={3} size="1.25rem">
                Paramètres de simulation
              </Title>
              <Badge size="lg" variant="light" color="blue" leftSection={<IconCalculator size={14} />}>
                Ajustez vos paramètres
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              <NumberInput
                label="Courses par jour"
                description="Nombre de courses quotidiennes"
                value={ridesPerDay}
                onChange={(val) => setRidesPerDay(Number(val))}
                min={0}
                max={50}
                leftSection={<IconTruck size={18} />}
                size="md"
              />

              <NumberInput
                label="Prix moyen par course"
                description="En dinars tunisiens (DT)"
                value={averageRidePrice}
                onChange={(val) => setAverageRidePrice(Number(val))}
                min={0}
                leftSection={<IconCash size={18} />}
                size="md"
                decimalScale={2}
              />

              <NumberInput
                label="Jours travaillés / semaine"
                description="Nombre de jours de travail"
                value={workDaysPerWeek}
                onChange={(val) => setWorkDaysPerWeek(Number(val))}
                min={1}
                max={7}
                leftSection={<IconCalendar size={18} />}
                size="md"
              />

              <NumberInput
                label="Coût carburant / km"
                description="En DT par kilomètre"
                value={fuelCostPerKm}
                onChange={(val) => setFuelCostPerKm(Number(val))}
                min={0}
                leftSection={<IconGasStation size={18} />}
                size="md"
                decimalScale={2}
              />

              <NumberInput
                label="Distance moyenne / course"
                description="En kilomètres"
                value={avgDistancePerRide}
                onChange={(val) => setAvgDistancePerRide(Number(val))}
                min={0}
                leftSection={<IconTruck size={18} />}
                size="md"
                decimalScale={1}
              />

              <NumberInput
                label="Maintenance / mois"
                description="Coûts mensuels en DT"
                value={maintenanceCostPerMonth}
                onChange={(val) => setMaintenanceCostPerMonth(Number(val))}
                min={0}
                leftSection={<IconTool size={18} />}
                size="md"
                decimalScale={2}
              />
            </SimpleGrid>

            <Button
              fullWidth
              size="lg"
              mt="xl"
              leftSection={<IconCalculator size={20} />}
              onClick={handleCalculate}
              loading={loading}
            >
              Calculer mes gains potentiels
            </Button>
          </Card>

          {/* Results */}
          {results && (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Title order={3} size="1.25rem" mb="lg">
                Résultats de la simulation
              </Title>

              <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'monthly')}>
                <Tabs.List>
                  <Tabs.Tab value="daily" leftSection={<IconCalendar size={16} />}>
                    Par jour
                  </Tabs.Tab>
                  <Tabs.Tab value="weekly" leftSection={<IconCalendar size={16} />}>
                    Par semaine
                  </Tabs.Tab>
                  <Tabs.Tab value="monthly" leftSection={<IconCalendar size={16} />}>
                    Par mois
                  </Tabs.Tab>
                  <Tabs.Tab value="yearly" leftSection={<IconCalendar size={16} />}>
                    Par an
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="daily" pt="xl">
                  <ResultCard period="par jour" data={results.daily} />
                </Tabs.Panel>

                <Tabs.Panel value="weekly" pt="xl">
                  <ResultCard period="par semaine" data={results.weekly} />
                </Tabs.Panel>

                <Tabs.Panel value="monthly" pt="xl">
                  <ResultCard period="par mois" data={results.monthly} />
                </Tabs.Panel>

                <Tabs.Panel value="yearly" pt="xl">
                  <ResultCard period="par an" data={results.yearly} />
                </Tabs.Panel>
              </Tabs>
            </Card>
          )}

          {/* Info Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#E7F5FF' }}>
            <Group gap="xs" mb="xs">
              <IconCalculator size={20} color="#228be6" />
              <Text size="sm" fw={600} c="blue">
                À propos de ce simulateur
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Ce simulateur vous aide à estimer vos revenus potentiels en tant que conducteur Truck4U.
              Les calculs incluent les frais de plateforme (10%), les coûts de carburant et de maintenance.
              Ajustez les paramètres pour explorer différents scénarios de travail.
            </Text>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}
