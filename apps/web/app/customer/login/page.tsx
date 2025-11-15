'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('+216');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(phone, 'customer');
      login(response.data.user, response.data.token);
      router.push('/customer/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header avec logo - Minimaliste */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="text-3xl">🚚</div>
          <h1 className="text-2xl font-bold tracking-tight">Truck4u</h1>
        </div>
      </div>

      {/* Main Content - Centré verticalement */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          {/* Titre principal - Grande typographie */}
          <div className="space-y-3">
            <h2 className="text-5xl font-bold tracking-tight leading-[1.1]">
              Bienvenue sur<br />Truck4u
            </h2>
            <p className="text-xl text-gray-600">
              Votre transporteur en quelques clics
            </p>
          </div>

          {/* Form - Moderne et épuré */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Group */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Numéro de téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full h-14 px-4 text-base rounded-2xl border-2 border-gray-200 focus:border-black focus:ring-0 transition-colors outline-none"
                placeholder="+216 XX XXX XXX"
                required
              />
            </div>

            {/* Submit Button - Grand et noir */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-black text-white text-base font-semibold rounded-2xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connexion...</span>
                </div>
              ) : (
                'Continuer'
              )}
            </button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-gray-500">ou</span>
              </div>
            </div>

            {/* Secondary Button */}
            <button
              type="button"
              onClick={() => router.push('/customer/register')}
              className="w-full h-14 bg-white text-black text-base font-semibold rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              Créer un compte
            </button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-xs text-gray-500 leading-relaxed">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="underline hover:text-gray-900">Conditions</a>
            {' '}et notre{' '}
            <a href="#" className="underline hover:text-gray-900">Politique de confidentialité</a>
          </p>
        </div>
      </div>

      {/* Bottom Decoration - Subtil */}
      <div className="h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </div>
  );
}
