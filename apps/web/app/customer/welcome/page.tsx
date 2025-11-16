'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  TruckIcon,
  MapPin,
  DollarSign,
  Bell,
  Star,
  ArrowRight,
  Check,
  X
} from 'lucide-react';
import { Card, AnimatedPage } from '@/components/ui';
import { Button } from '@mantine/core';
import { useAuthStore } from '@/lib/store';

interface TourStep {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  color: string;
}

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [showTour, setShowTour] = useState(true);

  const tourSteps: TourStep[] = [
    {
      id: 1,
      icon: <Sparkles className="w-12 h-12" />,
      title: `Bienvenue ${user?.name} ! 🎉`,
      description: 'Votre compte est créé avec succès. Laissez-nous vous montrer comment utiliser Truck4u en 3 étapes simples.',
      color: 'from-blue-600 to-indigo-600'
    },
    {
      id: 2,
      icon: <MapPin className="w-12 h-12" />,
      title: 'Créez votre première course',
      description: 'Indiquez vos adresses de départ et de livraison. Sélectionnez le type de véhicule dont vous avez besoin et ajoutez les détails de votre marchandise.',
      color: 'from-green-600 to-emerald-600'
    },
    {
      id: 3,
      icon: <DollarSign className="w-12 h-12" />,
      title: 'Comparez et choisissez',
      description: 'Recevez plusieurs offres de chauffeurs vérifiés en quelques minutes. Comparez les prix, consultez les avis, puis acceptez la meilleure offre.',
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 4,
      icon: <Star className="w-12 h-12" />,
      title: 'Suivez et évaluez',
      description: 'Suivez votre course en temps réel sur la carte. Une fois la livraison terminée, évaluez votre expérience pour aider la communauté.',
      color: 'from-amber-600 to-orange-600'
    }
  ];

  const handleSkipTour = () => {
    setShowTour(false);
    router.push('/customer/dashboard');
  };

  const handleNextStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      setCurrentTourStep(currentTourStep + 1);
    } else {
      handleSkipTour();
    }
  };

  const handlePrevStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(currentTourStep - 1);
    }
  };

  const handleStartFirstRide = () => {
    router.push('/customer/new-ride');
  };

  if (!showTour) {
    return null;
  }

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          {/* Skip button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end mb-4"
          >
            <Button variant="subtle" onClick={handleSkipTour} leftSection={<X className="w-4 h-4" />}>
              Passer le tour
            </Button>
          </motion.div>

          {/* Tour Card */}
          <Card padding="none" className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTourStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Gradient Header */}
                <div className={`bg-gradient-to-r ${tourSteps[currentTourStep].color} p-12 text-white text-center`}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6"
                  >
                    {tourSteps[currentTourStep].icon}
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold mb-4"
                  >
                    {tourSteps[currentTourStep].title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg opacity-90 max-w-2xl mx-auto"
                  >
                    {tourSteps[currentTourStep].description}
                  </motion.p>
                </div>

                {/* Content */}
                <div className="p-8">
                  {/* Step indicators */}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    {tourSteps.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => setCurrentTourStep(index)}
                        className="group relative"
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                            index === currentTourStep
                              ? 'bg-blue-600 text-white scale-110'
                              : index < currentTourStep
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {index < currentTourStep ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            step.id
                          )}
                        </div>

                        {/* Connector line */}
                        {index < tourSteps.length - 1 && (
                          <div className="absolute top-1/2 left-full w-12 h-1 -translate-y-1/2">
                            <div
                              className={`h-full rounded-full transition-all ${
                                index < currentTourStep ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                            />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Features preview based on step */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 mb-8"
                  >
                    {currentTourStep === 0 && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 mb-4">Ce que vous pouvez faire :</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {[
                            { icon: <TruckIcon className="w-5 h-5" />, text: 'Commander des transports en quelques clics' },
                            { icon: <DollarSign className="w-5 h-5" />, text: 'Comparer les prix en temps réel' },
                            { icon: <MapPin className="w-5 h-5" />, text: 'Suivre vos courses sur la carte' },
                            { icon: <Bell className="w-5 h-5" />, text: 'Recevoir des notifications instantanées' }
                          ].map((feature, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.1 }}
                              className="flex items-center gap-3 bg-white p-4 rounded-xl"
                            >
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                {feature.icon}
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {feature.text}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentTourStep === 1 && (
                      <div className="text-center">
                        <div className="bg-white rounded-xl p-6 max-w-md mx-auto">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-100 p-3 rounded-xl">
                              <MapPin className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm text-gray-500">Départ</p>
                              <p className="font-semibold">Tunis Centre-Ville</p>
                            </div>
                          </div>
                          <div className="border-t border-gray-200 my-4" />
                          <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-3 rounded-xl">
                              <MapPin className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm text-gray-500">Arrivée</p>
                              <p className="font-semibold">La Marsa</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentTourStep === 2 && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 mb-4">Exemple d'offres reçues :</h3>
                        {[
                          { name: 'Ahmed K.', rating: 4.9, price: 35, trips: 245 },
                          { name: 'Mohamed S.', rating: 4.8, price: 38, trips: 180 },
                          { name: 'Karim B.', rating: 4.7, price: 40, trips: 156 }
                        ].map((driver, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="bg-white p-4 rounded-xl flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full" />
                              <div>
                                <p className="font-semibold text-gray-900">{driver.name}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, j) => (
                                      <Star
                                        key={j}
                                        className="w-3 h-3 fill-yellow-400 text-yellow-400"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {driver.rating} · {driver.trips} courses
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">{driver.price} DT</p>
                              <p className="text-xs text-gray-500">Estimé</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {currentTourStep === 3 && (
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: [0, 5, 0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="inline-block"
                        >
                          <Star className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Votre avis compte !
                        </h3>
                        <p className="text-gray-600">
                          Après chaque course, partagez votre expérience pour aider les autres utilisateurs à faire le bon choix.
                        </p>
                      </div>
                    )}
                  </motion.div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={handlePrevStep}
                      disabled={currentTourStep === 0}
                    >
                      Précédent
                    </Button>

                    <div className="text-sm text-gray-500">
                      {currentTourStep + 1} / {tourSteps.length}
                    </div>

                    {currentTourStep === tourSteps.length - 1 ? (
                      <Button
                        onClick={handleStartFirstRide}
                        leftSection={<TruckIcon className="w-5 h-5" />}
                      >
                        Créer ma première course
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextStep}
                        rightSection={<ArrowRight className="w-5 h-5" />}
                      >
                        Suivant
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
}
