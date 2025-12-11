'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Card,
  Text,
  Badge,
  Button,
  Group,
  Stack,
  Grid,
  Modal,
  Select,
  NumberInput,
  Progress,
  Paper,
  ThemeIcon,
  List,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCrown,
  IconRocket,
  IconAlertCircle,
  IconCalendar,
  IconPackage,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';

interface Subscription {
  id: string;
  planType: 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
  monthlyFee: number;
  includedRides: number;
  usedRides: number;
  reducedCommission: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  lastInvoiceDate?: string;
}

interface PlanConfig {
  id: 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
  name: string;
  price: number;
  includedRides: number;
  commission: number;
  icon: typeof IconPackage;
  color: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: PlanConfig[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 49,
    includedRides: 10,
    commission: 9,
    icon: IconPackage,
    color: 'gray',
    features: [
      '10 courses incluses par mois',
      '9% de commission (au lieu de 10%)',
      'Support par email',
      'Tableau de bord basique',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 149,
    includedRides: 50,
    commission: 7,
    icon: IconRocket,
    color: 'blue',
    recommended: true,
    features: [
      '50 courses incluses par mois',
      '7% de commission (au lieu de 10%)',
      'Support prioritaire',
      'Tableau de bord avancé',
      'Rapports mensuels détaillés',
      'Gestionnaire de compte dédié',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 399,
    includedRides: 200,
    commission: 5,
    icon: IconCrown,
    color: 'yellow',
    features: [
      '200 courses incluses par mois',
      '5% de commission (au lieu de 10%)',
      'Support 24/7 dédié',
      'Tableau de bord personnalisé',
      'API Access',
      'Conducteurs dédiés',
      'Facturation personnalisée',
      'SLA garanti',
    ],
  },
];

export default function SubscriptionPage() {
  const { token } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('CARD');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/b2b/subscription', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch('http://localhost:4000/api/b2b/subscription/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planType: selectedPlan.id,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Abonnement activé',
          message: `Votre abonnement ${selectedPlan.name} est maintenant actif !`,
          color: 'green',
          icon: <IconCheck />,
        });

