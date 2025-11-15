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
  Save,
  X,
  List,
  Plus,
  LogOut,
  Package,
} from 'lucide-react';

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
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="flex items-center gap-2 text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Mon Profil</h1>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 font-medium text-sm"
            >
              Modifier
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-blue-600 font-medium text-sm disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {profile.accountType === 'BUSINESS' ? 'Compte Entreprise' : 'Compte Particulier'}
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistiques</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.totalRides || 0}</div>
              <div className="text-xs text-gray-600 mt-1">Courses</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{profile.completedRides || 0}</div>
              <div className="text-xs text-gray-600 mt-1">Terminées</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{profile.pendingRides || 0}</div>
              <div className="text-xs text-gray-600 mt-1">En cours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{profile.totalSpent || 0}</div>
              <div className="text-xs text-gray-600 mt-1">DT dépensé</div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Informations personnelles</h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {profile.accountType === 'BUSINESS' ? 'Nom du responsable' : 'Nom complet'}
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{profile.name}</p>
              )}
            </div>

            {/* Company Name */}
            {profile.accountType === 'BUSINESS' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nom de l'entreprise
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{profile.companyName || '-'}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Téléphone
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{profile.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">{profile.email || '-'}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Adresse
              </label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              ) : (
                <p className="text-gray-900">{profile.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white border-2 border-red-200 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 inline mr-2" />
          Se déconnecter
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-around">
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
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
          <button className="flex flex-col items-center gap-1 text-blue-600">
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
