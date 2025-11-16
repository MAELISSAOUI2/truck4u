'use client';

import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  SimpleGrid,
  Card,
  ThemeIcon,
  Center,
} from '@mantine/core';
import {
  IconTruck,
  IconClock,
  IconShield,
  IconStar,
  IconMapPin,
  IconUsers,
  IconArrowRight,
} from '@tabler/icons-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div>
      {/* Header */}
      <Container size="lg" py="xl">
        <Group justify="space-between">
          <Group gap="sm">
            <div style={{ fontSize: '2rem' }}>🚚</div>
            <Title order={1} size="1.75rem">Truck4u</Title>
          </Group>
          <Group gap="md">
            <Button variant="subtle" color="dark" onClick={() => router.push('/login')}>
              Se connecter
            </Button>
            <Button color="dark" radius="xl" onClick={() => router.push('/customer/register')}>
              Commencer
            </Button>
          </Group>
        </Group>
      </Container>

      {/* Hero Section */}
      <Container size="lg" py={80}>
        <Stack gap="xl" align="center" ta="center">
          <Title order={1} size="3.5rem" fw={800} maw={800}>
            Transport de marchandises simple et rapide
          </Title>
          <Text size="xl" c="dimmed" maw={600}>
            Connectez-vous avec des transporteurs vérifiés en Tunisie. Obtenez des devis en moins de 3 minutes.
          </Text>
          <Group gap="md">
            <Button 
              size="xl" 
              radius="xl" 
              color="dark"
              rightSection={<IconArrowRight size={20} />}
              onClick={() => router.push('/customer/register')}
            >
              Demander un transport
            </Button>
            <Button 
              size="xl" 
              radius="xl" 
              variant="outline"
              color="dark"
              onClick={() => router.push('/driver/register')}
            >
              Devenir transporteur
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Stats */}
      <div style={{ background: '#f8f9fa', padding: '4rem 0' }}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xl">
            <Center>
              <Stack gap="xs" align="center">
                <Title order={2} size="2.5rem">5,000+</Title>
                <Text c="dimmed">Courses réalisées</Text>
              </Stack>
            </Center>
            <Center>
              <Stack gap="xs" align="center">
                <Title order={2} size="2.5rem">500+</Title>
                <Text c="dimmed">Transporteurs actifs</Text>
              </Stack>
            </Center>
            <Center>
              <Stack gap="xs" align="center">
                <Title order={2} size="2.5rem">4.9/5</Title>
                <Text c="dimmed">Note moyenne</Text>
              </Stack>
            </Center>
            <Center>
              <Stack gap="xs" align="center">
                <Title order={2} size="2.5rem">24/7</Title>
                <Text c="dimmed">Support client</Text>
              </Stack>
            </Center>
          </SimpleGrid>
        </Container>
      </div>

      {/* Features */}
      <Container size="lg" py={80}>
        <Stack gap="xl" align="center" mb={60}>
          <Title order={2} size="2.5rem" ta="center">Pourquoi choisir Truck4u ?</Title>
          <Text size="xl" c="dimmed" ta="center" maw={600}>
            Une plateforme moderne pour tous vos besoins de transport
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="xl">
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <ThemeIcon size={60} radius="xl" variant="light" color="blue" mb="md">
              <IconClock size={32} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} size="1.25rem" mb="sm">Rapide et simple</Title>
            <Text c="dimmed">
              Créez votre demande en quelques clics et recevez des offres en moins de 3 minutes.
            </Text>
          </Card>

          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <ThemeIcon size={60} radius="xl" variant="light" color="green" mb="md">
              <IconShield size={32} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} size="1.25rem" mb="sm">Transporteurs vérifiés</Title>
            <Text c="dimmed">
              Tous nos transporteurs sont vérifiés et notés par la communauté.
            </Text>
          </Card>

          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <ThemeIcon size={60} radius="xl" variant="light" color="violet" mb="md">
              <IconTruck size={32} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} size="1.25rem" mb="sm">Suivi en temps réel</Title>
            <Text c="dimmed">
              Suivez votre colis en temps réel avec notre système de tracking GPS.
            </Text>
          </Card>

          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <ThemeIcon size={60} radius="xl" variant="light" color="orange" mb="md">
              <IconStar size={32} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} size="1.25rem" mb="sm">Meilleur prix</Title>
            <Text c="dimmed">
              Comparez les offres et choisissez le meilleur rapport qualité-prix.
            </Text>
          </Card>

          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <ThemeIcon size={60} radius="xl" variant="light" color="red" mb="md">
              <IconMapPin size={32} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} size="1.25rem" mb="sm">Partout en Tunisie</Title>
            <Text c="dimmed">
              Service disponible dans toute la Tunisie, des grandes villes aux zones rurales.
            </Text>
          </Card>

          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <ThemeIcon size={60} radius="xl" variant="light" color="indigo" mb="md">
              <IconUsers size={32} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} size="1.25rem" mb="sm">Support 24/7</Title>
            <Text c="dimmed">
              Notre équipe est disponible pour vous aider à tout moment.
            </Text>
          </Card>
        </SimpleGrid>
      </Container>

      {/* CTA */}
      <div style={{ background: '#000', color: 'white', padding: '5rem 0' }}>
        <Container size="md">
          <Stack gap="xl" align="center" ta="center">
            <Title order={2} size="2.5rem" c="white">Prêt à démarrer ?</Title>
            <Text size="xl" c="gray.3">
              Rejoignez des milliers d'utilisateurs qui font confiance à Truck4u
            </Text>
            <Button 
              size="xl" 
              radius="xl" 
              color="white"
              variant="white"
              c="dark"
              rightSection={<IconArrowRight size={20} />}
              onClick={() => router.push('/customer/register')}
            >
              Commencer maintenant
            </Button>
          </Stack>
        </Container>
      </div>

      {/* Footer */}
      <div style={{ background: '#f8f9fa', padding: '3rem 0' }}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 4 }} spacing="xl">
            <div>
              <Group gap="sm" mb="md">
                <div style={{ fontSize: '1.5rem' }}>🚚</div>
                <Title order={3} size="1.25rem">Truck4u</Title>
              </Group>
              <Text size="sm" c="dimmed">
                La plateforme #1 de transport de marchandises en Tunisie
              </Text>
            </div>
            <div>
              <Title order={4} size="1rem" mb="md">Entreprise</Title>
              <Stack gap="xs">
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>À propos</Text>
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Blog</Text>
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Carrières</Text>
              </Stack>
            </div>
            <div>
              <Title order={4} size="1rem" mb="md">Support</Title>
              <Stack gap="xs">
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Centre d'aide</Text>
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Contact</Text>
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>FAQ</Text>
              </Stack>
            </div>
            <div>
              <Title order={4} size="1rem" mb="md">Légal</Title>
              <Stack gap="xs">
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Conditions d'utilisation</Text>
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Politique de confidentialité</Text>
                <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }}>Mentions légales</Text>
              </Stack>
            </div>
          </SimpleGrid>
          <Text size="sm" c="dimmed" ta="center" mt="xl" pt="xl" style={{ borderTop: '1px solid #dee2e6' }}>
            © 2025 Truck4u. Tous droits réservés.
          </Text>
        </Container>
      </div>
    </div>
  );
}
