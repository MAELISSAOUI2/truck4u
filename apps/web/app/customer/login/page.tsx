'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
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
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Hero Image Section - Like Uber */}
      <div
        className="flex-1 relative bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80')",
          backgroundPosition: 'center'
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>

        {/* Logo */}
        <div className="relative z-10 p-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl">🚚</span>
            </div>
            <span className="text-2xl font-bold text-white">Truck4u</span>
          </div>
        </div>

        {/* Headline */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-8 pb-12">
          <h1 className="text-4xl font-bold mb-3 leading-tight">
            Transport de<br />marchandises<br />en Tunisie
          </h1>
          <p className="text-lg text-white/90">
            Simple, rapide et fiable
          </p>
        </div>
      </div>

      {/* Login Form Section - Bottom */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-20">
        <div className="p-8 pb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Entrez votre numéro
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Input - Large like Uber */}
            <div>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 text-lg bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none text-gray-900"
                  placeholder="+216 XX XXX XXX"
                  required
                />
              </div>
            </div>

            {/* Continue Button - Large Uber style */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-black text-white text-base font-semibold rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Continuer'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Register Link */}
          <button
            onClick={() => router.push('/customer/register')}
            className="w-full h-14 bg-white text-black text-base font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors"
          >
            Créer un compte
          </button>

          {/* Terms - Small text at bottom */}
          <p className="text-xs text-center text-gray-500 mt-6 leading-relaxed">
            En continuant, vous acceptez les{' '}
            <a href="#" className="underline">Conditions d'utilisation</a>
            {' '}et la{' '}
            <a href="#" className="underline">Politique de confidentialité</a>
          </p>
        </div>
      </div>
    </div>
  );
}
