'use client';

import { useEffect } from 'react';
import { Drawer, Stack, Title, Text, Group, Badge } from '@mantine/core';
import { IconBell, IconBellOff } from '@tabler/icons-react';
import { useNotificationStore } from '@/lib/store';
import { OfferNotificationCard } from './OfferNotificationCard';
import { useAuthStore } from '@/lib/store';
import { notifications } from '@mantine/notifications';

interface NotificationDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ opened, onClose }: NotificationDrawerProps) {
  const { notifications: notifs, updateNotificationStatus, markAllAsRead } = useNotificationStore();
  const { token } = useAuthStore();

  // Mark all as read when drawer opens
  useEffect(() => {
    if (opened) {
      markAllAsRead();
    }
  }, [opened, markAllAsRead]);

  const handleAccept = async (bidId: string, rideId: string) => {
    if (!token) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rides/${rideId}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bidId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec de l\'acceptation');
      }

      // Update notification status
      updateNotificationStatus(bidId, 'ACCEPTED');

      notifications.show({
        title: 'Offre acceptée',
        message: 'L\'offre a été acceptée avec succès!',
        color: 'green',
        icon: <IconBell />,
      });

      // Close drawer after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'acceptation de l\'offre',
        color: 'red',
      });
    }
  };

  const handleReject = async (bidId: string, rideId: string) => {
    if (!token) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rides/${rideId}/bids/${bidId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Échec du rejet');
      }

      // Update notification status
      updateNotificationStatus(bidId, 'REJECTED');

      notifications.show({
        title: 'Offre rejetée',
        message: 'L\'offre a été rejetée',
        color: 'orange',
      });
    } catch (error: any) {
      console.error('Error rejecting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors du rejet de l\'offre',
        color: 'red',
      });
    }
  };

  const activeNotifications = notifs.filter(n => n.status === 'ACTIVE');
  const pastNotifications = notifs.filter(n => n.status !== 'ACTIVE');

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group>
          <IconBell size={24} />
          <div>
            <Title order={3}>Offres reçues</Title>
            <Text size="sm" c="dimmed">
              {activeNotifications.length > 0
                ? `${activeNotifications.length} offre${activeNotifications.length > 1 ? 's' : ''} en attente`
                : 'Aucune offre en attente'
              }
            </Text>
          </div>
        </Group>
      }
      padding="lg"
    >
      {notifs.length === 0 ? (
        <Stack gap="xl" align="center" justify="center" style={{ minHeight: '60vh' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#f1f3f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconBellOff size={40} color="#adb5bd" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Title order={4} mb="xs">Aucune notification</Title>
            <Text c="dimmed">
              Vous recevrez des notifications quand les chauffeurs feront des offres
            </Text>
          </div>
        </Stack>
      ) : (
        <Stack gap="xl">
          {/* Active Notifications */}
          {activeNotifications.length > 0 && (
            <div>
              <Group mb="md">
                <Text size="sm" fw={600} tt="uppercase" c="dimmed">Nouvelles offres</Text>
                <Badge size="sm" color="blue">{activeNotifications.length}</Badge>
              </Group>
              <Stack gap="md">
                {activeNotifications.map((notification) => (
                  <OfferNotificationCard
                    key={notification.id}
                    {...notification}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </Stack>
            </div>
          )}

          {/* Past Notifications */}
          {pastNotifications.length > 0 && (
            <div>
              <Group mb="md">
                <Text size="sm" fw={600} tt="uppercase" c="dimmed">Historique</Text>
                <Badge size="sm" color="gray">{pastNotifications.length}</Badge>
              </Group>
              <Stack gap="md">
                {pastNotifications.map((notification) => (
                  <OfferNotificationCard
                    key={notification.id}
                    {...notification}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
