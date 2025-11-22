'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Card,
  Button,
  Badge,
  Progress,
  Alert,
  FileButton,
  Loader,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconFile,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconX,
} from '@tabler/icons-react';

interface KYCDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  verificationNotes?: string;
  uploadedAt: string;
}

interface KYCStatus {
  verificationStatus: string;
  progress: {
    total: number;
    uploaded: number;
    percentage: number;
  };
  missingDocuments: string[];
  documents: KYCDocument[];
  rejectionReason?: string;
}

const DOCUMENT_TYPES = [
  { value: 'CIN_FRONT', label: 'CIN (Recto)', required: true },
  { value: 'CIN_BACK', label: 'CIN (Verso)', required: true },
  { value: 'DRIVING_LICENSE', label: 'Permis de conduire', required: true },
  { value: 'VEHICLE_REGISTRATION', label: 'Carte grise du véhicule', required: true },
  { value: 'VEHICLE_PHOTO_FRONT', label: 'Photo véhicule (Avant)', required: true },
  { value: 'VEHICLE_PHOTO_BACK', label: 'Photo véhicule (Arrière)', required: false },
  { value: 'INSURANCE_CERTIFICATE', label: 'Certificat d\'assurance', required: false },
  { value: 'BUSINESS_LICENSE', label: 'Patente (optionnel)', required: false }
];

const STATUS_COLORS = {
  PENDING_DOCUMENTS: 'gray',
  PENDING_REVIEW: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  SUSPENDED: 'red'
};

const STATUS_LABELS = {
  PENDING_DOCUMENTS: 'Documents manquants',
  PENDING_REVIEW: 'En cours de vérification',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  SUSPENDED: 'Suspendu'
};

