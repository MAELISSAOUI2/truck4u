'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Card,
  Group,
  Badge,
  Timeline,
  Grid,
  Alert,
  Modal,
  Textarea,
  Rating,
  rem,
} from '@mantine/core';
import {
  IconMapPin,
  IconPackage,
  IconCoin,
  IconUser,
  IconPhone,
  IconX,
  IconStar,
  IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  SEARCHING_DRIVER: 'blue',
  DRIVER_ASSIGNED: 'cyan',
  DRIVER_EN_ROUTE: 'yellow',
  AT_PICKUP: 'orange',
  PICKED_UP: 'lime',
  IN_DELIVERY: 'teal',
  ARRIVED_DESTINATION: 'grape',
  DELIVERED: 'green',
  CANCELLED: 'red',
  FAILED: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SEARCHING_DRIVER: 'Recherche livreur',
  DRIVER_ASSIGNED: 'Livreur assigné',
  DRIVER_EN_ROUTE: 'En route pickup',
  AT_PICKUP: 'Au pickup',
  PICKED_UP: 'Colis récupéré',
  IN_DELIVERY: 'En livraison',
  ARRIVED_DESTINATION: 'Arrivé destination',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
  FAILED: 'Échoué',
};

export default function BusinessOrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpened, setCancelModalOpened] = useState(false);
  const [rateModalOpened, setRateModalOpened] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    const token = localStorage.getItem('businessToken');

    if (!token) {
      router.push('/business/register');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/business/orders/${orderId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setOrder(await response.json());
      } else {
        notifications.show({
          title: 'Erreur',
          message: 'Commande introuvable',
          color: 'red',
        });
        router.push('/business/orders');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    const token = localStorage.getItem('businessToken');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/business/orders/${orderId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Commande annulée',
          color: 'green',
        });
        setCancelModalOpened(false);
        fetchOrder();
      } else {
        const data = await response.json();
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Impossible d\'annuler',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur de connexion',
        color: 'red',
      });
    }
  };

  const handleRateOrder = async () => {
    const token = localStorage.getItem('businessToken');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/business/orders/${orderId}/rate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ rating, comment: ratingComment }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Merci !',
          message: 'Votre évaluation a été enregistrée',
          color: 'green',
        });
        setRateModalOpened(false);
        fetchOrder();
      } else {
        const data = await response.json();
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Impossible de noter',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur de connexion',
        color: 'red',
      });
    }
  };

  if (loading || !order) {
    return <Container><Text>Chargement...</Text></Container>;
  }

  const canCancel = ['DRAFT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE'].includes(order.status);
  const canRate = order.status === 'DELIVERED' && !order.driverRating;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Commande {order.orderNumber}</Title>
            <Badge color={STATUS_COLORS[order.status]} size="lg" mt="xs">
              {STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <Group>
            {canRate && (
              <Button
                leftSection={<IconStar size={16} />}
                onClick={() => setRateModalOpened(true)}
              >
                Noter la livraison
              </Button>
            )}
            {canCancel && (
              <Button
                color="red"
                variant="outline"
                leftSection={<IconX size={16} />}
                onClick={() => setCancelModalOpened(true)}
              >
                Annuler
              </Button>
            )}
          </Group>
        </Group>

        <Grid>
          {/* Left Column */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              {/* Recipient Info */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Group>
                    <IconMapPin size={20} />
                    <Title order={5}>Destinataire</Title>
                  </Group>
                  <div>
                    <Text fw={500}>{order.recipientName}</Text>
                    <Text size="sm" c="dimmed">{order.recipientPhone}</Text>
                    <Text size="sm" mt="xs">
                      {order.recipientAddress}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {order.recipientGouvernorat}, {order.recipientDelegation}
                    </Text>
                    {order.recipientNotes && (
                      <Alert mt="sm" color="blue" variant="light">
                        {order.recipientNotes}
                      </Alert>
                    )}
                  </div>
                </Stack>
              </Card>

              {/* Cargo Info */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Group>
                    <IconPackage size={20} />
                    <Title order={5}>Colis</Title>
                  </Group>
                  <div>
                    <Text><strong>Type:</strong> {order.cargoType}</Text>
                    {order.estimatedWeight && (
                      <Text><strong>Poids:</strong> {order.estimatedWeight} kg</Text>
                    )}
                    {order.cargoDescription && (
                      <Text size="sm" c="dimmed" mt="xs">{order.cargoDescription}</Text>
                    )}
                  </div>
                </Stack>
              </Card>

              {/* COD */}
              {order.hasCOD && (
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group>
                      <IconCoin size={20} />
                      <Title order={5}>Paiement à la livraison</Title>
                    </Group>
                    <Text fw={700} size="xl">{order.codAmount?.toFixed(2)} DT</Text>
                    <Badge color="orange" variant="light">
                      COD - {order.codStatus}
                    </Badge>
                  </Stack>
                </Card>
              )}

              {/* Driver Info */}
              {order.driver && (
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group>
                      <IconUser size={20} />
                      <Title order={5}>Livreur</Title>
                    </Group>
                    <div>
                      <Text fw={500}>
                        {order.driver.firstName} {order.driver.lastName}
                      </Text>
                      <Group gap="xs" mt="xs">
                        <IconPhone size={16} />
                        <Text size="sm">{order.driver.phone}</Text>
                      </Group>
                      <Group gap="xs" mt="xs">
                        <IconStar size={16} />
                        <Text size="sm">
                          {order.driver.rating?.toFixed(1)} / 5.0 ({order.driver.totalDeliveries} livraisons)
                        </Text>
                      </Group>
                    </div>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Grid.Col>

          {/* Right Column - Timeline */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={5} mb="md">Historique</Title>
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {order.statusHistory?.map((event: any, index: number) => (
                  <Timeline.Item
                    key={index}
                    bullet={<IconCheck size={12} />}
                    title={STATUS_LABELS[event.status] || event.status}
                  >
                    <Text size="sm" c="dimmed">
                      {new Date(event.timestamp).toLocaleString('fr-FR')}
                    </Text>
                    {event.notes && (
                      <Text size="xs" c="dimmed" mt="xs">{event.notes}</Text>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Cancel Modal */}
        <Modal
          opened={cancelModalOpened}
          onClose={() => setCancelModalOpened(false)}
          title="Annuler la commande"
        >
          <Stack gap="md">
            <Text size="sm">
              Êtes-vous sûr de vouloir annuler cette commande?
            </Text>
            <Textarea
              label="Raison (optionnel)"
              placeholder="Pourquoi annulez-vous?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.currentTarget.value)}
              rows={3}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCancelModalOpened(false)}>
                Fermer
              </Button>
              <Button color="red" onClick={handleCancelOrder}>
                Confirmer l'annulation
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Rate Modal */}
        <Modal
          opened={rateModalOpened}
          onClose={() => setRateModalOpened(false)}
          title="Noter la livraison"
        >
          <Stack gap="md">
            <div>
              <Text size="sm" mb="xs">Votre note</Text>
              <Rating value={rating} onChange={setRating} size="xl" />
            </div>
            <Textarea
              label="Commentaire (optionnel)"
              placeholder="Partagez votre expérience..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.currentTarget.value)}
              rows={3}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setRateModalOpened(false)}>
                Annuler
              </Button>
              <Button onClick={handleRateOrder}>
                Envoyer l'évaluation
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
