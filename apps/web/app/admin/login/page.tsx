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
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconMail } from '@tabler/icons-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (res.ok) {
        // Store admin token
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminData', JSON.stringify(data.admin));

        notifications.show({
          title: 'Connexion réussie',
          message: `Bienvenue ${data.admin.name}!`,
          color: 'green'
        });

        router.push('/admin/kyc');
      } else {
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Email ou mot de passe incorrect',
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur de connexion au serveur',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center' }}>
      <Container size="xs">
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg">
            <Center>
              <div>
                <Title order={1} ta="center" mb="xs">
                  Espace Administrateur
                </Title>
                <Text size="sm" c="dimmed" ta="center">
                  Connectez-vous pour gérer Truck4U
                </Text>
              </div>
            </Center>

            <form onSubmit={handleLogin}>
              <Stack gap="md">
                <TextInput
                  label="Email"
                  placeholder="admin@truck4u.tn"
                  leftSection={<IconMail size={16} />}
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  required
                  size="md"
                />

                <PasswordInput
                  label="Mot de passe"
                  placeholder="Votre mot de passe"
                  leftSection={<IconLock size={16} />}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                  size="md"
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  mt="md"
                >
                  Se connecter
                </Button>
              </Stack>
            </form>

            <Paper p="md" withBorder style={{ background: '#fff3cd', borderColor: '#ffc107' }}>
              <Text size="xs" c="dimmed" ta="center">
                <strong>Pour créer un compte admin:</strong><br />
                Utilisez Prisma Studio ou créez un admin via la base de données
              </Text>
            </Paper>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}
