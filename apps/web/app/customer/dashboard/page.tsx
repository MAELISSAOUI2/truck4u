'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { customerApi, rideApi } from '@/lib/api';
import {
  Home,
  Plus,
  List,
  User,
  MapPin,
  Clock,
  Package,
  ArrowRight
} from 'lucide-react';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadDashboard();
  }, [token]);

  const loadDashboard = async () => {
    try {
      const [profileRes, ridesRes] = await Promise.all([
        customerApi.getProfile(),
        rideApi.getHistory(),
      ]);
      setProfile(profileRes.data);
      setRides(ridesRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: rides.length,
    pending: rides.filter((r) => r.status === 'PENDING' || r.status === 'BIDDING').length,
    completed: rides.filter((r) => r.status === 'COMPLETED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bonjour,</h1>
            <p className="text-sm text-gray-600">{user?.name || profile?.name}</p>
          </div>
          <button
            onClick={() => router.push('/customer/profile')}
            className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
          >
            <User className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Quick Action - New Ride */}
        <button
          onClick={() => router.push('/customer/new-ride')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Nouvelle course</div>
              <div className="text-sm text-blue-100">Créer une demande de transport</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-gray-600 mt-1">En attente</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-600 mt-1">Terminées</div>
          </div>
        </div>

        {/* Recent Rides */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Courses récentes</h2>
            {rides.length > 0 && (
              <button
                onClick={() => router.push('/customer/rides')}
                className="text-blue-600 text-sm font-medium"
              >
                Tout voir
              </button>
            )}
          </div>

          {rides.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune course
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Créez votre première course pour commencer
              </p>
              <button
                onClick={() => router.push('/customer/new-ride')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium"
              >
                Créer une course
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.slice(0, 5).map((ride: any) => (
                <button
                  key={ride.id}
                  onClick={() => router.push(`/customer/rides/${ride.id}`)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-gray-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      ride.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      ride.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {ride.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(ride.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {ride.pickupAddress}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {ride.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{ride.vehicleType}</span>
                    <span className="text-lg font-bold text-blue-600">
                      {ride.finalPrice || ride.estimatedPrice} DT
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-blue-600">
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          <button
            onClick={() => router.push('/customer/rides')}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <List className="w-6 h-6" />
            <span className="text-xs font-medium">Courses</span>
          </button>
          <button
            onClick={() => router.push('/customer/new-ride')}
            className="flex flex-col items-center gap-1 -mt-4"
          >
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Plus className="w-7 h-7 text-white" />
            </div>
          </button>
          <button
            onClick={() => router.push('/customer/profile')}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
