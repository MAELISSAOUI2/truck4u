'use client';

import Link from 'next/link';
import {
  Truck, Users, Shield, Clock, MapPin, Star, ArrowRight,
  CheckCircle, TrendingUp, Zap, Lock, Phone, MessageSquare,
  Menu, X
} from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Truck4u
              </h1>
            </Link>

            <nav className="hidden md:flex gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition text-sm font-medium">
                Fonctionnalités
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition text-sm font-medium">
                Comment ça marche
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition text-sm font-medium">
                Tarifs
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition text-sm font-medium">
                Contact
              </a>
            </nav>

            <div className="hidden md:flex gap-3">
              <Link href="/customer/login" className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition">
                Connexion
              </Link>
              <Link href="/customer/login" className="btn-primary text-sm">
                Commencer
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-4 border-t border-border mt-4 space-y-4">
              <a href="#features" className="block text-sm font-medium">Fonctionnalités</a>
              <a href="#how-it-works" className="block text-sm font-medium">Comment ça marche</a>
              <a href="#pricing" className="block text-sm font-medium">Tarifs</a>
              <a href="#contact" className="block text-sm font-medium">Contact</a>
              <div className="flex flex-col gap-3 pt-4">
                <Link href="/customer/login" className="px-4 py-2 text-sm font-medium text-center text-primary hover:bg-primary/5 rounded-lg transition">
                  Connexion
                </Link>
                <Link href="/customer/login" className="btn-primary text-sm justify-center">
                  Commencer
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Logistique n°1 en Tunisie</span>
              </div>

              <h1 className="mb-6">
                Transport rapide et sécurisé
              </h1>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                Connectez-vous avec des chauffeurs vérifiés pour tous vos besoins de transport. Enchères en temps réel, paiement sécurisé, suivi GPS en direct.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/customer/login" className="btn-primary gap-2 justify-center sm:justify-start">
                  <Users className="w-5 h-5" />
                  Je suis Client
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link href="/driver/login" className="btn-outline gap-2 justify-center sm:justify-start">
                  <Truck className="w-5 h-5" />
                  Je suis Chauffeur
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold">100% Sécurisé</p>
                    <p className="text-muted-foreground text-xs">Vérification stricte</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
                    <Star className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">4.8/5 - 1200+ avis</p>
                    <p className="text-muted-foreground text-xs">Clients satisfaits</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden md:block">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-2xl" />

              <div className="relative bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Point de départ</p>
                        <p className="text-white font-semibold">Tunis Centre-Ville</p>
                      </div>
                    </div>

                    <div className="h-6 border-l-2 border-white/30 ml-5 mb-3" />

                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Destination</p>
                        <p className="text-white font-semibold">La Marsa</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/80 text-sm">Prix estimé</span>
                      <span className="text-3xl font-bold text-white">35-45 DT</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>12 chauffeurs disponibles</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">Pourquoi choisir Truck4u?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              La plateforme la plus complète pour vos besoins de transport en Tunisie
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Chauffeurs Vérifiés',
                description: 'Vérification stricte : CIN, permis de conduire, carte grise et attestations professionnelles',
                color: 'primary'
              },
              {
                icon: Zap,
                title: 'Enchères en Temps Réel',
                description: 'Recevez plusieurs offres en quelques minutes. Comparez et choisissez le meilleur prix',
                color: 'secondary'
              },
              {
                icon: MapPin,
                title: 'Suivi GPS en Direct',
                description: 'Suivez votre chauffeur en temps réel sur la carte, du ramassage à la livraison',
                color: 'accent'
              },
              {
                icon: Clock,
                title: 'Service Rapide',
                description: 'Transport livré en quelques heures. Service urgent disponible 24/7',
                color: 'primary'
              },
              {
                icon: Lock,
                title: 'Paiement Sécurisé',
                description: 'Transactions chiffrées et garantie de remboursement si insatisfait',
                color: 'secondary'
              },
              {
                icon: TrendingUp,
                title: 'Tarifs Compétitifs',
                description: 'Système d\'enchères inversées pour les meilleurs prix du marché',
                color: 'accent'
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              const colorClass = feature.color === 'primary' ? 'bg-primary/10 text-primary' :
                                feature.color === 'secondary' ? 'bg-secondary/10 text-secondary' :
                                'bg-accent/10 text-accent';

              return (
                <div key={i} className="card p-8 hover:shadow-md transition-all hover:-translate-y-1">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${colorClass} mb-6`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">Comment ça marche?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              4 étapes simples pour commander votre transport
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
            {[
              { num: 1, title: 'Créez votre demande', desc: 'Indiquez votre itinéraire et type de véhicule' },
              { num: 2, title: 'Recevez des offres', desc: 'Les chauffeurs proches vous envoient leurs tarifs' },
              { num: 3, title: 'Acceptez la meilleure', desc: 'Comparez les prix et notes, puis confirmez' },
              { num: 4, title: 'Suivi en direct', desc: 'Tracking GPS et paiement sécurisé' }
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="card p-6 text-center h-full flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg mx-auto mb-4">
                    {step.num}
                  </div>
                  <h4 className="font-bold mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-12 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4">Tarifs transparents</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pas de frais cachés. Vous voyez le prix avant de confirmer
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🚙', name: 'Pickup', price: 'À partir de 15 DT', capacity: '500 kg' },
              { icon: '🚐', name: 'Camionnette', price: 'À partir de 25 DT', capacity: '1 tonne' },
              { icon: '🚚', name: 'Camion', price: 'À partir de 45 DT', capacity: '3+ tonnes' }
            ].map((vehicle, i) => (
              <div key={i} className="card p-8 text-center hover:shadow-md hover:border-primary/50 transition-all">
                <div className="text-5xl mb-4">{vehicle.icon}</div>
                <h3 className="text-xl font-bold mb-2">{vehicle.name}</h3>
                <p className="text-3xl font-bold text-primary mb-2">{vehicle.price}</p>
                <p className="text-sm text-muted-foreground">{vehicle.capacity}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary via-secondary to-accent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-4 text-white">Prêt à commencer?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui font confiance à Truck4u pour leurs besoins de transport
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/customer/login" className="px-8 py-4 rounded-lg font-bold text-primary bg-white hover:bg-white/90 transition-all shadow-lg inline-flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Devenir Client
            </Link>
            <Link href="/driver/login" className="px-8 py-4 rounded-lg font-bold text-white bg-white/20 hover:bg-white/30 border-2 border-white transition-all inline-flex items-center justify-center gap-2">
              <Truck className="w-5 h-5" />
              Devenir Chauffeur
            </Link>
          </div>

          <p className="text-white/70 text-sm mt-8">
            Pas de frais cachés • Support 24/7 • Satisfaction garantie
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-6 h-6" />
                <span className="font-bold text-lg">Truck4u</span>
              </div>
              <p className="text-white/60 text-sm">
                Plateforme logistique on-demand #1 en Tunisie
              </p>
            </div>

            <div>
              <h5 className="font-bold mb-4">Entreprise</h5>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition">À propos</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Carrières</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold mb-4">Support</h5>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white transition">Sécurité</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold mb-4">Légal</h5>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition">CGU</a></li>
                <li><a href="#" className="hover:text-white transition">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-white/60">
                © 2024 Truck4u. Tous droits réservés.
              </p>
              <div className="flex gap-4 mt-4 md:mt-0">
                <a href="#" className="text-white/60 hover:text-white transition">
                  <Phone className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/60 hover:text-white transition">
                  <MessageSquare className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
