'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Card,
  Group,
  Paper,
  Radio,
  Divider,
  Alert,
  Loader,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCreditCard,
  IconWallet,
  IconShieldCheck,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';

const PAYMENT_METHODS = [
  {
    id: 'paymee',
    name: 'Paymee',
    description: 'Carte bancaire via Paymee',
    icon: IconCreditCard,
    color: 'blue',
  },
  {
    id: 'flouci',
    name: 'Flouci',
    description: 'Paiement mobile',
    icon: IconWallet,
    color: 'orange',
  },
];

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { token } = useAuthStore();

  const rideId = params.id as string;
  const bidId = searchParams.get('bidId');

  const [ride, setRide] = useState<any>(null);
  const [bid, setBid] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paymee');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }

    loadPaymentData();
  }, [rideId, bidId, token]);

  const loadPaymentData = async () => {
    try {
      // Load ride details
      const rideResponse = await rideApi.getById(rideId);
      setRide(rideResponse.data);

      // Load specific bid if provided
      if (bidId) {
        const bidsResponse = await rideApi.getBids(rideId);
        const selectedBid = bidsResponse.data.find((b: any) => b.id === bidId);
        setBid(selectedBid);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      setError('Impossible de charger les informations de paiement');
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = () => {
    if (!bid) return 0;
    // Commission: 10% du montant
    return Math.round(bid.amount * 0.1);
  };

  const handlePayment = async () => {
    if (!bid) return;

    setError('');
    setProcessing(true);

    try {
      // Create payment with selected method
      const paymentResponse = await rideApi.createPayment(rideId, {
        bidId: bid.id,
        paymentMethod,
        amount: calculateCommission(),
      });

      // Redirect to payment gateway
      if (paymentResponse.data.paymentUrl) {
        window.location.href = paymentResponse.data.paymentUrl;
      } else {
        // Payment successful, update ride status
        await rideApi.acceptBid(rideId, bid.id);
        router.push(`/customer/rides/${rideId}?payment=success`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Chargement...</Text>
        </Group>
      </Container>
    );
  }

  if (!ride || !bid) {
    return (
      <Container size="sm" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red">
          {error || 'Course ou offre introuvable'}
        </Alert>
        <Button
          mt="md"
          variant="subtle"
          onClick={() => router.push('/customer/dashboard')}
        >
          Retour au tableau de bord
        </Button>
      </Container>
    );
  }

  const commission = calculateCommission();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="md" radius={0} withBorder>
        <Container size="sm">
          <Group>
            <ActionIcon
              size="lg"
              variant="subtle"
              color="dark"
              onClick={() => router.push(`/customer/rides/${rideId}`)}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
            <div>
              <Text size="sm" c="dimmed">Paiement sécurisé</Text>
              <Text fw={700}>Commission de service</Text>
            </div>
          </Group>
        </Container>
      </Paper>

      <Container size="sm" py="xl">
        <Stack gap="xl">
          {/* Security Badge */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group>
              <IconShieldCheck size={32} color="#51cf66" />
              <div>
                <Text fw={700}>Paiement 100% sécurisé</Text>
                <Text size="sm" c="dimmed">
                  Votre argent est bloqué en sécurité jusqu'à la fin de la course
                </Text>
              </div>
            </Group>
          </Card>

          {/* Ride Summary */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Stack gap="md">
              <Title order={3} size="1.25rem">Résumé de la course</Title>

              <div>
                <Text size="sm" c="dimmed" mb={4}>Transporteur</Text>
                <Text fw={700}>{bid.driver.name}</Text>
              </div>

              <Divider />

              <div>
                <Text size="sm" c="dimmed" mb={4}>Trajet</Text>
                <Text size="sm">{ride.pickup.address}</Text>
                <Text size="sm" c="dimmed">→</Text>
                <Text size="sm">{ride.dropoff.address}</Text>
              </div>

              <Divider />

              <div>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Prix de la course</Text>
                  <Text fw={700}>{bid.amount} DT</Text>
                </Group>
                <Group justify="space-between" mt="xs">
                  <Text size="sm" c="dimmed">Commission plateforme (10%)</Text>
                  <Text fw={700} c="blue">{commission} DT</Text>
                </Group>
              </div>
            </Stack>
          </Card>

          {/* Payment Method */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder>
            <Stack gap="md">
              <Title order={3} size="1.25rem">Mode de paiement</Title>

              <Radio.Group value={paymentMethod} onChange={setPaymentMethod}>
                <Stack gap="md">
                  {PAYMENT_METHODS.map((method) => (
                    <Paper
                      key={method.id}
                      p="md"
                      radius="md"
                      withBorder
                      style={{
                        cursor: 'pointer',
                        borderColor: paymentMethod === method.id ? '#228BE6' : undefined,
                        borderWidth: paymentMethod === method.id ? 2 : 1,
                        backgroundColor: paymentMethod === method.id ? '#E7F5FF' : undefined,
                      }}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <Group>
                        <method.icon size={32} color={method.color === 'blue' ? '#228BE6' : '#fd7e14'} />
                        <div style={{ flex: 1 }}>
                          <Text fw={700}>{method.name}</Text>
                          <Text size="sm" c="dimmed">{method.description}</Text>
                        </div>
                        <Radio value={method.id} />
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Radio.Group>
            </Stack>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red">
              {error}
            </Alert>
          )}

          {/* How it works */}
          <Card shadow="sm" padding="xl" radius="lg" withBorder bg="blue.0">
            <Stack gap="sm">
              <Group gap="xs">
                <IconShieldCheck size={20} color="#228BE6" />
                <Text fw={700} c="blue">Comment ça fonctionne ?</Text>
              </Group>
              <Text size="sm" c="dimmed">
                1. Votre paiement de <strong>{commission} DT</strong> est bloqué en sécurité
              </Text>
              <Text size="sm" c="dimmed">
                2. Le transporteur effectue la livraison
              </Text>
              <Text size="sm" c="dimmed">
                3. À la fin de la course, le paiement est automatiquement libéré
              </Text>
              <Text size="sm" c="dimmed">
                4. En cas d'annulation, vous êtes remboursé intégralement
              </Text>
            </Stack>
          </Card>

          {/* Total & Pay Button */}
          <Paper p="xl" radius="lg" withBorder style={{ backgroundColor: '#f8f9fa' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed" mb={4}>Total à payer maintenant</Text>
                <Title order={2} size="2.5rem" c="blue">{commission} DT</Title>
                <Text size="xs" c="dimmed" mt={4}>
                  La course sera payée au transporteur ({bid.amount} DT) à la fin
                </Text>
              </div>
              <Button
                size="xl"
                radius="xl"
                color="blue"
                onClick={handlePayment}
                loading={processing}
                disabled={!paymentMethod}
                leftSection={<IconCheck size={20} />}
              >
                Payer {commission} DT
              </Button>
            </Group>
          </Paper>
        </Stack>
      </Container>
    </div>
  );
}
