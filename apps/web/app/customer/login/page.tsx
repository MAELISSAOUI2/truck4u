'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, User, Building2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    phone: '+216',
    name: '',
    accountType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    companyName: '',
    taxId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await authApi.login(formData.phone, 'customer');
        login(response.data.user, response.data.token);
        router.push('/customer/dashboard');
      } else {
        const response = await authApi.registerCustomer(formData);
        login(response.data.user, response.data.token);
        router.push('/customer/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Uber style with back button */}
      <div className="flex items-center px-4 py-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content - Centered, generous padding */}
      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        {/* Logo and Title - More space */}
        <div className="mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <span className="text-3xl">🚚</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? 'Bienvenue' : 'Créer un compte'}
          </h1>
          <p className="text-base text-muted-foreground">
            {isLogin ? 'Connectez-vous pour continuer' : 'Commencez votre expérience Truck4u'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="pl-12 h-12 text-base"
                placeholder="+216 XX XXX XXX"
                required
              />
            </div>
          </div>

          {/* Register Fields */}
          {!isLogin && (
            <>
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-12 h-12 text-base"
                    placeholder="Votre nom"
                    required
                  />
                </div>
              </div>

              {/* Account Type - Uber style selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Type de compte
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'INDIVIDUAL' })}
                    className={`h-14 rounded-lg border-2 font-medium text-sm transition-all ${
                      formData.accountType === 'INDIVIDUAL'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: 'BUSINESS' })}
                    className={`h-14 rounded-lg border-2 font-medium text-sm transition-all ${
                      formData.accountType === 'BUSINESS'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    Entreprise
                  </button>
                </div>
              </div>

              {/* Business Fields */}
              {formData.accountType === 'BUSINESS' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Nom de l'entreprise
                    </label>
                    <Input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="h-12 text-base"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Matricule fiscale <span className="text-muted-foreground">(optionnel)</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="h-12 text-base"
                      placeholder="Matricule fiscale"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Submit Button - Uber style with proper height */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold mt-8"
            size="lg"
          >
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
          </Button>
        </form>

        {/* Toggle Login/Register - Uber style */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {isLogin ? "Pas de compte ? Créer un compte" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>

        {/* Terms - Bottom */}
        <div className="mt-auto pt-8">
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="text-primary hover:underline">Conditions d'utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="text-primary hover:underline">Politique de confidentialité</a>
          </p>
        </div>
      </div>
    </div>
  );
}
