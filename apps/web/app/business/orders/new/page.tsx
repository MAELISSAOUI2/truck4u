'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Stack,
  Title,
  Text,
  TextInput,
  Select,
  Textarea,
  Checkbox,
  NumberInput,
  Button,
  Group,
  Card,
  Stepper,
  rem,
  Alert,
} from '@mantine/core';
import {
  IconUser,
  IconPackage,
  IconCoin,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const CARGO_TYPES = [
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'PETIT_COLIS', label: 'Petit colis' },
  { value: 'MOYEN_COLIS', label: 'Moyen colis' },
  { value: 'GROS_COLIS', label: 'Gros colis' },
  { value: 'PALETTE', label: 'Palette' },
  { value: 'MOBILIER', label: 'Mobilier' },
  { value: 'ELECTROMENAGER', label: 'Électroménager' },
  { value: 'ALIMENTAIRE', label: 'Alimentaire' },
];

const GOUVERNORATS = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
  'Nabeul', 'Zaghouan', 'Bizerte', 'Béja',
];

export default function NewBusinessOrderPage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // Recipient
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientGouvernorat, setRecipientGouvernorat] = useState<string | null>(null);
  const [recipientDelegation, setRecipientDelegation] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientNotes, setRecipientNotes] = useState('');

  // Cargo
  const [cargoType, setCargoType] = useState<string | null>(null);
  const [cargoDescription, setCargoDescription] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState<number | string>('');

  // COD
  const [hasCOD, setHasCOD] = useState(false);
  const [codAmount, setCodAmount] = useState<number | string>('');

  const handleStep1Submit = () => {
    if (!recipientName || !recipientPhone || !recipientGouvernorat || !recipientDelegation || !recipientAddress) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs destinataire',
        color: 'red',
      });
      return;
    }

    if (!recipientPhone.startsWith('+216')) {
      notifications.show({
        title: 'Erreur',
        message: 'Le numéro doit commencer par +216',
        color: 'red',
      });
      return;
    }

    setActive(1);
  };

  const handleStep2Submit = () => {
    if (!cargoType) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner le type de colis',
        color: 'red',
      });
      return;
    }

    setActive(2);
  };

  const handleCreateDraft = async () => {
    await createOrder(false);
  };

  const handleCreateAndSubmit = async () => {
    await createOrder(true);
  };

  const createOrder = async (submit: boolean) => {
    const token = localStorage.getItem('businessToken');

    if (!token) {
      router.push('/business/register');
      return;
    }

    if (hasCOD && !codAmount) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer le montant COD',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      // Create order
      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientName,
          recipientPhone,
          recipientGouvernorat,
          recipientDelegation,
          recipientAddress,
          recipientNotes,
          cargoType,
          cargoDescription,
          estimatedWeight: estimatedWeight ? Number(estimatedWeight) : undefined,
          hasCOD,
          codAmount: hasCOD ? Number(codAmount) : undefined,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        notifications.show({
          title: 'Erreur',
          message: createData.error || 'Erreur lors de la création',
          color: 'red',
        });
        return;
      }

      const orderId = createData.order.id;

      // If submit, call submit endpoint
      if (submit) {
        const submitResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/business/orders/${orderId}/submit`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (submitResponse.ok) {
          notifications.show({
            title: 'Succès',
            message: 'Commande créée et soumise pour recherche de livreur !',
            color: 'green',
          });
          router.push(`/business/orders/${orderId}`);
        } else {
          notifications.show({
            title: 'Avertissement',
            message: 'Commande créée mais erreur lors de la soumission',
            color: 'yellow',
          });
          router.push(`/business/orders/${orderId}`);
        }
      } else {
        notifications.show({
          title: 'Succès',
          message: 'Brouillon de commande créé',
          color: 'green',
        });
        router.push('/business/orders');
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur de connexion',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Card shadow="md" p="xl" radius="md">
        <Stack gap="xl">
          <div>
            <Title order={2}>Nouvelle Commande</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Créez une nouvelle demande de livraison
            </Text>
          </div>

          <Stepper active={active} onStepClick={setActive} size="sm">
            {/* Step 1: Destinataire */}
            <Stepper.Step
              label="Destinataire"
              description="Informations de livraison"
              icon={<IconUser style={{ width: rem(18), height: rem(18) }} />}
            >
              <Stack gap="md" mt="xl">
                <TextInput
                  label="Nom du destinataire"
                  placeholder="Ahmed Ben Salah"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.currentTarget.value)}
                  required
                />

                <TextInput
                  label="Téléphone"
                  placeholder="+21698123456"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.currentTarget.value)}
                  required
                />

                <Group grow>
                  <Select
                    label="Gouvernorat"
                    placeholder="Sélectionnez"
                    data={GOUVERNORATS}
                    value={recipientGouvernorat}
                    onChange={setRecipientGouvernorat}
                    required
                  />

                  <TextInput
                    label="Délégation"
                    placeholder="Ex: Carthage"
                    value={recipientDelegation}
                    onChange={(e) => setRecipientDelegation(e.currentTarget.value)}
                    required
                  />
                </Group>

                <Textarea
                  label="Adresse complète"
                  placeholder="15 Avenue Habib Bourguiba, près de..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.currentTarget.value)}
                  required
                  rows={3}
                />

                <Textarea
                  label="Notes (optionnel)"
                  placeholder="Instructions spéciales, code porte, etc."
                  value={recipientNotes}
                  onChange={(e) => setRecipientNotes(e.currentTarget.value)}
                  rows={2}
                />

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleStep1Submit}>Suivant</Button>
                </Group>
              </Stack>
            </Stepper.Step>

            {/* Step 2: Colis */}
            <Stepper.Step
              label="Colis"
              description="Type et poids"
              icon={<IconPackage style={{ width: rem(18), height: rem(18) }} />}
            >
              <Stack gap="md" mt="xl">
                <Select
                  label="Type de colis"
                  placeholder="Sélectionnez"
                  data={CARGO_TYPES}
                  value={cargoType}
                  onChange={setCargoType}
                  required
                />

                <TextInput
                  label="Poids estimé (kg)"
                  placeholder="Ex: 5"
                  type="number"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(e.currentTarget.value)}
                />

                <Textarea
                  label="Description (optionnel)"
                  placeholder="Décrivez le contenu du colis"
                  value={cargoDescription}
                  onChange={(e) => setCargoDescription(e.currentTarget.value)}
                  rows={3}
                />

                <Group justify="space-between" mt="md">
                  <Button variant="default" onClick={() => setActive(0)}>
                    Retour
                  </Button>
                  <Button onClick={handleStep2Submit}>Suivant</Button>
                </Group>
              </Stack>
            </Stepper.Step>

            {/* Step 3: COD */}
            <Stepper.Step
              label="Paiement"
              description="COD (optionnel)"
              icon={<IconCoin style={{ width: rem(18), height: rem(18) }} />}
            >
              <Stack gap="md" mt="xl">
                <Checkbox
                  label="Cette livraison nécessite un paiement à la livraison (COD)"
                  checked={hasCOD}
                  onChange={(e) => setHasCOD(e.currentTarget.checked)}
                />

                {hasCOD && (
                  <>
                    <NumberInput
                      label="Montant à collecter"
                      placeholder="Ex: 150"
                      value={codAmount}
                      onChange={setCodAmount}
                      required
                      min={0}
                      decimalScale={2}
                      suffix=" DT"
                    />

                    <Alert icon={<IconAlertCircle size={16} />} title="Info COD" color="blue">
                      Le montant sera collecté par le livreur et reversé selon votre méthode de payout configurée
                    </Alert>
                  </>
                )}

                <Group justify="space-between" mt="xl">
                  <Button variant="default" onClick={() => setActive(1)}>
                    Retour
                  </Button>
                  <Group>
                    <Button
                      variant="outline"
                      onClick={handleCreateDraft}
                      loading={loading}
                    >
                      Sauvegarder brouillon
                    </Button>
                    <Button
                      onClick={handleCreateAndSubmit}
                      loading={loading}
                    >
                      Créer et soumettre
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Stack gap="md" mt="xl" align="center">
                <IconCheck size={48} color="green" />
                <Title order={3}>Commande créée !</Title>
                <Text c="dimmed">Recherche de livreur en cours...</Text>
              </Stack>
            </Stepper.Completed>
          </Stepper>
        </Stack>
      </Card>
    </Container>
  );
}
