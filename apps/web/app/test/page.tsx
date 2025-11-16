'use client';

import { motion } from 'framer-motion';
import { TruckIcon } from 'lucide-react';
import { Button } from '@mantine/core';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          🎨 Test des Composants Modernes
        </h1>

        {/* Test 1: Gradients */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">1. Test des Gradients</h2>

          <div className="space-y-4">
            <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <p className="text-white font-bold">Gradient Bleu → Indigo</p>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-0.5 rounded-xl">
              <div className="bg-white rounded-xl p-4">
                <p className="font-semibold">Bordure gradient</p>
              </div>
            </div>

            <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Texte avec gradient
            </h3>
          </div>
        </div>

        {/* Test 2: Animations Framer Motion */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">2. Test des Animations</h2>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-100 p-4 rounded-lg"
            >
              <p className="font-semibold">Animation fade in + slide (si vous voyez ceci, framer-motion marche ✅)</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-indigo-100 p-4 rounded-lg cursor-pointer"
            >
              <p className="font-semibold">Survolez-moi ! (hover + tap animation)</p>
            </motion.div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto"
            />
            <p className="text-center text-sm text-gray-600">Rotation infinie</p>
          </div>
        </div>

        {/* Test 3: Boutons */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">3. Test des Boutons</h2>

          <div className="space-y-4">
            <Button variant="primary" size="lg" fullWidth>
              Bouton Primary (gradient bleu)
            </Button>

            <Button variant="secondary" size="lg" fullWidth>
              Bouton Secondary (gris)
            </Button>

            <Button variant="outline" size="lg" fullWidth>
              Bouton Outline
            </Button>

            <Button variant="danger" size="lg" fullWidth>
              Bouton Danger (rouge)
            </Button>

            <Button variant="ghost" size="lg" fullWidth>
              Bouton Ghost (transparent)
            </Button>
          </div>
        </div>

        {/* Test 4: Icons */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">4. Test des Icônes</h2>

          <div className="flex items-center justify-center gap-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl">
              <TruckIcon className="w-12 h-12 text-white" />
            </div>

            <div className="bg-blue-100 p-4 rounded-2xl">
              <TruckIcon className="w-12 h-12 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Test 5: Shadows */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">5. Test des Ombres</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm font-semibold text-center">Shadow SM</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-sm font-semibold text-center">Shadow MD</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-2xl">
              <p className="text-sm font-semibold text-center">Shadow 2XL</p>
            </div>
          </div>
        </div>

        {/* Diagnostic */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-yellow-900">📋 Diagnostic</h2>
          <div className="space-y-2 text-sm">
            <p><strong>✅ Si vous voyez des gradients bleus/violets</strong> : Tailwind fonctionne</p>
            <p><strong>✅ Si les animations tournent/bougent</strong> : Framer Motion fonctionne</p>
            <p><strong>✅ Si les boutons ont des ombres</strong> : Les styles sont bien appliqués</p>
            <p><strong>❌ Si tout est plat et gris</strong> : Problème de compilation Tailwind</p>
          </div>
        </div>

        <div className="text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => window.location.href = '/'}
          >
            ← Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
