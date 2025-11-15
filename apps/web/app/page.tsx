'use client';

import { useRouter } from 'next/navigation';
import {
  TruckIcon,
  Users,
  MapPin,
  Clock,
  Shield,
  Star,
  ArrowRight,
  CheckCircle,
  Package,
  DollarSign
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header - like Uber */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <TruckIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Truck4u</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/customer/login')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Se connecter
              </button>
              <button
                onClick={() => router.push('/customer/register')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Commencer
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean, no gradients */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Transport de marchandises simple et rapide
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Connectez-vous avec des transporteurs vérifiés en Tunisie. Obtenez des devis en moins de 3 minutes.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/customer/register')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-lg font-semibold transition-colors"
                >
                  Demander un transport
                </button>
                <button
                  onClick={() => router.push('/driver/register')}
                  className="px-8 py-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-lg rounded-lg font-semibold transition-colors"
                >
                  Devenir transporteur
                </button>
              </div>
            </div>

            {/* Right - Simple Image/Illustration */}
            <div className="bg-gray-100 rounded-2xl p-12 text-center">
              <TruckIcon className="w-48 h-48 mx-auto text-blue-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Simple, clean */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">5,000+</div>
              <div className="text-gray-600">Courses réalisées</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">500+</div>
              <div className="text-gray-600">Transporteurs actifs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">4.9/5</div>
              <div className="text-gray-600">Note moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">&lt; 3min</div>
              <div className="text-gray-600">Temps de réponse</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Simple 3 steps */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Comment ça marche</h2>
            <p className="text-xl text-gray-600">Trois étapes simples pour votre transport</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Créez votre demande</h3>
              <p className="text-gray-600">Indiquez vos adresses, type de véhicule et détails de marchandise</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Recevez les offres</h3>
              <p className="text-gray-600">Les transporteurs disponibles vous envoient leurs devis</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Choisissez et suivez</h3>
              <p className="text-gray-600">Acceptez la meilleure offre et suivez votre livraison en temps réel</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Clean cards */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Pourquoi Truck4u</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapide</h3>
              <p className="text-gray-600 text-sm">Réponse en moins de 3 minutes</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sécurisé</h3>
              <p className="text-gray-600 text-sm">Transporteurs vérifiés et assurés</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Transparent</h3>
              <p className="text-gray-600 text-sm">Prix clairs, sans surprise</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Suivi GPS</h3>
              <p className="text-gray-600 text-sm">Suivez votre livraison en direct</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Simple */}
      <section className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Prêt à commencer ?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Créez votre compte gratuitement en 2 minutes
          </p>
          <button
            onClick={() => router.push('/customer/register')}
            className="px-8 py-4 bg-white text-blue-600 text-lg rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Créer un compte gratuit
          </button>
        </div>
      </section>

      {/* Footer - Simple */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TruckIcon className="w-6 h-6" />
                <span className="text-lg font-bold">Truck4u</span>
              </div>
              <p className="text-gray-400 text-sm">
                La plateforme de transport de marchandises en Tunisie
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white">Tarifs</a></li>
                <li><a href="#" className="hover:text-white">Sécurité</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">À propos</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carrières</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">CGU</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            © 2024 Truck4u. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
