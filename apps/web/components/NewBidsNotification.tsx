'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Paper, Text, Group, Button, Badge, Stack, ActionIcon } from '@mantine/core';
import { IconBell, IconX } from '@tabler/icons-react';

interface NewBid {
  rideId: string;
  count: number;
  latestBid?: {
    driverName: string;
    price: number;
  };
}

interface NewBidsNotificationProps {
  newBids: NewBid[];
  onDismiss: (rideId: string) => void;
}

export function NewBidsNotification({ newBids, onDismiss }: NewBidsNotificationProps) {
  const router = useRouter();

  if (newBids.length === 0) return null;

  return (
    <Stack gap="xs" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '1rem 0' }}>
      {newBids.map((bid) => (
        <Paper
          key={bid.rideId}
          p="md"
          radius="md"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => router.push(`/customer/rides/${bid.rideId}`)}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="md">
              <div
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBell size={24} />
              </div>
              <div>
                <Group gap="xs" mb={4}>
                  <Text fw={700} size="md">
                    {bid.count} {bid.count === 1 ? 'nouvelle offre' : 'nouvelles offres'}
                  </Text>
                  <Badge color="yellow" variant="filled" size="sm">
                    NOUVEAU
                  </Badge>
                </Group>
                {bid.latestBid && (
                  <Text size="sm" opacity={0.9}>
                    {bid.latestBid.driverName} propose {bid.latestBid.price} DT
                  </Text>
                )}
                <Text size="xs" opacity={0.7} mt={4}>
                  Cliquez pour voir les détails →
                </Text>
              </div>
            </Group>
            <ActionIcon
              variant="subtle"
              color="white"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(bid.rideId);
              }}
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
