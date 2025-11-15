'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { customerApi } from '@/lib/api';
import {
  User, Phone, Mail, MapPin, Building2, ArrowLeft, Edit2, Save, X, LogOut,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { token, user, login, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        login({ ...user!, name: formData.name }, token!);
      }
    } catch (error) {
      setError('Erreur lors de la mise à jour du profil');
      console.error('Failed to update profile:', error);
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
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/customer/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </Link>
            <h1 className="text-2xl font-bold">Mon Profil</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          {/* Profile Header */}
          <div className="p-8 border-b border-border flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {profile.accountType === 'BUSINESS' ? 'Compte Entreprise' : 'Compte Particulier'}
                </p>
              </div>
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 btn-primary"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 m-8 p-4 bg-error/10 border border-error/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* Profile Form */}
          <div className="p-8 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {profile.accountType === 'BUSINESS' ? 'Nom du responsable' : 'Nom complet'}
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              ) : (
                <p className="text-foreground">{profile.name}</p>
              )}
            </div>

            {/* Company Name */}
            {profile.accountType === 'BUSINESS' && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Nom de l'entreprise
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="input"
                  />
                ) : (
                  <p className="text-foreground">{profile.companyName || '-'}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Téléphone
              </label>
              {editing ? (
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input pl-10"
                  />
                </div>
              ) : (
                <p className="text-foreground">{profile.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Email
              </label>
              {editing ? (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input pl-10"
                  />
                </div>
              ) : (
                <p className="text-foreground">{profile.email || '-'}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Adresse
              </label>
              {editing ? (
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="input pl-10"
                  />
                </div>
              ) : (
                <p className="text-foreground whitespace-pre-wrap">{profile.address}</p>
              )}
            </div>

            {/* Edit/Save Buttons */}
            {editing && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-border rounded-lg font-semibold hover:bg-muted transition"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 btn-primary justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="p-8 bg-muted/50 border-t border-border">
            <h3 className="text-lg font-bold mb-6">Statistiques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{profile.totalRides || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Courses totales</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{profile.completedRides || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Terminées</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">{profile.pendingRides || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">En cours</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-secondary">{profile.totalSpent || 0} DT</p>
                <p className="text-sm text-muted-foreground mt-1">Total dépensé</p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-8 border-t border-border">
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-error/10 hover:bg-error/20 text-error font-semibold rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
