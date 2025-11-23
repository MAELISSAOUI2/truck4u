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
  Tabs,
  Loader,
  Alert,
  Grid,
  TextInput,
  Accordion,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertCircle, IconCalculator, IconSettings, IconCoin, IconTruck, IconAdjustments } from '@tabler/icons-react';
import { pricingApi } from '@/lib/api';

const VEHICLE_TYPES = [
  { value: 'CAMIONNETTE', label: 'Camionnette' },
  { value: 'FOURGON', label: 'Fourgon' },
  { value: 'CAMION_3_5T', label: 'Camion 3.5T' },
  { value: 'CAMION_LOURD', label: 'Camion Lourd' },
];

export default function PricingConfigPage() {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Configurations
  const [vehicleConfigs, setVehicleConfigs] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>(null);

  // Simulateur
  const [vehicleType, setVehicleType] = useState<string>('CAMION_3_5T');
  const [distance, setDistance] = useState<number>(30);
  const [duration, setDuration] = useState<number>(60);
  const [tripType, setTripType] = useState<string>('ALLER_RETOUR');
  const [hasConvoyeur, setHasConvoyeur] = useState(true);
  const [departureTime, setDepartureTime] = useState<Date | null>(new Date('2024-01-15T08:30:00'));
  const [trafficLevel, setTrafficLevel] = useState<string>('DENSE');
  const [estimate, setEstimate] = useState<any>(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setLoadingConfigs(true);
    try {
      const [vehiclesRes, configRes] = await Promise.all([
        pricingApi.getVehicleConfigs(),
        pricingApi.getConfig(),
      ]);
      setVehicleConfigs(vehiclesRes.data.configs || []);
      setGlobalConfig(configRes.data.config || null);
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les configurations',
        color: 'red',
      });
    } finally {
      setLoadingConfigs(false);
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
      await loadConfigurations();
    } catch (error: any) {
      console.error('Error initializing defaults:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible d\'initialiser les configurations',
        color: 'red',
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleUpdateVehiclePricing = async (vehicleType: string, data: any) => {
    try {
      await pricingApi.updateVehiclePricing(vehicleType, data);
      notifications.show({
        title: 'Tarifs mis à jour',
        message: `Tarifs du ${vehicleType} mis à jour avec succès`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      await loadConfigurations();
    } catch (error: any) {
      console.error('Error updating vehicle pricing:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de mettre à jour les tarifs',
        color: 'red',
      });
    }
  };

  const handleUpdateGlobalConfig = async (data: any) => {
    try {
      await pricingApi.updateConfig(data);
      notifications.show({
        title: 'Configuration mise à jour',
        message: 'Configuration globale mise à jour avec succès',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      await loadConfigurations();
    } catch (error: any) {
      console.error('Error updating global config:', error);
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de mettre à jour la configuration',
        color: 'red',
      });
    }
  };

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
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfigs) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Chargement des configurations...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Configuration des Prix</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Gérer les tarifs des véhicules et les coefficients de pricing
            </Text>
          </div>
          <Button
            leftSection={<IconSettings size={18} />}
            onClick={handleInitDefaults}
            loading={initializing}
            variant="light"
            color="blue"
          >
            Initialiser Valeurs Par Défaut
          </Button>
        </Group>

        {/* Tabs */}
        <Tabs defaultValue="vehicles">
          <Tabs.List>
            <Tabs.Tab value="vehicles" leftSection={<IconTruck size={18} />}>
              Tarifs Véhicules
            </Tabs.Tab>
            <Tabs.Tab value="global" leftSection={<IconAdjustments size={18} />}>
              Configuration Globale
            </Tabs.Tab>
            <Tabs.Tab value="simulator" leftSection={<IconCalculator size={18} />}>
              Simulateur
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab 1: Tarifs Véhicules */}
          <Tabs.Panel value="vehicles" pt="xl">
            <VehiclePricingSection
              vehicleConfigs={vehicleConfigs}
              onUpdate={handleUpdateVehiclePricing}
            />
          </Tabs.Panel>

          {/* Tab 2: Configuration Globale */}
          <Tabs.Panel value="global" pt="xl">
            <GlobalConfigSection
              config={globalConfig}
              onUpdate={handleUpdateGlobalConfig}
            />
          </Tabs.Panel>

          {/* Tab 3: Simulateur */}
          <Tabs.Panel value="simulator" pt="xl">
            <SimulatorSection
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              distance={distance}
              setDistance={setDistance}
              duration={duration}
              setDuration={setDuration}
              tripType={tripType}
              setTripType={setTripType}
              hasConvoyeur={hasConvoyeur}
              setHasConvoyeur={setHasConvoyeur}
              departureTime={departureTime}
              setDepartureTime={setDepartureTime}
              trafficLevel={trafficLevel}
              setTrafficLevel={setTrafficLevel}
              estimate={estimate}
              loading={loading}
              onCalculate={handleCalculate}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

// ============================================================================
// SECTION: TARIFS VÉHICULES
// ============================================================================

function VehiclePricingSection({ vehicleConfigs, onUpdate }: any) {
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const handleEdit = (config: any) => {
    setEditingVehicle(config.vehicleType);
    setFormData({
      pricePerKm: config.pricePerKm,
      pricePerHour: config.pricePerHour,
      minimumPrice: config.minimumPrice,
      description: config.description || '',
    });
  };

  const handleSave = async () => {
    if (!editingVehicle) return;
    await onUpdate(editingVehicle, formData);
    setEditingVehicle(null);
    setFormData({});
  };

  return (
    <Stack gap="md">
      <Alert icon={<IconCoin size={18} />} title="Tarifs des Véhicules" color="blue">
        <Text size="sm">
          Configurez les prix au kilomètre, à l'heure et le prix minimum pour chaque type de véhicule.
        </Text>
      </Alert>

      <Grid>
        {VEHICLE_TYPES.map((type) => {
          const config = vehicleConfigs.find((c: any) => c.vehicleType === type.value);
          const isEditing = editingVehicle === type.value;

          return (
            <Grid.Col span={{ base: 12, md: 6 }} key={type.value}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600} size="lg">{type.label}</Text>
                      {config?.description && (
                        <Text size="xs" c="dimmed">{config.description}</Text>
                      )}
                    </div>
                    {!isEditing && config && (
                      <Button size="xs" variant="light" onClick={() => handleEdit(config)}>
                        Modifier
                      </Button>
                    )}
                  </Group>

                  <Divider />

                  {!config ? (
                    <Text size="sm" c="dimmed">Aucun tarif configuré</Text>
                  ) : isEditing ? (
                    <Stack gap="sm">
                      <NumberInput
                        label="Prix au kilomètre (DT)"
                        value={formData.pricePerKm}
                        onChange={(value) => setFormData({ ...formData, pricePerKm: Number(value) })}
                        min={0}
                        step={0.1}
                        decimalScale={2}
                      />
                      <NumberInput
                        label="Prix à l'heure (DT)"
                        value={formData.pricePerHour}
                        onChange={(value) => setFormData({ ...formData, pricePerHour: Number(value) })}
                        min={0}
                        step={1}
                        decimalScale={2}
                      />
                      <NumberInput
                        label="Prix minimum (DT)"
                        value={formData.minimumPrice}
                        onChange={(value) => setFormData({ ...formData, minimumPrice: Number(value) })}
                        min={0}
                        step={1}
                        decimalScale={2}
                      />
                      <TextInput
                        label="Description (optionnel)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
                        placeholder="Ex: Idéal pour petits colis"
                      />
                      <Group>
                        <Button size="sm" onClick={handleSave} leftSection={<IconCheck size={16} />}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="light" color="gray" onClick={() => setEditingVehicle(null)}>
                          Annuler
                        </Button>
                      </Group>
                    </Stack>
                  ) : (
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Prix au km</Text>
                        <Badge size="lg" variant="light">{config.pricePerKm.toFixed(2)} DT/km</Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Prix à l'heure</Text>
                        <Badge size="lg" variant="light">{config.pricePerHour.toFixed(2)} DT/h</Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Prix minimum</Text>
                        <Badge size="lg" variant="light" color="green">{config.minimumPrice.toFixed(2)} DT</Badge>
                      </Group>
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>
    </Stack>
  );
}

// ============================================================================
// SECTION: CONFIGURATION GLOBALE
// ============================================================================

function GlobalConfigSection({ config, onUpdate }: any) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (config) {
      setFormData({
        convoyeurPrice: config.convoyeurPrice,
        tripSimpleCoeff: config.tripSimpleCoeff,
        tripReturnCoeff: config.tripReturnCoeff,
        peakHoursCoeff: config.peakHoursCoeff,
        nightHoursCoeff: config.nightHoursCoeff,
        weekendCoeff: config.weekendCoeff,
        trafficFluidCoeff: config.trafficFluidCoeff,
        trafficMoyenCoeff: config.trafficMoyenCoeff,
        trafficDenseCoeff: config.trafficDenseCoeff,
      });
    }
  }, [config]);

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  if (!config) {
    return (
      <Alert icon={<IconAlertCircle size={18} />} title="Aucune configuration" color="yellow">
        <Text size="sm">
          Aucune configuration globale trouvée. Cliquez sur "Initialiser Valeurs Par Défaut" pour créer une configuration.
        </Text>
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Alert icon={<IconAdjustments size={18} />} title="Coefficients et Prix Fixes" color="blue" style={{ flex: 1 }}>
          <Text size="sm">
            Configurez les coefficients multiplicateurs et les prix fixes utilisés dans le calcul.
          </Text>
        </Alert>
        {!editing && (
          <Button onClick={() => setEditing(true)} variant="light">
            Modifier
          </Button>
        )}
      </Group>

      <Grid>
        {/* Prix Convoyeur */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text fw={600} size="lg">💰 Prix Fixe Convoyeur</Text>
              <Divider />
              {editing ? (
                <NumberInput
                  label="Prix convoyeur (DT)"
                  value={formData.convoyeurPrice}
                  onChange={(value) => setFormData({ ...formData, convoyeurPrice: Number(value) })}
                  min={0}
                  step={5}
                  decimalScale={2}
                />
              ) : (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Prix fixe</Text>
                  <Badge size="lg" color="orange">{config.convoyeurPrice.toFixed(2)} DT</Badge>
                </Group>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Coefficients Voyage */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text fw={600} size="lg">🚗 Coefficients Type de Voyage</Text>
              <Divider />
              {editing ? (
                <Stack gap="sm">
                  <NumberInput
                    label="Aller simple"
                    value={formData.tripSimpleCoeff}
                    onChange={(value) => setFormData({ ...formData, tripSimpleCoeff: Number(value) })}
                    min={0}
                    step={0.1}
                    decimalScale={2}
                  />
                  <NumberInput
                    label="Aller-retour"
                    value={formData.tripReturnCoeff}
                    onChange={(value) => setFormData({ ...formData, tripReturnCoeff: Number(value) })}
                    min={0}
                    step={0.1}
                    decimalScale={2}
                  />
                </Stack>
              ) : (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Aller simple</Text>
                    <Badge variant="light">×{config.tripSimpleCoeff}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Aller-retour</Text>
                    <Badge variant="light">×{config.tripReturnCoeff}</Badge>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Coefficients Horaires */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text fw={600} size="lg">⏰ Coefficients Horaires</Text>
              <Divider />
              {editing ? (
                <Stack gap="sm">
                  <NumberInput
                    label="Heures pleines"
                    value={formData.peakHoursCoeff}
                    onChange={(value) => setFormData({ ...formData, peakHoursCoeff: Number(value) })}
                    min={1}
                    step={0.1}
                    decimalScale={2}
                  />
                  <NumberInput
                    label="Heures de nuit"
                    value={formData.nightHoursCoeff}
                    onChange={(value) => setFormData({ ...formData, nightHoursCoeff: Number(value) })}
                    min={1}
                    step={0.1}
                    decimalScale={2}
                  />
                  <NumberInput
                    label="Week-end"
                    value={formData.weekendCoeff}
                    onChange={(value) => setFormData({ ...formData, weekendCoeff: Number(value) })}
                    min={1}
                    step={0.1}
                    decimalScale={2}
                  />
                </Stack>
              ) : (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Heures pleines</Text>
                    <Badge variant="light">×{config.peakHoursCoeff}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Heures de nuit</Text>
                    <Badge variant="light">×{config.nightHoursCoeff}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Week-end</Text>
                    <Badge variant="light">×{config.weekendCoeff}</Badge>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Coefficients Trafic */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text fw={600} size="lg">🚦 Coefficients Trafic</Text>
              <Divider />
              {editing ? (
                <Stack gap="sm">
                  <NumberInput
                    label="Trafic fluide"
                    value={formData.trafficFluidCoeff}
                    onChange={(value) => setFormData({ ...formData, trafficFluidCoeff: Number(value) })}
                    min={1}
                    step={0.05}
                    decimalScale={2}
                  />
                  <NumberInput
                    label="Trafic moyen"
                    value={formData.trafficMoyenCoeff}
                    onChange={(value) => setFormData({ ...formData, trafficMoyenCoeff: Number(value) })}
                    min={1}
                    step={0.05}
                    decimalScale={2}
                  />
                  <NumberInput
                    label="Trafic dense"
                    value={formData.trafficDenseCoeff}
                    onChange={(value) => setFormData({ ...formData, trafficDenseCoeff: Number(value) })}
                    min={1}
                    step={0.05}
                    decimalScale={2}
                  />
                </Stack>
              ) : (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">🟢 Fluide</Text>
                    <Badge variant="light">×{config.trafficFluidCoeff}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">🟡 Moyen</Text>
                    <Badge variant="light">×{config.trafficMoyenCoeff}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">🔴 Dense</Text>
                    <Badge variant="light">×{config.trafficDenseCoeff}</Badge>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {editing && (
        <Group justify="flex-end">
          <Button onClick={handleSave} leftSection={<IconCheck size={16} />}>
            Enregistrer les Modifications
          </Button>
          <Button variant="light" color="gray" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        </Group>
      )}
    </Stack>
  );
}

// ============================================================================
// SECTION: SIMULATEUR
// ============================================================================

function SimulatorSection({
  vehicleType,
  setVehicleType,
  distance,
  setDistance,
  duration,
  setDuration,
  tripType,
  setTripType,
  hasConvoyeur,
  setHasConvoyeur,
  departureTime,
  setDepartureTime,
  trafficLevel,
  setTrafficLevel,
  estimate,
  loading,
  onCalculate,
}: any) {
  return (
    <Group align="flex-start" gap="xl">
      {/* Formulaire */}
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ flex: 1 }}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600} size="lg">Calculateur d'Estimation</Text>
            <IconCalculator size={24} />
          </Group>
          <Divider />

          <Select
            label="Type de véhicule"
            value={vehicleType}
            onChange={(value) => setVehicleType(value!)}
            data={VEHICLE_TYPES}
          />

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

          <Select
            label="Type de voyage"
            value={tripType}
            onChange={(value) => setTripType(value!)}
            data={[
              { value: 'ALLER_SIMPLE', label: 'Aller Simple' },
              { value: 'ALLER_RETOUR', label: 'Aller-Retour' },
            ]}
          />

          <DateTimePicker
            label="Heure de départ"
            value={departureTime}
            onChange={setDepartureTime}
            clearable
          />

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

          <Switch
            label="Avec convoyeur"
            checked={hasConvoyeur}
            onChange={(event) => setHasConvoyeur(event.currentTarget.checked)}
          />

          <Button
            fullWidth
            size="lg"
            onClick={onCalculate}
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
              <Text fw={600} size="lg">Résultat</Text>
              <Badge size="xl" color="green" variant="filled">
                {estimate.finalPrice.toFixed(2)} DT
              </Badge>
            </Group>

            <Divider />

            <Paper p="md" withBorder style={{ background: '#f8f9fa' }}>
              <Stack gap="xs">
                <Text size="sm" fw={600} mb="xs">Détail du Calcul:</Text>

                <Group justify="space-between">
                  <Text size="sm">1️⃣ Coût de Base</Text>
                  <Text size="sm" fw={500}>{estimate.breakdown.step1_basePrice.toFixed(2)} DT</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm">2️⃣ Type Voyage (×{estimate.breakdown.appliedCoefficients.tripType})</Text>
                  <Text size="sm" fw={500}>{estimate.breakdown.step2_afterTripType.toFixed(2)} DT</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm">3️⃣ Horaires (×{estimate.breakdown.appliedCoefficients.timeSlot})</Text>
                  <Text size="sm" fw={500}>{estimate.breakdown.step3_afterTimeSlot.toFixed(2)} DT</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm">4️⃣ Trafic (×{estimate.breakdown.appliedCoefficients.traffic})</Text>
                  <Text size="sm" fw={500}>{estimate.breakdown.step4_afterTraffic.toFixed(2)} DT</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm">5️⃣ Convoyeur</Text>
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
          </Stack>
        </Card>
      )}
    </Group>
  );
}
