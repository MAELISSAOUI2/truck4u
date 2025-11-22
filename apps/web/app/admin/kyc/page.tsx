'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Card,
  Button,
  Textarea,
  Badge,
  Tabs,
  Loader,
  Center,
  SimpleGrid,
  Modal,
  Image,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCheck,
  IconX,
  IconFileText,
  IconUser,
  IconTruck,
  IconPhone,
  IconMail,
  IconChevronRight,
} from '@tabler/icons-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehiclePlate?: string;
  verificationStatus: string;
  createdAt: string;
  kycDocuments: KYCDocument[];
}

interface KYCDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: string;
  verificationNotes?: string;
  uploadedAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CIN_FRONT: 'CIN (Recto)',
  CIN_BACK: 'CIN (Verso)',
  DRIVING_LICENSE: 'Permis de conduire',
  VEHICLE_REGISTRATION: 'Carte grise',
  BUSINESS_LICENSE: 'Patente',
  VEHICLE_PHOTO_FRONT: 'Photo véhicule (Avant)',
  VEHICLE_PHOTO_BACK: 'Photo véhicule (Arrière)',
  VEHICLE_PHOTO_LEFT: 'Photo véhicule (Gauche)',
  VEHICLE_PHOTO_RIGHT: 'Photo véhicule (Droite)',
  VEHICLE_PHOTO_INTERIOR: 'Photo véhicule (Intérieur)',
  INSURANCE_CERTIFICATE: 'Assurance',
  TECHNICAL_INSPECTION: 'Contrôle technique'
};

