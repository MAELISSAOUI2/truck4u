'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehiclePlate?: string;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  kycDocuments: KYCDocument[];
}

interface KYCDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
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
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [viewingDocument, setViewingDocument] = useState<KYCDocument | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, [activeTab]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = activeTab === 'pending'
        ? '/api/admin/kyc/pending'
        : '/api/admin/drivers?status=PENDING_REVIEW';

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
        alert('Conducteur approuvé avec succès');
        setSelectedDriver(null);
        setApprovalNotes('');
        fetchDrivers();
      }
    } catch (error) {
      console.error('Failed to approve driver:', error);
      alert('Erreur lors de l\'approbation');
    }
  };

  const handleRejectDriver = async () => {
    if (!selectedDriver || !rejectReason.trim()) {
      alert('Veuillez fournir une raison pour le rejet');
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
        alert('Conducteur rejeté');
        setSelectedDriver(null);
        setRejectReason('');
        fetchDrivers();
      }
    } catch (error) {
      console.error('Failed to reject driver:', error);
      alert('Erreur lors du rejet');
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
        alert(`Document ${status === 'APPROVED' ? 'approuvé' : 'rejeté'}`);
        if (selectedDriver) {
          fetchDriverDetails(selectedDriver.id);
        }
      }
    } catch (error) {
      console.error('Failed to verify document:', error);
      alert('Erreur lors de la vérification');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vérification KYC</h1>
        <p className="text-gray-600">Gérer les demandes de vérification des conducteurs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          En attente ({drivers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tous
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drivers List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <h2 className="font-semibold mb-4">Conducteurs</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun conducteur</div>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => fetchDriverDetails(driver.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedDriver?.id === driver.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="font-medium">{driver.name}</div>
                  <div className="text-sm text-gray-600">{driver.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {driver.kycDocuments.length} documents
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Driver Details */}
        <div className="lg:col-span-2">
          {!selectedDriver ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              Sélectionnez un conducteur pour voir les détails
            </div>
          ) : (
            <div className="space-y-6">
              {/* Driver Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Informations du conducteur</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nom:</span>
                    <p className="font-medium">{selectedDriver.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Téléphone:</span>
                    <p className="font-medium">{selectedDriver.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedDriver.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type de véhicule:</span>
                    <p className="font-medium">{selectedDriver.vehicleType}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Plaque:</span>
                    <p className="font-medium">{selectedDriver.vehiclePlate || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Inscrit le:</span>
                    <p className="font-medium">
                      {new Date(selectedDriver.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Documents</h2>

                {selectedDriver.kycDocuments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Aucun document téléchargé</p>
                ) : (
                  <div className="space-y-4">
                    {selectedDriver.kycDocuments.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium">{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</h3>
                            <p className="text-sm text-gray-600">{doc.fileName}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            doc.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            doc.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.verificationStatus === 'APPROVED' ? 'Approuvé' :
                             doc.verificationStatus === 'REJECTED' ? 'Rejeté' :
                             'En attente'}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}${doc.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Voir le document
                          </a>

                          {doc.verificationStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'APPROVED')}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => {
                                  const notes = prompt('Raison du rejet (optionnel):');
                                  handleVerifyDocument(doc.id, 'REJECTED', notes || undefined);
                                }}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                        </div>

                        {doc.verificationNotes && (
                          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2">
                            <p className="text-xs text-yellow-900">Note: {doc.verificationNotes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Actions</h2>

                <div className="space-y-4">
                  {/* Approve */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Notes d'approbation (optionnel)</label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Ajouter des notes..."
                    />
                    <button
                      onClick={handleApproveDriver}
                      className="mt-2 w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
                    >
                      Approuver le conducteur
                    </button>
                  </div>

                  {/* Reject */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Raison du rejet *</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Expliquez la raison du rejet..."
                    />
                    <button
                      onClick={handleRejectDriver}
                      className="mt-2 w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700"
                    >
                      Rejeter le conducteur
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
