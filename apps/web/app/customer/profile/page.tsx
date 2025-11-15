'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { customerApi } from '@/lib/api';
import {
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  ArrowLeft,
  Edit,
  List,
  Plus,
  LogOut,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { token, user, setAuth, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
  });

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      const response = await customerApi.getProfile();
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
        companyName: response.data.companyName || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await customerApi.updateProfile(formData);
      setProfile(response.data);
      setEditing(false);

      if (formData.name !== user?.name) {
        setAuth(token!, { ...user, name: formData.name });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      companyName: profile.companyName || '',
    });
    setEditing(false);
  };

  const handleLogout = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      logout();
      router.push('/');
    }
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
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/customer/dashboard')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Mon Profil</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-5">
        {/* Profile Header Card */}
        <Card className="p-6 text-center border-border shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">
            {profile.accountType === 'BUSINESS' ? 'Compte Entreprise' : 'Compte Particulier'}
          </p>
        </Card>

        {/* Stats Card */}
        <Card className="p-5 border-border shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Statistiques</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{profile.totalRides || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Courses</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{profile.completedRides || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Terminées</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{profile.pendingRides || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">En cours</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{profile.totalSpent || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">DT dépensé</div>
            </div>
          </div>
        </Card>

        {/* Profile Info Card */}
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Informations personnelles</h3>
            {!editing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="text-primary font-medium h-auto p-0 hover:bg-transparent"
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-9 px-3"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-4"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                {profile.accountType === 'BUSINESS' ? 'Nom du responsable' : 'Nom complet'}
              </label>
              {editing ? (
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11"
                />
              ) : (
                <p className="text-base text-foreground font-medium">{profile.name}</p>
              )}
            </div>

            {/* Company Name */}
            {profile.accountType === 'BUSINESS' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Nom de l'entreprise
                </label>
                {editing ? (
                  <Input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="h-11"
                  />
                ) : (
                  <p className="text-base text-foreground font-medium">{profile.companyName || '-'}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Téléphone
              </label>
              {editing ? (
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-11"
                />
              ) : (
                <p className="text-base text-foreground font-medium">{profile.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Email
              </label>
              {editing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11"
                />
              ) : (
                <p className="text-base text-foreground font-medium">{profile.email || '-'}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Adresse
              </label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              ) : (
                <p className="text-base text-foreground font-medium">{profile.address}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 border-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Se déconnecter
        </Button>
      </div>

      {/* Bottom Navigation - Uber style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-6 py-3 max-w-md mx-auto">
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="flex flex-col items-center gap-1 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
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
          <button className="flex flex-col items-center gap-1 py-2 text-primary">
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
