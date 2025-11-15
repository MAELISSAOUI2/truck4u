'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { customerApi, rideApi } from '@/lib/api';
import {
  MapPin,
  Clock,
  Package,
  User,
  ChevronRight,
  Plus,
} from 'lucide-react';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - Clean black bar like Uber */}
      <div className="bg-black text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Bonjour</p>
            <h1 className="text-2xl font-bold">{user?.name?.split(' ')[0] || 'Client'}</h1>
          </div>
          <button
            onClick={() => router.push('/customer/profile')}
            className="w-11 h-11 bg-gray-800 rounded-full flex items-center justify-center"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24">
        {/* Large CTA Card - Uber style with image */}
        <div
          className="mx-6 my-6 h-48 rounded-3xl overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => router.push('/customer/new-ride')}
        >
          <img
            src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&q=80"
            alt="Truck"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-white text-2xl font-bold mb-2">
              Nouvelle course
            </h2>
            <p className="text-white/90 text-sm">
              Trouvez un transporteur en quelques clics
            </p>
          </div>
          <div className="absolute top-6 right-6">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6 text-black" />
            </div>
          </div>
        </div>

        {/* Quick Actions - Uber style */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <button className="bg-white rounded-2xl p-4 text-center shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-900">En cours</p>
              <p className="text-lg font-bold text-gray-900">
                {rides.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PENDING').length}
              </p>
            </button>

            <button className="bg-white rounded-2xl p-4 text-center shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Package className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-900">Terminées</p>
              <p className="text-lg font-bold text-gray-900">
                {rides.filter(r => r.status === 'COMPLETED').length}
              </p>
            </button>

            <button className="bg-white rounded-2xl p-4 text-center shadow-sm active:scale-95 transition-transform">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-900">Total</p>
              <p className="text-lg font-bold text-gray-900">{rides.length}</p>
            </button>
          </div>
        </div>

        {/* Recent Rides */}
        <div className="px-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Activité récente</h3>
            {rides.length > 0 && (
              <button
                onClick={() => router.push('/customer/rides')}
                className="text-sm font-semibold text-gray-900"
              >
                Tout voir
              </button>
            )}
          </div>

          {rides.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Aucune course
              </h4>
              <p className="text-sm text-gray-600 mb-6">
                Créez votre première demande de transport
              </p>
              <button
                onClick={() => router.push('/customer/new-ride')}
                className="h-12 px-8 bg-black text-white font-semibold rounded-full"
              >
                Commencer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.slice(0, 5).map((ride: any) => (
                <button
                  key={ride.id}
                  onClick={() => router.push(`/customer/rides/${ride.id}`)}
                  className="w-full bg-white rounded-2xl p-5 text-left shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ride.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : ride.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ride.status === 'COMPLETED'
                        ? 'Terminée'
                        : ride.status === 'IN_PROGRESS'
                        ? 'En cours'
                        : 'En attente'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {ride.pickupAddress}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {ride.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {(ride.finalPrice || ride.estimatedPrice) && (
                      <span className="text-base font-bold text-gray-900">
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

      {/* Bottom Navigation - Uber style with active indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex items-center justify-around h-20 px-6">
          <button className="flex flex-col items-center gap-1 relative">
            <div className="w-1.5 h-1.5 bg-black rounded-full absolute -top-3"></div>
            <Package className="w-6 h-6 text-black" />
            <span className="text-xs font-bold text-black">Accueil</span>
          </button>

          <button
            onClick={() => router.push('/customer/rides')}
            className="flex flex-col items-center gap-1"
          >
            <Clock className="w-6 h-6 text-gray-400" />
            <span className="text-xs font-medium text-gray-400">Activité</span>
          </button>

          <button
            onClick={() => router.push('/customer/profile')}
            className="flex flex-col items-center gap-1"
          >
            <User className="w-6 h-6 text-gray-400" />
            <span className="text-xs font-medium text-gray-400">Compte</span>
          </button>
        </div>
      </div>
    </div>
  );
}
