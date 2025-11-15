'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { customerApi, rideApi } from '@/lib/api';
import { User, LogOut, Plus, History, Settings, TrendingUp, Star, DollarSign, MapPin } from 'lucide-react';
import Link from 'next/link';

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
          <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">Bienvenue, {user?.name || profile?.name}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition text-error"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Courses totales</p>
                <p className="text-3xl font-bold text-primary mt-2">{profile?.totalRides || 0}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-primary/20" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Terminées</p>
                <p className="text-3xl font-bold text-success mt-2">{profile?.completedRides || 0}</p>
              </div>
              <Star className="w-12 h-12 text-success/20" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">En cours</p>
                <p className="text-3xl font-bold text-accent mt-2">{profile?.pendingRides || 0}</p>
              </div>
              <MapPin className="w-12 h-12 text-accent/20" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total dépensé</p>
                <p className="text-3xl font-bold text-secondary mt-2">{profile?.totalSpent || 0} DT</p>
              </div>
              <DollarSign className="w-12 h-12 text-secondary/20" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/customer/new-ride" className="card p-8 hover:shadow-md transition hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center text-center">
            <Plus className="w-12 h-12 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-1">Nouvelle course</h3>
            <p className="text-sm text-muted-foreground">Commander un transport</p>
          </Link>

          <Link href="/customer/rides" className="card p-8 hover:shadow-md transition hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center text-center">
            <History className="w-12 h-12 text-secondary mb-4" />
            <h3 className="font-bold text-lg mb-1">Mes courses</h3>
            <p className="text-sm text-muted-foreground">Consulter l'historique</p>
          </Link>

          <Link href="/customer/profile" className="card p-8 hover:shadow-md transition hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center text-center">
            <User className="w-12 h-12 text-accent mb-4" />
            <h3 className="font-bold text-lg mb-1">Mon profil</h3>
            <p className="text-sm text-muted-foreground">Gérer mes données</p>
          </Link>
        </div>

        {/* Recent Rides */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6">Courses récentes</h2>

          {rides.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4 font-medium">Aucune course pour le moment</p>
              <Link href="/customer/new-ride" className="btn-primary">
                Créer ma première course
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.slice(0, 5).map((ride: any) => (
                <Link
                  key={ride.id}
                  href={`/customer/rides/${ride.id}`}
                  className="card p-4 hover:shadow-md transition hover:bg-muted/50 flex items-center justify-between"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{ride.pickupAddress}</p>
                      <p className="text-sm text-muted-foreground truncate">→ {ride.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">{ride.finalPrice || ride.estimatedPrice} DT</p>
                    <div className={`text-xs font-semibold px-2 py-1 rounded mt-1 ${
                      ride.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                      ride.status === 'IN_PROGRESS' ? 'bg-primary/10 text-primary' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {ride.status}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
