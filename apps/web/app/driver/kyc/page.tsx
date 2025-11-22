'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  { value: 'VEHICLE_PHOTO_LEFT', label: 'Photo véhicule (Gauche)', required: false },
  { value: 'VEHICLE_PHOTO_RIGHT', label: 'Photo véhicule (Droite)', required: false },
  { value: 'VEHICLE_PHOTO_INTERIOR', label: 'Photo véhicule (Intérieur)', required: false },
  { value: 'INSURANCE_CERTIFICATE', label: 'Certificat d\'assurance', required: false },
  { value: 'TECHNICAL_INSPECTION', label: 'Contrôle technique', required: false },
  { value: 'BUSINESS_LICENSE', label: 'Patente (optionnel)', required: false }
];

const STATUS_COLORS = {
  PENDING_DOCUMENTS: 'bg-gray-100 text-gray-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-red-100 text-red-800'
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
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setKycStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale: 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Type de fichier non valide. Utilisez JPG, PNG ou PDF');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
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
        alert('Document téléchargé avec succès');
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors du téléchargement');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kyc/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        await fetchKYCStatus();
        alert('Document supprimé');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getDocumentStatus = (docType: string) => {
    return kycStatus?.documents.find(doc => doc.documentType === docType);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Vérification KYC</h1>

          {/* Status Badge */}
          {kycStatus && (
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                STATUS_COLORS[kycStatus.verificationStatus as keyof typeof STATUS_COLORS]
              }`}>
                {STATUS_LABELS[kycStatus.verificationStatus as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {kycStatus && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progression</span>
                <span className="font-medium">{kycStatus.progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${kycStatus.progress.percentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {kycStatus.progress.uploaded} / {kycStatus.progress.total} documents requis téléchargés
              </p>
            </div>
          )}

          {/* Rejection Reason */}
          {kycStatus?.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">Raison du rejet:</p>
              <p className="text-sm text-red-700">{kycStatus.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Instructions importantes:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Les documents doivent être clairs et lisibles</li>
            <li>• Format accepté: JPG, PNG ou PDF (10MB max)</li>
            <li>• Les documents marqués comme "requis" sont obligatoires</li>
            <li>• La vérification prend généralement 24-48 heures</li>
          </ul>
        </div>

        {/* Document Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Documents à fournir</h2>

          <div className="space-y-4">
            {DOCUMENT_TYPES.map((docType) => {
              const existingDoc = getDocumentStatus(docType.value);
              const isMissing = kycStatus?.missingDocuments.includes(docType.value);

              return (
                <div
                  key={docType.value}
                  className={`border rounded-lg p-4 ${
                    isMissing && docType.required ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{docType.label}</h3>
                      {docType.required && (
                        <span className="text-red-500 text-sm">*</span>
                      )}
                    </div>

                    {existingDoc && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        existingDoc.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        existingDoc.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {existingDoc.verificationStatus === 'APPROVED' ? 'Approuvé' :
                         existingDoc.verificationStatus === 'REJECTED' ? 'Rejeté' :
                         'En attente'}
                      </span>
                    )}
                  </div>

                  {existingDoc ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{existingDoc.fileName}</p>
                          <p className="text-xs text-gray-500">
                            Téléchargé le {new Date(existingDoc.uploadedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}${existingDoc.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Voir
                          </a>
                          {kycStatus?.verificationStatus !== 'APPROVED' && (
                            <button
                              onClick={() => handleDeleteDocument(existingDoc.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>

                      {existingDoc.verificationNotes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-xs font-medium text-yellow-900">Note:</p>
                          <p className="text-xs text-yellow-800">{existingDoc.verificationNotes}</p>
                        </div>
                      )}

                      {existingDoc.verificationStatus === 'REJECTED' && (
                        <label className="block">
                          <span className="sr-only">Remplacer le document</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => handleFileUpload(e, docType.value)}
                            disabled={uploading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="block">
                      <span className="sr-only">Télécharger {docType.label}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={(e) => handleFileUpload(e, docType.value)}
                        disabled={uploading || kycStatus?.verificationStatus === 'APPROVED'}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {uploading && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Téléchargement en cours...
            </div>
          )}

          {kycStatus?.verificationStatus === 'PENDING_REVIEW' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ Tous les documents requis ont été téléchargés. Votre dossier est en cours de vérification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
