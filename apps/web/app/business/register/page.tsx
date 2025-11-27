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
  Button,
  Card,
  Group,
  Stepper,
  rem,
  Paper,
  Alert,
} from '@mantine/core';
import {
  IconBuilding,
  IconPhone,
  IconMapPin,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const BUSINESS_TYPES = [
  { value: 'LOCAL_SHOP', label: 'Commerce de proximité' },
  { value: 'SOCIAL_SELLER', label: 'Vendeur en ligne (Facebook/Instagram)' },
  { value: 'SME', label: 'PME locale' },
  { value: 'RESTAURANT', label: 'Restaurant / Traiteur' },
];

const GOUVERNORATS = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
  'Nabeul', 'Zaghouan', 'Bizerte', 'Béja',
  'Jendouba', 'Kef', 'Siliana', 'Kairouan',
  'Kasserine', 'Sidi Bouzid', 'Sousse', 'Monastir',
  'Mahdia', 'Sfax', 'Gafsa', 'Tozeur',
  'Kebili', 'Gabès', 'Medenine', 'Tataouine'
];

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [ownerFirstName, setOwnerFirstName] = useState('');

  // Step 2: Contact
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // Step 3: Location
  const [gouvernorat, setGouvernorat] = useState<string | null>(null);
  const [delegation, setDelegation] = useState('');
  const [addressLine, setAddressLine] = useState('');

  const handleStep1Submit = async () => {
    if (!businessName || !businessType || !ownerFirstName) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs',
        color: 'red',
      });
      return;
    }

    setActive(1);
  };

  const handleStep2Submit = async () => {
    if (!phone) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer votre numéro de téléphone',
        color: 'red',
      });
      return;
    }

    if (!phone.startsWith('+216')) {
      notifications.show({
        title: 'Erreur',
        message: 'Le numéro doit commencer par +216',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessType,
          ownerFirstName,
          phone,
          gouvernorat: gouvernorat || '',
          delegation: delegation || '',
          addressLine: addressLine || '',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Code de vérification envoyé par SMS',
          color: 'green',
        });
        setActive(2);
      } else {
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Une erreur est survenue',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de contacter le serveur',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer le code de vérification',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token
        localStorage.setItem('businessToken', data.token);

        notifications.show({
          title: 'Bienvenue !',
          message: 'Votre compte business a été créé avec succès',
          color: 'green',
        });

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/business/dashboard');
        }, 1000);
      } else {
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Code de vérification incorrect',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de contacter le serveur',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Paper shadow="md" p="xl" radius="md">
        <Stack gap="xl">
          <div>
            <Title order={2}>Inscription Business</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Créez votre compte en 3 étapes simples (2 minutes)
            </Text>
          </div>

          <Stepper active={active} onStepClick={setActive} size="sm">
            {/* Step 1: Business Info */}
            <Stepper.Step
              label="Informations"
              description="Votre commerce"
              icon={<IconBuilding style={{ width: rem(18), height: rem(18) }} />}
            >
              <Stack gap="md" mt="xl">
                <TextInput
                  label="Nom du commerce"
                  placeholder="Épicerie du Coin"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.currentTarget.value)}
                  required
                  leftSection={<IconBuilding size={16} />}
                />

                <Select
                  label="Type de commerce"
                  placeholder="Sélectionnez"
                  data={BUSINESS_TYPES}
                  value={businessType}
                  onChange={setBusinessType}
                  required
                />

                <TextInput
                  label="Votre prénom"
                  placeholder="Mohamed"
                  value={ownerFirstName}
                  onChange={(e) => setOwnerFirstName(e.currentTarget.value)}
                  required
                />

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleStep1Submit}>
                    Suivant
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            {/* Step 2: Contact */}
            <Stepper.Step
              label="Contact"
              description="Téléphone"
              icon={<IconPhone style={{ width: rem(18), height: rem(18) }} />}
            >
              <Stack gap="md" mt="xl">
                <TextInput
                  label="Numéro de téléphone"
                  placeholder="+21698765432"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  required
                  leftSection={<IconPhone size={16} />}
                  description="Format: +216XXXXXXXX"
                />

                <Alert icon={<IconAlertCircle size={16} />} title="Info" color="blue">
                  Un code de vérification sera envoyé à ce numéro par SMS
                </Alert>

                <Group justify="space-between" mt="md">
                  <Button variant="default" onClick={() => setActive(0)}>
                    Retour
                  </Button>
                  <Button onClick={handleStep2Submit} loading={loading}>
                    Envoyer code SMS
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            {/* Step 3: Verification */}
            <Stepper.Step
              label="Vérification"
              description="Code SMS"
              icon={<IconCheck style={{ width: rem(18), height: rem(18) }} />}
            >
              <Stack gap="md" mt="xl">
                <Alert icon={<IconAlertCircle size={16} />} title="Code envoyé" color="green">
                  Un code à 6 chiffres a été envoyé au {phone}
                </Alert>

                <TextInput
                  label="Code de vérification"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.currentTarget.value)}
                  required
                  maxLength={6}
                  description="Pour test: utilisez le code 123456"
                />

                <Group justify="space-between" mt="md">
                  <Button variant="default" onClick={() => setActive(1)}>
                    Retour
                  </Button>
                  <Button onClick={handleVerifyCode} loading={loading}>
                    Vérifier et terminer
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Stack gap="md" mt="xl" align="center">
                <IconCheck size={48} color="green" />
                <Title order={3}>Compte créé avec succès !</Title>
                <Text c="dimmed">Redirection vers votre tableau de bord...</Text>
              </Stack>
            </Stepper.Completed>
          </Stepper>

          <Text size="xs" c="dimmed" ta="center" mt="xl">
            En vous inscrivant, vous acceptez nos conditions d'utilisation
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}
