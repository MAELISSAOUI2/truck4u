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
  Button,
  Badge,
  Loader,
  Center,
  SimpleGrid,
  ThemeIcon,
  Progress,
  Modal,
  TextInput,
  Alert,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconRoute,
  IconMapPin,
  IconTrendingUp,
  IconGasStation,
  IconCoin,
  IconHome,
  IconAlertCircle,
  IconTarget,
  IconChevronRight,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { driverApi, rideApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function DriverReturnLoadsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [returnLoadsData, setReturnLoadsData] = useState<any>(null);
  const [homeLocationModalOpen, setHomeLocationModalOpen] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [settingHome, setSettingHome] = useState(false);

  useEffect(() => {
    if (!token || user?.userType !== 'driver') {
      router.push('/driver/login');
      return;
    }

    loadReturnLoads();
  }, [token, user]);

  const loadReturnLoads = async () => {
    setLoading(true);
    try {
      const response = await driverApi.getReturnLoads();
      setReturnLoadsData(response.data);
    } catch (error: any) {
      // Check if error is about missing home location
      if (error.response?.data?.error?.includes('home location')) {
        notifications.show({
          title: 'Position de retour non définie',
          message: 'Veuillez définir votre position de retour habituelle',
          color: 'orange',
        });
        setHomeLocationModalOpen(true);
      } else if (error.response?.data?.error?.includes('Current location')) {
        notifications.show({
          title: 'Position GPS requise',
          message: 'Veuillez activer votre GPS et mettre à jour votre position',
          color: 'orange',
        });
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.response?.data?.error || 'Impossible de charger les chargements de retour',
          color: 'red',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetHomeLocation = async () => {
    if (!user?.currentLocation) {
      notifications.show({
        title: 'Erreur',
        message: 'Position GPS non disponible',
        color: 'red',
      });
      return;
    }

    setSettingHome(true);
    try {
      const location = user.currentLocation as any;
      await driverApi.updateHomeLocation(location.lat, location.lng, homeAddress);

      notifications.show({
        title: 'Position enregistrée',
        message: 'Votre position de retour a été enregistrée avec succès',
        color: 'green',
      });

      setHomeLocationModalOpen(false);
      loadReturnLoads();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible d\'enregistrer la position',
        color: 'red',
      });
    } finally {
      setSettingHome(false);
    }
  };

  const handleBidOnRide = async (rideId: string) => {
    router.push(`/driver/rides/${rideId}`);
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

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
                Retour à vide
              </Title>
              <Text c="dimmed" size="sm">
                Trouvez des chargements le long de votre trajet retour
              </Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Route Info Card */}
          {returnLoadsData && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Stack gap="lg">
                <Group justify="space-between">
                  <Title order={3} size="1.25rem">
                    Votre trajet de retour
                  </Title>
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconHome size={16} />}
                    onClick={() => setHomeLocationModalOpen(true)}
                  >
                    Modifier destination
                  </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                  <div>
                    <Group gap="xs" mb="xs">
                      <IconMapPin size={18} color="#228be6" />
                      <Text size="sm" fw={500}>Position actuelle</Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {returnLoadsData.currentLocation?.address ||
                        `${returnLoadsData.currentLocation?.lat.toFixed(4)}, ${returnLoadsData.currentLocation?.lng.toFixed(4)}`}
                    </Text>
                  </div>

                  <div>
                    <Group gap="xs" mb="xs">
                      <IconTarget size={18} color="#fa5252" />
                      <Text size="sm" fw={500}>Destination</Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {returnLoadsData.destination?.address ||
                        `${returnLoadsData.destination?.lat.toFixed(4)}, ${returnLoadsData.destination?.lng.toFixed(4)}`}
                    </Text>
                  </div>

                  <div>
                    <Group gap="xs" mb="xs">
                      <IconRoute size={18} color="#51cf66" />
                      <Text size="sm" fw={500}>Distance directe</Text>
                    </Group>
                    <Text size="lg" fw={600} c="green">
                      {returnLoadsData.directDistance} km
                    </Text>
                  </div>
                </SimpleGrid>
              </Stack>
            </Card>
          )}

          {/* Return Loads List */}
          {returnLoadsData && returnLoadsData.returnLoads.length === 0 && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Aucun chargement trouvé"
              color="blue"
            >
              Aucun chargement disponible le long de votre trajet de retour pour le moment.
              Détour maximal autorisé: {returnLoadsData.maxDetour} km
            </Alert>
          )}

          {returnLoadsData && returnLoadsData.returnLoads.length > 0 && (
            <>
              <Group justify="space-between">
                <Title order={2} size="1.5rem">
                  Chargements disponibles ({returnLoadsData.totalFound})
                </Title>
                <Badge size="lg" variant="light" color="blue">
                  Détour max: {returnLoadsData.maxDetour} km
                </Badge>
              </Group>

              <Stack gap="md">
                {returnLoadsData.returnLoads.map((ride: any) => {
                  const info = ride.returnLoadInfo;
                  const pickup = ride.pickup as any;
                  const dropoff = ride.dropoff as any;

                  return (
                    <Card key={ride.id} shadow="sm" padding="lg" radius="md" withBorder>
                      <Stack gap="md">
                        {/* Header */}
                        <Group justify="space-between">
                          <div>
                            <Group gap="xs" mb="xs">
                              <Badge color="blue">{ride.vehicleType}</Badge>
                              <Badge color="gray">{ride._count.bids} offres</Badge>
                            </Group>
                            <Text size="sm" c="dimmed">
                              {ride.customer.name} • {ride.customer.accountType === 'BUSINESS' ? 'Entreprise' : 'Particulier'}
                            </Text>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Text size="xs" c="dimmed">Gains estimés</Text>
                            <Text size="xl" fw={700} c="green">
                              {info.netEarnings} DT
                            </Text>
                            <Text size="xs" c="dimmed">
                              (Brut: {info.grossEarnings} DT)
                            </Text>
                          </div>
                        </Group>

                        {/* Route Info */}
                        <div>
                          <Group gap="xs" mb="xs">
                            <IconMapPin size={16} />
                            <Text size="sm" fw={500}>Pickup</Text>
                          </Group>
                          <Text size="sm" c="dimmed" ml={24}>
                            {pickup.address}
                          </Text>

                          {dropoff && (
                            <>
                              <Group gap="xs" mb="xs" mt="xs">
                                <IconMapPin size={16} color="#228be6" />
                                <Text size="sm" fw={500}>Dropoff</Text>
                              </Group>
                              <Text size="sm" c="dimmed" ml={24}>
                                {dropoff.address}
                              </Text>
                            </>
                          )}
                        </div>

                        {/* Metrics */}
                        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                          <div>
                            <Text size="xs" c="dimmed">Distance pickup</Text>
                            <Text size="sm" fw={600}>{info.distanceToPickup} km</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Détour</Text>
                            <Text size="sm" fw={600} c={info.detour <= 10 ? 'green' : 'orange'}>
                              +{info.detour} km
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Efficacité</Text>
                            <Group gap={4}>
                              <Text size="sm" fw={600} c="blue">
                                {info.efficiency}%
                              </Text>
                              <ThemeIcon
                                size="sm"
                                variant="light"
                                color={info.efficiency >= 70 ? 'green' : info.efficiency >= 50 ? 'orange' : 'red'}
                              >
                                <IconTrendingUp size={12} />
                              </ThemeIcon>
                            </Group>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Distance course</Text>
                            <Text size="sm" fw={600}>{info.pickupToDropoff} km</Text>
                          </div>
                        </SimpleGrid>

                        {/* Efficiency Bar */}
                        <div>
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" fw={500}>Efficacité du trajet</Text>
                            <Text size="xs" c="dimmed">
                              {info.totalDistanceWithRide} km total
                            </Text>
                          </Group>
                          <Progress
                            value={info.efficiency}
                            color={info.efficiency >= 70 ? 'green' : info.efficiency >= 50 ? 'blue' : 'orange'}
                            size="lg"
                            radius="xl"
                          />
                        </div>

                        {/* Action Button */}
                        <Button
                          fullWidth
                          size="md"
                          rightSection={<IconChevronRight size={18} />}
                          onClick={() => handleBidOnRide(ride.id)}
                          variant="gradient"
                          gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                        >
                          Voir et faire une offre
                        </Button>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            </>
          )}

          {/* Info Card */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ background: '#E7F5FF' }}>
            <Group gap="xs" mb="xs">
              <IconGasStation size={20} color="#228be6" />
              <Text size="sm" fw={600} c="blue">
                Comment ça marche ?
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Le mode retour à vide vous aide à maximiser votre rentabilité en trouvant des chargements
              le long de votre trajet de retour. L'efficacité mesure le pourcentage du trajet total qui
              est profitable. Plus l'efficacité est élevée, plus vous économisez en carburant et en temps.
            </Text>
          </Card>
        </Stack>
      </Container>

      {/* Home Location Modal */}
      <Modal
        opened={homeLocationModalOpen}
        onClose={() => setHomeLocationModalOpen(false)}
        title="Définir votre position de retour"
        size="md"
      >
        <Stack gap="md">
          <Alert icon={<IconHome size={16} />} color="blue">
            Votre position actuelle sera enregistrée comme position de retour habituelle.
            Vous pourrez la modifier à tout moment.
          </Alert>

          <TextInput
            label="Adresse (optionnel)"
            placeholder="Ex: Tunis, Rue de la République"
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setHomeLocationModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSetHomeLocation} loading={settingHome}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
