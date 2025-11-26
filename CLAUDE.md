# CLAUDE.md - Contexte Permanent du Projet Truck4u

**Dernière mise à jour :** 2025-11-26
**Branche principale :** `claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK`

---

## 📋 Description du Projet

**Truck4u** est une plateforme de mise en relation entre clients et transporteurs pour le transport de marchandises en Tunisie. Le système fonctionne selon un modèle de mise aux enchères (bidding) inspiré d'inDrive.

### Objectifs principaux :
- Permettre aux clients de créer des demandes de transport avec estimation de prix
- Permettre aux conducteurs de soumissionner sur les courses
- Système d'annulation avec pénalités (client: 5 DT après 5 min, conducteur: système de strikes)
- Administration complète (KYC, gestion conducteurs, tarification, analytics)
- Notifications temps réel via Socket.io
- Estimation de prix modulaire et configurable

---

## 🏗️ Stack Technique

### Frontend (`apps/web`)
- **Framework :** Next.js 14.2.33 (App Router)
- **React :** 18.2.0 (⚠️ **IMPORTANT:** Pinné exactement à 18.2.0, ne JAMAIS upgrader à React 19)
- **UI Libraries :**
  - Mantine 8.3.9 (composants principaux, notifications)
  - TailwindCSS 3.4.0 (styling)
  - Framer Motion 12.23.24 (animations)
- **State Management :** Zustand 4.5.0
- **Maps :** Leaflet (via dynamic import pour éviter SSR)
- **Routing :** OSRM (calcul distance/durée)
- **WebSockets :** Socket.io-client 4.7.2
- **Validation :** Zod 3.22.4

### Backend (`apps/api`)
- **Runtime :** Node.js + Express
- **Database :** PostgreSQL via Prisma ORM
- **WebSockets :** Socket.io 4.7.2
- **Authentication :** JWT (tokens stockés différemment pour admin vs client/driver)

### Database (`packages/database`)
- **ORM :** Prisma
- **Database :** PostgreSQL

---

## 📁 Architecture et Structure

```
truck4u/
├── apps/
│   ├── web/                    # Application Next.js frontend
│   │   ├── app/
│   │   │   ├── admin/         # Back-office administration
│   │   │   │   ├── dashboard/
│   │   │   │   ├── kyc/       # Vérification KYC
│   │   │   │   ├── drivers/   # Gestion conducteurs
│   │   │   │   ├── rides/     # Gestion courses
│   │   │   │   ├── pricing/   # Configuration tarification ⭐
│   │   │   │   └── analytics/
│   │   │   ├── customer/      # Interface client
│   │   │   │   ├── new-ride/  # Création course + estimation prix
│   │   │   │   ├── rides/     # Liste et détails courses
│   │   │   │   └── payment/   # Paiement
│   │   │   ├── driver/        # Interface conducteur
│   │   │   │   ├── dashboard/
│   │   │   │   ├── available-rides/
│   │   │   │   └── kyc/
│   │   │   ├── components/
│   │   │   │   └── notifications/  # Système notifs temps réel
│   │   │   ├── layout.tsx     # Root layout avec MantineProvider
│   │   │   └── providers.tsx  # Mantine + Notifications wrapper
│   │   └── lib/
│   │       ├── api.ts         # Client API avec intercepteurs
│   │       ├── socket.ts      # Configuration Socket.io
│   │       └── store.ts       # Stores Zustand
│   │
│   └── api/                   # Backend Express
│       └── src/
│           ├── routes/
│           │   ├── pricing.ts      # API estimation prix ⭐
│           │   ├── cancellations.ts
│           │   ├── rides.ts
│           │   ├── admin.ts
│           │   └── auth.ts
│           ├── middleware/
│           │   └── auth.ts         # verifyToken, requireAdmin
│           ├── services/
│           │   └── notifications.ts
│           └── socket.ts
│
└── packages/
    └── database/
        └── prisma/
            └── schema.prisma  # Modèles DB
```

---

## 🎯 Conventions de Code

### Commits Git
- **feat:** Nouvelle fonctionnalité
- **fix:** Correction de bug
- **style:** Changements de style/layout
- **refactor:** Refactoring sans changement fonctionnel
- **docs:** Documentation

### Nommage
- **Composants React :** PascalCase (`AddressAutocomplete`, `SimpleMap`)
- **Fichiers :** kebab-case ou PascalCase selon le contenu
- **Variables :** camelCase
- **Constantes :** UPPER_SNAKE_CASE
- **Routes API :** `/api/resource` ou `/api/resource/:id`

### TypeScript
- Utiliser Zod pour validation des schémas API
- Types dans les interfaces, pas `any`
- Préférer `interface` pour les objets, `type` pour les unions

---

## 🔧 Dépendances Critiques et Versions

### ⚠️ VERSIONS VERROUILLÉES (NE PAS MODIFIER)

