'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  PasswordInput,
  Stepper,
  Select,
  Textarea,
  Card,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBuilding, IconUser, IconMapPin, IconCheck, IconAlertCircle } from '@tabler/icons-react';

export default function BusinessRegisterPage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Company Info
    companyName: '',
    tradeName: '',
    taxId: '',
    businessLicense: '',
    sector: '',

    // Step 2: Contact Info
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // Step 3: Address
    street: '',
    city: '',
    postalCode: '',
    region: '',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    // Basic validation for current step
    if (active === 0) {
      if (!formData.companyName || !formData.taxId) {
        notifications.show({
          title: 'Erreur',
          message: 'Veuillez remplir tous les champs obligatoires',
          color: 'red',
        });
        return;
      }
    } else if (active === 1) {
      if (!formData.contactName || !formData.contactPhone || !formData.email || !formData.phone || !formData.password) {
        notifications.show({
          title: 'Erreur',
          message: 'Veuillez remplir tous les champs obligatoires',
          color: 'red',
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        notifications.show({
          title: 'Erreur',
          message: 'Les mots de passe ne correspondent pas',
          color: 'red',
        });
        return;
      }
    }
    setActive((current) => (current < 2 ? current + 1 : current));
  };

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = async () => {
    // Validate address
    if (!formData.street || !formData.city) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir l\'adresse complète',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          companyName: formData.companyName,
          tradeName: formData.tradeName || null,
          taxId: formData.taxId,
          businessLicense: formData.businessLicense || null,
          sector: formData.sector || null,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail || formData.email,
          address: {
            street: formData.street,
            city: formData.city,
            postalCode: formData.postalCode || '',
            region: formData.region || '',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

      // Store token
      localStorage.setItem('businessToken', data.token);

      notifications.show({
        title: 'Succès',
        message: 'Compte entreprise créé avec succès',
        color: 'green',
      });

      // Redirect to dashboard
      router.push('/business/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'inscription',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py={60}>
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="lg">
          <div>
            <Title order={2} ta="center">Créer un compte entreprise</Title>
            <Text c="dimmed" size="sm" ta="center" mt="xs">
              Gérez vos transports professionnels facilement
            </Text>
          </div>

          <Stepper active={active} onStepClick={setActive} breakpoint="sm">
            <Stepper.Step
              label="Entreprise"
              description="Informations société"
              icon={<IconBuilding size={18} />}
            >
              <Stack gap="md" mt="xl">
                <TextInput
                  label="Nom de l'entreprise"
                  placeholder="Ex: Transport Express SARL"
                  required
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                />
                <TextInput
                  label="Nom commercial (optionnel)"
                  placeholder="Si différent du nom légal"
                  value={formData.tradeName}
                  onChange={(e) => updateFormData('tradeName', e.target.value)}
                />
                <TextInput
                  label="Matricule fiscale"
                  placeholder="Ex: 1234567/A/M/000"
                  required
                  value={formData.taxId}
                  onChange={(e) => updateFormData('taxId', e.target.value)}
                />
                <TextInput
                  label="Registre de commerce (optionnel)"
                  placeholder="Numéro RC"
                  value={formData.businessLicense}
                  onChange={(e) => updateFormData('businessLicense', e.target.value)}
                />
                <Select
                  label="Secteur d'activité (optionnel)"
                  placeholder="Sélectionnez un secteur"
                  value={formData.sector}
                  onChange={(value) => updateFormData('sector', value || '')}
                  data={[
                    { value: 'commerce', label: 'Commerce' },
                    { value: 'construction', label: 'Construction' },
                    { value: 'industrie', label: 'Industrie' },
                    { value: 'services', label: 'Services' },
                    { value: 'alimentaire', label: 'Alimentaire' },
                    { value: 'autre', label: 'Autre' },
                  ]}
                />
              </Stack>
            </Stepper.Step>

            <Stepper.Step
              label="Contact"
              description="Coordonnées et accès"
              icon={<IconUser size={18} />}
            >
              <Stack gap="md" mt="xl">
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  Ces informations seront utilisées pour vous contacter
                </Alert>
                <TextInput
                  label="Nom du responsable"
                  placeholder="Prénom et nom"
                  required
                  value={formData.contactName}
                  onChange={(e) => updateFormData('contactName', e.target.value)}
                />
                <TextInput
                  label="Téléphone du responsable"
                  placeholder="Ex: +216 20 123 456"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData('contactPhone', e.target.value)}
                />
                <TextInput
                  label="Email du responsable"
                  placeholder="email@entreprise.tn"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => updateFormData('contactEmail', e.target.value)}
                />
                <TextInput
                  label="Email de connexion"
                  placeholder="Pour se connecter à la plateforme"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                />
                <TextInput
                  label="Téléphone de l'entreprise"
                  placeholder="Ligne principale"
                  required
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                />
                <PasswordInput
                  label="Mot de passe"
                  placeholder="Minimum 8 caractères"
                  required
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                />
                <PasswordInput
                  label="Confirmer le mot de passe"
                  placeholder="Ressaisissez le mot de passe"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                />
              </Stack>
            </Stepper.Step>

            <Stepper.Step
              label="Adresse"
              description="Localisation entreprise"
              icon={<IconMapPin size={18} />}
            >
              <Stack gap="md" mt="xl">
                <Textarea
                  label="Adresse complète"
                  placeholder="Rue, numéro, bâtiment..."
                  required
                  rows={3}
                  value={formData.street}
                  onChange={(e) => updateFormData('street', e.target.value)}
                />
                <Group grow>
                  <TextInput
                    label="Ville"
                    placeholder="Ex: Tunis"
                    required
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                  />
                  <TextInput
                    label="Code postal"
                    placeholder="Ex: 1000"
                    value={formData.postalCode}
                    onChange={(e) => updateFormData('postalCode', e.target.value)}
                  />
                </Group>
                <Select
                  label="Région"
                  placeholder="Sélectionnez une région"
                  value={formData.region}
                  onChange={(value) => updateFormData('region', value || '')}
                  data={[
                    { value: 'tunis', label: 'Tunis' },
                    { value: 'ariana', label: 'Ariana' },
                    { value: 'ben-arous', label: 'Ben Arous' },
                    { value: 'manouba', label: 'Manouba' },
                    { value: 'sousse', label: 'Sousse' },
                    { value: 'sfax', label: 'Sfax' },
                    { value: 'autre', label: 'Autre' },
                  ]}
                />
                <Alert icon={<IconCheck size={16} />} color="green">
                  Vos documents KYC seront vérifiés par notre équipe sous 24-48h
                </Alert>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Stack gap="md" mt="xl">
                <Alert icon={<IconCheck size={16} />} color="green" title="Tout est prêt!">
                  Vous êtes sur le point de créer votre compte entreprise Truck4u
                </Alert>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  loading={loading}
                  fullWidth
                >
                  Créer mon compte
                </Button>
              </Stack>
            </Stepper.Completed>
          </Stepper>

          <Group justify="space-between" mt="xl">
            <Button variant="default" onClick={prevStep} disabled={active === 0}>
              Précédent
            </Button>
            {active < 3 && (
              <Button onClick={nextStep}>
                Suivant
              </Button>
            )}
          </Group>

          <Text c="dimmed" size="sm" ta="center">
            Vous avez déjà un compte?{' '}
            <Text
              component="a"
              href="/business/login"
              c="blue"
              style={{ cursor: 'pointer' }}
            >
              Se connecter
            </Text>
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
