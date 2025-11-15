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
  ArrowRight,
  CheckCircle,
  TruckIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header - Uber style */}
      <div className="bg-white border-b border-border">
        <div className="px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Bonjour,</p>
              <h1 className="text-2xl font-bold text-foreground">{user?.name || profile?.name}</h1>
            </div>
            <button
              onClick={() => router.push('/customer/profile')}
              className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <User className="w-6 h-6 text-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6">
        {/* CTA Card - Uber style prominent action */}
        <Card className="bg-primary text-primary-foreground p-6 border-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Nouvelle course</h2>
              <p className="text-sm text-primary-foreground/80">
                Commandez un transport en quelques clics
              </p>
            </div>
            <Button
              onClick={() => router.push('/customer/new-ride')}
              size="icon"
              className="w-12 h-12 bg-white text-primary hover:bg-white/90 rounded-full shadow-md flex-shrink-0"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </Card>

        {/* Stats Grid - Clean Uber style */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center border-border shadow-sm">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </div>
          </Card>
          <Card className="p-4 text-center border-border shadow-sm">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
              <div className="text-xs text-muted-foreground mt-1">Terminées</div>
            </div>
          </Card>
          <Card className="p-4 text-center border-border shadow-sm">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-xs text-muted-foreground mt-1">En cours</div>
            </div>
          </Card>
        </div>

        {/* Recent Rides Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Courses récentes</h2>
            {rides.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/customer/rides')}
                className="text-primary font-medium h-auto p-0 hover:bg-transparent"
              >
                Voir tout
              </Button>
            )}
          </div>

          {rides.length === 0 ? (
            <Card className="p-8 text-center border-border shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TruckIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">
                Aucune course pour le moment
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Commencez par créer votre première demande de transport
              </p>
              <Button
                onClick={() => router.push('/customer/new-ride')}
                className="h-11"
              >
                Nouvelle course
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {rides.slice(0, 5).map((ride: any) => (
                <Card
                  key={ride.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-all border-border shadow-sm"
                  onClick={() => router.push(`/customer/rides/${ride.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {ride.status === 'COMPLETED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Terminée
                        </span>
                      )}
                      {ride.status === 'IN_PROGRESS' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          En cours
                        </span>
                      )}
                      {(ride.status === 'PENDING' || ride.status === 'BIDDING') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          En attente
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-foreground font-medium line-clamp-1">
                        {ride.pickupAddress}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-destructive rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-foreground font-medium line-clamp-1">
                        {ride.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {new Date(ride.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    {(ride.finalPrice || ride.estimatedPrice) && (
                      <span className="text-sm font-semibold text-foreground">
                        {ride.finalPrice || ride.estimatedPrice} DT
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Uber style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-6 py-3 max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 py-2 text-primary">
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          <button
            onClick={() => router.push('/customer/rides')}
            className="flex flex-col items-center gap-1 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <List className="w-6 h-6" />
            <span className="text-xs font-medium">Courses</span>
          </button>
          <button
            onClick={() => router.push('/customer/new-ride')}
            className="flex flex-col items-center gap-1 -mt-2"
          >
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Plus className="w-7 h-7 text-white" />
            </div>
          </button>
          <button
            onClick={() => router.push('/customer/profile')}
            className="flex flex-col items-center gap-1 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
