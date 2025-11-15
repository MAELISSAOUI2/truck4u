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
  SegmentedControl,
  Center,
} from '@mantine/core';
import {
  IconPhone,
  IconUser,
  IconBuilding,
  IconFileText,
} from '@tabler/icons-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    phone: '+216',
    name: '',
    accountType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    companyName: '',
    taxId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.registerCustomer(formData);
      login(response.data.user, response.data.token);
      router.push('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
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
          <Title order={2} size="1.75rem" fw={700}>Créer un compte</Title>
          <Text c="dimmed" size="lg">Rejoignez des milliers d'utilisateurs</Text>
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
            {/* Account Type */}
            <div>
              <Text size="sm" fw={500} mb="xs">Type de compte</Text>
              <SegmentedControl
                fullWidth
                size="lg"
                radius="xl"
                value={formData.accountType}
                onChange={(value) => setFormData({ ...formData, accountType: value as any })}
                data={[
                  { label: 'Particulier', value: 'INDIVIDUAL' },
                  { label: 'Entreprise', value: 'BUSINESS' },
                ]}
              />
            </div>

            {/* Name */}
            <TextInput
              label="Nom complet"
              placeholder="Votre nom"
              size="lg"
              radius="xl"
              leftSection={<IconUser size={20} />}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            {/* Phone */}
            <TextInput
              label="Numéro de téléphone"
              placeholder="+216 XX XXX XXX"
              size="lg"
              radius="xl"
              leftSection={<IconPhone size={20} />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />

            {/* Business Fields */}
            {formData.accountType === 'BUSINESS' && (
              <>
                <TextInput
                  label="Nom de l'entreprise"
                  placeholder="Nom de votre entreprise"
                  size="lg"
                  radius="xl"
                  leftSection={<IconBuilding size={20} />}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />

                <TextInput
                  label="Matricule fiscale (optionnel)"
                  placeholder="Matricule fiscale"
                  size="lg"
                  radius="xl"
                  leftSection={<IconFileText size={20} />}
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </>
            )}

            <Button 
              type="submit"
              size="lg"
              radius="xl"
              color="dark"
              fullWidth
              loading={loading}
              mt="md"
            >
              Créer mon compte
            </Button>
          </Stack>
        </form>

        {/* Login Link */}
        <Text size="sm" c="dimmed" ta="center">
          Déjà un compte ?{' '}
          <Text 
            component="span" 
            c="dark" 
            fw={600} 
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/customer/login')}
          >
            Se connecter
          </Text>
        </Text>

        {/* Footer */}
        <Text size="xs" c="dimmed" ta="center">
          En créant un compte, vous acceptez nos{' '}
          <Text component="a" href="#" c="dark" td="underline">Conditions</Text>
          {' '}et notre{' '}
          <Text component="a" href="#" c="dark" td="underline">Politique de confidentialité</Text>
        </Text>
      </Stack>
    </Container>
  );
}
