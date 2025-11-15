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
  ArrowRight,
  Activity
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
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="bg-gradient-primary p-2.5 rounded-2xl shadow-lg">
                <TruckIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient-primary">Truck4u</h1>
                <p className="text-sm text-gray-600">Tableau de bord</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-500">Bienvenue de retour,</p>
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
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-primary rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
            {/* Decorative Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="text-white">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3"
                >
                  Bonjour {user?.name?.split(' ')[0]} ! 👋
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg opacity-95"
                >
                  {rides.length === 0
                    ? 'Créez votre première course en quelques clics et profitez de notre service de transport rapide'
                    : stats.pending > 0
                    ? `Vous avez ${stats.pending} course${stats.pending > 1 ? 's' : ''} en attente de réponse`
                    : 'Toutes vos courses sont à jour ! Prêt à en créer une nouvelle ?'}
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  size="lg"
                  onClick={() => router.push('/customer/new-ride')}
                  icon={<Plus className="w-5 h-5" />}
                  className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl"
                >
                  Nouvelle course
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Courses */}
          <motion.div
            whileHover={{ y: -4 }}
            className="glass rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-md">
                <Package className="w-7 h-7 text-white" />
              </div>
              <Badge variant="info" size="sm">Total</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Total courses</p>
              <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </motion.div>

          {/* Pending */}
          <motion.div
            whileHover={{ y: -4 }}
            className="glass rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-xl shadow-md">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <Badge variant="warning" size="sm">En cours</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">En attente</p>
              <p className="text-4xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </motion.div>

          {/* Completed */}
          <motion.div
            whileHover={{ y: -4 }}
            className="glass rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-md">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <Badge variant="success" size="sm">Terminé</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Terminées</p>
              <p className="text-4xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </motion.div>

          {/* Total Spent */}
          <motion.div
            whileHover={{ y: -4 }}
            className="glass rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-md">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <Badge variant="purple" size="sm">Montant</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Total dépensé</p>
              <p className="text-4xl font-bold text-gray-900">{stats.totalSpent} <span className="text-2xl text-gray-600">DT</span></p>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="glass rounded-2xl p-6 border border-white/20 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Actions rapides
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                size="lg"
                variant="primary"
                onClick={() => router.push('/customer/new-ride')}
                icon={<Plus className="w-5 h-5" />}
                fullWidth
              >
                Créer une course
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/customer/rides')}
                icon={<List className="w-5 h-5" />}
                fullWidth
              >
                Voir mes courses
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/customer/profile')}
                icon={<Settings className="w-5 h-5" />}
                fullWidth
              >
                Mon profil
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Recent Rides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="glass rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Courses récentes</h3>
              {rides.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => router.push('/customer/rides')}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Tout voir
                </Button>
              )}
            </div>

            {rides.length === 0 ? (
              <div className="text-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                >
                  <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <TruckIcon className="w-14 h-14 text-blue-600" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Aucune course pour le moment
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Commencez à utiliser Truck4u en créant votre première course. C'est simple et rapide !
                </p>
                <Button
                  size="lg"
                  variant="primary"
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
                    whileHover={{ x: 4, scale: 1.01 }}
                    onClick={() => router.push(`/customer/rides/${ride.id}`)}
                    className="bg-white/60 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-5 hover:border-blue-400 hover:bg-white/80 hover:shadow-md cursor-pointer transition-all"
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
                          <span className="text-sm text-gray-500 font-medium">
                            {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="bg-green-100 p-1.5 rounded-lg mt-0.5">
                              <MapPin className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                              {ride.pickupAddress}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="bg-red-100 p-1.5 rounded-lg mt-0.5">
                              <MapPin className="w-4 h-4 text-red-600" />
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {ride.deliveryAddress}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-6 flex flex-col items-end">
                        <p className="text-3xl font-bold text-gradient-primary mb-1">
                          {ride.finalPrice || ride.estimatedPrice}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">DT</p>
                        <div className="mt-2 px-3 py-1 bg-gray-100 rounded-full">
                          <p className="text-xs font-medium text-gray-700">
                            {ride.vehicleType}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
