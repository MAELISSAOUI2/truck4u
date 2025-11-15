'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, User, MapPin, Building2, Mail } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '+216',
    email: '',
    address: '',
    companyName: '',
    accountType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.registerCustomer({
        ...formData,
        password: formData.phone.slice(-4),
      });

      if (response.data.token) {
        setAuth(response.data.token, response.data.user);
        router.push('/customer/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚚</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inscription</h1>
          <p className="text-gray-600 mt-2">Créez votre compte Truck4u</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de compte
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountType: 'INDIVIDUAL' })}
                className={`p-3 border-2 rounded-lg font-medium ${
                  formData.accountType === 'INDIVIDUAL'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-1" />
                Particulier
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountType: 'BUSINESS' })}
                className={`p-3 border-2 rounded-lg font-medium ${
                  formData.accountType === 'BUSINESS'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                Entreprise
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.accountType === 'BUSINESS' ? 'Nom du responsable' : 'Nom complet'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Votre nom"
              />
            </div>
          </div>

          {/* Company Name (if business) */}
          {formData.accountType === 'BUSINESS' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required={formData.accountType === 'BUSINESS'}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de votre entreprise"
                />
              </div>
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+216 XX XXX XXX"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (optionnel)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@exemple.com"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="15 Avenue Habib Bourguiba, Tunis"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/customer/login')}
            className="text-blue-600 font-medium"
          >
            Déjà un compte ? Se connecter
          </button>
        </div>

        {/* Terms */}
        <p className="mt-8 text-xs text-center text-gray-500">
          En créant un compte, vous acceptez nos{' '}
          <a href="#" className="text-blue-600">Conditions</a>
          {' '}et{' '}
          <a href="#" className="text-blue-600">Politique de confidentialité</a>
        </p>
      </div>
    </div>
  );
}
