'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  Anchor,
  Tabs,
} from '@mantine/core';
import {
  IconTruck,
  IconPhone,
  IconUser,
  IconMail,
  IconFileText,
  IconArrowLeft,
  IconLogin,
  IconUserPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function DriverLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string | null>('login');
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginPhone, setLoginPhone] = useState('+216');

  // Register form
  const [registerData, setRegisterData] = useState({
    phone: '+216',
    name: '',
    vehicleType: 'CAMIONNETTE',
    vehiclePlate: '',
    email: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(loginPhone, 'driver');
      login(response.data.user, response.data.token);

      notifications.show({
        title: 'Connexion réussie',
        message: 'Bienvenue !',
        color: 'green',
      });

      router.push('/driver/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de se connecter',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.registerDriver(registerData);
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
            Espace Transporteur
          </Title>
          <Text ta="center" c="dimmed" size="lg" mb="xl">
            Connectez-vous ou créez votre compte
          </Text>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List grow mb="xl">
              <Tabs.Tab value="login" leftSection={<IconLogin size={20} />}>
                Connexion
              </Tabs.Tab>
              <Tabs.Tab value="register" leftSection={<IconUserPlus size={20} />}>
                Inscription
              </Tabs.Tab>
            </Tabs.List>

            {/* Login Tab */}
            <Tabs.Panel value="login">
              <form onSubmit={handleLogin}>
                <Stack gap="md">
                  <TextInput
                    label="Numéro de téléphone"
                    placeholder="+216 XX XXX XXX"
                    leftSection={<IconPhone size={20} />}
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                    size="md"
                  />

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    loading={loading}
                    leftSection={<IconLogin size={20} />}
                  >
                    Se connecter
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            {/* Register Tab */}
            <Tabs.Panel value="register">
              <form onSubmit={handleRegister}>
                <Stack gap="md">
                  <TextInput
                    label="Numéro de téléphone"
                    placeholder="+216 XX XXX XXX"
                    leftSection={<IconPhone size={20} />}
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    required
                    size="md"
                  />

                  <TextInput
                    label="Nom complet"
                    placeholder="Votre nom"
                    leftSection={<IconUser size={20} />}
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    required
                    size="md"
                  />

                  <TextInput
                    label="Immatriculation"
                    placeholder="TUN 1234"
                    leftSection={<IconFileText size={20} />}
                    value={registerData.vehiclePlate}
                    onChange={(e) => setRegisterData({ ...registerData, vehiclePlate: e.target.value })}
                    description="Optionnel"
                    size="md"
                  />

                  <TextInput
                    label="Email"
                    placeholder="votre@email.com"
                    leftSection={<IconMail size={20} />}
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    description="Optionnel"
                    size="md"
                  />

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    loading={loading}
                    leftSection={<IconUserPlus size={20} />}
                  >
                    Créer mon compte
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>
          </Tabs>

          {/* Terms */}
          <Text ta="center" mt="xl" size="xs" c="dimmed">
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
        <Paper shadow="sm" p="md" mt="lg" style={{ background: '#FFF9DB', border: '1px solid #FFE066' }}>
          <Group gap="xs">
            <Text size="sm" fw={500}>💡 Mode Démo</Text>
          </Group>
          <Text size="sm" c="dimmed" mt="xs">
            Pour tester rapidement : utilisez n'importe quel numéro au format +216XXXXXXXX
          </Text>
        </Paper>
      </Container>
    </div>
  );
}