        setPurchaseModalOpen(false);
        loadSubscription();
      } else {
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Impossible d\'activer l\'abonnement',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue lors de l\'achat',
        color: 'red',
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/b2b/subscription/${subscription.id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        notifications.show({
          title: 'Abonnement annulé',
          message: 'Votre abonnement a été annulé avec succès',
          color: 'blue',
        });

        loadSubscription();
      } else {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible d\'annuler l\'abonnement',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'green',
      EXPIRED: 'red',
      CANCELLED: 'gray',
    };

    return (
      <Badge color={colors[status] || 'gray'} size="lg">
        {status === 'ACTIVE' ? 'Actif' : status === 'EXPIRED' ? 'Expiré' : 'Annulé'}
      </Badge>
    );
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Text>Chargement...</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">
        Gestion Abonnement B2B
      </Title>

      {/* Current Subscription Status */}
      {subscription && (
        <Card shadow="sm" p="lg" radius="md" mb="xl">
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon
                size="xl"
                color={
                  PLANS.find((p) => p.id === subscription.planType)?.color || 'gray'
                }
                variant="light"
              >
                {PLANS.find((p) => p.id === subscription.planType)?.icon ? (
                  <IconRocket size={24} />
                ) : (
                  <IconPackage size={24} />
                )}
              </ThemeIcon>
              <div>
                <Text size="xl" fw={700}>
                  {PLANS.find((p) => p.id === subscription.planType)?.name || subscription.planType}
                </Text>
                <Text size="sm" c="dimmed">
                  {subscription.monthlyFee} DT / mois
                </Text>
              </div>
            </Group>
            {getStatusBadge(subscription.status)}
          </Group>

          {subscription.status === 'ACTIVE' && (
            <>
              {/* Usage Progress */}
              <Paper p="md" withBorder mb="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    Courses utilisées
                  </Text>
                  <Text size="sm" fw={700}>
                    {subscription.usedRides} / {subscription.includedRides}
                  </Text>
                </Group>
                <Progress
                  value={(subscription.usedRides / subscription.includedRides) * 100}
                  color={
                    subscription.usedRides >= subscription.includedRides
                      ? 'red'
                      : subscription.usedRides >= subscription.includedRides * 0.8
                      ? 'yellow'
                      : 'blue'
                  }
                  size="lg"
                />
                {subscription.usedRides >= subscription.includedRides && (
                  <Alert icon={<IconAlertCircle size={16} />} color="orange" mt="xs">
                    Vous avez utilisé toutes vos courses incluses. Les courses supplémentaires seront facturées à la commission normale de 10%.
                  </Alert>
                )}
              </Paper>

              {/* Subscription Info */}
              <Grid>
                <Grid.Col span={6}>
                  <Paper p="sm" withBorder>
                    <Group>
                      <IconCalendar size={20} />
                      <div>
                        <Text size="xs" c="dimmed">
                          Date de début
                        </Text>
                        <Text size="sm" fw={500}>
                          {new Date(subscription.startDate).toLocaleDateString('fr-FR')}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper p="sm" withBorder>
                    <Group>
                      <IconCalendar size={20} />
                      <div>
                        <Text size="xs" c="dimmed">
                          Date de renouvellement
                        </Text>
                        <Text size="sm" fw={500}>
                          {new Date(subscription.endDate).toLocaleDateString('fr-FR')}
                        </Text>
                        <Text size="xs" c="dimmed">
                          (dans {getDaysRemaining(subscription.endDate)} jours)
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Grid.Col>
              </Grid>

              <Button
                variant="light"
                color="red"
                fullWidth
                mt="md"
                onClick={handleCancelSubscription}
              >
                Annuler l'abonnement
              </Button>
            </>
          )}

          {subscription.status !== 'ACTIVE' && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              Votre abonnement est {subscription.status === 'EXPIRED' ? 'expiré' : 'annulé'}.
              Renouvelez-le pour continuer à bénéficier de vos avantages.
            </Alert>
          )}
        </Card>
      )}

      {/* Available Plans */}
      {(!subscription || subscription.status !== 'ACTIVE') && (
        <>
          <Title order={2} mb="md">
            {subscription ? 'Renouveler votre abonnement' : 'Choisissez votre plan'}
          </Title>

          <Grid>
            {PLANS.map((plan) => (
              <Grid.Col key={plan.id} span={{ base: 12, md: 4 }}>
                <Card
                  shadow="sm"
                  p="lg"
                  radius="md"
                  withBorder
                  style={{
                    borderColor: plan.recommended ? '#228be6' : undefined,
                    borderWidth: plan.recommended ? 2 : 1,
                    position: 'relative',
                  }}
                >
                  {plan.recommended && (
                    <Badge
                      color="blue"
                      variant="filled"
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: 20,
                      }}
                    >
                      Recommandé
                    </Badge>
                  )}

                  <Stack gap="md">
                    <Group>
                      <ThemeIcon size="xl" color={plan.color} variant="light">
                        <plan.icon size={24} />
                      </ThemeIcon>
                      <div>
                        <Text size="xl" fw={700}>
                          {plan.name}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {plan.includedRides} courses/mois
                        </Text>
                      </div>
                    </Group>

                    <div>
                      <Text size="3rem" fw={700} style={{ lineHeight: 1 }}>
                        {plan.price}
                        <Text component="span" size="lg" c="dimmed">
                          {' '}
                          DT
                        </Text>
                      </Text>
                      <Text size="sm" c="dimmed">
                        par mois
                      </Text>
                    </div>

                    <List
                      spacing="xs"
                      size="sm"
                      center
                      icon={
                        <ThemeIcon color="green" size={20} radius="xl">
                          <IconCheck size={12} />
                        </ThemeIcon>
                      }
                    >
                      {plan.features.map((feature, idx) => (
                        <List.Item key={idx}>{feature}</List.Item>
                      ))}
                    </List>

                    <Button
                      variant={plan.recommended ? 'filled' : 'light'}
                      color={plan.color}
                      fullWidth
                      onClick={() => {
                        setSelectedPlan(plan);
                        setPurchaseModalOpen(true);
                      }}
                    >
                      {subscription ? 'Renouveler' : 'Souscrire'}
                    </Button>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </>
      )}

      {/* Purchase Modal */}
      <Modal
        opened={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        title={`Souscrire au plan ${selectedPlan?.name}`}
        size="md"
      >
        <Stack gap="md">
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Plan sélectionné</Text>
              <Text size="sm" fw={700}>
                {selectedPlan?.name}
              </Text>
            </Group>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Courses incluses</Text>
              <Text size="sm" fw={700}>
                {selectedPlan?.includedRides} / mois
              </Text>
            </Group>
            <Group justify="space-between" mb="xs">
              <Text size="sm">Commission réduite</Text>
              <Text size="sm" fw={700}>
                {selectedPlan?.commission}%
              </Text>
            </Group>
            <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
              <Text size="lg" fw={700}>
                Total
              </Text>
              <Text size="xl" fw={700} c="blue">
                {selectedPlan?.price} DT
              </Text>
            </Group>
          </Paper>

          <Select
            label="Méthode de paiement"
            placeholder="Sélectionnez une méthode"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val || 'CARD')}
            data={[
              { value: 'CARD', label: 'Carte bancaire' },
              { value: 'FLOUCI', label: 'Flouci' },
              { value: 'TRANSFER', label: 'Virement bancaire' },
            ]}
            required
          />

          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            L'abonnement sera renouvelé automatiquement chaque mois. Vous pouvez l'annuler à tout moment.
          </Alert>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setPurchaseModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePurchase}>Confirmer le paiement</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