export default function DriverKYCPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      if (!token) {
        router.push('/driver/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setKycStatus(data);

        // Redirect to pending page if already submitted for review
        if (data.verificationStatus === 'PENDING_REVIEW') {
          router.push('/driver/pending');
          return;
        }

        // Redirect to dashboard if approved
        if (data.verificationStatus === 'APPROVED') {
          router.push('/driver/dashboard');
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger le statut KYC',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File | null, documentType: string) => {
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      notifications.show({
        title: 'Erreur',
        message: 'Le fichier est trop volumineux (10MB max)',
        color: 'red'
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      notifications.show({
        title: 'Erreur',
        message: 'Type de fichier non valide (JPG, PNG ou PDF uniquement)',
        color: 'red'
      });
      return;
    }

    setUploading(true);

    try {
      if (!token) {
        router.push('/driver/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        await fetchKYCStatus();
        notifications.show({
          title: 'Succès',
          message: 'Document téléchargé avec succès',
          color: 'green'
        });
      } else {
        const error = await res.json();
        notifications.show({
          title: 'Erreur',
          message: error.error || 'Erreur lors du téléchargement',
          color: 'red'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors du téléchargement',
        color: 'red'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        // Update state immediately by removing the document from the list
        if (kycStatus) {
          const deletedDoc = kycStatus.documents.find(doc => doc.id === docId);
          const updatedDocs = kycStatus.documents.filter(doc => doc.id !== docId);

          // Update missing documents list if it was a required document
          const requiredDocs = ['CIN_FRONT', 'CIN_BACK', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'VEHICLE_PHOTO_FRONT'];
          const updatedMissing = deletedDoc && requiredDocs.includes(deletedDoc.documentType)
            ? [...kycStatus.missingDocuments, deletedDoc.documentType]
            : kycStatus.missingDocuments;

          setKycStatus({
            ...kycStatus,
            documents: updatedDocs,
            missingDocuments: updatedMissing,
            progress: {
              total: kycStatus.progress.total,
              uploaded: updatedDocs.filter(d => requiredDocs.includes(d.documentType)).length,
              percentage: Math.round((updatedDocs.filter(d => requiredDocs.includes(d.documentType)).length / kycStatus.progress.total) * 100)
            }
          });
        }

        // Then fetch fresh data from server
        await fetchKYCStatus();

        notifications.show({
          title: 'Succès',
          message: 'Document supprimé. Vous pouvez maintenant en télécharger un nouveau.',
          color: 'green'
        });
      } else {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de supprimer le document',
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de la suppression',
        color: 'red'
      });
    }
  };

  const getDocumentStatus = (docType: string) => {
    return kycStatus?.documents.find(doc => doc.documentType === docType);
  };

  const handleSubmitForReview = async () => {
    try {
      if (!token) return;

      setSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Documents soumis pour vérification',
          color: 'green'
        });
        router.push('/driver/pending');
      } else {
        notifications.show({
          title: 'Erreur',
          message: data.error || 'Erreur lors de la soumission',
          color: 'red'
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de la soumission',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: 80 }}>
      <Container size="md" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Paper p="xl" radius="md" withBorder>
            <Title order={1} mb="md">Vérification KYC</Title>

            {kycStatus && (
              <Stack gap="md">
                <Badge
                  size="lg"
                  color={STATUS_COLORS[kycStatus.verificationStatus as keyof typeof STATUS_COLORS]}
                >
                  {STATUS_LABELS[kycStatus.verificationStatus as keyof typeof STATUS_LABELS]}
                </Badge>

                {/* Progress */}
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Progression</Text>
                    <Text size="sm" fw={600}>{kycStatus.progress.percentage}%</Text>
                  </Group>
                  <Progress value={kycStatus.progress.percentage} color="blue" size="lg" radius="xl" />
                  <Text size="xs" c="dimmed" mt="xs">
                    {kycStatus.progress.uploaded} / {kycStatus.progress.total} documents requis téléchargés
                  </Text>
                </div>

                {/* Rejection Reason */}
                {kycStatus.rejectionReason && (
                  <Alert icon={<IconAlertCircle size={16} />} title="Raison du rejet" color="red" variant="light">
                    {kycStatus.rejectionReason}
                  </Alert>
                )}
              </Stack>
            )}
          </Paper>

          {/* Instructions */}
          <Alert icon={<IconAlertCircle size={16} />} title="Instructions importantes" color="blue" variant="light">
            <Stack gap="xs">
              <Text size="sm">• Les documents doivent être clairs et lisibles</Text>
              <Text size="sm">• Format accepté: JPG, PNG ou PDF (10MB max)</Text>
              <Text size="sm">• Les documents requis sont obligatoires</Text>
              <Text size="sm">• La vérification prend 24-48 heures</Text>
            </Stack>
          </Alert>

          {/* Documents */}
          <Paper p="xl" radius="md" withBorder>
            <Title order={2} size="h3" mb="lg">Documents à fournir</Title>

            <Stack gap="md">
              {DOCUMENT_TYPES.map((docType) => {
                const existingDoc = getDocumentStatus(docType.value);
                const isMissing = kycStatus?.missingDocuments.includes(docType.value);

                return (
                  <Card
                    key={docType.value}
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{
                      borderColor: isMissing && docType.required ? '#fa5252' : undefined
                    }}
                  >
                    <Group justify="space-between" mb="md">
                      <div>
                        <Group gap="xs">
                          <Text fw={600}>{docType.label}</Text>
                          {docType.required && <Text c="red">*</Text>}
                        </Group>
                      </div>

                      {existingDoc && (
                        <Badge
                          color={
                            existingDoc.verificationStatus === 'APPROVED' ? 'green' :
                            existingDoc.verificationStatus === 'REJECTED' ? 'red' :
                            'yellow'
                          }
                          leftSection={
                            existingDoc.verificationStatus === 'APPROVED' ? <IconCheck size={14} /> :
                            existingDoc.verificationStatus === 'REJECTED' ? <IconX size={14} /> :
                            <IconAlertCircle size={14} />
                          }
                        >
                          {existingDoc.verificationStatus === 'APPROVED' ? 'Approuvé' :
                           existingDoc.verificationStatus === 'REJECTED' ? 'Rejeté' :
                           'En attente'}
                        </Badge>
                      )}
                    </Group>

                    {existingDoc ? (
                      <Stack gap="sm">
                        <Paper p="md" withBorder style={{ background: '#f8f9fa' }}>
                          <Group justify="space-between">
                            <Group gap="xs">
                              <IconFile size={20} />
                              <div>
                                <Text size="sm" fw={600}>{existingDoc.fileName}</Text>
                                <Text size="xs" c="dimmed">
                                  {existingDoc.uploadedAt
                                    ? new Date(existingDoc.uploadedAt).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })
                                    : 'Date inconnue'}
                                </Text>
                              </div>
                            </Group>
                            <Group gap="xs">
                              <Button
                                component="a"
                                href={`${process.env.NEXT_PUBLIC_API_URL}${existingDoc.fileUrl}`}
                                target="_blank"
                                variant="light"
                                size="xs"
                              >
                                Voir
                              </Button>
                              {kycStatus?.verificationStatus !== 'APPROVED' && (
                                <Button
                                  variant="light"
                                  color="red"
                                  size="xs"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => handleDeleteDocument(existingDoc.id)}
                                >
                                  Supprimer
                                </Button>
                              )}
                            </Group>
                          </Group>
                        </Paper>

                        {existingDoc.verificationNotes && (
                          <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
                            <Text size="sm">{existingDoc.verificationNotes}</Text>
                          </Alert>
                        )}

                        {existingDoc.verificationStatus === 'REJECTED' && (
                          <FileButton
                            onChange={(file) => handleFileUpload(file, docType.value)}
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            disabled={uploading}
                          >
                            {(props) => (
                              <Button
                                {...props}
                                leftSection={<IconUpload size={16} />}
                                variant="light"
                                disabled={uploading}
                              >
                                Remplacer le document
                              </Button>
                            )}
                          </FileButton>
                        )}
                      </Stack>
                    ) : (
                      <FileButton
                        onChange={(file) => handleFileUpload(file, docType.value)}
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        disabled={uploading || kycStatus?.verificationStatus === 'APPROVED'}
                      >
                        {(props) => (
                          <Button
                            {...props}
                            fullWidth
                            leftSection={<IconUpload size={16} />}
                            variant="light"
                            disabled={uploading || kycStatus?.verificationStatus === 'APPROVED'}
                          >
                            Télécharger {docType.label.toLowerCase()}
                          </Button>
                        )}
                      </FileButton>
                    )}
                  </Card>
                );
              })}
            </Stack>

            {uploading && (
              <Center mt="md">
                <Group gap="xs">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Téléchargement en cours...</Text>
                </Group>
              </Center>
            )}

            {/* Debug info */}
            <Alert color="blue" variant="light" mt="lg">
              <Text size="sm">
                <strong>Statut actuel:</strong> {kycStatus?.verificationStatus}
              </Text>
              <Text size="sm">
                <strong>Documents manquants:</strong> {kycStatus?.missingDocuments.length || 0}
              </Text>
              <Text size="sm">
                <strong>Documents requis:</strong> {kycStatus?.missingDocuments.join(', ') || 'Aucun'}
              </Text>
            </Alert>

            {kycStatus?.verificationStatus === 'PENDING_REVIEW' && (
              <Alert icon={<IconCheck size={16} />} title="Documents complets" color="green" variant="light" mt="lg">
                Tous les documents requis ont été téléchargés. Votre dossier est en cours de vérification.
              </Alert>
            )}

            {/* Show submit button for PENDING_DOCUMENTS or REJECTED when all docs uploaded */}
            {(kycStatus?.verificationStatus === 'PENDING_DOCUMENTS' ||
              kycStatus?.verificationStatus === 'REJECTED') &&
             kycStatus?.missingDocuments.length === 0 && (
              <Button
                fullWidth
                size="lg"
                mt="lg"
                onClick={handleSubmitForReview}
                loading={submitting}
                leftSection={<IconCheck size={20} />}
              >
                Soumettre pour vérification
              </Button>
            )}
          </Paper>
        </Stack>
      </Container>
    </div>
  );
}
