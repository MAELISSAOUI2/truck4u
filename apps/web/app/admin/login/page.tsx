'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Center,
} from '@mantine/core';
import { IconShieldCheck, IconAlertCircle } from '@tabler/icons-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Implement actual admin login
      if (email === 'admin@truck4u.tn' && password === 'admin123') {
        localStorage.setItem('adminToken', 'mock-admin-token');
        router.push('/admin/dashboard');
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: '#f8f9fa' }}>
      <Container size={420}>
        <Center mb="xl">
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconShieldCheck size={40} color="white" />
          </div>
        </Center>

        <Title order={1} ta="center" mb="xs">
          Truck4u Admin
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Connexion au back office
        </Text>

        <Paper radius="md" p="xl" withBorder>
          <form onSubmit={handleLogin}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="admin@truck4u.tn"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="md"
              />

              <PasswordInput
                label="Mot de passe"
                placeholder="Votre mot de passe"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="md"
              />

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red" variant="light">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                size="md"
                color="dark"
                loading={loading}
                mt="sm"
              >
                Se connecter
              </Button>

              <Text size="sm" c="dimmed" ta="center">
                Demo: admin@truck4u.tn / admin123
              </Text>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
}
