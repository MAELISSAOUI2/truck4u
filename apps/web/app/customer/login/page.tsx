'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TextInput,
  Button,
  Stack,
  Title,
  Text,
  Container,
  Paper,
  Divider,
  Center,
  Loader,
} from '@mantine/core';
import { IconPhone } from '@tabler/icons-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('+216');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(phone, 'customer');
      login(response.data.user, response.data.token);
      router.push('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Stack gap="xl">
        {/* Logo */}
        <Center>
          <Stack gap="sm" align="center">
            <div style={{ fontSize: '3rem' }}>🚚</div>
            <Title order={1} size="2.5rem" fw={700}>Truck4u</Title>
          </Stack>
        </Center>

        {/* Title */}
        <Stack gap="xs">
          <Title order={2} size="1.75rem" fw={700}>Bienvenue</Title>
          <Text c="dimmed" size="lg">Connectez-vous pour continuer</Text>
        </Stack>

        {/* Error */}
        {error && (
          <Paper p="md" radius="md" bg="red.0" withBorder>
            <Text c="red" size="sm">{error}</Text>
          </Paper>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Numéro de téléphone"
              placeholder="+216 XX XXX XXX"
              size="lg"
              radius="xl"
              leftSection={<IconPhone size={20} />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <Button 
              type="submit"
              size="lg"
              radius="xl"
              color="dark"
              fullWidth
              loading={loading}
            >
              Continuer
            </Button>

            <Divider label="ou" labelPosition="center" />

            <Button
              variant="outline"
              size="lg"
              radius="xl"
              color="dark"
              fullWidth
              onClick={() => router.push('/customer/register')}
            >
              Créer un compte
            </Button>
          </Stack>
        </form>

        {/* Footer */}
        <Text size="xs" c="dimmed" ta="center">
          En continuant, vous acceptez nos{' '}
          <Text component="a" href="#" c="dark" td="underline">Conditions</Text>
          {' '}et notre{' '}
          <Text component="a" href="#" c="dark" td="underline">Politique de confidentialité</Text>
        </Text>
      </Stack>
    </Container>
  );
}
