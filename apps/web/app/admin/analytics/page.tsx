'use client';

import { Container, Title, Text, Paper, Center, Stack } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';

export default function AdminAnalyticsPage() {
  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">Analytiques</Title>
          <Text c="dimmed">Rapports et statistiques détaillés</Text>
        </div>

        <Paper p="xl" radius="md" withBorder>
          <Center style={{ minHeight: 300 }}>
            <Stack gap="md" align="center">
              <IconChartBar size={64} color="#adb5bd" />
              <Title order={3} c="dimmed">Page en développement</Title>
              <Text c="dimmed" ta="center" maw={400}>
                Les rapports analytiques seront bientôt disponibles
              </Text>
            </Stack>
          </Center>
        </Paper>
      </Stack>
    </Container>
  );
}
