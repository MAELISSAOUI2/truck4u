'use client';

import { Modal, Stack, Title, Text, SimpleGrid, Card, Badge, List, Button, Group } from '@mantine/core';
import { IconStar, IconRocket, IconCrown, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

interface SubscriptionModalProps {
  opened: boolean;
  onClose: () => void;
  driverId?: string;
}

const SUBSCRIPTION_PLANS = [
  {
    tier: 'STANDARD',
    name: 'Standard',
    price: 0,
    priceText: 'Gratuit',
    color: 'gray',
    icon: IconStar,
    features: [
      'Accès normal aux courses',
      'Commission standard (10%)',
      'Support par email'
    ],
    disabled: true // Can't subscribe to free tier
  },
  {
    tier: 'PREMIUM',
    name: 'Premium',
    price: 49,
    priceText: '49 DT/mois',
    color: 'blue',
    icon: IconRocket,
    features: [
      'Priorité 1.5× sur les courses',
      'Profil boosté +50%',
      'Accès anticipé 5 minutes',
      'Commission standard (10%)',
      'Support prioritaire'
    ]
  },
  {
    tier: 'ELITE',
    name: 'Elite',
    price: 99,
    priceText: '99 DT/mois',
    color: 'yellow',
    icon: IconCrown,
    features: [
      'Priorité 2.5× sur les courses',
      'Profil boosté +100%',
      'Accès anticipé 15 minutes',
      'Commission réduite (8%)',
      'Support VIP 24/7',
      'Badge Elite visible'
    ],
    highlight: true
  }
];

export function SubscriptionModal({ opened, onClose, driverId }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    const token = localStorage.getItem('truck4u-auth');
    if (!token) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté pour souscrire',
        color: 'red'
      });
      return;
    }

    setLoading(true);
    setSelectedTier(tier);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/driver-subscriptions/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(token).token}`
        },
        body: JSON.stringify({
          tier,
          paymentMethod: 'FLOUCI' // Default payment method
        })
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Succès !',
          message: `Abonnement ${tier} activé avec succès`,
          color: 'green'
        });
        onClose();
        // Refresh page to update subscription status
        window.location.reload();
      } else {
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Impossible de souscrire à cet abonnement',
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur de connexion au serveur',
        color: 'red'
      });
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <div>
          <Title order={2}>🎉 Félicitations !</Title>
          <Text size="sm" c="dimmed" mt="xs">
            Votre compte conducteur a été validé. Boostez votre visibilité avec un abonnement :
          </Text>
        </div>
      }
    >
      <Stack gap="xl">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.tier}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{
                  borderColor: plan.highlight ? '#ffd700' : undefined,
                  borderWidth: plan.highlight ? 2 : 1,
                  position: 'relative'
                }}
              >
                {plan.highlight && (
                  <Badge
                    color="yellow"
                    variant="filled"
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: 10
                    }}
                  >
                    Recommandé
                  </Badge>
                )}

                <Stack gap="md">
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: plan.color === 'gray' ? '#f1f3f5' : plan.color === 'blue' ? '#e7f5ff' : '#fff9db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                      }}
                    >
                      <Icon size={32} color={plan.color === 'gray' ? '#868e96' : plan.color === 'blue' ? '#1971c2' : '#f59f00'} />
                    </div>
                    <Badge color={plan.color} size="lg" variant="light">
                      {plan.name}
                    </Badge>
                    <Text size="xl" fw={700} mt="sm">
                      {plan.priceText}
                    </Text>
                  </div>

                  <List
                    spacing="xs"
                    size="sm"
                    center
                    icon={
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#51cf66',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <IconCheck size={14} color="white" />
                      </div>
                    }
                  >
                    {plan.features.map((feature, idx) => (
                      <List.Item key={idx}>
                        <Text size="sm">{feature}</Text>
                      </List.Item>
                    ))}
                  </List>

                  {!plan.disabled && (
                    <Button
                      fullWidth
                      color={plan.color}
                      variant={plan.highlight ? 'filled' : 'light'}
                      onClick={() => handleSubscribe(plan.tier)}
                      loading={loading && selectedTier === plan.tier}
                      disabled={loading}
                    >
                      Souscrire
                    </Button>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" c="dimmed" ta="center">
            <strong>Note importante :</strong> L'abonnement n'est PAS requis pour effectuer des livraisons B2B.
            Il vous permet simplement d'augmenter votre visibilité et de recevoir plus d'offres.
          </Text>
        </Card>

        <Group justify="center">
          <Button variant="subtle" onClick={onClose}>
            Peut-être plus tard
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