export default function AdminKYCPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [viewingDoc, setViewingDoc] = useState<KYCDocument | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  useEffect(() => {
    fetchDrivers();
  }, [activeTab]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = '/api/admin/kyc/pending';

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les conducteurs',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverDetails = async (driverId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/kyc/driver/${driverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSelectedDriver(data.driver);
      }
    } catch (error) {
      console.error('Failed to fetch driver details:', error);
    }
  };

  const handleApproveDriver = async () => {
    if (!selectedDriver) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/kyc/driver/${selectedDriver.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notes: approvalNotes })
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Conducteur approuvé avec succès',
          color: 'green'
        });
        setSelectedDriver(null);
        setApprovalNotes('');
        fetchDrivers();
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de l\'approbation',
        color: 'red'
      });
    }
  };

  const handleRejectDriver = async () => {
    if (!selectedDriver || !rejectReason.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez fournir une raison pour le rejet',
        color: 'red'
      });
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/kyc/driver/${selectedDriver.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason: rejectReason })
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Rejeté',
          message: 'Conducteur rejeté',
          color: 'orange'
        });
        setSelectedDriver(null);
        setRejectReason('');
        fetchDrivers();
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors du rejet',
        color: 'red'
      });
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/kyc/document/${docId}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status, notes })
        }
      );

      if (res.ok) {
        notifications.show({
          title: 'Succès',
          message: `Document ${status === 'APPROVED' ? 'approuvé' : 'rejeté'}`,
          color: status === 'APPROVED' ? 'green' : 'orange'
        });
        if (selectedDriver) {
          fetchDriverDetails(selectedDriver.id);
        }
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de la vérification',
        color: 'red'
      });
    }
  };

  const openDocumentModal = (doc: KYCDocument) => {
    setViewingDoc(doc);
    openModal();
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '70vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">Vérification KYC</Title>
          <Text c="dimmed">Gérer les demandes de vérification des conducteurs</Text>
        </div>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'pending')}>
          <Tabs.List>
            <Tabs.Tab value="pending">
              En attente ({drivers.length})
            </Tabs.Tab>
            <Tabs.Tab value="all">
              Tous
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          {/* Drivers List */}
          <div>
            <Title order={3} size="h5" mb="md">Conducteurs</Title>

            {drivers.length === 0 ? (
              <Paper p="xl" radius="md" withBorder>
                <Center>
                  <Text c="dimmed">Aucun conducteur en attente</Text>
                </Center>
              </Paper>
            ) : (
              <Stack gap="sm">
                {drivers.map((driver) => (
                  <Card
                    key={driver.id}
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      border: selectedDriver?.id === driver.id ? '2px solid #228be6' : undefined
                    }}
                    onClick={() => fetchDriverDetails(driver.id)}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text fw={600} mb={4}>{driver.name}</Text>
                        <Text size="sm" c="dimmed">{driver.phone}</Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {driver.kycDocuments.length} documents
                        </Text>
                      </div>
                      <IconChevronRight size={20} color="#adb5bd" />
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </div>

          {/* Driver Details */}
          <div style={{ gridColumn: 'span 2' }}>
            {!selectedDriver ? (
              <Paper p="xl" radius="md" withBorder>
                <Center style={{ minHeight: 300 }}>
                  <Stack gap="xs" align="center">
                    <IconUser size={48} color="#adb5bd" />
                    <Text c="dimmed">Sélectionnez un conducteur</Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Stack gap="lg">
                {/* Driver Info */}
                <Paper p="lg" radius="md" withBorder>
                  <Title order={3} size="h5" mb="md">Informations du conducteur</Title>
                  <SimpleGrid cols={2} spacing="md">
                    <div>
                      <Text size="xs" c="dimmed" mb={4}>Nom</Text>
                      <Group gap="xs">
                        <IconUser size={16} />
                        <Text fw={600}>{selectedDriver.name}</Text>
                      </Group>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" mb={4}>Téléphone</Text>
                      <Group gap="xs">
                        <IconPhone size={16} />
                        <Text fw={600}>{selectedDriver.phone}</Text>
                      </Group>
                    </div>
                    {selectedDriver.email && (
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>Email</Text>
                        <Group gap="xs">
                          <IconMail size={16} />
                          <Text fw={600}>{selectedDriver.email}</Text>
                        </Group>
                      </div>
                    )}
                    <div>
                      <Text size="xs" c="dimmed" mb={4}>Véhicule</Text>
                      <Group gap="xs">
                        <IconTruck size={16} />
                        <Text fw={600}>{selectedDriver.vehicleType}</Text>
                      </Group>
                    </div>
                  </SimpleGrid>
                </Paper>

                {/* Documents */}
                <Paper p="lg" radius="md" withBorder>
                  <Title order={3} size="h5" mb="md">Documents</Title>

                  {selectedDriver.kycDocuments.length === 0 ? (
                    <Center py="xl">
                      <Text c="dimmed">Aucun document téléchargé</Text>
                    </Center>
                  ) : (
                    <Stack gap="md">
                      {selectedDriver.kycDocuments.map((doc) => (
                        <Card key={doc.id} padding="md" radius="md" withBorder>
                          <Group justify="space-between" mb="sm">
                            <div>
                              <Text fw={600} mb={4}>
                                {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                              </Text>
                              <Text size="sm" c="dimmed">{doc.fileName}</Text>
                            </div>
                            <Badge
                              color={
                                doc.verificationStatus === 'APPROVED' ? 'green' :
                                doc.verificationStatus === 'REJECTED' ? 'red' :
                                'yellow'
                              }
                            >
                              {doc.verificationStatus === 'APPROVED' ? 'Approuvé' :
                               doc.verificationStatus === 'REJECTED' ? 'Rejeté' :
                               'En attente'}
                            </Badge>
                          </Group>

                          <Group gap="xs">
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconFileText size={16} />}
                              onClick={() => openDocumentModal(doc)}
                            >
                              Voir
                            </Button>

                            {doc.verificationStatus === 'PENDING' && (
                              <>
                                <Button
                                  size="xs"
                                  color="green"
                                  leftSection={<IconCheck size={16} />}
                                  onClick={() => handleVerifyDocument(doc.id, 'APPROVED')}
                                >
                                  Approuver
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  leftSection={<IconX size={16} />}
                                  onClick={() => {
                                    const notes = prompt('Raison du rejet (optionnel):');
                                    handleVerifyDocument(doc.id, 'REJECTED', notes || undefined);
                                  }}
                                >
                                  Rejeter
                                </Button>
                              </>
                            )}
                          </Group>

                          {doc.verificationNotes && (
                            <Text size="sm" c="dimmed" mt="sm" p="xs" style={{ background: '#f8f9fa', borderRadius: 4 }}>
                              Note: {doc.verificationNotes}
                            </Text>
                          )}
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Paper>

                {/* Actions */}
                <Paper p="lg" radius="md" withBorder>
                  <Title order={3} size="h5" mb="md">Actions</Title>

                  <Stack gap="md">
                    <Textarea
                      label="Notes d'approbation (optionnel)"
                      placeholder="Ajouter des notes..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      minRows={2}
                    />
                    <Button
                      fullWidth
                      color="green"
                      leftSection={<IconCheck size={20} />}
                      onClick={handleApproveDriver}
                    >
                      Approuver le conducteur
                    </Button>

                    <Textarea
                      label="Raison du rejet *"
                      placeholder="Expliquez la raison du rejet..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      minRows={3}
                      required
                    />
                    <Button
                      fullWidth
                      color="red"
                      leftSection={<IconX size={20} />}
                      onClick={handleRejectDriver}
                    >
                      Rejeter le conducteur
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            )}
          </div>
        </SimpleGrid>

        {/* Document Viewer Modal */}
        <Modal
          opened={modalOpened}
          onClose={closeModal}
          title={viewingDoc ? DOC_TYPE_LABELS[viewingDoc.documentType] : 'Document'}
          size="lg"
        >
          {viewingDoc && (
            <div>
              <Image
                src={`${process.env.NEXT_PUBLIC_API_URL}${viewingDoc.fileUrl}`}
                alt={viewingDoc.fileName}
                fit="contain"
              />
              <Text size="sm" c="dimmed" mt="md">
                {viewingDoc.fileName}
              </Text>
            </div>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}
