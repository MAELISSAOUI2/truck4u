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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Uber style */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl">
                <TruckIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Truck4u</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/customer/login')}
              >
                Se connecter
              </Button>
              <Button
                onClick={() => router.push('/customer/register')}
                size="lg"
              >
                Commencer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean Uber style */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Transport de marchandises simple et rapide
                </h1>
                <p className="text-xl text-muted-foreground">
                  Connectez-vous avec des transporteurs vérifiés en Tunisie. Obtenez des devis en moins de 3 minutes.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => router.push('/customer/register')}
                  size="lg"
                  className="text-lg h-14 px-8"
                >
                  Demander un transport
                </Button>
                <Button
                  onClick={() => router.push('/driver/register')}
                  variant="outline"
                  size="lg"
                  className="text-lg h-14 px-8"
                >
                  Devenir transporteur
                </Button>
              </div>
            </div>

            {/* Right - Simple Illustration */}
            <div className="bg-primary/5 rounded-2xl p-12 text-center">
              <TruckIcon className="w-48 h-48 mx-auto text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Uber style */}
      <section className="bg-gray-50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">5,000+</div>
              <div className="text-muted-foreground font-medium">Courses réalisées</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">500+</div>
              <div className="text-muted-foreground font-medium">Transporteurs actifs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">4.9/5</div>
              <div className="text-muted-foreground font-medium">Note moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">24/7</div>
              <div className="text-muted-foreground font-medium">Support client</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Clean cards */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Pourquoi choisir Truck4u ?
            </h2>
            <p className="text-xl text-muted-foreground">
              Une plateforme moderne pour tous vos besoins de transport
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-8 border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Rapide et simple</h3>
              <p className="text-muted-foreground">
                Créez votre demande en quelques clics et recevez des offres en moins de 3 minutes.
              </p>
            </Card>

            <Card className="p-8 border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Transporteurs vérifiés</h3>
              <p className="text-muted-foreground">
                Tous nos transporteurs sont vérifiés et notés par la communauté.
              </p>
            </Card>

            <Card className="p-8 border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Package className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Suivi en temps réel</h3>
              <p className="text-muted-foreground">
                Suivez votre colis en temps réel avec notre système de tracking GPS.
              </p>
            </Card>

            <Card className="p-8 border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Star className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Meilleur prix</h3>
              <p className="text-muted-foreground">
                Comparez les offres et choisissez le meilleur rapport qualité-prix.
              </p>
            </Card>

            <Card className="p-8 border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Partout en Tunisie</h3>
              <p className="text-muted-foreground">
                Service disponible dans toute la Tunisie, des grandes villes aux zones rurales.
              </p>
            </Card>

            <Card className="p-8 border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Support 24/7</h3>
              <p className="text-muted-foreground">
                Notre équipe est disponible pour vous aider à tout moment.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Uber style */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Prêt à démarrer ?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Rejoignez des milliers d'utilisateurs qui font confiance à Truck4u
          </p>
          <Button
            onClick={() => router.push('/customer/register')}
            size="lg"
            variant="secondary"
            className="text-lg h-14 px-8"
          >
            Commencer maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-2 rounded-lg">
                  <TruckIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">Truck4u</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La plateforme #1 de transport de marchandises en Tunisie
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carrières</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2025 Truck4u. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
