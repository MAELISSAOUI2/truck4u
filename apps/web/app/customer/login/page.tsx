'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Phone, User, Building2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    phone: '+216',
    name: '',
    email: '',
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition">
          <ArrowLeft className="w-5 h-5" />
          Retour à l'accueil
        </Link>

        {/* Card */}
        <div className="card p-8 shadow-lg">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            {isLogin ? 'Connexion Client' : 'Créer un compte'}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {isLogin ? 'Connectez-vous pour commander un transport' : 'Rejoignez Truck4u en quelques secondes'}
          </p>

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

            {/* Register only fields */}
            {!isLogin && (
              <>
                {/* Account Type */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Type de compte
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, accountType: 'INDIVIDUAL' })}
                      className={`py-3 px-4 rounded-lg border-2 font-semibold transition ${
                        formData.accountType === 'INDIVIDUAL'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-foreground'
                      }`}
                    >
                      Particulier
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, accountType: 'BUSINESS' })}
                      className={`py-3 px-4 rounded-lg border-2 font-semibold transition ${
                        formData.accountType === 'BUSINESS'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-foreground'
                      }`}
                    >
                      Entreprise
                    </button>
                  </div>
                </div>

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
                      placeholder="Votre nom"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre@email.com"
                    className="input"
                  />
                </div>

                {/* Business fields */}
                {formData.accountType === 'BUSINESS' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Nom de l'entreprise
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Nom de votre entreprise"
                          className="input pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Matricule fiscale
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        placeholder="Matricule fiscale"
                        className="input"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-50"
            >
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
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
                className="font-semibold text-primary hover:text-primary/80 transition"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </div>

          {/* Legal note */}
          <p className="mt-6 text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="text-primary hover:underline">
              Conditions d'utilisation
            </a>{' '}
            et notre{' '}
            <a href="#" className="text-primary hover:underline">
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
