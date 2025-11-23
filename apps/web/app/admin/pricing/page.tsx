'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Card,
  Stack,
  Group,
  Button,
  Select,
  NumberInput,
  Switch,
  Text,
  Paper,
  Divider,
  Badge,
  Table,
  Loader,
  Alert,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle, IconCalculator, IconSettings } from '@tabler/icons-react';
import { pricingApi } from '@/lib/api';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Form fields
  const [vehicleType, setVehicleType] = useState<string>('CAMION_3_5T');
  const [distance, setDistance] = useState<number>(30);
  const [duration, setDuration] = useState<number>(60);
  const [tripType, setTripType] = useState<string>('ALLER_RETOUR');
  const [hasConvoyeur, setHasConvoyeur] = useState(true);
  const [departureTime, setDepartureTime] = useState<Date | null>(new Date('2024-01-15T08:30:00'));
  const [trafficLevel, setTrafficLevel] = useState<string>('DENSE');

  // Results
  const [estimate, setEstimate] = useState<any>(null);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await pricingApi.estimate({
        vehicleType: vehicleType as any,
        distance,
        duration,
        tripType: tripType as any,
        hasConvoyeur,
        departureTime: departureTime?.toISOString(),
        trafficLevel: trafficLevel as any,
      });

      setEstimate(response.data.estimate);
      notifications.show({
        title: 'Estimation calculée',
        message: `Prix final: ${response.data.estimate.finalPrice.toFixed(2)} DT`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      console.error('Error calculating estimate:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de calculer l\'estimation',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitDefaults = async () => {
    setInitializing(true);
    try {
      const response = await pricingApi.initDefaults();
      notifications.show({
        title: 'Configurations initialisées',
        message: response.data.message,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      console.error('Error initializing defaults:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible d\'initialiser les configurations',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Système de Pricing</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Algorithme modulaire d'estimation de prix en 6 étapes
            </Text>
          </div>
          <Button
            leftSection={<IconSettings size={18} />}
            onClick={handleInitDefaults}
            loading={initializing}
            variant="light"
          >
            Initialiser Configs Par Défaut
          </Button>
        </Group>

        {/* Info Alert */}
        <Alert icon={<IconAlertCircle size={18} />} title="Algorithme de Pricing" color="blue">
          <Text size="sm">
            <strong>6 Étapes:</strong> Coût base → Facteur voyage → Coefficients horaires → Trafic → Convoyeur → Prix minimum
          </Text>
        </Alert>

        <Group align="flex-start" gap="xl">
          {/* Formulaire d'estimation */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">Calculateur d'Estimation</Text>
                <IconCalculator size={24} />
              </Group>

              <Divider />

              {/* Type de véhicule */}
              <Select
                label="Type de véhicule"
                value={vehicleType}
                onChange={(value) => setVehicleType(value!)}
                data={[
                  { value: 'CAMIONNETTE', label: 'Camionnette' },
                  { value: 'FOURGON', label: 'Fourgon' },
                  { value: 'CAMION_3_5T', label: 'Camion 3.5T' },
                  { value: 'CAMION_LOURD', label: 'Camion Lourd' },
                ]}
              />

              {/* Distance et durée */}
              <Group grow>
                <NumberInput
                  label="Distance (km)"
                  value={distance}
                  onChange={(value) => setDistance(Number(value))}
                  min={0}
                  step={1}
                  decimalScale={2}
                />
                <NumberInput
                  label="Durée (minutes)"
                  value={duration}
                  onChange={(value) => setDuration(Number(value))}
                  min={0}
                  step={5}
                />
              </Group>

              {/* Type de voyage */}
              <Select
                label="Type de voyage"
                value={tripType}
                onChange={(value) => setTripType(value!)}
                data={[
                  { value: 'ALLER_SIMPLE', label: 'Aller Simple' },
                  { value: 'ALLER_RETOUR', label: 'Aller-Retour' },
                ]}
              />

              {/* Heure de départ */}
              <DateTimePicker
                label="Heure de départ"
                value={departureTime}
                onChange={setDepartureTime}
                clearable
              />

              {/* Niveau de trafic */}
              <Select
                label="Niveau de trafic"
                value={trafficLevel}
                onChange={(value) => setTrafficLevel(value!)}
                data={[
                  { value: 'FLUIDE', label: '🟢 Fluide' },
                  { value: 'MOYEN', label: '🟡 Moyen' },
                  { value: 'DENSE', label: '🔴 Dense' },
                ]}
              />

              {/* Convoyeur */}
              <Switch
                label="Avec convoyeur"
                checked={hasConvoyeur}
                onChange={(event) => setHasConvoyeur(event.currentTarget.checked)}
              />

              <Button
                fullWidth
                size="lg"
                onClick={handleCalculate}
                loading={loading}
                leftSection={<IconCalculator size={18} />}
              >
                Calculer l'Estimation
              </Button>
            </Stack>
          </Card>

          {/* Résultats */}
          {estimate && (
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600} size="lg">Résultat de l'Estimation</Text>
                  <Badge size="xl" color="green" variant="filled">
                    {estimate.finalPrice.toFixed(2)} DT
                  </Badge>
                </Group>

                <Divider />

                {/* Breakdown détaillé */}
                <Paper p="md" withBorder style={{ background: '#f8f9fa' }}>
                  <Stack gap="xs">
                    <Text size="sm" fw={600} mb="xs">Détail du Calcul (6 Étapes):</Text>

                    <Group justify="space-between">
                      <Text size="sm">1️⃣ Coût de Base</Text>
                      <Text size="sm" fw={500}>{estimate.breakdown.step1_basePrice.toFixed(2)} DT</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">2️⃣ Après Type Voyage (×{estimate.breakdown.appliedCoefficients.tripType})</Text>
                      <Text size="sm" fw={500}>{estimate.breakdown.step2_afterTripType.toFixed(2)} DT</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">3️⃣ Après Horaires (×{estimate.breakdown.appliedCoefficients.timeSlot})</Text>
                      <Text size="sm" fw={500}>{estimate.breakdown.step3_afterTimeSlot.toFixed(2)} DT</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">4️⃣ Après Trafic (×{estimate.breakdown.appliedCoefficients.traffic})</Text>
                      <Text size="sm" fw={500}>{estimate.breakdown.step4_afterTraffic.toFixed(2)} DT</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">5️⃣ Avec Convoyeur</Text>
                      <Text size="sm" fw={500}>{estimate.breakdown.step5_convoyeurFee.toFixed(2)} DT</Text>
                    </Group>

                    <Divider my="xs" />

                    <Group justify="space-between">
                      <Text size="sm" fw={700}>6️⃣ Prix Final</Text>
                      <Text size="sm" fw={700} c="green">{estimate.breakdown.step6_finalPrice.toFixed(2)} DT</Text>
                    </Group>

                    {estimate.breakdown.minimumPriceApplied && (
                      <Badge color="orange" variant="light" mt="xs">
                        Prix minimum appliqué
                      </Badge>
                    )}
                  </Stack>
                </Paper>

                {/* Tarifs du véhicule */}
                <Paper p="md" withBorder>
                  <Stack gap="xs">
                    <Text size="sm" fw={600} mb="xs">Configuration du Véhicule:</Text>

                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Prix au km</Text>
                      <Text size="xs">{estimate.vehiclePricing.pricePerKm.toFixed(2)} DT/km</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Prix à l'heure</Text>
                      <Text size="xs">{estimate.vehiclePricing.pricePerHour.toFixed(2)} DT/h</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Prix minimum</Text>
                      <Text size="xs">{estimate.vehiclePricing.minimumPrice.toFixed(2)} DT</Text>
                    </Group>
                  </Stack>
                </Paper>
              </Stack>
            </Card>
          )}
        </Group>

        {/* Exemple du User */}
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#e7f5ff' }}>
          <Stack gap="md">
            <Text fw={600} size="lg">📋 Exemple de Calcul (Camion 3.5T)</Text>
            <Text size="sm">
              Distance: 30 km, Durée: 60 min, Aller-retour, Avec convoyeur, 08:30, Trafic dense
            </Text>
            <Text size="sm" fw={500}>
              Tarif: 1.8 DT/km, 75 DT/h, minimum 50 DT • Prix convoyeur: 50 DT
            </Text>

            <Divider />

            <Stack gap="xs">
              <Text size="sm">1. Coût base: (30 × 1.8) + (1 × 75) = <strong>129 DT</strong></Text>
              <Text size="sm">2. Avec voyage: 129 × 1.6 = <strong>206.4 DT</strong></Text>
              <Text size="sm">3. Avec horaire: 206.4 × 1.3 = <strong>268.32 DT</strong> (heures pleines)</Text>
              <Text size="sm">4. Avec trafic: 268.32 × 1.15 = <strong>308.57 DT</strong></Text>
              <Text size="sm">5. Avec convoyeur: 308.57 + 50 = <strong>358.57 DT</strong></Text>
              <Text size="sm">6. Vérification minimum: 358.57 &gt; 50 → Prix final = <strong>358.57 DT</strong></Text>
            </Stack>

            <Button
              variant="light"
              onClick={() => {
                setVehicleType('CAMION_3_5T');
                setDistance(30);
                setDuration(60);
                setTripType('ALLER_RETOUR');
                setHasConvoyeur(true);
                setDepartureTime(new Date('2024-01-15T08:30:00'));
                setTrafficLevel('DENSE');
                handleCalculate();
              }}
            >
              Tester cet exemple
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
