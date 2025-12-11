'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  NumberInput,
  Modal,
  Badge,
  Table,
  Pagination,
  Center,
  Loader,
  Paper,
  Divider,
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconWallet,
  IconPlus,
  IconClock,
  IconCheck,
  IconX,
  IconArrowDown,
  IconArrowUp,
  IconLock,
  IconRefresh,
} from '@tabler/icons-react';
import { useAuthStore } from '@/lib/store';

interface WalletData {
  id: string;
  balance: number;
  heldAmount: number;
  availableAmount: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  ride?: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    status: string;
  };
}

export default function WalletPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number | string>(50);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadWalletData();
  }, [token, page]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      // Fetch wallet balance
      const walletRes = await fetch('http://localhost:4000/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!walletRes.ok) throw new Error('Failed to fetch wallet');
      const walletData = await walletRes.json();
      setWallet(walletData.wallet);

      // Fetch transactions
      const txRes = await fetch(`http://localhost:4000/api/wallet/transactions?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!txRes.ok) throw new Error('Failed to fetch transactions');
      const txData = await txRes.json();
      setTransactions(txData.transactions);
      setTotalPages(txData.totalPages);
    } catch (error) {
      console.error('Error loading wallet:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger le wallet',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer un montant valide',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:4000/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(depositAmount),
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recharge');
      }

      notifications.show({
        title: 'Succès',
        message: `Wallet rechargé de ${depositAmount} DT`,
        color: 'green',
        icon: <IconCheck />,
      });

      setDepositModalOpen(false);
      setDepositAmount(50);
      loadWalletData();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message,
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <IconArrowDown size={20} color="green" />;
      case 'HOLD':
        return <IconLock size={20} color="orange" />;
      case 'RELEASE':
        return <IconArrowUp size={20} color="red" />;
      case 'REFUND':
        return <IconRefresh size={20} color="blue" />;
      case 'CHARGE':
        return <IconArrowUp size={20} color="red" />;
      default:
        return <IconWallet size={20} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'green';
      case 'HOLD':
        return 'orange';
      case 'RELEASE':
      case 'CHARGE':
        return 'red';
      case 'REFUND':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'yellow',
      COMPLETED: 'green',
      FAILED: 'red',
      CANCELLED: 'gray',
    };

    return (
      <Badge color={colors[status] || 'gray'} size="sm">
        {status}
      </Badge>
    );
  };

  if (loading && !wallet) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Mon Wallet</Title>
            <Text c="dimmed" size="sm">
              Gérez votre solde et vos transactions
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setDepositModalOpen(true)}
            size="lg"
          >
            Recharger
          </Button>
        </Group>

        {/* Balance Cards */}
        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Solde total
              </Text>
              <Group align="baseline" gap="xs">
                <Text size="2rem" fw={700}>
                  {wallet?.balance.toFixed(2) || '0.00'}
                </Text>
                <Text size="lg" c="dimmed">
                  DT
                </Text>
              </Group>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group gap="xs">
                <IconLock size={16} color="orange" />
                <Text size="sm" c="dimmed">
                  Montant bloqué
                </Text>
              </Group>
              <Group align="baseline" gap="xs">
                <Text size="2rem" fw={700} c="orange">
                  {wallet?.heldAmount.toFixed(2) || '0.00'}
                </Text>
                <Text size="lg" c="dimmed">
                  DT
                </Text>
              </Group>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: '#e7f5ff' }}>
            <Stack gap="xs">
              <Text size="sm" c="blue" fw={500}>
                Disponible
              </Text>
              <Group align="baseline" gap="xs">
                <Text size="2rem" fw={700} c="blue">
                  {wallet?.availableAmount.toFixed(2) || '0.00'}
                </Text>
                <Text size="lg" c="dimmed">
                  DT
                </Text>
              </Group>
            </Stack>
          </Card>
        </Group>

        <Divider />

        {/* Transaction History */}
        <div>
          <Title order={2} size="1.5rem" mb="md">
            Historique des transactions
          </Title>

          {transactions.length === 0 ? (
            <Paper p="xl" withBorder>
              <Center>
                <Stack align="center" gap="xs">
                  <IconWallet size={48} color="gray" />
                  <Text c="dimmed">Aucune transaction pour le moment</Text>
                </Stack>
              </Center>
            </Paper>
          ) : (
            <Card shadow="sm" padding={0} radius="md" withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Montant</Table.Th>
                    <Table.Th>Solde après</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Date</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transactions.map((tx) => (
                    <Table.Tr key={tx.id}>
                      <Table.Td>
                        <Group gap="xs">
                          {getTransactionIcon(tx.type)}
                          <Badge color={getTransactionColor(tx.type)} variant="light">
                            {tx.type}
                          </Badge>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{tx.description}</Text>
                        {tx.ride && (
                          <Text size="xs" c="dimmed">
                            Course #{tx.ride.id.slice(0, 8)}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text
                          fw={600}
                          c={tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? 'green' : 'red'}
                        >
                          {tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? '+' : '-'}
                          {tx.amount.toFixed(2)} DT
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{tx.balanceAfter.toFixed(2)} DT</Text>
                      </Table.Td>
                      <Table.Td>{getStatusBadge(tx.status)}</Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {totalPages > 1 && (
                <Group justify="center" p="md">
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={totalPages}
                  />
                </Group>
              )}
            </Card>
          )}
        </div>
      </Stack>

      {/* Deposit Modal */}
      <Modal
        opened={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        title="Recharger le wallet"
        size="md"
      >
        <Stack gap="md">
          <NumberInput
            label="Montant"
            placeholder="Entrez le montant"
            value={depositAmount}
            onChange={setDepositAmount}
            min={5}
            max={10000}
            step={5}
            leftSection={<Text size="sm">DT</Text>}
            size="lg"
            required
          />

          <Select
            label="Méthode de paiement"
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value || 'CARD')}
            data={[
              { value: 'CARD', label: 'Carte bancaire' },
              { value: 'CASH', label: 'Espèces (en agence)' },
              { value: 'TRANSFER', label: 'Virement bancaire' },
            ]}
            size="lg"
          />

          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => setDepositModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleDeposit} loading={submitting} size="lg">
              Recharger {depositAmount} DT
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
