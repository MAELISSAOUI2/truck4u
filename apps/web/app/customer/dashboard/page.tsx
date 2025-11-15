'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { customerApi, rideApi } from '@/lib/api';
import { User, MapPin, Clock, TruckIcon } from 'lucide-react';

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
            <div className="flex items-center space-x-3">
              <TruckIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Truck4u</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Bienvenue, {user?.name || profile?.name}
              </span>
              <button
                onClick={() => logout()}
                className="text-red-600 hover:text-red-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/customer/new-ride')}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <MapPin className="h-5 w-5" />
              <span>Nouvelle course</span>
            </button>
            <button
              onClick={() => router.push('/customer/rides')}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              <Clock className="h-5 w-5" />
              <span>Mes courses</span>
            </button>
            <button
              onClick={() => router.push('/customer/profile')}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              <User className="h-5 w-5" />
              <span>Mon profil</span>
            </button>
          </div>
        </div>

        {/* Recent Rides */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Courses récentes</h2>
          {rides.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Aucune course pour le moment</p>
              <button
                onClick={() => router.push('/customer/new-ride')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Créer ma première course
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.slice(0, 5).map((ride: any) => (
                <div
                  key={ride.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/customer/rides/${ride.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                        <span>{new Date(ride.createdAt).toLocaleDateString('fr-FR')}</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          ride.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          ride.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          ride.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ride.status}
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{ride.pickupAddress}</p>
                          <p className="text-sm text-gray-500">→ {ride.deliveryAddress}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{ride.finalPrice || ride.estimatedPrice} DT</p>
                      <p className="text-sm text-gray-500">{ride.vehicleType}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
