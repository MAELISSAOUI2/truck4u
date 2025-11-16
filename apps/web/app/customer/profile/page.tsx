'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  TextInput,
  Textarea,
  Paper,
  Group,
  ActionIcon,
  Avatar,
  SimpleGrid,
  Card,
  Center,
  Loader,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUser,
  IconPhone,
  IconMail,
  IconMapPin,
  IconBuilding,
  IconLogout,
  IconEdit,
  IconCheck,
  IconX,
  IconPackage,
  IconClock,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { customerApi } from '@/lib/api';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
  });

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      const response = await customerApi.getProfile();
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
        companyName: response.data.companyName || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await customerApi.updateProfile(formData);
      setProfile(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      companyName: profile.companyName || '',
    });
    setEditing(false);
  };

  const handleLogout = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      logout();
      router.push('/');
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
    <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* Header */}
      <Paper p="md" radius={0} withBorder>
        <Container size="md">
          <Group justify="space-between">
            <ActionIcon size="lg" variant="subtle" color="dark" onClick={() => router.push('/customer/dashboard')}>
              <IconArrowLeft size={24} />
            </ActionIcon>
            <Title order={2} size="1.25rem">Mon Profil</Title>
            <div style={{ width: 40 }} />
          </Group>
        </Container>
      </Paper>

      <Container size="md" mt="xl">
        <Stack gap="xl">
          {/* Profile Header */}
          <Paper shadow="sm" p="xl" radius="lg" withBorder>
            <Stack gap="md" align="center">
              <Avatar size={80} radius="xl" color="dark">
                <IconUser size={40} />
              </Avatar>
              <div>
                <Title order={2} ta="center">{profile.name}</Title>
                <Text c="dimmed" ta="center">
                  {profile.accountType === 'BUSINESS' ? 'Compte Entreprise' : 'Compte Particulier'}
                </Text>
              </div>
            </Stack>
          </Paper>

          {/* Stats */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <Card shadow="sm" padding="md" radius="lg" withBorder>
              <Stack gap="xs" align="center">
                <IconPackage size={24} />
                <Title order={3} size="1.5rem">{profile.totalRides || 0}</Title>
                <Text size="xs" c="dimmed">Courses</Text>
              </Stack>
            </Card>
            <Card shadow="sm" padding="md" radius="lg" withBorder>
              <Stack gap="xs" align="center">
                <IconCheck size={24} color="green" />
                <Title order={3} size="1.5rem" c="green">{profile.completedRides || 0}</Title>
                <Text size="xs" c="dimmed">Terminées</Text>
              </Stack>
            </Card>
            <Card shadow="sm" padding="md" radius="lg" withBorder>
              <Stack gap="xs" align="center">
                <IconClock size={24} color="orange" />
                <Title order={3} size="1.5rem" c="orange">{profile.pendingRides || 0}</Title>
                <Text size="xs" c="dimmed">En cours</Text>
              </Stack>
            </Card>
            <Card shadow="sm" padding="md" radius="lg" withBorder>
              <Stack gap="xs" align="center">
                <Text size="xs" c="dimmed">Total dépensé</Text>
                <Title order={3} size="1.5rem">{profile.totalSpent || 0}</Title>
                <Text size="xs" c="dimmed">DT</Text>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* Profile Info */}
          <Paper shadow="sm" radius="lg" withBorder>
            <Group justify="space-between" p="lg" style={{ borderBottom: '1px solid #e9ecef' }}>
              <Title order={3} size="1.125rem">Informations personnelles</Title>
              {!editing ? (
                <Button 
                  variant="subtle" 
                  color="dark"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => setEditing(true)}
                >
                  Modifier
                </Button>
              ) : (
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="gray" onClick={handleCancel}>
                    <IconX size={20} />
                  </ActionIcon>
                  <ActionIcon variant="filled" color="dark" onClick={handleSave} loading={saving}>
                    <IconCheck size={20} />
                  </ActionIcon>
                </Group>
              )}
            </Group>

            <Stack gap="lg" p="lg">
              <TextInput
                label="Nom complet"
                size="md"
                radius="lg"
                leftSection={<IconUser size={18} />}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
              />

              {profile.accountType === 'BUSINESS' && (
                <TextInput
                  label="Nom de l'entreprise"
                  size="md"
                  radius="lg"
                  leftSection={<IconBuilding size={18} />}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  disabled={!editing}
                />
              )}

              <TextInput
                label="Téléphone"
                size="md"
                radius="lg"
                leftSection={<IconPhone size={18} />}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!editing}
              />

              <TextInput
                label="Email"
                size="md"
                radius="lg"
                leftSection={<IconMail size={18} />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editing}
                placeholder="email@exemple.com"
              />

              <Textarea
                label="Adresse"
                size="md"
                radius="lg"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!editing}
                placeholder="Votre adresse complète"
              />
            </Stack>
          </Paper>

          {/* Logout Button */}
          <Button
            variant="outline"
            color="red"
            size="lg"
            radius="xl"
            leftSection={<IconLogout size={20} />}
            onClick={handleLogout}
          >
            Se déconnecter
          </Button>
        </Stack>
      </Container>
    </div>
  );
}
