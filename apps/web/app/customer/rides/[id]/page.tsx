'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import { MapPin, Clock, TruckIcon, ArrowRight, Filter, Search, Package, DollarSign } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  PENDING: { 
    label: 'En attente d\'offres', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-50', 
    dotColor: 'bg-amber-500' 
  },
  BIDDING: { 
    label: 'Enchères en cours', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    dotColor: 'bg-blue-500' 
  },
  ACCEPTED: { 
    label: 'Chauffeur assigné', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50', 
    dotColor: 'bg-green-500' 
  },
  IN_PROGRESS: { 
    label: 'En cours de livraison', 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-50', 
    dotColor: 'bg-indigo-500' 
  },
  COMPLETED: { 
    label: 'Terminée', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-50', 
    dotColor: 'bg-gray-500' 
  },
  CANCELLED: { 
    label: 'Annulée', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50', 
    dotColor: 'bg-red-500' 
  },
};

const VEHICLE_ICONS: Record<string, string> = {
  PICKUP: '🚙',
  VAN: '🚐',
  SMALL_TRUCK: '🚚',
  MEDIUM_TRUCK: '🚛',
  LARGE_TRUCK: '🚚',
};

export default function CustomerRidesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
    const matchesFilter = filter === 'ALL' || ride.status === filter;
    const matchesSearch = 
      ride.pickupAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.cargoDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: rides.length,
    pending: rides.filter((r) => r.status === 'PENDING' || r.status === 'BIDDING').length,
    active: rides.filter((r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS').length,
    completed: rides.filter((r) => r.status === 'COMPLETED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowRight className="h-5 w-5 mr-2 rotate-180" />
              <span className="font-medium">Retour</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Mes Courses</h1>
            <button
              onClick={() => router.push('/customer/new-ride')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg font-medium"
            >
              + Nouvelle course
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-xl">
                <Package className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">En attente</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">En cours</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.active}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Terminées</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par adresse ou description..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              {[
                { value: 'ALL', label: 'Toutes', icon: Package },
                { value: 'PENDING', label: 'En attente', icon: Clock },
                { value: 'IN_PROGRESS', label: 'En cours', icon: TruckIcon },
                { value: 'COMPLETED', label: 'Terminées', icon: DollarSign },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition font-medium ${
                    filter === item.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rides List */}
        {filteredRides.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-200">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <TruckIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Aucune course trouvée
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {filter === 'ALL'
                ? 'Vous n\'avez pas encore créé de course. Commencez dès maintenant !'
                : `Aucune course avec le statut "${STATUS_CONFIG[filter]?.label}"`}
            </p>
            <button
              onClick={() => router.push('/customer/new-ride')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg font-semibold text-lg"
            >
              Créer ma première course
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRides.map((ride) => {
              const status = STATUS_CONFIG[ride.status];
              const vehicleIcon = VEHICLE_ICONS[ride.vehicleType] || '🚚';

              return (
                <div
                  key={ride.id}
                  onClick={() => router.push(`/customer/rides/${ride.id}`)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer border border-gray-200 overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${status.color} ${status.bgColor}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${status.dotColor} mr-2`}></span>
                            {status.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-3xl">{vehicleIcon}</span>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {ride.vehicleType.replace('_', ' ')}
                            </h3>
                            {ride.cargoDescription && (
                              <p className="text-sm text-gray-600">{ride.cargoDescription}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          {ride.finalPrice || ride.estimatedPrice}
                          <span className="text-lg text-gray-600"> DT</span>
                        </p>
                        {ride.bidsCount > 0 && (
                          <p className="text-sm text-blue-600 font-medium mt-1">
                            {ride.bidsCount} offre{ride.bidsCount > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Départ
                          </p>
                          <p className="text-sm font-medium text-gray-900">{ride.pickupAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <MapPin className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Arrivée
                          </p>
                          <p className="text-sm font-medium text-gray-900">{ride.deliveryAddress}</p>
                        </div>
                      </div>
                    </div>

                    {ride.estimatedDistance && (
                      <div className="flex items-center space-x-4 text-xs text-gray-600 pt-4 border-t border-gray-100">
                        <span className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {ride.estimatedDistance.toFixed(1)} km
                        </span>
                        {ride.estimatedDuration && (
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {ride.estimatedDuration} min
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hover effect bar */}
                  <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
