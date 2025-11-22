'use client';

import { Container, Title, Text, Paper, Center, Stack } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';

export default function AdminRidesPage() {
  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">Courses</Title>
          <Text c="dimmed">Gérer toutes les courses de la plateforme</Text>
        </div>

        <Paper p="xl" radius="md" withBorder>
          <Center style={{ minHeight: 300 }}>
            <Stack gap="md" align="center">
              <IconPackage size={64} color="#adb5bd" />
              <Title order={3} c="dimmed">Page en développement</Title>
              <Text c="dimmed" ta="center" maw={400}>
                La gestion des courses sera bientôt disponible
              </Text>
            </Stack>
          </Center>
        </Paper>
      </Stack>
    </Container>
  );
}
