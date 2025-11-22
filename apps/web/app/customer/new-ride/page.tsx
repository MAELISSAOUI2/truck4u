'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Textarea,
  Button,
  Card,
  Group,
  ActionIcon,
  Paper,
  SimpleGrid,
  Checkbox,
  Select,
  Stepper,
  Badge,
  ThemeIcon,
  rem,
  TextInput,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import {
  IconArrowLeft,
  IconMapPin,
  IconPackage,
  IconClock,
  IconNavigation,
  IconMinus,
  IconPlus,
  IconCalendar,
  IconPhoto,
  IconUpload,
  IconX,
  IconCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import SimpleMap from '@/components/SimpleMap';
import { notifications } from '@mantine/notifications';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';

const VEHICLE_TYPES = [
  { value: 'CAMIONNETTE', label: 'Camionnette', icon: '🚙', basePrice: 20, capacity: '500kg', description: 'Parfait pour les petits colis' },
  { value: 'FOURGON', label: 'Fourgon', icon: '🚐', basePrice: 35, capacity: '1 tonne', description: 'Idéal pour les charges moyennes' },
  { value: 'CAMION_3_5T', label: 'Camion 3.5T', icon: '🚚', basePrice: 60, capacity: '3.5 tonnes', description: 'Pour les grandes livraisons' },
  { value: 'CAMION_LOURD', label: 'Camion Lourd', icon: '🚛', basePrice: 100, capacity: '8+ tonnes', description: 'Transport de marchandises lourdes' },
];

export default function NewRidePage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: 36.8065,
    pickupLng: 10.1815,
    deliveryAddress: '',
    deliveryLat: 36.8188,
    deliveryLng: 10.1658,
    schedulingType: 'immediate', // 'immediate' or 'scheduled'
    scheduledDate: null as Date | null,
    vehicleType: 'FOURGON',
    cargoDescription: '',
    cargoWeight: '',
    numberOfHelpers: 0,
    numberOfTrips: 1,
    isUrgent: false,
  });

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
  }, [token, router]);

  // Calculate route using OSRM (free!)
  const calculateRoute = async () => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${formData.pickupLng},${formData.pickupLat};${formData.deliveryLng},${formData.deliveryLat}?` +
        `overview=false&geometries=geojson`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          setDistance(parseFloat((route.distance / 1000).toFixed(1)));
          setDuration(Math.round(route.duration / 60));
        }
      }
    } catch (err) {
      console.error('Error calculating route:', err);
    }
  };

  // Calculate route when both addresses are set
  useEffect(() => {
    if (formData.pickupAddress && formData.deliveryAddress) {
      calculateRoute();
    }
  }, [formData.pickupLat, formData.pickupLng, formData.deliveryLat, formData.deliveryLng]);

  const handlePickupChange = (address: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      pickupAddress: address,
      pickupLat: lat,
      pickupLng: lng,
    }));
  };

  const handleDeliveryChange = (address: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      deliveryAddress: address,
      deliveryLat: lat,
      deliveryLng: lng,
    }));
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!formData.pickupAddress || !formData.deliveryAddress) {
        setError('Veuillez saisir les deux adresses');
        return;
      }
    }
    setError('');
    setActiveStep(prev => prev + 1);
  };

  const calculatePrice = () => {
    const vehicle = VEHICLE_TYPES.find(v => v.value === formData.vehicleType);
    if (!vehicle) return 0;

    let price = vehicle.basePrice;
    price += distance * 1.5; // 1.5 DT per km
    price += formData.numberOfHelpers * 15; // 15 DT per helper
    price += (formData.numberOfTrips - 1) * 10; // 10 DT per additional trip
    if (formData.isUrgent) price *= 1.2; // +20% for urgent

    return Math.round(price);
  };

  const handleSubmit = async () => {
    if (!formData.cargoDescription) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Upload photos first if any
      const photoUrls: string[] = [];
      // In a real app, you'd upload to a storage service here

      // Transform data to match API schema
      const apiData = {
        pickup: {
          lat: formData.pickupLat,
          lng: formData.pickupLng,
          address: formData.pickupAddress,
        },
        dropoff: {
          lat: formData.deliveryLat,
          lng: formData.deliveryLng,
          address: formData.deliveryAddress,
        },
        vehicleType: formData.vehicleType,
        loadAssistance: formData.numberOfHelpers > 0,
        numberOfTrips: formData.numberOfTrips,
        itemPhotos: photoUrls,
        description: formData.cargoDescription,
        serviceType: formData.schedulingType === 'immediate' ? 'IMMEDIATE' : 'SCHEDULED',
        scheduledFor: formData.scheduledDate ? formData.scheduledDate.toISOString() : undefined,
      };

      const response = await rideApi.create(apiData);

      notifications.show({
        title: 'Succès!',
        message: 'Votre course a été publiée avec succès',
        color: 'green',
      });

      // Success! Redirect to dashboard
      router.push(`/customer/dashboard?success=ride_created`);
    } catch (err: any) {
      console.error('Erreur création course:', err);

      // If API is not available, show helpful message
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('⚠️ API backend non disponible. Démarrez l\'API avec: cd apps/api && npm run dev');
      } else {
        setError(err.response?.data?.message || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="md" radius={0} withBorder>
        <Container size="xl">
          <Group justify="space-between">
            <ActionIcon
              size="lg"
              variant="subtle"
              color="dark"
              onClick={() => activeStep > 0 ? setActiveStep(prev => prev - 1) : router.push('/customer/dashboard')}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
            <Title order={2} size="1.25rem">Nouvelle course</Title>
            <div style={{ width: 40 }} />
          </Group>
        </Container>
      </Paper>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        {/* Map - Left side - always visible */}
        <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
          {formData.pickupAddress && formData.deliveryAddress ? (
            <SimpleMap
              pickup={{
                lat: formData.pickupLat,
                lng: formData.pickupLng,
                address: formData.pickupAddress
              }}
              dropoff={{
                lat: formData.deliveryLat,
                lng: formData.deliveryLng,
                address: formData.deliveryAddress
              }}
              height="100%"
            />
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f1f3f5'
            }}>
              <Stack align="center" gap="md">
                <IconMapPin size={64} color="#868e96" />
                <Text c="dimmed" size="lg">
                  Sélectionnez les adresses pour voir la carte
                </Text>
              </Stack>
            </div>
          )}

          {/* Route Info Overlay */}
          {distance > 0 && (
            <Paper
              shadow="lg"
              p="md"
              radius="lg"
              withBorder
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                zIndex: 10,
                backgroundColor: 'white',
              }}
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon size="lg" radius="lg" variant="light" color="blue">
                    <IconNavigation size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">Distance</Text>
                    <Text size="lg" fw={700}>{distance} km</Text>
                  </div>
                </Group>
                <Group gap="sm">
                  <ThemeIcon size="lg" radius="lg" variant="light" color="green">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">Durée</Text>
                    <Text size="lg" fw={700}>{duration} min</Text>
                  </div>
                </Group>
              </Group>
            </Paper>
          )}
        </div>

        {/* Form - Right side with stepper */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: 'white' }}>
          <Container size="md" py="xl">
            <Stepper active={activeStep} onStepClick={setActiveStep} size="sm" mb="xl">
              <Stepper.Step label="Adresses" description="D'où à où ?">
                <Stack gap="xl" mt="xl">
                  {error && (
                    <Paper p="md" radius="md" bg="red.0" withBorder>
                      <Text c="red" size="sm">{error}</Text>
                    </Paper>
                  )}

                  {/* Scheduling Type */}
                  <Select
                    label="Quand ?"
                    size="lg"
                    radius="lg"
                    value={formData.schedulingType}
                    onChange={(value) => setFormData({ ...formData, schedulingType: value || 'immediate' })}
                    data={[
                      { value: 'immediate', label: 'Immédiatement' },
                      { value: 'scheduled', label: 'Planifier' },
                    ]}
                    leftSection={<IconClock size={18} />}
                  />

                  {formData.schedulingType === 'scheduled' && (
                    <DateTimePicker
                      label="Date et heure de prise en charge"
                      placeholder="Sélectionner une date et heure"
                      size="lg"
                      radius="lg"
                      value={formData.scheduledDate}
                      onChange={(value) => setFormData({ ...formData, scheduledDate: value as any })}
                      minDate={new Date()}
                      leftSection={<IconCalendar size={18} />}
                    />
                  )}

                  {/* Pickup Address with autocomplete */}
                  <AddressAutocomplete
                    label="Adresse de départ"
                    placeholder="Rechercher une adresse..."
                    value={formData.pickupAddress}
                    onChange={handlePickupChange}
                    icon={<IconMapPin size={18} style={{ color: '#51cf66' }} />}
                  />

                  {/* Delivery Address with autocomplete */}
                  <AddressAutocomplete
                    label="Adresse de livraison"
                    placeholder="Rechercher une adresse..."
                    value={formData.deliveryAddress}
                    onChange={handleDeliveryChange}
                    icon={<IconMapPin size={18} style={{ color: '#ff6b6b' }} />}
                  />

                  <Button
                    size="xl"
                    radius="lg"
                    color="dark"
                    onClick={handleNextStep}
                    disabled={!formData.pickupAddress || !formData.deliveryAddress}
                    fullWidth
                  >
                    Continuer
                  </Button>
                </Stack>
              </Stepper.Step>

              <Stepper.Step label="Véhicule" description="Type de transport">
                <Stack gap="xl" mt="xl">
                  <Text size="sm" fw={600}>Sélectionnez le type de véhicule</Text>
                  <SimpleGrid cols={2} spacing="md">
                    {VEHICLE_TYPES.map((vehicle) => (
                      <Card
                        key={vehicle.value}
                        shadow="sm"
                        padding="lg"
                        radius="lg"
                        withBorder
                        style={{
                          cursor: 'pointer',
                          borderColor: formData.vehicleType === vehicle.value ? '#000' : undefined,
                          borderWidth: formData.vehicleType === vehicle.value ? 2 : 1,
                          backgroundColor: formData.vehicleType === vehicle.value ? '#f8f9fa' : undefined,
                        }}
                        onClick={() => setFormData({ ...formData, vehicleType: vehicle.value })}
                      >
                        <Stack gap="sm">
                          <div style={{ fontSize: '2.5rem', textAlign: 'center' }}>{vehicle.icon}</div>
                          <Text fw={700} size="md" ta="center">{vehicle.label}</Text>
                          <Badge color="gray" variant="light" fullWidth>{vehicle.capacity}</Badge>
                          <Text size="xs" c="dimmed" ta="center">{vehicle.description}</Text>
                        </Stack>
                      </Card>
                    ))}
                  </SimpleGrid>

                  <Button size="xl" radius="lg" color="dark" onClick={handleNextStep} fullWidth>
                    Continuer
                  </Button>
                </Stack>
              </Stepper.Step>

              <Stepper.Step label="Détails" description="Informations">
                <Stack gap="lg" mt="xl">
                  <Textarea
                    label="Description de la marchandise"
                    placeholder="Ex: 20 cartons de produits alimentaires"
                    size="md"
                    radius="lg"
                    rows={3}
                    value={formData.cargoDescription}
                    onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                    required
                    leftSection={<IconPackage size={18} />}
                  />

                  <TextInput
                    label="Poids estimé (kg)"
                    placeholder="500"
                    size="md"
                    radius="lg"
                    type="number"
                    value={formData.cargoWeight}
                    onChange={(e) => setFormData({ ...formData, cargoWeight: e.target.value })}
                  />

                  <div>
                    <Text size="sm" fw={500} mb="xs">Nombre de convoyeurs</Text>
                    <Group gap="xs">
                      <ActionIcon
                        size="lg"
                        radius="lg"
                        variant="light"
                        color="gray"
                        onClick={() => setFormData({ ...formData, numberOfHelpers: Math.max(0, formData.numberOfHelpers - 1) })}
                      >
                        <IconMinus size={18} />
                      </ActionIcon>
                      <Text size="xl" fw={700} style={{ flex: 1, textAlign: 'center' }}>
                        {formData.numberOfHelpers}
                      </Text>
                      <ActionIcon
                        size="lg"
                        radius="lg"
                        color="dark"
                        onClick={() => setFormData({ ...formData, numberOfHelpers: formData.numberOfHelpers + 1 })}
                      >
                        <IconPlus size={18} />
                      </ActionIcon>
                    </Group>
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb="xs">Nombre de voyages</Text>
                    <Group gap="xs">
                      <ActionIcon
                        size="lg"
                        radius="lg"
                        variant="light"
                        color="gray"
                        onClick={() => setFormData({ ...formData, numberOfTrips: Math.max(1, formData.numberOfTrips - 1) })}
                      >
                        <IconMinus size={18} />
                      </ActionIcon>
                      <Text size="xl" fw={700} style={{ flex: 1, textAlign: 'center' }}>
                        {formData.numberOfTrips}
                      </Text>
                      <ActionIcon
                        size="lg"
                        radius="lg"
                        color="dark"
                        onClick={() => setFormData({ ...formData, numberOfTrips: formData.numberOfTrips + 1) })}
                      >
                        <IconPlus size={18} />
                      </ActionIcon>
                    </Group>
                  </div>

                  <Paper p="md" radius="lg" withBorder>
                    <Checkbox
                      label={
                        <div>
                          <Text fw={600}>Course urgente</Text>
                          <Text size="sm" c="dimmed">Priorité maximale</Text>
                        </div>
                      }
                      checked={formData.isUrgent}
                      onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                      size="md"
                    />
                  </Paper>

                  <div>
                    <Text size="sm" fw={500} mb="xs">Photos de la marchandise (optionnel)</Text>
                    <Dropzone
                      onDrop={(files) => setPhotos(prev => [...prev, ...files])}
                      onReject={(files) => console.log('rejected files', files)}
                      maxSize={5 * 1024 ** 2}
                      accept={IMAGE_MIME_TYPE}
                    >
                      <Group justify="center" gap="xl" style={{ minHeight: rem(120), pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                          <IconUpload size={52} stroke={1.5} />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                          <IconX size={52} stroke={1.5} />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                          <IconPhoto size={52} stroke={1.5} />
                        </Dropzone.Idle>

                        <div>
                          <Text size="xl" inline>
                            Glissez des photos ici ou cliquez pour sélectionner
                          </Text>
                          <Text size="sm" c="dimmed" inline mt={7}>
                            Taille maximale : 5 MB
                          </Text>
                        </div>
                      </Group>
                    </Dropzone>

                    {photos.length > 0 && (
                      <SimpleGrid cols={4} spacing="xs" mt="md">
                        {photos.map((file, idx) => (
                          <Paper key={idx} p="xs" radius="md" withBorder>
                            <Group gap="xs" justify="space-between">
                              <Text size="xs" truncate style={{ flex: 1 }}>{file.name}</Text>
                              <ActionIcon
                                size="sm"
                                color="red"
                                variant="subtle"
                                onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                              >
                                <IconX size={14} />
                              </ActionIcon>
                            </Group>
                          </Paper>
                        ))}
                      </SimpleGrid>
                    )}
                  </div>

                  {/* Prix estimé */}
                  <Paper p="xl" radius="lg" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                    <Group justify="space-between" align="center">
                      <div>
                        <Text size="sm" c="dimmed" mb={4}>Prix estimé</Text>
                        <Title order={2} size="2rem">{calculatePrice()} DT</Title>
                        <Text size="xs" c="dimmed" mt={4}>
                          Le prix final sera confirmé par le transporteur
                        </Text>
                      </div>
                      <Button
                        size="xl"
                        radius="xl"
                        color="dark"
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={!formData.cargoDescription}
                        leftSection={<IconCheck size={20} />}
                      >
                        Publier la course
                      </Button>
                    </Group>
                  </Paper>
                </Stack>
              </Stepper.Step>
            </Stepper>
          </Container>
        </div>
      </div>
    </div>
  );
}
