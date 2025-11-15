'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  TruckIcon,
  Users,
  MapPin,
  Clock,
  Shield,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Award,
  TrendingUp,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Réponse Ultra-Rapide',
      description: 'Recevez des offres de chauffeurs qualifiés en moins de 3 minutes',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Chauffeurs Certifiés',
      description: 'Vérification complète : permis, assurance, antécédents',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Prix Transparents',
      description: 'Comparez les offres et choisissez le meilleur tarif',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Suivi GPS Temps Réel',
      description: 'Suivez votre livraison en direct sur la carte',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Créez votre demande',
      description: 'En 2 minutes : adresses, type de véhicule, détails de la marchandise',
      icon: <TruckIcon className="w-8 h-8" />
    },
    {
      number: '02',
      title: 'Recevez les offres',
      description: 'Les chauffeurs disponibles vous envoient leurs propositions',
      icon: <Users className="w-8 h-8" />
    },
    {
      number: '03',
      title: 'Choisissez & Suivez',
      description: 'Acceptez la meilleure offre et suivez votre course en temps réel',
      icon: <CheckCircle2 className="w-8 h-8" />
    }
  ];

  const stats = [
    { value: '5,000+', label: 'Courses réalisées', icon: <TruckIcon /> },
    { value: '500+', label: 'Chauffeurs actifs', icon: <Users /> },
    { value: '4.9/5', label: 'Note moyenne', icon: <Star /> },
    { value: '< 3min', label: 'Temps de réponse', icon: <Clock /> }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Header with Glass Effect */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="bg-gradient-primary p-2.5 rounded-2xl shadow-lg">
                <TruckIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-primary">Truck4u</h1>
                <p className="text-xs text-gray-500 font-medium">Transport Premium</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="ghost"
                onClick={() => router.push('/customer/login')}
                className="hidden sm:inline-flex"
              >
                Connexion
              </Button>
              <Button onClick={() => router.push('/customer/onboarding')}>
                Commencer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section with Gradient Mesh */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-mesh">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="container-custom relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  #1 Plateforme de Transport en Tunisie
                </span>
              </div>

              <h1 className="text-6xl lg:text-7xl font-bold leading-tight mb-6">
                Transport de{' '}
                <span className="text-gradient-primary">marchandises</span>
                <br />
                simplifié
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Connectez-vous instantanément avec des chauffeurs vérifiés.
                Comparez les prix, suivez vos livraisons en temps réel.
                <strong className="text-gray-900"> Simple. Rapide. Fiable.</strong>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  onClick={() => router.push('/customer/onboarding')}
                  className="btn-primary text-lg px-8 py-4 shadow-xl hover:shadow-2xl"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Je suis Client
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/driver/register')}
                  className="btn-outline text-lg px-8 py-4"
                >
                  <TruckIcon className="w-5 h-5 mr-2" />
                  Je suis Chauffeur
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 items-center">
                {[
                  { icon: <Shield className="w-5 h-5" />, text: '100% Sécurisé' },
                  { icon: <Award className="w-5 h-5" />, text: 'Chauffeurs Certifiés' },
                  { icon: <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />, text: '4.9/5 sur 1,200+ avis' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-2 text-gray-700"
                  >
                    <div className="text-green-600">{item.icon}</div>
                    <span className="font-medium text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Visual - Modern Card Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Main Card */}
                <div className="card-elevated p-8 bg-white">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Votre prochaine course</p>
                      <h3 className="text-2xl font-bold text-gray-900">Tunis → Sfax</h3>
                    </div>
                    <div className="bg-gradient-success px-4 py-2 rounded-xl">
                      <span className="text-white font-bold text-lg">150 DT</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Départ</p>
                        <p className="font-semibold">15 Avenue Habib Bourguiba</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 p-2 rounded-lg">
                        <MapPin className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Arrivée</p>
                        <p className="font-semibold">Route de Tunis, Sfax</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-3">3 offres reçues</p>
                    <div className="space-y-2">
                      {[145, 150, 155].map((price, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                            <div>
                              <p className="font-semibold text-sm">Chauffeur {i + 1}</p>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, j) => (
                                  <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="font-bold text-blue-600">{price} DT</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-gradient-warm px-6 py-3 rounded-2xl shadow-xl"
                >
                  <p className="text-white font-bold text-sm">-30% Premier Transport</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section bg-white border-y border-gray-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                  <div className="text-blue-600">{stat.icon}</div>
                </div>
                <h3 className="text-4xl font-bold text-gradient-primary mb-2">{stat.value}</h3>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-gradient-mesh">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-4">
              Pourquoi choisir <span className="text-gradient-primary">Truck4u</span> ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              La plateforme la plus avancée pour vos besoins de transport en Tunisie
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <div className="card-elevated p-6 h-full hover:shadow-2xl transition-all duration-300">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">{feature.icon}</div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-4">Comment ça marche ?</h2>
            <p className="text-xl text-gray-600">Simple comme 1, 2, 3</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-1/3 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-20"></div>

            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative"
              >
                <div className="card-elevated p-8 text-center hover:shadow-2xl transition-all duration-300">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-6 mx-auto">
                    <div className="text-white">{step.icon}</div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-white border-4 border-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{step.number}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button
              size="lg"
              onClick={() => router.push('/customer/onboarding')}
              className="btn-primary text-lg px-10 py-4 shadow-xl"
            >
              Commencer maintenant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-5xl font-bold mb-6">Prêt à commencer ?</h2>
            <p className="text-xl mb-10 opacity-90">
              Rejoignez des milliers d'utilisateurs satisfaits et simplifiez vos transports dès aujourd'hui
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => router.push('/customer/onboarding')}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-10 py-4 shadow-2xl"
              >
                Créer un compte gratuit
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/driver/register')}
                className="border-2 border-white text-white hover:bg-white/10 text-lg px-10 py-4"
              >
                Devenir chauffeur
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="container-custom">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-primary p-2 rounded-xl">
                  <TruckIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Truck4u</span>
              </div>
              <p className="text-sm leading-relaxed">
                La plateforme de transport de marchandises la plus simple et rapide de Tunisie.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white transition">Tarifs</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">À propos</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Carrières</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+216 XX XXX XXX</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>contact@truck4u.tn</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 Truck4u. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
