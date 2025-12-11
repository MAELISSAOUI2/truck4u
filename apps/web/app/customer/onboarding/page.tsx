'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Building2,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles
} from 'lucide-react';
import { Input, Card, ProgressSteps, AnimatedPage } from '@/components/ui';
import { Button } from '@mantine/core';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface OnboardingData {
  // Step 1
  accountType: 'INDIVIDUAL' | 'BUSINESS';

  // Step 2
  name: string;
  companyName?: string;

  // Step 3
  phone: string;
  email?: string;

  // Step 4
  address: string;
}

export default function CustomerOnboardingPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<OnboardingData>({
    accountType: 'INDIVIDUAL',
    name: '',
    companyName: '',
    phone: '+216',
    email: '',
    address: ''
  });

  const steps = [
    { id: 1, title: 'Type de compte', description: 'Particulier ou entreprise' },
    { id: 2, title: 'Identité', description: 'Vos informations' },
    { id: 3, title: 'Contact', description: 'Téléphone et email' },
    { id: 4, title: 'Adresse', description: 'Votre localisation' }
  ];

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!data.accountType;
      case 2:
        if (data.accountType === 'BUSINESS') {
          return !!data.name && !!data.companyName;
        }
        return !!data.name;
      case 3:
        return !!data.phone && data.phone.length >= 12;
      case 4:
        return !!data.address && data.address.length >= 5;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setError('');
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authApi.registerCustomer({
        ...data,
        password: data.phone.slice(-4) // Simple password for demo
      });

      if (response.data.token) {
        login(response.data.user, response.data.token);
        router.push('/customer/welcome');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Bienvenue sur Truck4u
              </h1>
            </div>
            <p className="text-gray-600">
              Quelques informations pour créer votre compte
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <ProgressSteps
              steps={steps}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
              allowSkip={false}
            />
          </motion.div>

          {/* Form Card */}
          <Card padding="lg" className="mb-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Account Type */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Quel type de compte souhaitez-vous créer ?
                    </h2>
                    <p className="text-gray-600">
                      Choisissez le type de compte qui correspond à vos besoins
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setData({ ...data, accountType: 'INDIVIDUAL' })}
                      className={`p-8 rounded-2xl border-2 transition-all ${
                        data.accountType === 'INDIVIDUAL'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <User className={`w-16 h-16 mx-auto mb-4 ${
                        data.accountType === 'INDIVIDUAL' ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <h3 className={`text-xl font-bold mb-2 ${
                        data.accountType === 'INDIVIDUAL' ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        Particulier
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Pour vos besoins personnels de transport
                      </p>
                      {data.accountType === 'INDIVIDUAL' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-4"
                        >
                          <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center mx-auto">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setData({ ...data, accountType: 'BUSINESS' })}
                      className={`p-8 rounded-2xl border-2 transition-all ${
                        data.accountType === 'BUSINESS'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Building2 className={`w-16 h-16 mx-auto mb-4 ${
                        data.accountType === 'BUSINESS' ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <h3 className={`text-xl font-bold mb-2 ${
                        data.accountType === 'BUSINESS' ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        Entreprise
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Pour vos besoins professionnels réguliers
                      </p>
                      {data.accountType === 'BUSINESS' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-4"
                        >
                          <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center mx-auto">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Identity */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Présentez-vous
                    </h2>
                    <p className="text-gray-600">
                      {data.accountType === 'BUSINESS'
                        ? 'Informations sur le responsable et l\'entreprise'
                        : 'Comment devons-nous vous appeler ?'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label={data.accountType === 'BUSINESS' ? 'Nom du responsable' : 'Nom complet'}
                      icon={<User className="w-5 h-5" />}
                      value={data.name}
                      onChange={(e) => setData({ ...data, name: e.target.value })}
                      placeholder="Ex: Mohamed Ben Ali"
                      required
                      success={data.name.length > 2}
                    />

                    {data.accountType === 'BUSINESS' && (
                      <Input
                        label="Nom de l'entreprise"
                        icon={<Building2 className="w-5 h-5" />}
                        value={data.companyName}
                        onChange={(e) => setData({ ...data, companyName: e.target.value })}
                        placeholder="Ex: Transport Express SARL"
                        required
                        success={!!data.companyName && data.companyName.length > 2}
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Comment vous contacter ?
                    </h2>
                    <p className="text-gray-600">
                      Nous aurons besoin de votre numéro pour vous envoyer des notifications
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Numéro de téléphone"
                      type="tel"
                      icon={<Phone className="w-5 h-5" />}
                      value={data.phone}
                      onChange={(e) => setData({ ...data, phone: e.target.value })}
                      placeholder="+216 XX XXX XXX"
                      required
                      success={data.phone.length >= 12}
                      hint="Votre numéro servira pour les notifications SMS"
                    />

                    <Input
                      label="Email (optionnel)"
                      type="email"
                      value={data.email}
                      onChange={(e) => setData({ ...data, email: e.target.value })}
                      placeholder="email@exemple.com"
                      success={!!data.email && data.email.includes('@')}
                      hint="Pour recevoir des notifications par email"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 4: Address */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Où êtes-vous situé ?
                    </h2>
                    <p className="text-gray-600">
                      Nous utiliserons cette adresse pour vous proposer des chauffeurs à proximité
                    </p>
                  </div>

                  <div>
                    <Input
                      label="Adresse complète"
                      icon={<MapPin className="w-5 h-5" />}
                      value={data.address}
                      onChange={(e) => setData({ ...data, address: e.target.value })}
                      placeholder="Ex: 15 Avenue Habib Bourguiba, Tunis"
                      required
                      success={data.address.length >= 5}
                      hint="Rue, numéro, ville, code postal"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 rounded-xl p-6 space-y-3">
                    <p className="text-sm font-semibold text-blue-900 mb-4">
                      Récapitulatif de votre inscription
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Type de compte :</span>
                        <span className="font-medium text-gray-900">
                          {data.accountType === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Nom :</span>
                        <span className="font-medium text-gray-900">{data.name}</span>
                      </div>
                      {data.accountType === 'BUSINESS' && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Entreprise :</span>
                          <span className="font-medium text-gray-900">{data.companyName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Téléphone :</span>
                        <span className="font-medium text-gray-900">{data.phone}</span>
                      </div>
                      {data.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Email :</span>
                          <span className="font-medium text-gray-900">{data.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4"
              >
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="subtle"
                onClick={handleBack}
                disabled={currentStep === 1}
                leftSection={<ArrowLeft className="w-5 h-5" />}
              >
                Retour
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Étape {currentStep} sur {steps.length}
                </span>
              </div>

              <Button
                onClick={handleNext}
                loading={loading}
                disabled={!validateStep(currentStep)}
                rightSection={currentStep === 4 ? <Check className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              >
                {currentStep === 4 ? 'Créer mon compte' : 'Continuer'}
              </Button>
            </div>
          </Card>

          {/* Login link */}
          <p className="text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <button
              onClick={() => router.push('/customer/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </AnimatedPage>
  );
}
