'use client';

import { useState, useEffect } from 'react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehiclePlate?: string;
  verificationStatus: string;
  rating: number;
  totalRides: number;
  totalEarnings: number;
  isAvailable: boolean;
  createdAt: string;
}

const STATUS_COLORS = {
  PENDING_DOCUMENTS: 'bg-gray-100 text-gray-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  PENDING_DOCUMENTS: 'Documents manquants',
  PENDING_REVIEW: 'En vérification',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  SUSPENDED: 'Suspendu'
};

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDrivers();
  }, [page, statusFilter, searchTerm]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (driverId: string) => {
    const reason = prompt('Raison de la suspension:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers/${driverId}/suspend`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        }
      );

      if (res.ok) {
        alert('Conducteur suspendu');
        fetchDrivers();
      }
    } catch (error) {
      console.error('Failed to suspend driver:', error);
      alert('Erreur lors de la suspension');
    }
  };

  const handleActivate = async (driverId: string) => {
    if (!confirm('Réactiver ce conducteur ?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/drivers/${driverId}/activate`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.ok) {
        alert('Conducteur réactivé');
        fetchDrivers();
      }
    } catch (error) {
      console.error('Failed to activate driver:', error);
      alert('Erreur lors de la réactivation');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Conducteurs</h1>
        <p className="text-gray-600">Gérer tous les conducteurs de la plateforme</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Recherche</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, téléphone, email, plaque..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="PENDING_DOCUMENTS">Documents manquants</option>
              <option value="PENDING_REVIEW">En vérification</option>
              <option value="APPROVED">Approuvé</option>
              <option value="REJECTED">Rejeté</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Aucun conducteur trouvé</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Conducteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Véhicule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Courses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Gains
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.phone}</div>
                          {driver.email && (
                            <div className="text-xs text-gray-400">{driver.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div>{driver.vehicleType}</div>
                          {driver.vehiclePlate && (
                            <div className="text-gray-500">{driver.vehiclePlate}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          STATUS_COLORS[driver.verificationStatus as keyof typeof STATUS_COLORS]
                        }`}>
                          {STATUS_LABELS[driver.verificationStatus as keyof typeof STATUS_LABELS]}
                        </span>
                        {driver.isAvailable && driver.verificationStatus === 'APPROVED' && (
                          <div className="text-xs text-green-600 mt-1">● Disponible</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">{driver.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{driver.totalRides}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{driver.totalEarnings.toFixed(2)} TND</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <a
                            href={`/admin/kyc?driver=${driver.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Voir
                          </a>
                          {driver.verificationStatus === 'APPROVED' ? (
                            <button
                              onClick={() => handleSuspend(driver.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Suspendre
                            </button>
                          ) : driver.verificationStatus === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleActivate(driver.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Activer
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} sur {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
