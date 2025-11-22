'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Button,
  Center,
  Loader,
  ThemeIcon,
} from '@mantine/core';
import { IconClock, IconArrowLeft } from '@tabler/icons-react';

export default function DriverPendingPage() {
  const router = useRouter();
  const { token, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState('');

  useEffect(() => {
    checkStatus();
    // Poll every 10 seconds to check for status updates
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      if (!token) {
        router.push('/driver/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setVerificationStatus(data.verificationStatus);

        // Update user status in store
        updateUser({ verificationStatus: data.verificationStatus });

        // Redirect to dashboard if approved
        if (data.verificationStatus === 'APPROVED') {
          router.push('/driver/dashboard');
        }
        // Redirect back to KYC if rejected
        else if (data.verificationStatus === 'REJECTED') {
          router.push('/driver/kyc');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingTop: 80 }}>
      <Container size="sm" py="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="xl" align="center">
            <ThemeIcon size={80} radius={80} variant="light" color="yellow">
              <IconClock size={40} />
            </ThemeIcon>

            <Stack gap="md" align="center">
              <Title order={1} ta="center">
                Vérification en cours
              </Title>

              <Text size="lg" c="dimmed" ta="center" maw={500}>
                Votre dossier KYC est en cours de vérification par notre équipe.
                Vous recevrez une notification dès que votre compte sera activé.
              </Text>

              <Paper p="md" withBorder style={{ background: '#fff3cd', borderColor: '#ffc107' }} mt="md">
                <Stack gap="xs">
                  <Text size="sm" fw={600} c="dark">
                    ⏱️ Temps de vérification habituel
                  </Text>
                  <Text size="sm" c="dimmed">
                    La vérification prend généralement entre <strong>24 et 48 heures</strong>.
                    Nous vous contacterons si des informations supplémentaires sont nécessaires.
                  </Text>
                </Stack>
              </Paper>

              <Stack gap="xs" mt="xl" w="100%">
                <Text size="sm" fw={600}>
                  En attendant:
                </Text>
                <Text size="sm" c="dimmed">
                  • Vérifiez que votre téléphone est accessible
                </Text>
                <Text size="sm" c="dimmed">
                  • Assurez-vous que tous vos documents sont à jour
                </Text>
                <Text size="sm" c="dimmed">
                  • Préparez votre véhicule pour la première course
                </Text>
              </Stack>
            </Stack>

            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.push('/driver/kyc')}
              mt="md"
            >
              Retour aux documents
            </Button>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}
