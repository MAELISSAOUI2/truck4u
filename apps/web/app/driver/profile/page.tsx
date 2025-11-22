'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  Paper,
  ActionIcon,
  Avatar,
  Badge,
  Divider,
  Loader,
  Center,
  Grid,
  Progress,
  SimpleGrid,
  RingProgress,
  Textarea,
  FileButton,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconStar,
  IconTruck,
  IconCash,
  IconPhone,
  IconMail,
  IconId,
  IconLogout,
  IconThumbUp,
  IconClock,
  IconTrophy,
  IconSparkles,
  IconShieldCheck,
  IconCamera,
  IconCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { notifications } from '@mantine/notifications';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  review: string;
  date: string;
}

// Badge configuration avec icônes et couleurs
const BADGE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  TOP_RATED: { icon: IconTrophy, color: 'yellow', label: 'Top noté' },
  PUNCTUAL: { icon: IconClock, color: 'blue', label: 'Ponctuel' },
  CLEAN: { icon: IconSparkles, color: 'teal', label: 'Propre' },
  VERIFIED: { icon: IconShieldCheck, color: 'green', label: 'Vérifié' },
  NEW: { icon: IconStar, color: 'grape', label: 'Nouveau' },
  PROFESSIONAL: { icon: IconThumbUp, color: 'indigo', label: 'Professionnel' },
};

