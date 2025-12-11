'use client';

import { Modal, Card, Group, Stack, Text, Title, Badge, Button, Avatar } from '@mantine/core';
import { IconCheck, IconX, IconStar, IconTruck } from '@tabler/icons-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating?: number;
  vehicleType?: string;
  totalRides?: number;
}

interface AutoOfferModalProps {
  opened: boolean;
  onClose: () => void;
  bidId: string;
  rideId: string;
  driver: Driver;
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
}

export function AutoOfferModal({
  opened,
  onClose,
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
}: AutoOfferModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      withCloseButton={false}
      overlayProps={{
        backgroundOpacity: 0.7,
        blur: 3,
      }}
      styles={{
        body: { padding: 0 },
      }}
    >
      <Card padding="xl" radius="md">
        {/* Header */}
        <Stack gap="md" mb="xl">
          <Group justify="center">
            <Badge size="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              Nouvelle offre reçue!
            </Badge>
          </Group>

          {/* Driver Info */}
          <Group>
            <Avatar size="xl" radius="xl" color="dark">
              <IconTruck size={32} />
            </Avatar>
            <div style={{ flex: 1 }}>
              <Title order={2} size="1.5rem">{driver.name}</Title>
              <Group gap="xs">
                {driver.rating && (
                  <Group gap={4}>
                    <IconStar size={16} fill="#fab005" color="#fab005" />
                    <Text size="sm" fw={600}>{driver.rating.toFixed(1)}</Text>
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
        </Stack>

        {/* Ride Details */}
        {ride && (
          <Card padding="md" radius="md" bg="gray.0" mb="lg">
            <Stack gap="sm">
              <Group gap="xs" wrap="nowrap">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#51cf66', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Text size="xs" c="dimmed" mb={2}>Départ</Text>
                  <Text size="sm" fw={600}>{ride.pickupAddress}</Text>
                </div>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b6b', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Text size="xs" c="dimmed" mb={2}>Arrivée</Text>
                  <Text size="sm" fw={600}>{ride.dropoffAddress}</Text>
                </div>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Price - Large and prominent */}
        <Card padding="lg" radius="md" bg="green.0" mb="lg" withBorder style={{ borderColor: '#51cf66' }}>
          <Stack gap="xs" align="center">
            <Text size="sm" c="dimmed" fw={600}>Prix proposé</Text>
            <Title order={1} size="3rem" c="green" style={{ lineHeight: 1 }}>
              {proposedPrice} DT
            </Title>
            {estimatedArrival && (
              <Text size="sm" c="dimmed">Arrivée: {estimatedArrival}</Text>
            )}
          </Stack>
        </Card>

        {/* Driver Message */}
        {message && (
          <Card padding="md" radius="md" bg="blue.0" mb="xl" withBorder style={{ borderColor: '#4dabf7' }}>
            <Text size="sm" fs="italic" ta="center">"{message}"</Text>
          </Card>
        )}

        {/* Action Buttons - Large and Clear */}
        <Group gap="md" grow>
          <Button
            size="xl"
            color="red"
            variant="outline"
            leftSection={<IconX size={24} />}
            onClick={() => onReject(bidId, rideId)}
            disabled={isProcessing}
            styles={{
              root: { height: '60px' },
              label: { fontSize: '1.1rem', fontWeight: 700 },
            }}
          >
            Rejeter
          </Button>
          <Button
            size="xl"
            color="green"
            leftSection={<IconCheck size={24} />}
            onClick={() => onAccept(bidId, rideId)}
            loading={isProcessing}
            disabled={isProcessing}
            styles={{
              root: { height: '60px' },
              label: { fontSize: '1.1rem', fontWeight: 700 },
            }}
          >
            Accepter
          </Button>
        </Group>

        {/* Help text */}
        <Text size="xs" c="dimmed" ta="center" mt="md">
          Cette offre sera visible dans vos notifications
        </Text>
      </Card>
    </Modal>
  );
}
