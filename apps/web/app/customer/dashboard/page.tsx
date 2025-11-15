'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import { customerApi, rideApi } from '@/lib/api';
import {
  User,
  MapPin,
  Clock,
  TruckIcon,
  Plus,
  List,
  Settings,
  LogOut,
  Package,
  CheckCircle2,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, Badge, AnimatedPage } from '@/components/ui';

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
    inProgress: rides.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: rides.filter((r) => r.status === 'COMPLETED').length,
    totalSpent: profile?.totalSpent || 0
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl">
                <TruckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Truck4u</h1>
                <p className="text-sm text-gray-500">Tableau de bord</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-500">Bonjour,</p>
                <p className="font-semibold text-gray-900">
                  {user?.name || profile?.name}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => logout()}
                icon={<LogOut className="w-5 h-5" />}
              >
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card gradient className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Bienvenue, {user?.name?.split(' ')[0]} ! 👋
                </h2>
                <p className="opacity-90">
                  {rides.length === 0
                    ? 'Créez votre première course en quelques clics'
                    : `Vous avez ${stats.pending} course${stats.pending > 1 ? 's' : ''} en attente`}
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => router.push('/customer/new-ride')}
                icon={<Plus className="w-5 h-5" />}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                Nouvelle course
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card hover className="bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total courses</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-2xl">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card hover className="bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En attente</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="bg-amber-100 p-4 rounded-2xl">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card hover className="bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Terminées</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card hover className="bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total dépensé</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSpent} DT</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-2xl">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                size="lg"
                onClick={() => router.push('/customer/new-ride')}
                icon={<Plus className="w-5 h-5" />}
              >
                Créer une course
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/customer/rides')}
                icon={<List className="w-5 h-5" />}
              >
                Voir mes courses
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/customer/profile')}
                icon={<Settings className="w-5 h-5" />}
              >
                Mon profil
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Recent Rides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Courses récentes</CardTitle>
                {rides.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/customer/rides')}
                  >
                    Tout voir
                  </Button>
                )}
              </div>
            </CardHeader>

            {rides.length === 0 ? (
              <div className="text-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                >
                  <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TruckIcon className="w-12 h-12 text-blue-600" />
                  </div>
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucune course pour le moment
                </h3>
                <p className="text-gray-600 mb-6">
                  Créez votre première course pour commencer
                </p>
                <Button
                  size="lg"
                  onClick={() => router.push('/customer/new-ride')}
                  icon={<Plus className="w-5 h-5" />}
                >
                  Créer ma première course
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rides.slice(0, 5).map((ride: any, index: number) => (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/customer/rides/${ride.id}`)}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge
                            variant={
                              ride.status === 'COMPLETED' ? 'success' :
                              ride.status === 'IN_PROGRESS' ? 'info' :
                              ride.status === 'PENDING' ? 'warning' :
                              'default'
                            }
                            dot
                          >
                            {ride.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(ride.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-900">
                              {ride.pickupAddress}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                            <p className="text-sm text-gray-600">
                              {ride.deliveryAddress}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-blue-600">
                          {ride.finalPrice || ride.estimatedPrice} DT
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ride.vehicleType}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </AnimatedPage>
  );
}
