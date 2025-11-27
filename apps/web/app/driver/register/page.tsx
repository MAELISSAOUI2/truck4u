'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Select,
  Button,
  Stack,
  Group,
  Alert,
  Anchor,
  List,
  ThemeIcon,
  Checkbox,
} from '@mantine/core';
import {
  IconTruck,
  IconPhone,
  IconUser,
  IconMail,
  IconFileText,
  IconCheck,
  IconArrowLeft,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const VEHICLE_TYPES = [
  { value: 'CAMIONNETTE', label: 'Camionnette' },
  { value: 'FOURGON', label: 'Fourgon' },
  { value: 'CAMION_3_5T', label: 'Camion 3.5T' },
  { value: 'CAMION_LOURD', label: 'Camion Lourd' },
];

export default function DriverRegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    phone: '+216',
    name: '',
    vehicleType: 'CAMIONNETTE',
    vehiclePlate: '',
    email: '',
    hasPatenteOption: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || !formData.name || !formData.vehicleType) {
      notifications.show({
        title: 'Champs requis',
        message: 'Veuillez remplir tous les champs obligatoires',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.registerDriver(formData);
      login(response.data.user, response.data.token);

      notifications.show({
        title: 'Bienvenue !',
        message: 'Votre compte a été créé avec succès',
        color: 'green',
      });

      router.push('/driver/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || "Impossible de créer le compte",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <Container size="sm">
        {/* Back button */}
        <Group mb="xl">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={20} />}
            onClick={() => router.push('/')}
          >
            Retour à l'accueil
          </Button>
        </Group>

        <Paper shadow="md" p="xl" radius="lg">
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#e7f5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <IconTruck size={40} color="#1971c2" />
          </div>

          {/* Title */}
          <Title order={1} ta="center" size="2rem" mb="xs">
            Devenir Transporteur
          </Title>
          <Text ta="center" c="dimmed" size="lg" mb="xl">
            Gagnez de l'argent en proposant vos services de transport
          </Text>

          {/* Info Alert */}
          <Alert variant="light" color="blue" mb="xl" icon={<IconFileText size={20} />}>
            <Text size="sm" fw={500} mb="xs">
              Documents requis après l'inscription :
            </Text>
            <List size="sm" spacing="xs">
              <List.Item>CIN (recto/verso)</List.Item>
              <List.Item>Permis de conduire</List.Item>
              <List.Item>Carte grise du véhicule</List.Item>
              <List.Item>Photos du véhicule</List.Item>
              <List.Item>Patente professionnelle (optionnel, pour livraisons B2B)</List.Item>
            </List>
          </Alert>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {/* Phone */}
              <TextInput
                label="Numéro de téléphone"
                placeholder="+216 XX XXX XXX"
                leftSection={<IconPhone size={20} />}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                size="md"
              />

              {/* Name */}
              <TextInput
                label="Nom complet"
                placeholder="Votre nom"
                leftSection={<IconUser size={20} />}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                size="md"
              />

              {/* Vehicle Type */}
              <Select
                label="Type de véhicule"
                placeholder="Sélectionnez"
                data={VEHICLE_TYPES}
                value={formData.vehicleType}
                onChange={(value) => setFormData({ ...formData, vehicleType: value || 'CAMIONNETTE' })}
                required
                size="md"
              />

              {/* Vehicle Plate */}
              <TextInput
                label="Immatriculation"
                placeholder="TUN 1234"
                leftSection={<IconFileText size={20} />}
                value={formData.vehiclePlate}
                onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                description="Optionnel"
                size="md"
              />

              {/* Patente Option */}
              <Checkbox
                label="Je dispose d'une patente professionnelle"
                description="Vous pourrez uploader ce document lors de la vérification KYC pour devenir éligible aux livraisons B2B"
                checked={formData.hasPatenteOption}
                onChange={(e) => setFormData({
                  ...formData,
                  hasPatenteOption: e.currentTarget.checked
                })}
                mt="md"
              />

              {/* Email */}
              <TextInput
                label="Email"
                placeholder="votre@email.com"
                leftSection={<IconMail size={20} />}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                description="Optionnel"
                size="md"
              />

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={loading}
                leftSection={<IconCheck size={20} />}
                mt="md"
              >
                Créer mon compte
              </Button>
            </Stack>
          </form>

          {/* Login link */}
          <Text ta="center" mt="xl" size="sm">
            Vous avez déjà un compte ?{' '}
            <Anchor component="button" onClick={() => router.push('/driver/login')}>
              Se connecter
            </Anchor>
          </Text>

          {/* Terms */}
          <Text ta="center" mt="lg" size="xs" c="dimmed">
            En continuant, vous acceptez nos{' '}
            <Anchor href="#" size="xs">
              Conditions d'utilisation
            </Anchor>{' '}
            et notre{' '}
            <Anchor href="#" size="xs">
              Politique de confidentialité
            </Anchor>
          </Text>
        </Paper>

        {/* Demo note */}
        <Alert variant="light" color="yellow" mt="lg" title="💡 Mode Démo">
          <Text size="sm">
            Pour tester rapidement : utilisez n'importe quel numéro au format +216XXXXXXXX
          </Text>
        </Alert>
      </Container>
    </div>
  );
}
