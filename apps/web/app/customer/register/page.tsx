'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Phone, User, MapPin, Building2, Mail } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';

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
        password: formData.phone.slice(-4), // Simple password for demo
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

  const isPhoneValid = formData.phone.length >= 12;
  const isNameValid = formData.name.length >= 3;
  const isAddressValid = formData.address.length >= 10;

  return (
    <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.push('/')}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Retour à l'accueil</span>
          </motion.button>

          {/* Registration Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-2xl mb-6 shadow-xl"
              >
                <Users className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Inscription Client
              </h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Créez votre compte pour commencer à utiliser Truck4u et profiter de nos services de transport
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl"
              >
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type de compte
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, accountType: 'INDIVIDUAL' })}
                    className={`p-5 border-2 rounded-xl transition-all ${
                      formData.accountType === 'INDIVIDUAL'
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <User className={`h-7 w-7 mx-auto mb-2 ${
                      formData.accountType === 'INDIVIDUAL' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-semibold ${
                      formData.accountType === 'INDIVIDUAL' ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      Particulier
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, accountType: 'BUSINESS' })}
                    className={`p-5 border-2 rounded-xl transition-all ${
                      formData.accountType === 'BUSINESS'
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Building2 className={`h-7 w-7 mx-auto mb-2 ${
                      formData.accountType === 'BUSINESS' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-semibold ${
                      formData.accountType === 'BUSINESS' ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      Entreprise
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* Name */}
              <Input
                label={formData.accountType === 'BUSINESS' ? 'Nom du responsable' : 'Nom complet'}
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                icon={<User className="h-5 w-5" />}
                placeholder="Entrez votre nom"
                success={isNameValid}
                hint="Au moins 3 caractères"
              />

              {/* Company Name (if business) */}
              {formData.accountType === 'BUSINESS' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Input
                    label="Nom de l'entreprise"
                    type="text"
                    required={formData.accountType === 'BUSINESS'}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    icon={<Building2 className="h-5 w-5" />}
                    placeholder="Nom de votre entreprise"
                  />
                </motion.div>
              )}

              {/* Phone */}
              <Input
                label="Téléphone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                icon={<Phone className="h-5 w-5" />}
                placeholder="+216 XX XXX XXX"
                success={isPhoneValid}
                hint="Format: +216 XX XXX XXX"
              />

              {/* Email */}
              <Input
                label="Email (optionnel)"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                icon={<Mail className="h-5 w-5" />}
                placeholder="email@exemple.com"
                hint="Pour recevoir les notifications par email"
              />

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <textarea
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl transition-all outline-none resize-none ${
                      formData.address.length > 0
                        ? isAddressValid
                          ? 'border-green-500 focus:border-green-500 focus:ring-4 focus:ring-green-100 bg-green-50/30'
                          : 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/30'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                    placeholder="Votre adresse complète"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Au moins 10 caractères - Ex: 15 Avenue Habib Bourguiba, Tunis
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Créer mon compte
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/customer/login')}
                    className="text-blue-600 hover:text-blue-700 font-semibold transition"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </form>

            {/* Terms */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500 leading-relaxed">
                En créant un compte, vous acceptez nos{' '}
                <a href="#" className="text-blue-600 hover:underline font-medium">
                  Conditions d'utilisation
                </a>{' '}
                et notre{' '}
                <a href="#" className="text-blue-600 hover:underline font-medium">
                  Politique de confidentialité
                </a>
              </p>
            </div>
          </motion.div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid md:grid-cols-3 gap-4"
          >
            <div className="glass rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">🚀</div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Inscription rapide</h3>
              <p className="text-xs text-gray-600">En moins de 2 minutes</p>
            </div>

            <div className="glass rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">💳</div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Sans engagement</h3>
              <p className="text-xs text-gray-600">Aucune carte requise</p>
            </div>

            <div className="glass rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">🎁</div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Offre de bienvenue</h3>
              <p className="text-xs text-gray-600">10% sur votre 1ère course</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
