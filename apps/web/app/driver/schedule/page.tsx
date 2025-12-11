'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Button,
  SimpleGrid,
  Badge,
  Loader,
  Center,
  Tabs,
  Timeline,
  ThemeIcon,
  Switch,
  Select,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconTrendingUp,
  IconBulb,
  IconCheck,
  IconTruck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { driverApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Thursday',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
};

export default function DriverSchedulePage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  // Schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, Array<{ start: string; end: string }>>>({});
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!token || user?.userType !== 'driver') {
      router.push('/driver/login');
      return;
    }

    loadScheduleData();
  }, [token, user]);

  const loadScheduleData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, analyticsRes] = await Promise.all([
        driverApi.getSchedule(),
        driverApi.getScheduleAnalytics()
      ]);

      setWeeklySchedule(scheduleRes.data.weeklySchedule);
      setUpcomingRides(scheduleRes.data.upcomingRides || []);
      setAnalytics(analyticsRes.data);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de charger le planning',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (day: string, enabled: boolean) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: enabled ? [{ start: '08:00', end: '18:00' }] : []
    }));
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: prev[day]?.length > 0 ? [{ ...prev[day][0], [field]: value }] : [{ start: '08:00', end: '18:00' }]
    }));
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await driverApi.updateSchedule(weeklySchedule);
      notifications.show({
        title: 'Planning sauvegardé',
        message: 'Votre planning a été mis à jour avec succès',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || 'Impossible de sauvegarder le planning',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="xl" radius={0} withBorder>
        <Container size="lg">
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={20} />}
              onClick={() => router.back()}
            >
              Retour
            </Button>
            <div>
              <Title order={1} size="2rem">
                Mon Planning
              </Title>
              <Text c="dimmed" size="sm">
                Gérez votre disponibilité et optimisez votre temps
              </Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="lg" py="xl">
        <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'schedule')}>
          <Tabs.List>
            <Tabs.Tab value="schedule" leftSection={<IconCalendar size={16} />}>
              Disponibilité
            </Tabs.Tab>
            <Tabs.Tab value="upcoming" leftSection={<IconTruck size={16} />}>
              Courses à venir ({upcomingRides.length})
            </Tabs.Tab>
            <Tabs.Tab value="analytics" leftSection={<IconTrendingUp size={16} />}>
              Analyses
            </Tabs.Tab>
          </Tabs.List>

          {/* Schedule Tab */}
          <Tabs.Panel value="schedule" pt="xl">
            <Stack gap="xl">
              {DAYS.map((day) => {
                const isEnabled = weeklySchedule[day]?.length > 0;
                const schedule = weeklySchedule[day]?.[0] || { start: '08:00', end: '18:00' };

                return (
                  <Card key={day} shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md" style={{ flex: 1 }}>
                        <Switch
                          checked={isEnabled}
                          onChange={(e) => handleToggleDay(day, e.currentTarget.checked)}
                          size="lg"
                        />
                        <div style={{ minWidth: 100 }}>
                          <Text fw={600}>{DAY_LABELS[day]}</Text>
                          {isEnabled && (
                            <Text size="sm" c="dimmed">
                              {schedule.start} - {schedule.end}
                            </Text>
                          )}
                        </div>
                      </Group>

                      {isEnabled && (
                        <Group gap="md">
                          <Select
                            value={schedule.start}
                            onChange={(val) => val && handleTimeChange(day, 'start', val)}
                            data={generateTimeOptions()}
                            w={120}
                            label="Début"
                          />
                          <Select
                            value={schedule.end}
                            onChange={(val) => val && handleTimeChange(day, 'end', val)}
                            data={generateTimeOptions()}
                            w={120}
                            label="Fin"
                          />
                        </Group>
                      )}
                    </Group>
                  </Card>
                );
              })}

              <Button
                size="lg"
                fullWidth
                onClick={handleSaveSchedule}
                loading={saving}
                leftSection={<IconCheck size={20} />}
              >
                Sauvegarder mon planning
              </Button>
            </Stack>
          </Tabs.Panel>

          {/* Upcoming Rides Tab */}
          <Tabs.Panel value="upcoming" pt="xl">
            {upcomingRides.length === 0 ? (
              <Card shadow="sm" padding="xl" radius="md" withBorder>
                <Stack align="center" gap="md" py="xl">
                  <IconTruck size={48} color="#adb5bd" />
                  <Title order={3} size="1.25rem" ta="center">
                    Aucune course planifiée
                  </Title>
                  <Text size="sm" c="dimmed" ta="center">
                    Vos prochaines courses apparaîtront ici
                  </Text>
                </Stack>
              </Card>
            ) : (
              <Timeline active={upcomingRides.length} bulletSize={24} lineWidth={2}>
                {upcomingRides.map((ride, idx) => (
                  <Timeline.Item
                    key={ride.id}
                    bullet={<IconClock size={12} />}
                    title={
                      <Text fw={600}>
                        {ride.scheduledFor
                          ? new Date(ride.scheduledFor).toLocaleString('fr-FR')
                          : 'Date non programmée'}
                      </Text>
                    }
                  >
                    <Card mt="xs" padding="md" withBorder>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <Badge color="blue">{ride.status}</Badge>
                          <Text size="sm" c="dimmed">
                            {ride.customer?.name}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconMapPin size={14} />
                          <Text size="sm">{ride.pickup?.address}</Text>
                        </Group>
                        <Group gap="xs">
                          <IconMapPin size={14} color="#228be6" />
                          <Text size="sm">{ride.dropoff?.address}</Text>
                        </Group>
                        <Button
                          variant="light"
                          size="sm"
                          onClick={() => router.push(`/driver/rides/${ride.id}`)}
                        >
                          Voir détails
                        </Button>
                      </Stack>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Tabs.Panel>

          {/* Analytics Tab */}
          <Tabs.Panel value="analytics" pt="xl">
            <Stack gap="xl">
              {/* Recommendations */}
              {analytics?.recommendations && (
                <Card shadow="sm" padding="xl" radius="md" withBorder style={{ background: '#E7F5FF' }}>
                  <Group gap="xs" mb="md">
                    <IconBulb size={24} color="#228be6" />
                    <Title order={3} size="1.25rem">
                      Recommandations
                    </Title>
                  </Group>
                  <Stack gap="md">
                    {analytics.recommendations.map((rec: any, idx: number) => (
                      <Paper key={idx} p="md" withBorder>
                        <Text fw={600}>{rec.message}</Text>
                      </Paper>
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Peak Hours */}
              {analytics?.peakHours && analytics.peakHours.length > 0 && (
                <Card shadow="sm" padding="xl" radius="md" withBorder>
                  <Title order={3} size="1.25rem" mb="lg">
                    Heures de forte demande
                  </Title>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {analytics.peakHours.slice(0, 6).map((peak: any, idx: number) => (
                      <Paper key={idx} p="md" withBorder>
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" c="dimmed">
                              {DAY_LABELS[peak.day]} à {peak.hour}h
                            </Text>
                            <Text fw={600} size="lg">
                              {peak.demand} courses
                            </Text>
                          </div>
                          <ThemeIcon size="xl" variant="light" color="blue">
                            <IconTrendingUp size={20} />
                          </ThemeIcon>
                        </Group>
                        <Text size="xs" c="dimmed" mt="xs">
                          Prix moyen: {peak.avgPrice} DT
                        </Text>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </div>
  );
}

function generateTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of [0, 30]) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      options.push({ value: time, label: time });
    }
  }
  return options;
}