```json
{
  "react": "18.2.0",              // ⚠️ Pinné exactement - Mantine incompatible avec React 19
  "react-dom": "18.2.0",          // ⚠️ Même version que React
  "@mantine/core": "^8.3.9",      // Compatible React 18 uniquement
  "@mantine/notifications": "^8.3.9",
  "@mantine/hooks": "^8.3.9",
  "@mantine/dates": "^8.3.9",
  "@mantine/dropzone": "^8.3.9"
}
```

### Overrides requis dans `apps/web/package.json`
```json
{
  "overrides": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

---

## ⚠️ Points d'Attention / Pièges à Éviter

### 1. React Version (CRITIQUE)
- **NE JAMAIS** upgrader React à la version 19.x
- Si `npm install` installe React 19 :
  1. Supprimer `node_modules` et `package-lock.json`
  2. Relancer `npm install`
  3. Vérifier avec `npm list react react-dom`

### 2. SSR et Composants Client
- **Leaflet/Maps** : Toujours utiliser `dynamic import` avec `ssr: false`
  ```tsx
  const SimpleMap = dynamic(() => import('@/components/SimpleMap'), {
    ssr: false,
    loading: () => <div>Chargement...</div>
  });
  ```

### 3. Authentication Middleware
- **Backend** : Utiliser `verifyToken` (pas `authenticateToken`)
- **User ID** : Accéder via `req.userId` (pas `req.user.id`)
- **Admin Token** : Stocké dans `localStorage.getItem('adminToken')`
- **Client/Driver Token** : Stocké dans Zustand store `truck4u-auth`

### 4. Prisma Imports
- **TOUJOURS** importer depuis le workspace package :
  ```typescript
  import { prisma } from '@truck4u/database';
  ```
- **JAMAIS** depuis un chemin relatif comme `'../lib/prisma'`

### 5. MantineProvider
- Doit wrapper toute l'app dans `app/providers.tsx`
- Le composant `Providers` doit être marqué `'use client'`
- Importer les CSS dans `layout.tsx`, pas dans `providers.tsx`

### 6. API Interceptor
- Vérifie d'abord `adminToken`, puis `truck4u-auth` store
- Exemple :
  ```typescript
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  ```

### 7. Pricing System
- Base de données doit être migrée avant utilisation
- Configs par défaut doivent être initialisées via admin UI
- Algorithme en 6 étapes (voir `apps/api/src/routes/pricing.ts`)

---

## 🗄️ Schéma Base de Données (Modèles Principaux)

### Pricing System
```prisma
VehiclePricing {
  vehicleType, pricePerKm, pricePerHour, minimumPrice
}

PricingConfig {
  convoyeurPrice, tripSimpleCoeff, tripReturnCoeff,
  peakHoursCoeff, nightHoursCoeff, weekendCoeff,
  trafficFluidCoeff, trafficMoyenCoeff, trafficDenseCoeff
}

PriceEstimate {
  vehicleType, distance, duration, tripType,
  basePrice, finalPrice, breakdown (JSON)
}
```

### Cancellations
```prisma
Cancellation {
  ride, cancelledBy (CUSTOMER/DRIVER),
  cancellationFee, withinGracePeriod, strikeIssued
}

DriverStrike {
  driver, cancellation, isActive
}
```

### Core Models
```prisma
User, Driver, Ride, Bid, KYCDocument, Payment
```

---

## 🚀 Commandes Utiles

### Développement
```bash
# Frontend
cd apps/web && npm run dev

# Backend
cd apps/api && npm run dev

# Full stack (depuis la racine)
npm run dev
```

### Database
```bash
# Créer migration
cd packages/database && npx prisma migrate dev --name <nom>

# Générer client
npx prisma generate

# Reset DB
npx prisma migrate reset
```

### Git
```bash
# Toujours pusher vers la branche avec le session ID
git push -u origin claude/<feature>-018mXHM8CxWHpUfvhfS9qeqK
```

---

## 📞 Endpoints API Principaux

### Pricing
- `POST /api/pricing/estimate` - Calculer estimation
- `GET /api/pricing/vehicle-configs` - Configs véhicules
- `GET /api/pricing/config` - Config globale
- `PUT /api/pricing/config` - Modifier config (admin)
- `PUT /api/pricing/vehicle/:type` - Modifier tarif véhicule (admin)
- `POST /api/pricing/init-defaults` - Initialiser valeurs par défaut (admin)

### Rides
- `POST /api/rides` - Créer course
- `GET /api/rides/:id` - Détails course
- `POST /api/rides/:id/cancel` - Annuler course

### Admin
- `GET /api/admin/kyc/pending` - KYC en attente
- `PUT /api/admin/drivers/:id/status` - Modifier statut conducteur

---

## 🔐 Tokens et Authentication

### Structure des Tokens JWT
- **Admin** : Stocké dans `localStorage` clé `adminToken`
- **Customer/Driver** : Stocké dans Zustand store `truck4u-auth`

### Middleware Express
```typescript
verifyToken  // Vérifie token et définit req.userId
requireAdmin // Vérifie rôle admin après verifyToken
```

---

**Note finale :** Ce document doit être maintenu à jour à chaque ajout de fonctionnalité majeure ou changement d'architecture.