export default function DriverProfilePage() {
  const router = useRouter();
  const { user, token, logout, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      router.push('/driver/login');
      return;
    }

    loadProfileData();
  }, [token, user]);

  const loadProfileData = async () => {
    try {
      // Charger les avis clients
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/drivers/${user?.id}/reviews`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner une image',
        color: 'red',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notifications.show({
        title: 'Erreur',
        message: 'L\'image ne doit pas dépasser 5 MB',
        color: 'red',
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/drivers/profile/photo`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Update user in store
        if (user) {
          setUser({ ...user, profilePhoto: data.photoUrl });
        }

        notifications.show({
          title: 'Photo mise à jour',
          message: 'Votre photo de profil a été mise à jour avec succès',
          color: 'green',
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de mettre à jour la photo',
        color: 'red',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/driver/login');
  };

  // Calculer les statistiques de badges
  const driverBadges = user?.badges || [];
  const hasTopRatedBadge = driverBadges.includes('TOP_RATED');
  const hasPunctualBadge = driverBadges.includes('PUNCTUAL');
  const hasCleanBadge = driverBadges.includes('CLEAN');

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="xl" radius={0} withBorder>
        <Container size="md">
          <Group>
            <ActionIcon variant="subtle" size="lg" onClick={() => router.back()}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={1} size="2rem">
              Mon profil
            </Title>
          </Group>
        </Container>
      </Paper>

      <Container size="md" py="xl">
        <Stack gap="xl">
          {/* Profile Header with Photo */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Stack align="center" gap="md">
              <div style={{ position: 'relative' }}>
                <Avatar
                  size={120}
                  radius={120}
                  src={user?.profilePhoto}
                  alt={user?.name}
                >
                  {!user?.profilePhoto && <IconTruck size={60} />}
                </Avatar>
                <FileButton onChange={handlePhotoUpload} accept="image/*">
                  {(props) => (
                    <ActionIcon
                      {...props}
                      size="lg"
                      radius="xl"
                      variant="filled"
                      color="dark"
                      loading={uploadingPhoto}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        border: '3px solid white',
                      }}
                    >
                      <IconCamera size={18} />
                    </ActionIcon>
                  )}
                </FileButton>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Title order={2} size="1.75rem">
                  {user?.name || 'Transporteur'}
                </Title>
                <Group justify="center" gap="xs" mt={8}>
                  <IconStar size={18} fill="#FFD700" color="#FFD700" />
                  <Text size="lg" fw={600}>
                    {user?.rating?.toFixed(1) || '5.0'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    ({user?.completedRides || 0} courses terminées)
                  </Text>
                </Group>
              </div>

              {/* Badges dynamiques */}
              {driverBadges.length > 0 && (
                <Group gap="xs" justify="center">
                  {driverBadges.map((badgeKey) => {
                    const config = BADGE_CONFIG[badgeKey];
                    if (!config) return null;
                    const IconComponent = config.icon;
                    return (
                      <Badge
                        key={badgeKey}
                        size="lg"
                        variant="light"
                        color={config.color}
                        leftSection={<IconComponent size={14} />}
                      >
                        {config.label}
                      </Badge>
                    );
                  })}
                </Group>
              )}

              {/* Fallback badges si aucun badge */}
              {driverBadges.length === 0 && (
                <Group gap="xs">
                  <Badge size="lg" variant="filled" color="green" leftSection={<IconShieldCheck size={14} />}>
                    Vérifié
                  </Badge>
                  <Badge size="lg" variant="light" color="blue" leftSection={<IconThumbUp size={14} />}>
                    Professionnel
                  </Badge>
                </Group>
              )}
            </Stack>
          </Card>

          {/* Statistics Grid */}
          <SimpleGrid cols={3} spacing="md">
            <Card shadow="sm" padding="lg" radius="lg" withBorder>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[{ value: (user?.rating || 0) * 20, color: 'yellow' }]}
                  label={
                    <Center>
                      <IconStar size={24} fill="#FFD700" color="#FFD700" />
                    </Center>
                  }
                />
                <Text size="xs" c="dimmed" ta="center">
                  Note moyenne
                </Text>
                <Text size="lg" fw={700}>
                  {user?.rating?.toFixed(1) || '5.0'}/5
                </Text>
              </Stack>
            </Card>

            <Card shadow="sm" padding="lg" radius="lg" withBorder>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[{ value: user?.acceptanceRate || 0, color: 'green' }]}
                  label={
                    <Center>
                      <IconCheck size={24} color="#40c057" />
                    </Center>
                  }
                />
                <Text size="xs" c="dimmed" ta="center">
                  Taux d'acceptation
                </Text>
                <Text size="lg" fw={700}>
                  {user?.acceptanceRate?.toFixed(0) || 0}%
                </Text>
              </Stack>
            </Card>

            <Card shadow="sm" padding="lg" radius="lg" withBorder>
              <Stack align="center" gap="xs">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[
                    {
                      value: user?.completedRides ? Math.min((user.completedRides / 100) * 100, 100) : 0,
                      color: 'blue',
                    },
                  ]}
                  label={
                    <Center>
                      <IconTruck size={24} color="#228be6" />
                    </Center>
                  }
                />
                <Text size="xs" c="dimmed" ta="center">
                  Courses totales
                </Text>
                <Text size="lg" fw={700}>
                  {user?.completedRides || 0}
                </Text>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* Contact Information */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Informations de contact
            </Title>
            <Stack gap="md">
              {user?.phone && (
                <Group gap="md">
                  <IconPhone size={20} />
                  <div>
                    <Text size="xs" c="dimmed">
                      Téléphone
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.phone}
                    </Text>
                  </div>
                </Group>
              )}

              {user?.email && (
                <Group gap="md">
                  <IconMail size={20} />
                  <div>
                    <Text size="xs" c="dimmed">
                      Email
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.email}
                    </Text>
                  </div>
                </Group>
              )}

              <Group gap="md">
                <IconId size={20} />
                <div>
                  <Text size="xs" c="dimmed">
                    ID Transporteur
                  </Text>
                  <Text size="sm" fw={500}>
                    #{user?.id.slice(0, 8).toUpperCase()}
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {/* Vehicle Information */}
          {user?.vehicleType && (
            <Card shadow="sm" padding="xl" radius="lg" withBorder>
              <Title order={3} size="1.25rem" mb="md">
                Informations du véhicule
              </Title>
              <Stack gap="md">
                <Group gap="md">
                  <IconTruck size={20} />
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">
                      Type de véhicule
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.vehicleType}
                    </Text>
                  </div>
                </Group>

                {user.vehiclePlate && (
                  <Group gap="md">
                    <IconId size={20} />
                    <div>
                      <Text size="xs" c="dimmed">
                        Immatriculation
                      </Text>
                      <Text size="sm" fw={500}>
                        {user.vehiclePlate}
                      </Text>
                    </div>
                  </Group>
                )}

                {(user.vehicleBrand || user.vehicleModel) && (
                  <Group gap="md">
                    <IconTruck size={20} />
                    <div>
                      <Text size="xs" c="dimmed">
                        Marque et modèle
                      </Text>
                      <Text size="sm" fw={500}>
                        {[user.vehicleBrand, user.vehicleModel, user.vehicleYear]
                          .filter(Boolean)
                          .join(' ')}
                      </Text>
                    </div>
                  </Group>
                )}

                {user.vehicleColor && (
                  <Group gap="md">
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: user.vehicleColor.toLowerCase(),
                        border: '2px solid #dee2e6',
                      }}
                    />
                    <div>
                      <Text size="xs" c="dimmed">
                        Couleur
                      </Text>
                      <Text size="sm" fw={500}>
                        {user.vehicleColor}
                      </Text>
                    </div>
                  </Group>
                )}
              </Stack>
            </Card>
          )}

          {/* Customer Reviews */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3} size="1.25rem">
                Avis clients
              </Title>
              <Badge size="lg" variant="filled" color="blue">
                {reviews.length} avis
              </Badge>
            </Group>

            {reviews.length === 0 ? (
              <Paper p="xl" withBorder style={{ background: '#f8f9fa' }}>
                <Stack align="center" gap="sm">
                  <IconStar size={48} color="#adb5bd" />
                  <Text c="dimmed" ta="center">
                    Aucun avis pour le moment
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Complétez vos premières courses pour recevoir des avis
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Stack gap="md">
                {reviews.map((review) => (
                  <Paper key={review.id} p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Avatar size="sm" color="blue" radius="xl">
                          {review.customerName.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text size="sm" fw={600}>
                            {review.customerName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Date(review.date).toLocaleDateString('fr-FR')}
                          </Text>
                        </div>
                      </Group>
                      <Group gap={4}>
                        {[...Array(5)].map((_, i) => (
                          <IconStar
                            key={i}
                            size={16}
                            fill={i < review.rating ? '#FFD700' : 'none'}
                            color={i < review.rating ? '#FFD700' : '#dee2e6'}
                          />
                        ))}
                      </Group>
                    </Group>
                    {review.review && (
                      <Text size="sm" style={{ fontStyle: 'italic' }}>
                        "{review.review}"
                      </Text>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Card>

          {/* Performance Stats */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Title order={3} size="1.25rem" mb="md">
              Statistiques de performance
            </Title>
            <Stack gap="md">
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm">Taux de réussite</Text>
                  <Text size="sm" fw={600}>
                    {user?.completedRides && user?.totalRides
                      ? ((user.completedRides / user.totalRides) * 100).toFixed(0)
                      : 0}
                    %
                  </Text>
                </Group>
                <Progress
                  value={
                    user?.completedRides && user?.totalRides
                      ? (user.completedRides / user.totalRides) * 100
                      : 0
                  }
                  color="green"
                  size="md"
                />
              </div>

              <Divider />

              <Group justify="space-between">
                <Group gap="xs">
                  <IconCash size={20} color="#40c057" />
                  <Text size="sm">Revenus totaux</Text>
                </Group>
                <Text size="lg" fw={700} c="green">
                  {user?.totalEarnings?.toFixed(2) || '0.00'} DT
                </Text>
              </Group>

              <Divider />

              <Group justify="space-between">
                <Group gap="xs">
                  <IconTruck size={20} color="#228be6" />
                  <Text size="sm">Courses en cours</Text>
                </Group>
                <Text size="lg" fw={700}>
                  {user?.totalRides && user?.completedRides
                    ? user.totalRides - user.completedRides
                    : 0}
                </Text>
              </Group>
            </Stack>
          </Card>

          {/* Actions */}
          <Stack gap="md">
            <Button
              variant="light"
              color="blue"
              size="lg"
              fullWidth
              onClick={() => router.push('/driver/earnings')}
              leftSection={<IconCash size={20} />}
            >
              Voir mes revenus
            </Button>

            <Button
              variant="outline"
              color="red"
              size="lg"
              fullWidth
              onClick={handleLogout}
              leftSection={<IconLogout size={20} />}
            >
              Déconnexion
            </Button>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}
