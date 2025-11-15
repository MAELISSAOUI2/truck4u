'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import { MapPin, Clock, TruckIcon, ArrowRight, Filter } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  BIDDING: { label: 'Enchères en cours', color: 'bg-blue-100 text-blue-800' },
  ACCEPTED: { label: 'Acceptée', color: 'bg-green-100 text-green-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Terminée', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
};

export default function CustomerRidesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }

    loadRides();
  }, [token]);

  const loadRides = async () => {
    try {
      const response = await rideApi.getHistory();
      setRides(response.data);
    } catch (error) {
      console.error('Failed to load rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    if (filter === 'ALL') return true;
    return ride.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="h-5 w-5 mr-2 rotate-180" />
              Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Mes Courses</h1>
            <button
              onClick={() => router.push('/customer/new-ride')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Nouvelle course
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
            {[
              { value: 'ALL', label: 'Toutes' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'BIDDING', label: 'Enchères' },
              { value: 'IN_PROGRESS', label: 'En cours' },
              { value: 'COMPLETED', label: 'Terminées' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  filter === item.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rides List */}
        {filteredRides.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune course trouvée
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'ALL'
                ? 'Vous n\'avez pas encore créé de course'
                : `Aucune course avec le statut "${STATUS_LABELS[filter]?.label}"`}
            </p>
            <button
              onClick={() => router.push('/customer/new-ride')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Créer ma première course
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <div
                key={ride.id}
                onClick={() => router.push(`/customer/rides/${ride.id}`)}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          STATUS_LABELS[ride.status]?.color
                        }`}
                      >
                        {STATUS_LABELS[ride.status]?.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {ride.vehicleType.replace('_', ' ')}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {ride.finalPrice || ride.estimatedPrice} DT
                    </p>
                    {ride.bidsCount > 0 && (
                      <p className="text-sm text-blue-600 mt-1">
                        {ride.bidsCount} offre{ride.bidsCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Départ</p>
                      <p className="text-sm text-gray-600">{ride.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Arrivée</p>
                      <p className="text-sm text-gray-600">{ride.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                {ride.estimatedDistance && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center space-x-4 text-sm text-gray-600">
                    <span>Distance: {ride.estimatedDistance.toFixed(1)} km</span>
                    {ride.estimatedDuration && (
                      <>
                        <span>•</span>
                        <span>Durée: {ride.estimatedDuration} min</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
