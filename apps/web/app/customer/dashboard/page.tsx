'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { rideApi } from '@/lib/api';
import {
  MapPin,
  Clock,
  Package,
  User,
  LogOut,
  Plus,
  ChevronRight,
  TruckIcon,
} from 'lucide-react';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const ridesRes = await rideApi.getHistory();
      setRides(ridesRes.data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: rides.length,
    pending: rides.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length,
    completed: rides.filter(r => r.status === 'COMPLETED').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header - Moderne avec avatar */}
      <div className="px-6 py-8 border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Bonjour,</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.name?.split(' ')[0] || 'Client'}
            </h1>
          </div>
          <button
            onClick={() => router.push('/customer/profile')}
            className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
          >
            <User className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid - Minimaliste */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-2xl">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-2xl">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-gray-600 mt-1">En cours</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-2xl">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-600 mt-1">Terminées</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-8">
        {/* CTA Card - Simple et élégant */}
        <button
          onClick={() => router.push('/customer/new-ride')}
          className="w-full bg-black text-white rounded-3xl p-8 text-left hover:bg-gray-900 active:scale-[0.98] transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Nouvelle course</h2>
              <p className="text-gray-300 text-sm">
                Trouvez un transporteur en quelques minutes
              </p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <TruckIcon className="w-4 h-4" />
            <span>Tous types de véhicules disponibles</span>
          </div>
        </button>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Activité récente</h3>
            {rides.length > 0 && (
              <button
                onClick={() => router.push('/customer/rides')}
                className="text-sm font-semibold hover:underline"
              >
                Tout voir
              </button>
            )}
          </div>

          {rides.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Aucune course</h4>
              <p className="text-sm text-gray-600 mb-6">
                Commencez par créer votre première demande
              </p>
              <button
                onClick={() => router.push('/customer/new-ride')}
                className="h-12 px-8 bg-black text-white font-semibold rounded-full hover:bg-gray-900 transition-colors"
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
                  className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        ride.status === 'COMPLETED'
                          ? 'bg-green-50 text-green-700'
                          : ride.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {ride.status === 'COMPLETED'
                        ? 'Terminée'
                        : ride.status === 'IN_PROGRESS'
                        ? 'En cours'
                        : 'En attente'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-sm font-semibold line-clamp-1">{ride.pickupAddress}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-sm font-semibold line-clamp-1">{ride.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    {(ride.finalPrice || ride.estimatedPrice) && (
                      <span className="text-base font-bold">
                        {ride.finalPrice || ride.estimatedPrice} DT
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Minimal et moderne */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="flex items-center justify-around h-20 px-6">
          <button className="flex flex-col items-center gap-2 text-black">
            <Package className="w-6 h-6" />
            <span className="text-xs font-semibold">Accueil</span>
          </button>

          <button
            onClick={() => router.push('/customer/rides')}
            className="flex flex-col items-center gap-2 text-gray-400 hover:text-black transition-colors"
          >
            <Clock className="w-6 h-6" />
            <span className="text-xs font-medium">Courses</span>
          </button>

          <button
            onClick={() => router.push('/customer/profile')}
            className="flex flex-col items-center gap-2 text-gray-400 hover:text-black transition-colors"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
