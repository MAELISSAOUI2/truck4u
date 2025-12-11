'use client';

import { useState, useEffect } from 'react';
import { Card, Group, Stack, Text, Button, Badge, Avatar } from '@mantine/core';
import { IconCheck, IconX, IconStar, IconTruck, IconMapPin } from '@tabler/icons-react';

interface OfferCardProps {
  bidId: string;
  rideId: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    rating?: number;
    vehicleType?: string;
    totalRides?: number;
  };
  proposedPrice: number;
  estimatedArrival?: string;
  message?: string;
  ride?: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
  };
  onAccept: (bidId: string, rideId: string) => void;
  onReject: (bidId: string, rideId: string) => void;
  isProcessing: boolean;
  animationDelay?: number;
}

export function OfferCard({
  bidId,
  rideId,
  driver,
  proposedPrice,
  estimatedArrival,
  message,
  ride,
  onAccept,
  onReject,
  isProcessing,
  animationDelay = 0,
}: OfferCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleAccept = async () => {
    setIsActioning(true);
    await onAccept(bidId, rideId);
  };

  const handleReject = async () => {
    setIsActioning(true);
    await onReject(bidId, rideId);
  };

  return (
    <Card
      shadow="xl"
      padding="lg"
      radius="lg"
      withBorder
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s ease-out',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderColor: '#228be6',
        borderWidth: '2px',
      }}
    >
      {/* Nouvelle offre badge */}
      <Badge
        size="lg"
        variant="gradient"
        gradient={{ from: 'blue', to: 'cyan' }}
        style={{ position: 'absolute', top: 10, right: 10 }}
      >
        Nouvelle offre
      </Badge>

      {/* Driver info */}
      <Group mb="md" mt="xs">
        <Avatar size="lg" radius="xl" color="dark">
          <IconTruck size={28} />
        </Avatar>
        <div style={{ flex: 1 }}>
          <Text fw={700} size="lg">{driver.name}</Text>
          <Group gap={8}>
            {driver.rating !== undefined && driver.rating !== null && (
              <Group gap={4}>
                <IconStar size={14} fill="#fab005" color="#fab005" />
                <Text size="sm" c="dimmed">{driver.rating.toFixed(1)}</Text>
              </Group>
            )}
            {driver.totalRides && (
              <Text size="sm" c="dimmed">• {driver.totalRides} courses</Text>
            )}
          </Group>
          {driver.vehicleType && (
            <Badge size="sm" variant="light" color="dark" mt={4}>{driver.vehicleType}</Badge>
          )}
        </div>
      </Group>

      {/* Ride details compact */}
      {ride && (
        <Stack gap={4} mb="md">
          <Group gap="xs" wrap="nowrap">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#51cf66', flexShrink: 0 }} />
            <Text size="xs" c="dimmed" lineClamp={1}>{ride.pickupAddress}</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b', flexShrink: 0 }} />
            <Text size="xs" c="dimmed" lineClamp={1}>{ride.dropoffAddress}</Text>
          </Group>
        </Stack>
      )}

      {/* Price prominent */}
      <Card padding="md" radius="md" bg="green.0" mb="md" withBorder style={{ borderColor: '#51cf66' }}>
        <Group justify="space-between">
          <div>
            <Text size="xs" c="dimmed">Prix proposé</Text>
            <Text size="xl" fw={900} c="green">{proposedPrice} DT</Text>
          </div>
          {estimatedArrival && (
            <div style={{ textAlign: 'right' }}>
              <Text size="xs" c="dimmed">Arrivée</Text>
              <Text size="sm" fw={600}>{estimatedArrival} min</Text>
            </div>
          )}
        </Group>
      </Card>

      {/* Message if exists */}
      {message && (
        <Text size="sm" fs="italic" c="dimmed" mb="md" lineClamp={2}>
          "{message}"
        </Text>
      )}

      {/* Action buttons */}
      <Group gap="sm" grow>
        <Button
          size="md"
          color="red"
          variant="outline"
          leftSection={<IconX size={18} />}
          onClick={handleReject}
          disabled={isProcessing || isActioning}
          loading={isActioning}
        >
          Rejeter
        </Button>
        <Button
          size="md"
          color="green"
          leftSection={<IconCheck size={18} />}
          onClick={handleAccept}
          disabled={isProcessing || isActioning}
          loading={isActioning}
        >
          Accepter
        </Button>
      </Group>
    </Card>
  );
}
