'use client';

import { useState } from 'react';
import { Card, Group, Stack, Text, Title, Badge, Button, Avatar } from '@mantine/core';
import { IconCheck, IconX, IconClock, IconStar, IconTruck } from '@tabler/icons-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating?: number;
  vehicleType?: string;
  totalRides?: number;
}

interface OfferNotificationCardProps {
  id: string;
  rideId: string;
  driver: Driver;
  proposedPrice: number;
  estimatedArrival?: string;
  message?: string;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  ride?: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
  };
  onAccept: (bidId: string, rideId: string) => void;
  onReject: (bidId: string, rideId: string) => void;
}

export function OfferNotificationCard({
  id,
  rideId,
  driver,
  proposedPrice,
  estimatedArrival,
  message,
  status,
  ride,
  onAccept,
  onReject,
}: OfferNotificationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(id, rideId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(id, rideId);
    } finally {
      setIsProcessing(false);
    }
  };

  const isActionable = status === 'ACTIVE';

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder
      style={{
        backgroundColor: status === 'ACCEPTED' ? '#f0fdf4' :
                        status === 'REJECTED' ? '#fef2f2' :
                        'white'
      }}
    >
      {/* Driver Info */}
      <Group mb="md">
        <Avatar size="lg" radius="xl" color="dark">
          <IconTruck size={24} />
        </Avatar>
        <div style={{ flex: 1 }}>
          <Text fw={600} size="lg">{driver.name}</Text>
          <Group gap="xs">
            {driver.rating && (
              <Group gap={4}>
                <IconStar size={14} fill="#fab005" color="#fab005" />
                <Text size="sm" c="dimmed">{driver.rating.toFixed(1)}</Text>
              </Group>
            )}
            {driver.totalRides && (
              <Text size="sm" c="dimmed">• {driver.totalRides} courses</Text>
            )}
            {driver.vehicleType && (
              <Text size="sm" c="dimmed">• {driver.vehicleType}</Text>
            )}
          </Group>
        </div>
      </Group>

      {/* Ride Details */}
      {ride && (
        <Card padding="sm" radius="md" bg="gray.0" mb="md">
          <Stack gap="xs">
            <Group gap="xs" wrap="nowrap">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#51cf66', flexShrink: 0 }} />
              <Text size="sm" fw={500} style={{ flex: 1 }}>{ride.pickupAddress}</Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b', flexShrink: 0 }} />
              <Text size="sm" fw={500} style={{ flex: 1 }}>{ride.dropoffAddress}</Text>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Offer Details */}
      <Group justify="space-between" mb="md">
        <div>
          <Text size="sm" c="dimmed">Prix proposé</Text>
          <Title order={2} size="2rem" c="dark">{proposedPrice} DT</Title>
        </div>
        {estimatedArrival && (
          <div>
            <Text size="sm" c="dimmed">
              <Group gap={4}>
                <IconClock size={14} />
                Arrivée estimée
              </Group>
            </Text>
            <Text size="sm" fw={600}>{estimatedArrival}</Text>
          </div>
        )}
      </Group>

      {/* Driver Message */}
      {message && (
        <Card padding="sm" radius="md" bg="blue.0" mb="md" withBorder style={{ borderColor: '#4dabf7' }}>
          <Text size="sm" c="dark" fs="italic">"{message}"</Text>
        </Card>
      )}

      {/* Status Badge */}
      {!isActionable && (
        <Group mb="md">
          {status === 'ACCEPTED' && (
            <Badge size="lg" color="green" leftSection={<IconCheck size={14} />}>
              Acceptée
            </Badge>
          )}
          {status === 'REJECTED' && (
            <Badge size="lg" color="red" leftSection={<IconX size={14} />}>
              Rejetée
            </Badge>
          )}
          {status === 'EXPIRED' && (
            <Badge size="lg" color="gray" leftSection={<IconClock size={14} />}>
              Expirée
            </Badge>
          )}
        </Group>
      )}

      {/* Action Buttons */}
      {isActionable && (
        <Group gap="md" mt="lg" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
          <Button
            flex={1}
            size="md"
            color="green"
            leftSection={<IconCheck size={18} />}
            onClick={handleAccept}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Accepter
          </Button>
          <Button
            flex={1}
            size="md"
            color="red"
            variant="outline"
            leftSection={<IconX size={18} />}
            onClick={handleReject}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Rejeter
          </Button>
        </Group>
      )}
    </Card>
  );
}
