'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Truck, ArrowLeft, Phone, User, AlertCircle, TrendingUp } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function DriverLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    phone: '+216',
    name: '',
    vehicleType: 'VAN' as 'PICKUP' | 'VAN' | 'SMALL_TRUCK' | 'MEDIUM_TRUCK' | 'LARGE_TRUCK',
    vehiclePlate: '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await authApi.login(formData.phone, 'driver');
        login(response.data.user, response.data.token);
        router.push('/driver/dashboard');
      } else {
        const response = await authApi.registerDriver(formData);
        login(response.data.user, response.data.token);
        router.push('/driver/onboarding');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition">
          <ArrowLeft className="w-5 h-5" />
          Retour à l'accueil
        </Link>

        {/* Card */}
        <div className="card p-8 shadow-lg">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-secondary/10 text-secondary mx-auto mb-6">
            <Truck className="w-8 h-8" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            {isLogin ? 'Connexion Chauffeur' : 'Devenir Partenaire'}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {isLogin ? 'Connectez-vous pour gérer vos courses' : 'Gagnez de l\'argent en proposant vos services'}
          </p>

          {/* Benefits */}
          {!isLogin && (
            <div className="mb-6 p-4 bg-secondary/10 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>Revenus illimités</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>Horaires flexibles</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>Support 24/7</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+216 XX XXX XXX"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Register fields */}
            {!isLogin && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Votre nom complet"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Type de véhicule
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="input"
                    required
                  >
                    <option value="PICKUP">Pickup (500 kg)</option>
                    <option value="VAN">Camionnette (1 tonne)</option>
                    <option value="SMALL_TRUCK">Petit Camion (3 tonnes)</option>
                    <option value="MEDIUM_TRUCK">Camion Moyen (8 tonnes)</option>
                    <option value="LARGE_TRUCK">Grand Camion (20 tonnes)</option>
                  </select>
                </div>

                {/* Vehicle Plate */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Immatriculation du véhicule
                  </label>
                  <input
                    type="text"
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                    placeholder="TUN 1234"
                    className="input"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre@email.com"
                    className="input"
                  />
                </div>

                {/* Requirements */}
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-2">Documents requis après inscription :</p>
                  <ul className="text-xs text-primary/80 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      CIN (recto/verso)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Permis de conduire
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Carte grise du véhicule
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      Photos du véhicule
                    </li>
                  </ul>
                </div>
              </>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-secondary w-full justify-center py-3 font-semibold disabled:opacity-50"
            >
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Commencer'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">OU</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Toggle login/register */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Pas encore de compte? " : "Déjà un compte? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="font-semibold text-secondary hover:text-secondary/80 transition"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </div>

          {/* Legal note */}
          <p className="mt-6 text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="text-secondary hover:underline">
              Conditions d'utilisation
            </a>{' '}
            et notre{' '}
            <a href="#" className="text-secondary hover:underline">
              Politique de confidentialité
            </a>
          </p>
        </div>

        {/* Demo info */}
        <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm font-semibold text-warning mb-1">Mode Démo</p>
          <p className="text-xs text-warning/80">
            Pour tester rapidement : utilisez n'importe quel numéro au format +216XXXXXXXX
          </p>
        </div>
      </div>
    </div>
  );
}
