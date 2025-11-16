'use client';

import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  SimpleGrid,
  Card,
  ThemeIcon,
  Group,
} from '@mantine/core';
import {
  IconTruck,
  IconPackage,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';

export default function LoginChoicePage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', paddingTop: '3rem', paddingBottom: '3rem' }}>
      <Container size="md">
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

        {/* Header */}
        <Stack align="center" mb="xl">
          <Title order={1} size="2.5rem" ta="center">
            Se connecter à Truck4u
          </Title>
          <Text size="xl" c="dimmed" ta="center" maw={600}>
            Choisissez votre type de compte pour continuer
          </Text>
        </Stack>

        {/* Choice cards */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          {/* Customer Card */}
          <Card
            shadow="md"
            padding="xl"
            radius="lg"
            withBorder
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
            onClick={() => router.push('/customer/login')}
          >
            <Stack align="center" gap="md">
              <ThemeIcon size={100} radius="xl" variant="light" color="blue">
                <IconPackage size={50} stroke={1.5} />
              </ThemeIcon>

              <Title order={2} size="1.75rem" ta="center">
                Client
              </Title>

              <Text c="dimmed" ta="center" size="sm">
                Je souhaite envoyer des marchandises et trouver un transporteur
              </Text>

              <Stack gap="xs" w="100%" mt="md">
                <Group gap="xs">
                  <Text size="sm">✓</Text>
                  <Text size="sm">Publier une demande de transport</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm">✓</Text>
                  <Text size="sm">Recevoir des offres de transporteurs</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm">✓</Text>
                  <Text size="sm">Suivre vos envois en temps réel</Text>
                </Group>
              </Stack>

              <Button
                fullWidth
                size="lg"
                color="blue"
                rightSection={<IconArrowRight size={20} />}
                mt="md"
              >
                Continuer en tant que client
              </Button>
            </Stack>
          </Card>

          {/* Driver Card */}
          <Card
            shadow="md"
            padding="xl"
            radius="lg"
            withBorder
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
            onClick={() => router.push('/driver/login')}
          >
            <Stack align="center" gap="md">
              <ThemeIcon size={100} radius="xl" variant="light" color="green">
                <IconTruck size={50} stroke={1.5} />
              </ThemeIcon>

              <Title order={2} size="1.75rem" ta="center">
                Transporteur
              </Title>

              <Text c="dimmed" ta="center" size="sm">
                Je suis transporteur et je souhaite trouver des courses
              </Text>

              <Stack gap="xs" w="100%" mt="md">
                <Group gap="xs">
                  <Text size="sm">✓</Text>
                  <Text size="sm">Consulter les courses disponibles</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm">✓</Text>
                  <Text size="sm">Soumettre des offres</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm">✓</Text>
                  <Text size="sm">Gérer vos courses et revenus</Text>
                </Group>
              </Stack>

              <Button
                fullWidth
                size="lg"
                color="green"
                rightSection={<IconArrowRight size={20} />}
                mt="md"
              >
                Continuer en tant que transporteur
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Info */}
        <Paper shadow="sm" p="lg" mt="xl" style={{ background: '#FFF9DB', border: '1px solid #FFE066' }}>
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="sm" fw={600}>
                💡 Première visite ?
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              Vous n'avez pas encore de compte ? Pas de problème ! Vous pourrez créer un compte
              après avoir choisi votre type de profil.
            </Text>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}
