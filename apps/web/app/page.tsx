'use client';

import Link from 'next/link';
import { Truck, Users, Shield, Clock, MapPin, Star, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Truck4u</h1>
          </div>
          <nav className="hidden md:flex gap-6">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition">Fonctionnalités</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition">Comment ça marche</a>
            <a href="#contact" className="text-gray-600 hover:text-blue-600 transition">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🚀 Plateforme N°1 en Tunisie
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Transport rapide et sécurisé en Tunisie
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Connectez-vous avec des chauffeurs vérifiés pour tous vos besoins de transport. 
              Enchères en temps réel, paiement sécurisé, tracking GPS.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/customer/login">
                <div className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Je suis Client
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              
              <Link href="/driver/login">
                <div className="group bg-white border-2 border-gray-200 hover:border-blue-600 text-gray-900 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Je suis Chauffeur
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span>100% Sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span>4.8/5 sur 1200+ avis</span>
              </div>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Point de départ</p>
                    <p className="font-semibold text-gray-900">Tunis Centre-Ville</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-semibold text-gray-900">La Marsa</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Prix estimé</span>
                  <span className="text-2xl font-bold text-blue-600">35-45 TND</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>12 chauffeurs disponibles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir Truck4u ?
            </h3>
            <p className="text-xl text-gray-600">
              La plateforme la plus complète pour vos besoins de transport
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-blue-50 rounded-2xl p-8 hover:shadow-lg transition">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Chauffeurs Vérifiés</h4>
              <p className="text-gray-600">
                Vérification stricte : CIN, permis de conduire, carte grise, et attestations professionnelles.
              </p>
            </div>

            <div className="bg-green-50 rounded-2xl p-8 hover:shadow-lg transition">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Enchères en Temps Réel</h4>
              <p className="text-gray-600">
                Recevez plusieurs offres en quelques minutes. Comparez et choisissez le meilleur prix.
              </p>
            </div>

            <div className="bg-purple-50 rounded-2xl p-8 hover:shadow-lg transition">
              <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Suivi GPS en Direct</h4>
              <p className="text-gray-600">
                Suivez votre chauffeur en temps réel sur la carte, du ramassage à la livraison.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comment ça marche ?
            </h3>
            <p className="text-xl text-gray-600">
              Simple, rapide et efficace
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: 1, title: 'Créez votre demande', desc: 'Indiquez votre itinéraire et le type de véhicule nécessaire' },
              { num: 2, title: 'Recevez des offres', desc: 'Les chauffeurs proches vous envoient leurs tarifs' },
              { num: 3, title: 'Choisissez le meilleur', desc: 'Comparez les prix et les notes, puis acceptez' },
              { num: 4, title: 'Suivez en direct', desc: 'Tracking GPS et paiement sécurisé à la livraison' }
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-blue-600 transition">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-4">
                    {step.num}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-gray-600 text-sm">{step.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-blue-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à commencer ?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui font confiance à Truck4u pour leurs besoins de transport
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/customer/login">
              <div className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl">
                Commander un transport
              </div>
            </Link>
            <Link href="/driver/login">
              <div className="bg-blue-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-800 transition-all border-2 border-white/20">
                Devenir chauffeur partenaire
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-6 h-6" />
                <span className="font-bold text-lg">Truck4u</span>
              </div>
              <p className="text-gray-400 text-sm">
                Plateforme logistique on-demand #1 en Tunisie
              </p>
            </div>
            <div>
              <h5 className="font-bold mb-4">Entreprise</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">À propos</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carrières</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Support</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white">Sécurité</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Légal</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">CGU</a></li>
                <li><a href="#" className="hover:text-white">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2024 Truck4u. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
