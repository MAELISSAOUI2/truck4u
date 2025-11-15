'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  ArrowLeft,
  Phone,
  User,
  Building2,
  CheckCircle,
  TruckIcon,
  Shield,
  Zap
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';

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
    <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding & Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block space-y-8"
          >
            {/* Logo & Tagline */}
            <div className="space-y-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-3"
              >
                <div className="bg-gradient-primary p-3 rounded-2xl shadow-lg">
                  <TruckIcon className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gradient-primary">Truck4u</h1>
              </motion.div>

              <h2 className="text-3xl font-bold text-gray-900">
                Votre plateforme de transport {isLogin ? 'vous attend' : 'de confiance'}
              </h2>
              <p className="text-lg text-gray-600">
                {isLogin
                  ? 'Connectez-vous pour accéder à vos commandes et suivre vos livraisons en temps réel.'
                  : 'Rejoignez des milliers de clients satisfaits et profitez d\'un service de transport rapide et fiable.'
                }
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-4 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/20"
              >
                <div className="bg-gradient-success p-2.5 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Livraison Rapide</h3>
                  <p className="text-sm text-gray-600">
                    Plus de 5,000 livraisons réussies avec un taux de satisfaction de 98%
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-4 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/20"
              >
                <div className="bg-gradient-primary p-2.5 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">100% Sécurisé</h3>
                  <p className="text-sm text-gray-600">
                    Vos données sont protégées avec un chiffrement de niveau bancaire
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-4 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/20"
              >
                <div className="bg-gradient-warm p-2.5 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Support 24/7</h3>
                  <p className="text-sm text-gray-600">
                    Notre équipe est disponible à tout moment pour vous aider
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Login/Register Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            {/* Back Button - Mobile */}
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition lg:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour à l'accueil</span>
            </button>

            {/* Form Card */}
            <div className="glass rounded-3xl p-8 shadow-xl border border-white/20">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="bg-gradient-primary w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>

              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {isLogin ? 'Connexion Client' : 'Créer un compte'}
                </h1>
                <p className="text-gray-600">
                  {isLogin
                    ? 'Connectez-vous pour commander un transport'
                    : 'Rejoignez Truck4u en quelques secondes'
                  }
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Phone */}
                <Input
                  label="Numéro de téléphone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  icon={<Phone className="w-5 h-5" />}
                  placeholder="+216 XX XXX XXX"
                  required
                />

                {/* Register Fields */}
                {!isLogin && (
                  <>
                    <Input
                      label="Nom complet"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      icon={<User className="w-5 h-5" />}
                      placeholder="Votre nom"
                      required
                    />

                    {/* Account Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Type de compte
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData({ ...formData, accountType: 'INDIVIDUAL' })}
                          className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                            formData.accountType === 'INDIVIDUAL'
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 shadow-md'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <User className={`w-5 h-5 mx-auto mb-1 ${
                            formData.accountType === 'INDIVIDUAL' ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          Particulier
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData({ ...formData, accountType: 'BUSINESS' })}
                          className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                            formData.accountType === 'BUSINESS'
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 shadow-md'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <Building2 className={`w-5 h-5 mx-auto mb-1 ${
                            formData.accountType === 'BUSINESS' ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          Entreprise
                        </motion.button>
                      </div>
                    </div>

                    {/* Business Fields */}
                    {formData.accountType === 'BUSINESS' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-5"
                      >
                        <Input
                          label="Nom de l'entreprise"
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          icon={<Building2 className="w-5 h-5" />}
                          placeholder="Nom de votre entreprise"
                        />

                        <Input
                          label="Matricule fiscale (optionnel)"
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                          placeholder="Matricule fiscale"
                        />
                      </motion.div>
                    )}
                  </>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  {isLogin ? 'Se connecter' : 'Créer mon compte'}
                </Button>
              </form>

              {/* Toggle Login/Register */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium transition"
                >
                  {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
                </button>
              </div>

              {/* Terms */}
              <p className="mt-6 text-xs text-center text-gray-500">
                En continuant, vous acceptez nos{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Conditions d'utilisation
                </a>{' '}
                et notre{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Politique de confidentialité
                </a>
              </p>
            </div>

            {/* Demo Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 glass rounded-xl p-4 border border-amber-200/50"
            >
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-xl">💡</span>
                <span className="text-amber-900">Mode Démo</span>
              </p>
              <p className="text-xs text-amber-800">
                Pour tester rapidement : utilisez n'importe quel numéro au format +216XXXXXXXX
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
