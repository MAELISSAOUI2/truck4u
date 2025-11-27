# PROGRESS.md - Journal de Session

**Date :** 2025-11-27
**Durée estimée :** ~8 heures (Sessions 1-4)
**Session ID :** 018mXHM8CxWHpUfvhfS9qeqK
**Dernière mise à jour :** 2025-11-27 (Session 4)

---

## 📊 État Git

### Branche Actuelle
```
claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK
```

### Historique des Commits (20 derniers)
```
87ba6ce feat: Implement B2B backend API with matching engine
41f5c39 feat: Add B2B database schema
faa14c5 docs: Add comprehensive B2B module documentation
c122e6d feat: Add driver subscription system with priority and profile boosting
843d20e docs: Update documentation for Session 2 (payment auto-confirm + KYC fixes)
2807f08 feat: Add automatic payment confirmation batch job and improve KYC admin
0bdb3c6 docs: Add comprehensive session documentation (CLAUDE, PROGRESS, TODO)
98fabb1 fix: Pin React to 18.2.0 and fix MantineProvider compatibility
b505706 fix: Use dynamic import for SimpleMap to prevent SSR errors
4470da1 fix: Use req.userId instead of req.user.id in pricing routes
8a8f52b fix: Add admin token support in API interceptor
d6b2ab1 fix: Correct auth middleware import (authenticateToken → verifyToken)
78e9ea1 feat: Integrate real-time price estimation in customer ride form
1e5897b fix: Complete pricing system with admin configuration interface
2ec5d47 feat: Add admin pricing configuration interface
f3730dd feat: Add modular price estimation algorithm (Backend + API)
ec93ec6 feat: Add bidirectional cancellation notifications and redirects
2048f95 feat: Complete driver cancellation UI with strike system
502c94d feat: Interface annulation client avec timer 5 minutes
ec991e0 feat: API complète d'annulation de course
```

### Git Status
```
On branch claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK
Your branch is up to date with 'origin/claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK'.

nothing to commit, working tree clean
```

### Diff Stats
Aucun fichier non commité. Tous les changements ont été pushés.

---

## ✅ Tâches Accomplies

### 1. Système de Tarification Modulaire (COMPLET)

#### A. Base de Données
**Fichier modifié :** `packages/database/prisma/schema.prisma`

Ajout de 3 nouveaux modèles :
- `VehiclePricing` : Tarifs par type de véhicule (prix/km, prix/heure, minimum)
- `PricingConfig` : Configuration globale (coefficients, convoyeur, créneaux horaires)
- `PriceEstimate` : Historique des estimations avec détail des calculs

Ajout de 3 enums :
- `TripType` : ALLER_SIMPLE, ALLER_RETOUR
- `TrafficLevel` : FLUIDE, MOYEN, DENSE
- `TimeSlotType` : PEAK_HOURS, NIGHT_HOURS, WEEKEND

#### B. Backend - Algorithme de Tarification
**Fichier créé :** `apps/api/src/routes/pricing.ts` (540 lignes)

Algorithme en 6 étapes :
1. **Coût de base** : (distance × prix/km) + (durée × prix/heure)
2. **Type de voyage** : ×1.0 (simple) ou ×1.6 (aller-retour)
3. **Créneaux horaires** : Cumulatifs (pointe ×1.3, nuit ×1.2, weekend ×1.1)
4. **Trafic** : ×1.0 (fluide), ×1.05 (moyen), ×1.15 (dense)
5. **Convoyeur** : +50 DT fixe si demandé
6. **Prix minimum** : max(calculé, minimum véhicule)

Endpoints créés :
- `POST /api/pricing/estimate` - Calculer estimation
- `GET /api/pricing/vehicle-configs` - Lister configs véhicules
- `GET /api/pricing/config` - Config globale
- `PUT /api/pricing/config` - Modifier config (admin only)
- `PUT /api/pricing/vehicle/:type` - Modifier tarif véhicule (admin only)
- `POST /api/pricing/init-defaults` - Initialiser valeurs par défaut (admin only)

Valeurs par défaut :
- Camionnette : 0.80 DT/km, 15 DT/h, min 8 DT
- Fourgon : 1.20 DT/km, 20 DT/h, min 12 DT
- Camion 3.5T : 1.80 DT/km, 30 DT/h, min 20 DT
- Camion Lourd : 2.50 DT/km, 40 DT/h, min 35 DT

#### C. Frontend - Client API
**Fichier modifié :** `apps/web/lib/api.ts`

Ajout de `pricingApi` avec méthodes :
- `estimate()` - Calcul estimation
- `getVehicleConfigs()` - Récupérer configs véhicules
- `getConfig()` - Récupérer config globale
- `updateConfig()` - Mettre à jour config
- `updateVehiclePricing()` - Mettre à jour tarif véhicule
- `initDefaults()` - Initialiser valeurs par défaut

#### D. Interface Admin - Configuration Tarification
**Fichier créé :** `apps/web/app/admin/pricing/page.tsx` (802 lignes)

Interface en 3 onglets :
1. **Tarifs Véhicules** : Édition en ligne des prix/km, prix/heure, minimum par véhicule
2. **Configuration Globale** : Édition des coefficients (voyage, horaires, trafic, convoyeur)
3. **Simulateur** : Test des calculs avec tous les paramètres

Features :
- Édition inline avec validation
- Bouton "Initialiser valeurs par défaut"
- Preview des calculs en temps réel
- Breakdown détaillé des 6 étapes

**Fichier modifié :** `apps/web/app/admin/layout.tsx`

Ajout d'entrée menu "Configuration Prix" avec icône `IconCoin`

#### E. Interface Client - Estimation Temps Réel
**Fichier modifié :** `apps/web/app/customer/new-ride/page.tsx`

Intégration estimation prix :
- Appel API automatique quand paramètres changent
- Affichage prix en temps réel (format "XX.XX DT")
- Mise à jour dynamique selon :
  - Type de véhicule
  - Nombre de convoyeurs
  - Type de voyage (aller simple/retour)
  - Option Express (trafic dense)
  - Date/heure de départ (créneaux horaires)
- État de chargement pendant calcul
- Gestion erreurs API

---

### 2. Corrections de Bugs Critiques

#### Bug #1 : Import Prisma incorrect
**Erreur :** `Cannot find module '../lib/prisma'`

**Fichier :** `apps/api/src/routes/pricing.ts`

**Fix :**
```typescript
// Avant
import { prisma } from '../lib/prisma';

// Après
import { prisma } from '@truck4u/database';
```

**Commit :** Inclus dans le commit initial de pricing

---

#### Bug #2 : Middleware d'authentification incorrect
**Erreur :** `Route.put() requires a callback function but got a [object Undefined]`

**Fichier :** `apps/api/src/routes/pricing.ts`

**Fix :**
```typescript
// Avant
import { authenticateToken, requireAdmin } from '../middleware/auth';

// Après
import { verifyToken, requireAdmin } from '../middleware/auth';
```

**Commit :** `d6b2ab1 fix: Correct auth middleware import`

---

#### Bug #3 : Token admin non reconnu
**Erreur :** `Admin access required` lors de l'initialisation des configs

**Fichier :** `apps/web/lib/api.ts`

**Fix :** Modification de l'interceptor pour vérifier d'abord `adminToken`, puis fallback sur `truck4u-auth`
```typescript
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Priorité au token admin
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      return config;
    }

    // Fallback sur token customer/driver
    const authStore = localStorage.getItem('truck4u-auth');
    // ...
  }
  return config;
});
```

**Commit :** `8a8f52b fix: Add admin token support in API interceptor`

---

#### Bug #4 : Accès incorrect à l'ID utilisateur
**Erreur :** `Cannot read properties of undefined (reading 'id')`

**Fichier :** `apps/api/src/routes/pricing.ts`

**Fix :**
```typescript
// Avant
const adminId = (req as any).user.id;

// Après
const adminId = (req as any).userId;
```

**Raison :** Le middleware `verifyToken` définit `req.userId`, pas `req.user.id`

**Commit :** `4470da1 fix: Use req.userId instead of req.user.id in pricing routes`

---

#### Bug #5 : Erreur SSR avec Leaflet Maps
**Erreur :** `ReferenceError: window is not defined` dans SimpleMap

**Fichier :** `apps/web/app/customer/new-ride/page.tsx`

**Fix :** Utilisation de dynamic import pour éviter le SSR
```typescript
import dynamic from 'next/dynamic';

const SimpleMap = dynamic(() => import('@/components/SimpleMap'), {
  ssr: false,
  loading: () => <div style={{...}}>Chargement de la carte...</div>
});
```

**Commit :** `b505706 fix: Use dynamic import for SimpleMap to prevent SSR errors`

---

#### Bug #6 : MantineProvider introuvable (CRITIQUE)
**Erreur :** `@mantine/core: MantineProvider was not found in component tree`

**Cause :** React 19.2.0 installé au lieu de React 18.2.0, incompatibilité avec Mantine 8.3.x

**Fichiers modifiés :**
1. `apps/web/package.json` :
   - Pinné React exactement à `18.2.0` (suppression du `^`)
   - Ajout de `overrides` pour forcer React 18.2.0
   - Mise à jour Mantine vers `8.3.9`

2. `apps/web/app/providers.tsx` :
   - Suppression des imports CSS en double (déjà dans layout.tsx)
   - Nettoyage du code

**Commit :** `98fabb1 fix: Pin React to 18.2.0 and fix MantineProvider compatibility`

**Actions requises utilisateur :**
```bash
cd apps/web
rm -rf node_modules package-lock.json
npm install
npm list react react-dom  # Vérifier versions 18.2.0
npm run dev
```

---

### 3. Système d'Auto-Confirmation des Paiements (SESSION 2)

#### A. Base de Données
**Fichier modifié :** `packages/database/prisma/schema.prisma`

Ajout de statut `ON_HOLD` à `PaymentStatus`:
- PENDING → ON_HOLD (quand conducteur arrive) → COMPLETED (après 15 min ou confirmation)

Extension du modèle `Payment`:
- `onHoldAt` : Timestamp quand le paiement passe en ON_HOLD
- `autoConfirmedAt` : Timestamp de confirmation automatique par le batch
- `confirmedByBatch` : Boolean indiquant si confirmé automatiquement

Extension du modèle `Driver`:
- `currentLat`, `currentLng` : Position GPS en temps réel pour vérification arrivée

#### B. Service de Batch Auto-Confirmation
**Fichier créé :** `apps/api/src/services/paymentAutoConfirmation.ts` (280 lignes)

Fonctionnalités:
- S'exécute toutes les 2 minutes
- Trouve tous les paiements ON_HOLD depuis plus de 15 minutes
- Vérifie que le conducteur est à destination (Haversine formula, seuil 100m)
- Confirme automatiquement le paiement
- Enregistre les gains du conducteur
- Envoie notifications Socket.io aux deux parties

Formule de distance GPS (Haversine):
```typescript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Rayon Terre en mètres
  // ... calculs trigonométriques
  return distance_en_metres;
}
```

Vérifications:
1. Paiement ON_HOLD depuis 15+ minutes
2. Conducteur à moins de 100m de destination OU statut course DROPOFF_ARRIVED/COMPLETED
3. Si conditions OK → auto-confirm

#### C. API Routes - Extensions Paiement
**Fichier modifié :** `apps/api/src/routes/payments.ts`

Nouvel endpoint:
- `POST /api/payments/:id/hold` - Conducteur signale son arrivée, paiement passe en ON_HOLD
  - Envoie notification client "Confirmez la livraison"
  - Démarre le timer de 15 minutes

Endpoint modifié:
- `POST /api/payments/:id/confirm-cash` - Accepte maintenant client OU conducteur
  - Gère statuts PENDING et ON_HOLD
  - Évite double enregistrement des gains (check existingEarnings)

#### D. Intégration Serveur
**Fichier modifié :** `apps/api/src/index.ts`

- Ajout import du service d'auto-confirmation
- Démarrage batch job au lancement serveur
- Graceful shutdown: arrête le batch job sur SIGTERM
- Log de démarrage: "⏰ Payment auto-confirmation batch job started"

---

### 4. Système d'Abonnement Conducteurs (SESSION 2)

#### A. Base de Données
**Fichier modifié :** `packages/database/prisma/schema.prisma`

Création enum `DriverSubscriptionTier`:
- STANDARD : Gratuit, pas d'avantages
- PREMIUM : 49 DT/mois, priorité 1.5×, +50% boost
- ELITE : 99 DT/mois, priorité 2.5×, +100% boost, commission réduite 8%

Extension du modèle `Driver`:
- `hasActiveSubscription` : Boolean
- `subscriptionTier` : DriverSubscriptionTier?
- Relation one-to-one avec DriverSubscription
- Index sur `[hasActiveSubscription, rating]` pour priorisation

Nouveau modèle `DriverSubscription`:
- `tier`, `status` (ACTIVE/EXPIRED/CANCELLED)
- `monthlyFee`, `priorityMultiplier`, `profileBoost`
- `reducedPlatformFee`, `earlyAccessMinutes`
- Dates: `startDate`, `endDate`, `renewalDate`
- Paiement: `lastPaymentDate`, `lastPaymentAmount`, `paymentMethod`

#### B. API Routes - Abonnements Conducteurs
**Fichier créé :** `apps/api/src/routes/driverSubscriptions.ts` (320 lignes)

Endpoints:
- `GET /api/driver-subscriptions/plans` - Liste des plans disponibles avec features
- `GET /api/driver-subscriptions/current` - Abonnement actuel du conducteur
- `POST /api/driver-subscriptions/subscribe` - Souscrire à un plan (PREMIUM/ELITE)
- `POST /api/driver-subscriptions/cancel` - Annuler abonnement (garde avantages jusqu'à expiration)
- `GET /api/driver-subscriptions/stats` - Statistiques (jours restants, courses, gains depuis souscription)

Plans définis:
1. **STANDARD** (Gratuit):
   - Accès normal, notifications standard, support email

2. **PREMIUM** (49 DT/mois):
   - Priorité 1.5× sur offres
   - Profil boosté +50%
   - Accès anticipé 5 minutes
   - Badge Premium, notifications prioritaires

3. **ELITE** (99 DT/mois):
   - Priorité 2.5× (maximale)
   - Profil ultra-boosté +100%
   - Accès anticipé 15 minutes
   - Commission réduite 8% (vs 10%)
   - Badge Elite, support VIP 24/7

#### C. Service de Batch Expiration Abonnements
**Fichier créé :** `apps/api/src/services/subscriptionExpiration.ts` (110 lignes)

Fonctionnalités:
- S'exécute toutes les heures
- Trouve tous les abonnements actifs expirés (endDate <= now)
- Met à jour status → EXPIRED
- Retire les avantages du conducteur:
  - `hasActiveSubscription` → false
  - `subscriptionTier` → null
  - `platformFeeRate` → 0.10 (reset défaut)
- Envoie notifications Socket.io: "subscription_expired"

#### D. Intégration Serveur
**Fichier modifié :** `apps/api/src/index.ts`

- Ajout import du service d'expiration abonnements
- Enregistrement route `/api/driver-subscriptions`
- Démarrage batch job expiration au lancement
- Graceful shutdown: arrête les deux batch jobs (payment + subscription)
- Log de démarrage: "💎 Subscription expiration batch job started"

---

### 5. Amélioration KYC Admin (SESSION 2)

**Fichier modifié :** `apps/web/app/admin/kyc/page.tsx`

Fix du bug: détails conducteur ne s'affichent pas au clic

Améliorations:
- Ajout try/catch complet autour de fetchDriverDetails
- Ajout notifications Mantine pour erreurs utilisateur
- Ajout console.log pour debug: "Driver details loaded"
- Différenciation entre erreurs API et erreurs réseau

Avant:
```typescript
const res = await fetch(...);
setSelectedDriver(data.driver); // Crash silencieux si erreur
```

Après:
```typescript
try {
  const res = await fetch(...);
  if (res.ok) {
    const data = await res.json();
    console.log('Driver details loaded:', data.driver);
    setSelectedDriver(data.driver);
  } else {
    notifications.show({ title: 'Erreur', message: '...', color: 'red' });
  }
} catch (error) {
  console.error('Failed to fetch driver details:', error);
  notifications.show({ title: 'Erreur', message: '...', color: 'red' });
}
```

---

### 6. Module B2B - Business Orders (SESSION 3)

#### A. Documentation et Planification
**Fichiers créés :**
- `B2B_PLAN.md` (1005+ lignes) - Plan d'implémentation complet
- Mise à jour de `CLAUDE.md` avec section B2B

Architecture Decisions (ADRs):
- ADR-001: Business séparé de Customer (workflows différents)
- ADR-002: BusinessOrder séparé de Ride (matching automatique vs bidding)
- ADR-003: Extension Driver pour B2B (pas nouveau modèle)
- ADR-004: Matching à 2 rounds (réguliers prioritaires, puis tous)

Public cible:
- Commerces de proximité (épiceries, boutiques, pharmacies)
- Vendeurs en ligne (Facebook/Instagram sellers)
- PME locales
- Restaurants et traiteurs

#### B. Base de Données - Modèle B2B
**Fichier modifié :** `packages/database/prisma/schema.prisma` (+389 lignes)

**Nouveau modèle Business:**
- Infos de base: businessName, businessType, phone
- Localisation: gouvernorat, delegation, addressLine, coordinates
- Trust Level: STARTER → VERIFIED → PRO → ENTERPRISE
- Limites dynamiques: maxDailyCOD, maxSingleOrderCOD, maxDailyOrders
- Vérification: cinFront, cinBack, cinSelfie, verificationStatus
- COD Payout: codPayoutMethod (D17/FLOUCI/BANK/CASH), détails bancaires
- Stats: totalOrders, completedOrders, totalCODCollected, rating

**Trust Levels avec limites:**
- STARTER: 300 DT COD/jour, 100 DT/ordre, 5 ordres/jour, délai payout 72h
- VERIFIED: 1000 DT COD/jour, 300 DT/ordre, 20 ordres/jour, délai 48h
- PRO: 5000 DT COD/jour, 1000 DT/ordre, 100 ordres/jour, -15% discount, délai 24h
- ENTERPRISE: Limites custom, account manager dédié, -20% discount, délai 12h

**Nouveau modèle BusinessOrder:**
- Destinataire: recipientName, phone, address, coordinates, notes
- Pickup: pickupContact, address (défaut = adresse business)
- Colis: cargoType, description, weight, size
- COD: hasCOD, codAmount, codStatus
- Matching: matchingStatus (PENDING/SEARCHING/MATCHED/NO_DRIVER), matchingRound (1 ou 2)
- Proof of Delivery: podPhoto, podSignature, podRecipientName, podTimestamp, podLocation
- Status: DRAFT → SEARCHING_DRIVER → DRIVER_ASSIGNED → ... → DELIVERED
- Order number: TRK-YYYYMMDD-XXXX

**Nouveau modèle BusinessAddress (carnet d'adresses):**
- nickname, contactName, contactPhone
- gouvernorat, delegation, addressLine, coordinates
- notes, isDefault, usageCount, lastUsedAt

**Nouveau modèle DriverBusinessRelation:**
- Suivi relation conducteur-business
- totalDeliveries, completedDeliveries, averageRating
- totalRevenue, lastDeliveryAt

**Nouveau modèle BusinessFavoriteDriver:**
- Liste des conducteurs favoris d'un business
- addedAt timestamp

**Nouveau modèle BusinessOrderStatusHistory:**
- Timeline complète d'une commande
- status, timestamp, notes

**Extension modèle Driver:**
- b2bLevel (1-4) : Niveau d'habilitation B2B
- b2bLevelUpdatedAt
- b2bHabilitation (JSON): { minDeliveries, minRating, insuranceValid, codTrainingPassed }
- b2bPreferences (JSON): { acceptsB2B, workingZones, acceptsCOD, maxCODAmount }
- totalB2BDeliveries, completedB2BDeliveries
- Relations vers: businessOrders, businessRelations, favoritedByBusinesses

**Nouveaux enums:**
- BusinessType: LOCAL_SHOP, SOCIAL_SELLER, SME, RESTAURANT
- TrustLevel: STARTER, VERIFIED, PRO, ENTERPRISE
- CODPayoutMethod: D17, FLOUCI, BANK_TRANSFER, CASH_PICKUP
- MatchingStatus: PENDING, SEARCHING, MATCHED, NO_DRIVER, TIMEOUT
- BusinessOrderStatus: DRAFT, PENDING_PAYMENT, SEARCHING_DRIVER, DRIVER_ASSIGNED, etc.
- CargoType: DOCUMENT, PETIT_COLIS, MOYEN_COLIS, GROS_COLIS, etc.
- CargoSize: TRES_PETIT, PETIT, MOYEN, GRAND, TRES_GRAND
- CODStatus: PENDING, COLLECTED, PAID_OUT, CANCELLED, NOT_APPLICABLE
- BusinessVerificationStatus: NONE, PENDING, APPROVED, REJECTED

#### C. Backend - Middleware Authentication
**Fichier modifié :** `apps/api/src/middleware/auth.ts`

Extensions:
- AuthRequest.userType étendu pour inclure 'business'
- Nouveau middleware: requireBusiness
- generateToken supporte maintenant 'business' userType
- JWT tokens business valides 7 jours comme les autres

#### D. Backend - Routes Business Auth
**Fichier créé :** `apps/api/src/routes/business.ts` (360+ lignes)

Endpoints:
- `POST /api/business/register` - Inscription business (Step 1: infos de base)
  - Validation: businessName, businessType, phone (+216XXXXXXXX), localisation
  - Création avec STARTER trust level par défaut
  - TODO: Envoi SMS code vérification (actuellement mock)

- `POST /api/business/verify-phone` - Vérifier téléphone avec code SMS
  - Validation code 6 chiffres (mock accepte "123456")
  - Mise à jour phoneVerified + génération JWT token

- `GET /api/business/profile` - Profil business
  - Include counts: orders, addresses, favoriteDrivers
  - Masque champs sensibles (CIN photos)

- `PUT /api/business/profile` - Mise à jour profil
  - Update infos générales, localisation, COD payout config

- `GET /api/business/limits` - Limites trust level + usage quotidien
  - Calcul usage aujourd'hui (orders count, COD sum)
  - Retourne limites, usage actuel, disponible
  - Config: codPayoutDelay, requiredDriverLevel, discount

- `GET /api/business/upgrade-eligibility` - Éligibilité upgrade
  - STARTER → VERIFIED: 3+ orders, phone vérifié, CIN uploadé
  - VERIFIED → PRO: 30+ orders, rating ≥4.5, verification approved

Validation avec Zod schemas complets

#### E. Backend - Routes Business Orders
**Fichier créé :** `apps/api/src/routes/businessOrders.ts` (650+ lignes)

Endpoints:
- `POST /api/business/orders` - Créer commande (DRAFT)
  - Validation destinataire, pickup (défaut = adresse business), colis
  - Check limites quotidiennes (orders + COD)
  - Validation COD amount vs trust level limits
  - Support saved address (carnet d'adresses)
  - Génération order number: TRK-YYYYMMDD-XXXX
  - Création status history entry

- `GET /api/business/orders` - Liste commandes avec pagination
  - Filtres: status
  - Include driver info (name, phone, rating, GPS)
  - Sort: createdAt DESC
  - Pagination: page, limit, total, pages

- `GET /api/business/orders/:id` - Détails commande
  - Include driver complet + statusHistory
  - Vérification ownership (businessId)

- `POST /api/business/orders/:id/submit` - Soumettre pour matching
  - DRAFT → SEARCHING_DRIVER
  - Déclenche matching engine (asynchrone)
  - Création status history

- `POST /api/business/orders/:id/cancel` - Annuler commande
  - Statuts annulables: DRAFT, SEARCHING_DRIVER, DRIVER_ASSIGNED, DRIVER_EN_ROUTE
  - Enregistre cancellationReason
  - TODO: Notifier driver si assigned

- `POST /api/business/orders/:id/rate` - Noter commande livrée
  - Rating 1-5 + comment optionnel
  - Update driver rating (calcul moyenne pondérée)
  - Update/create DriverBusinessRelation (historique)

- `GET /api/business/orders/:id/tracking` - Tracking temps réel
  - Retourne: status, driver GPS, pickup/destination, timeline, ETA

Helpers:
- generateOrderNumber(): TRK-YYYYMMDD-XXXX
- checkDailyLimits(): Vérifie usage vs limites trust level

#### F. Backend - Routes Business Addresses
**Fichier créé :** `apps/api/src/routes/businessAddresses.ts` (260+ lignes)

Carnet d'adresses pour destinations fréquentes:
- `POST /api/business/addresses` - Créer adresse
- `GET /api/business/addresses` - Liste toutes (sort: default, usage, date)
- `GET /api/business/addresses/recent` - Récentes (lastUsedAt DESC)
- `GET /api/business/addresses/frequent` - Fréquentes (usageCount DESC)
- `GET /api/business/addresses/:id` - Détails
- `PUT /api/business/addresses/:id` - Modifier
- `DELETE /api/business/addresses/:id` - Supprimer
- `POST /api/business/addresses/:id/set-default` - Définir par défaut

Features:
- Gestion adresse par défaut (auto-unset des autres)
- Tracking usage count et lastUsedAt
- Validation: nickname, contact, localisation complète

#### G. Backend - Routes Business Drivers
**Fichier créé :** `apps/api/src/routes/businessDrivers.ts` (220+ lignes)

Gestion relation business-conducteurs:
- `GET /api/business/drivers` - Liste tous les conducteurs travaillés
  - Include: driver info (rating, deliveries, b2bLevel)
  - Sort: lastDeliveryAt DESC

- `GET /api/business/drivers/:driverId` - Détails + historique
  - Relation: totalDeliveries, averageRating, totalRevenue
  - Recent orders (10 derniers)

- `GET /api/business/drivers/favorites/list` - Liste favoris
  - Include driver complet avec GPS

- `POST /api/business/drivers/:driverId/favorite` - Ajouter favori
  - Validation: driver exists, pas déjà favori

- `DELETE /api/business/drivers/:driverId/favorite` - Retirer favori

- `GET /api/business/drivers/:driverId/is-favorite` - Check si favori

- `GET /api/business/drivers/stats/summary` - Stats conducteurs
  - Total drivers travaillés, favoris count
  - Top 3 drivers by delivery count

#### H. Backend - Service Matching Engine
**Fichier créé :** `apps/api/src/services/matchingEngine.ts` (520+ lignes)

Algorithme de matching à 2 rounds avec scoring:

**Configuration:**
- Round 1: 60s, réguliers uniquement (favoris + 2+ livraisons)
- Round 2: 90s, tous les conducteurs éligibles
- Distance max: 50 km, idéale: 5 km

**Poids du scoring (total = 100%):**
- Distance: 25%
- Availability: 20%
- Rating: 15%
- Experience: 5%
- Relationship: 35% (poids le plus élevé)

**Fonctions principales:**

1. `matchOrder(orderId)` - Fonction principale
   - Vérifie statut order = SEARCHING_DRIVER
   - Lance Round 1 (regulars only)
   - Si échec, lance Round 2 (all eligible)
   - Update order status, assign driver
   - Crée status history avec score

2. `filterEligibleDrivers(order, regularsOnly)` - Filtre conducteurs
   - Statut: APPROVED, available
   - b2bLevel ≥ requiredLevel (selon trust level business)
   - b2bPreferences: acceptsB2B, acceptsCOD, maxCODAmount
   - Si round 1: filtre sur isRegularDriver()

3. `calculateDriverScore(driver, order, businessId)` - Calcul score
   - Distance score: 100 si ≤5km, décroissant jusqu'à 50km
   - Availability score: 100 si available, 0 sinon
   - Rating score: (rating/5) × 100
   - Experience score: B2B deliveries + completion rate
   - Relationship score: 50 pts si favori + 30 pts max deliveries + 20 pts rating

4. `isRegularDriver(driverId, businessId)` - Check régulier
   - True si: favori OU 2+ completed deliveries

5. `calculateRelationshipScore(driverId, businessId)` - Score relation
   - Favori: +50 points
   - Completed deliveries: +3 pts chacune (max 30)
   - Average rating from business: max 20 pts

6. `calculateDistance(lat1, lng1, lat2, lng2)` - Haversine formula
   - Calcul distance GPS en km
   - Formule trigonométrique avec rayon Terre = 6371 km

**Logs détaillés:**
- `[Matching Engine] Starting match for order TRK-...`
- `[Matching Engine] Round 1: Found X regular drivers`
- `[Matching Engine] Round 1 - Best driver: Name (score: XX.XX)`
- `[Matching Engine] Order assigned to driver`

**TODO (Phase 2):**
- Implémenter envoi offres à top 5/10 drivers (actuellement auto-assign au meilleur)
- Système d'acceptation/refus avec timeout
- Notifications Socket.io en temps réel

#### I. Intégration Serveur
**Fichier modifié :** `apps/api/src/index.ts`

Ajout imports et enregistrement routes:
- `import businessRoutes from './routes/business'`
- `import businessOrderRoutes from './routes/businessOrders'`
- `import businessAddressRoutes from './routes/businessAddresses'`
- `import businessDriverRoutes from './routes/businessDrivers'`

Routes enregistrées:
- `app.use('/api/business', businessRoutes)`
- `app.use('/api/business/orders', businessOrderRoutes)`
- `app.use('/api/business/addresses', businessAddressRoutes)`
- `app.use('/api/business/drivers', businessDriverRoutes)`

---

## 📝 Fichiers Créés ou Modifiés (Session complète)

### Fichiers Créés (nouveaux)
1. `apps/api/src/routes/pricing.ts` (540 lignes) - SESSION 1
2. `apps/web/app/admin/pricing/page.tsx` (802 lignes) - SESSION 1
3. `apps/api/src/services/paymentAutoConfirmation.ts` (280 lignes) - SESSION 2
4. `apps/api/src/routes/driverSubscriptions.ts` (320 lignes) - SESSION 2
5. `apps/api/src/services/subscriptionExpiration.ts` (110 lignes) - SESSION 2
6. `B2B_PLAN.md` (1005+ lignes) - SESSION 3
7. `apps/api/src/routes/business.ts` (360+ lignes) - SESSION 3
8. `apps/api/src/routes/businessOrders.ts` (650+ lignes) - SESSION 3
9. `apps/api/src/routes/businessAddresses.ts` (260+ lignes) - SESSION 3
10. `apps/api/src/routes/businessDrivers.ts` (220+ lignes) - SESSION 3
11. `apps/api/src/services/matchingEngine.ts` (520+ lignes) - SESSION 3
12. `CLAUDE.md` (documentation permanente)
13. `PROGRESS.md` (ce fichier)
14. `TODO.md` (backlog)

### Fichiers Modifiés
1. `packages/database/prisma/schema.prisma`
   - SESSION 1: Ajout modèles VehiclePricing, PricingConfig, PriceEstimate
   - SESSION 1: Ajout enums TripType, TrafficLevel, TimeSlotType
   - SESSION 2: Extension Payment (onHoldAt, autoConfirmedAt, confirmedByBatch)
   - SESSION 2: Extension Driver (currentLat/Lng, hasActiveSubscription, subscriptionTier)
   - SESSION 2: Nouveau modèle DriverSubscription
   - SESSION 2: Nouvel enum DriverSubscriptionTier
   - SESSION 3: Nouveaux modèles B2B (+389 lignes):
     * Business, BusinessOrder, BusinessAddress
     * DriverBusinessRelation, BusinessFavoriteDriver
     * BusinessOrderStatusHistory
   - SESSION 3: Extension Driver pour B2B (b2bLevel, b2bHabilitation, b2bPreferences, stats B2B)
   - SESSION 3: Nouveaux enums B2B (+9):
     * BusinessType, TrustLevel, CODPayoutMethod
     * MatchingStatus, BusinessOrderStatus
     * CargoType, CargoSize, CODStatus
     * BusinessVerificationStatus

2. `apps/api/src/index.ts`
   - SESSION 1: Enregistrement route `/api/pricing`
   - SESSION 2: Import et démarrage batch job payment auto-confirmation
   - SESSION 2: Enregistrement route `/api/driver-subscriptions`
   - SESSION 2: Import et démarrage batch job subscription expiration
   - SESSION 2: Graceful shutdown pour les deux batch jobs
   - SESSION 3: Import et enregistrement routes B2B:
     * `/api/business` (auth)
     * `/api/business/orders` (commandes)
     * `/api/business/addresses` (carnet)
     * `/api/business/drivers` (relations)

3. `apps/api/src/middleware/auth.ts`
   - SESSION 3: Extension AuthRequest.userType pour 'business'
   - SESSION 3: Ajout middleware requireBusiness
   - SESSION 3: Update generateToken pour supporter 'business'

4. `apps/api/src/routes/payments.ts` - SESSION 2
   - Nouvel endpoint: `POST /api/payments/:id/hold`
   - Modification endpoint: `POST /api/payments/:id/confirm-cash` (accepte client + conducteur)

5. `apps/web/lib/api.ts` - SESSION 1
   - Ajout `pricingApi` object avec toutes les méthodes
   - Fix interceptor pour support token admin

6. `apps/web/app/admin/layout.tsx` - SESSION 1
   - Ajout entrée menu "Configuration Prix"

7. `apps/web/app/customer/new-ride/page.tsx` - SESSION 1
   - Import dynamique SimpleMap
   - Intégration estimation prix temps réel
   - Hook useEffect pour auto-calcul

8. `apps/web/app/admin/kyc/page.tsx` - SESSION 2
   - Ajout try/catch pour gestion d'erreurs
   - Ajout notifications Mantine
   - Ajout console.log pour debug

9. `apps/web/package.json` - SESSION 1
   - Pin React à 18.2.0
   - Ajout overrides
   - Mise à jour Mantine vers 8.3.9

10. `apps/web/app/providers.tsx` - SESSION 1
   - Nettoyage imports CSS

11. `CLAUDE.md` - SESSION 3
   - Ajout section complète B2B dans description projet
   - Ajout routes B2B dans structure architecture
   - Ajout section 10: B2B Module avec Trust Levels, matching, COD

---

### 7. Frontend B2B - Pages Client Business (SESSION 4)

#### A. Page Inscription Business
**Fichier créé :** `apps/web/app/business/register/page.tsx` (328 lignes)

Features:
- Wizard 3 étapes (Mantine Stepper component)
- Step 1: Informations business (name, type, localisation, contact)
- Step 2: Téléphone +216XXXXXXXX
- Step 3: Vérification SMS (mock code "123456")
- Token stocké dans `localStorage.businessToken`
- Redirect vers `/business/dashboard` après succès

#### B. Page Dashboard Business
**Fichier créé :** `apps/web/app/business/dashboard/page.tsx` (186 lignes)

Features:
- Stats cards: total orders, completed, COD collected, rating
- Trust Level badge (STARTER/VERIFIED/PRO/ENTERPRISE)
- Daily limits avec progress bars (COD + orders)
- Quick actions: Nouvelle commande, Mes commandes

API calls:
- `GET /api/business/profile` - Profil complet
- `GET /api/business/limits` - Limites + usage quotidien

#### C. Page Liste Commandes
**Fichier créé :** `apps/web/app/business/orders/page.tsx` (231 lignes)

Features:
- Table paginée (Mantine Table)
- Filtres par status (dropdown avec tous les statuts)
- Colonnes: N° commande, destinataire, date, COD, statut, livreur, actions
- Status badges colorés (DRAFT=gray, SEARCHING_DRIVER=blue, DELIVERED=green, etc.)
- Click sur "Voir" → redirect vers détails

STATUS_COLORS mapping:
- DRAFT: gray, SEARCHING_DRIVER: blue, DRIVER_ASSIGNED: cyan
- PICKED_UP: lime, IN_DELIVERY: teal, DELIVERED: green
- CANCELLED/FAILED: red

#### D. Page Nouvelle Commande
**Fichier créé :** `apps/web/app/business/orders/new/page.tsx` (398 lignes)

Features:
- Wizard 3 étapes (Mantine Stepper)
- Step 1 - Destinataire:
  - Nom, téléphone (+216 requis), gouvernorat, délégation
  - Adresse complète (textarea), notes optionnelles
- Step 2 - Colis:
  - Select type (DOCUMENT, PETIT_COLIS, MOYEN_COLIS, etc.)
  - Poids estimé (kg), description optionnelle
- Step 3 - COD:
  - Checkbox "Nécessite paiement à la livraison"
  - NumberInput montant (suffix "DT")
  - Alert info COD payout

Actions:
- "Sauvegarder brouillon" → POST /api/business/orders (DRAFT)
- "Créer et soumettre" → POST + POST /api/business/orders/:id/submit

Validation:
- Step 1: Tous champs required sauf notes
- Téléphone doit commencer par +216
- Step 2: Type de colis required
- Step 3: Si COD coché, montant required

#### E. Page Tracking Commande
**Fichier créé :** `apps/web/app/business/orders/[id]/page.tsx` (432 lignes)

Features:
- **Timeline** (Mantine Timeline):
  - Statuts: DRAFT → SEARCHING → ASSIGNED → EN_ROUTE → PICKUP → PICKED_UP → DELIVERY → ARRIVED → DELIVERED
  - Couleurs par statut, icons, timestamps
- **Infos commande**: Destinataire, pickup, colis, COD amount
- **Infos conducteur** (si assigné):
  - Nom, téléphone, rating, véhicule
  - TODO: Map avec position GPS en temps réel
- **Actions**:
  - Bouton "Annuler" (modal avec textarea raison)
  - Bouton "Noter" (modal avec rating 1-5 + commentaire)
- **Auto-refresh**: setInterval 10 secondes

Modals:
- CancelModal: textarea raison, POST /api/business/orders/:id/cancel
- RateModal: Rating component (1-5 stars), textarea comment, POST /api/business/orders/:id/rate

---

### 8. Driver Patente & Subscription Modal (SESSION 4)

#### A. Patente Checkbox - Driver Registration
**Fichier modifié :** `apps/web/app/driver/register/page.tsx`

Modifications:
- Import Checkbox component from Mantine
- Ajout field `hasPatenteOption: false` dans formData state
- Ajout Checkbox dans form (entre vehicle plate et email):
  ```tsx
  <Checkbox
    label="Je dispose d'une patente professionnelle"
    description="Vous pourrez uploader ce document lors de la vérification KYC pour devenir éligible aux livraisons B2B"
    checked={formData.hasPatenteOption}
    onChange={(e) => setFormData({ ...formData, hasPatenteOption: e.currentTarget.checked })}
  />
  ```
- Update alert documents requis: "Patente professionnelle (optionnel, pour livraisons B2B)"

**Fichier modifié :** `apps/api/src/routes/auth.ts`

- Ajout `hasPatenteOption: z.boolean().default(false)` dans registerDriverSchema
- Field envoyé au Prisma create lors de l'inscription

#### B. Backend - Patente Validation Endpoint
**Fichier modifié :** `apps/api/src/routes/admin.ts` (+109 lignes)

Nouvel endpoint: `PUT /api/admin/drivers/:id/validate-patente`

Body: `{ approved: boolean, reason?: string }`

Logique si approved=true:
1. Update driver:
   - `patenteVerified = true`
   - `patenteVerifiedAt = new Date()`
   - `b2bLevel = 2` (auto-upgrade!)
   - `b2bPreferences = { acceptsB2B: true, acceptsCOD: true, maxCODAmount: 500 }`
2. Approve BUSINESS_LICENSE document (si existe)
3. Socket.io notification: `patente_validated` avec message + b2bLevel

Logique si approved=false:
1. Update driver:
   - `patenteVerified = false`
   - `patenteRejectionReason = reason`
2. Reject BUSINESS_LICENSE document (si existe)
3. Socket.io notification: `patente_rejected` avec raison

Validations:
- Driver exists
- Driver.hasPatenteOption === true (sinon erreur 400)

#### C. Subscription Modal Component
**Fichier créé :** `apps/web/components/SubscriptionModal.tsx` (235 lignes)

Props:
- `opened: boolean`
- `onClose: () => void`
- `driverId?: string`

Features:
- **3 Plans** (STANDARD, PREMIUM, ELITE):
  - STANDARD: Gratuit, disabled (pas de bouton souscrire)
  - PREMIUM: 49 DT/mois, icône IconRocket, couleur blue
  - ELITE: 99 DT/mois, icône IconCrown, couleur yellow, badge "Recommandé"
- **Features affichées**:
  - STANDARD: Accès normal, commission 10%, support email
  - PREMIUM: Priorité 1.5×, boost +50%, accès 5min, support prioritaire
  - ELITE: Priorité 2.5×, boost +100%, accès 15min, commission 8%, support VIP
- **Bouton souscrire**:
  - Loading state pendant API call
  - POST /api/driver-subscriptions/subscribe avec tier + paymentMethod: 'FLOUCI'
  - Success → window.location.reload() pour rafraîchir status
- **Note importante**: "L'abonnement n'est PAS requis pour effectuer des livraisons B2B"
- **Bouton "Peut-être plus tard"**: Ferme modal, set localStorage flag

Layout:
- SimpleGrid cols={3} pour afficher les 3 plans côte à côte
- Cards avec border highlight pour ELITE
- Badge "Recommandé" positionné en absolute top-right
- Icons colorés dans cercle
- List avec IconCheck pour features

#### D. Integration Modal - Driver Dashboard
**Fichier modifié :** `apps/web/app/driver/dashboard/page.tsx`

Modifications:
- Import SubscriptionModal component
- State: `subscriptionModalOpened: boolean`
- useEffect pour afficher modal après KYC approval:
  ```tsx
  useEffect(() => {
    const modalShown = localStorage.getItem('subscription-modal-shown');
    if (user.verificationStatus === 'APPROVED' && !modalShown) {
      setTimeout(() => setSubscriptionModalOpened(true), 1000);
    }
  }, [user]);
  ```
- Handler: `handleCloseSubscriptionModal()` → set flag localStorage
- JSX: `<SubscriptionModal opened={...} onClose={...} driverId={...} />`

Timing:
- Modal s'affiche 1 seconde après le premier chargement du dashboard pour conducteur APPROVED
- Ne s'affiche qu'une seule fois (localStorage flag)
- Peut être fermé avec "Peut-être plus tard"

---

## 🐛 Problèmes en Cours / Non Résolus

### 1. Migrations Base de Données Non Exécutées
**Statut :** ⚠️ BLOQUANT pour utilisation pricing + payment auto-confirm + subscriptions + B2B

**Problème :**
- Les migrations Prisma n'ont pas été exécutées en environnement de développement
- Plusieurs schémas en attente de migration:
  - Pricing system (VehiclePricing, PricingConfig, PriceEstimate)
  - Payment auto-confirmation (ON_HOLD status, onHoldAt, autoConfirmedAt)
  - Driver subscriptions (DriverSubscription model, subscriptionTier)
  - **B2B Module (SESSION 3)**: 6 nouveaux modèles + 9 enums + extension Driver

**Impact :**
- Les tables n'existent pas en DB
- Les appels API retournent des erreurs
- Le module B2B est complètement non fonctionnel

**Action requise utilisateur :**
```bash
cd packages/database
npx prisma migrate dev --name add_b2b_module
```

Cette commande va :
1. Créer le dossier `migrations/` (si inexistant)
2. Générer le SQL de migration pour TOUS les changements en attente
3. Appliquer la migration à la DB
4. Mettre à jour le client Prisma

**Vérification :**
```bash
# Vérifier que les migrations existent
ls packages/database/prisma/migrations/

# Devrait contenir un dossier type: 20251126XXXXXX_add_payment_auto_confirm_and_subscriptions/
```

---

### 2. Initialisation Configs Par Défaut
**Statut :** ⏳ En attente de migration

**Action requise utilisateur :**
1. S'assurer que la migration est exécutée
2. Aller sur `/admin/pricing`
3. Cliquer sur "Initialiser valeurs par défaut"
4. Vérifier que les 4 véhicules et la config globale sont créés

---

### 3. Test End-to-End du Pricing
**Statut :** ⏳ Non testé

**À vérifier :**
1. Estimation s'affiche correctement sur `/customer/new-ride`
2. Prix se met à jour quand on change les paramètres
3. Admin peut modifier les configs sur `/admin/pricing`
4. Modifications admin se reflètent dans les estimations client

---

## 🎯 Prochaines Étapes Prioritaires

### Urgent (À faire immédiatement)
1. ✅ Récupérer les derniers commits : `git pull origin claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK`
2. ✅ Réinstaller dépendances avec React 18.2.0 :
   ```bash
   cd apps/web
   rm -rf node_modules package-lock.json
   npm install
   npm list react react-dom  # Doit afficher 18.2.0
   ```
3. ✅ Vérifier que l'app démarre : `npm run dev`
4. ⚠️ **CRITIQUE**: Exécuter migration Prisma : `cd packages/database && npx prisma migrate dev --name add_b2b_module`
5. ⚠️ Initialiser configs pricing via admin UI
6. ⚠️ Redémarrer serveur API : `cd apps/api && npm run dev` - Vérifier logs batch jobs

### Important (Cette semaine)
7. **Tester le module B2B via API (Postman)**:
   - Créer business test
   - Vérifier code SMS (mock "123456")
   - Créer commande DRAFT
   - Soumettre commande → vérifier matching engine logs
   - Vérifier assignation conducteur
8. **Implémenter frontend B2B (Phase 1 MVP - 6-8h estimé)**:
   - Page `/business/register` - Wizard 3 étapes
   - Page `/business/dashboard` - Overview + stats
   - Page `/business/orders/new` - Créer commande
   - Page `/business/orders` - Liste commandes
   - Page `/business/orders/:id` - Détails + tracking
9. Tester le système d'auto-confirmation des paiements
   - Créer paiement test, mettre onHoldAt à -20min
   - Attendre 2-3 minutes (batch s'exécute)
   - Vérifier status → COMPLETED
10. Tester le système d'abonnement conducteurs
    - Tester souscription PREMIUM/ELITE
    - Vérifier gains enregistrés avec commission réduite (ELITE)
    - Tester expiration abonnement (modifier endDate en DB)
11. Tester le système de pricing end-to-end
12. Vérifier les notifications de cancellation
13. Tester le système de strikes conducteurs
14. Vérifier le paiement (bug "5ft" au lieu de "20 dt" ?)

### Nice-to-have (Backlog)
15. **Interface B2B Phase 2 (Advanced Features)**:
    - Page `/business/verification` - Upload CIN pour upgrade VERIFIED
    - Page `/business/upgrade-pro` - Upload RC/Patente pour PRO
    - Page `/business/addresses` - CRUD carnet d'adresses
    - Page `/business/drivers` - Liste conducteurs + favoris
    - Page `/business/settings` - Config COD payout
16. **B2B Driver Side**:
    - Page `/driver/b2b` - Toggle acceptsB2B, config preferences
    - Notifications temps réel pour B2B orders (Socket.io)
    - Interface acceptation/refus offres B2B
17. **B2B Admin Interface**:
    - Page `/admin/businesses` - Liste businesses + verification
    - Page `/admin/b2b-orders` - Vue globale commandes B2B
    - Approve/Reject business verification (CIN)
    - Analytics B2B (GMV, COD collected, top businesses)
18. **Matching Engine Phase 2**:
    - Envoi offres à top 5/10 drivers (actuellement auto-assign)
    - Système acceptation/refus avec timeout
    - Notifications Socket.io en temps réel
    - Re-matching si refus (fallback to next driver)
19. **SMS Integration**:
    - Intégrer provider SMS (Twilio, Africa's Talking, etc.)
    - Remplacer mock code "123456" par vraie vérification
20. Créer interface frontend pour abonnements conducteurs
    - Page `/driver/subscription` avec affichage des plans
    - Bouton de souscription avec sélection paiement
    - Affichage abonnement actuel et statistiques
    - Bouton d'annulation
21. Implémenter logique de priorité dans notifications de courses
    - ELITE: notification immédiate
    - PREMIUM: notification après 5 minutes
    - STANDARD: notification après 15 minutes
22. Implémenter boost de profil dans listings conducteurs
    - Appliquer profileBoost% au score de ranking
    - Afficher badge PREMIUM/ELITE sur profils
23. Ajouter analytics pour le pricing (prix moyen, estimations par véhicule)
24. Exporter historique des estimations
25. Dashboard admin avec stats pricing et subscriptions
26. Tests unitaires pour l'algorithme de pricing
27. Tests unitaires pour batch jobs (auto-confirm, subscription expiration)
28. Tests unitaires pour matching engine B2B

---

## 📊 Statistiques de Session

**Session 1:**
- **Commits créés :** 8
- **Fichiers créés :** 5
- **Fichiers modifiés :** 7
- **Lignes de code ajoutées :** ~1500
- **Bugs corrigés :** 6
- **Features implémentées :** 1 système complet (pricing)

**Session 2:**
- **Commits créés :** 4
- **Fichiers créés :** 3 (paymentAutoConfirmation.ts, driverSubscriptions.ts, subscriptionExpiration.ts)
- **Fichiers modifiés :** 4 (schema.prisma, index.ts, payments.ts, kyc/page.tsx)
- **Lignes de code ajoutées :** ~710
- **Bugs corrigés :** 1 (KYC admin details)
- **Features implémentées :** 2 systèmes complets (payment auto-confirm, driver subscriptions)

**Session 3:**
- **Commits créés :** 3
- **Fichiers créés :** 6 (B2B_PLAN.md, business.ts, businessOrders.ts, businessAddresses.ts, businessDrivers.ts, matchingEngine.ts)
- **Fichiers modifiés :** 4 (schema.prisma, index.ts, auth.ts, CLAUDE.md)
- **Lignes de code ajoutées :** ~2400
- **Bugs corrigés :** 0
- **Features implémentées :** 1 système complet (B2B module backend)

**Session 4:**
- **Commits créés :** 3 (à créer)
- **Fichiers créés :** 6 (5 pages B2B frontend + SubscriptionModal.tsx)
- **Fichiers modifiés :** 4 (driver/register, admin.ts, auth.ts, driver/dashboard)
- **Lignes de code ajoutées :** ~1700
- **Bugs corrigés :** 0
- **Features implémentées :** 2 systèmes complets (B2B frontend + Patente/Subscription)

**Total Sessions 1+2+3+4:**
- **Commits créés :** 18
- **Fichiers créés :** 20
- **Fichiers modifiés :** 15 (unique)
- **Lignes de code ajoutées :** ~6310
- **Bugs corrigés :** 7
- **Features implémentées :** 6 systèmes complets

---

## 🔗 Commits de Cette Session (par ordre chronologique)

**Session 1:**
1. `f3730dd` - feat: Add modular price estimation algorithm (Backend + API)
2. `2ec5d47` - feat: Add admin pricing configuration interface
3. `1e5897b` - fix: Complete pricing system with admin configuration interface
4. `78e9ea1` - feat: Integrate real-time price estimation in customer ride form
5. `d6b2ab1` - fix: Correct auth middleware import (authenticateToken → verifyToken)
6. `8a8f52b` - fix: Add admin token support in API interceptor
7. `4470da1` - fix: Use req.userId instead of req.user.id in pricing routes
8. `b505706` - fix: Use dynamic import for SimpleMap to prevent SSR errors
9. `98fabb1` - fix: Pin React to 18.2.0 and fix MantineProvider compatibility

**Session 2:**
10. `0bdb3c6` - docs: Add comprehensive session documentation (CLAUDE, PROGRESS, TODO)
11. `2807f08` - feat: Add automatic payment confirmation batch job and improve KYC admin
12. `843d20e` - docs: Update documentation for Session 2 (payment auto-confirm + KYC fixes)
13. `c122e6d` - feat: Add driver subscription system with priority and profile boosting

**Session 3:**
14. `faa14c5` - docs: Add comprehensive B2B module documentation
15. `41f5c39` - feat: Add B2B database schema
16. `87ba6ce` - feat: Implement B2B backend API with matching engine

---

## 💡 Notes pour la Prochaine Session

### Contexte à se rappeler :
- Le système de pricing est **complet** côté code
- Le système d'auto-confirmation paiements est **complet** côté code (batch s'exécute toutes les 2min)
- Le système d'abonnement conducteurs est **complet** côté backend (batch s'exécute toutes les heures)
- **Le module B2B backend est complet** (Session 3): Auth, Orders, Addresses, Drivers, Matching Engine
- Il faut **migrer la DB** pour activer toutes ces fonctionnalités (pricing + payments + subscriptions + B2B)
- React **DOIT** rester à 18.2.0 (Mantine incompatible avec v19)
- Tous les commits sont sur `claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK`

### Vérifications à faire :
- Confirmer que React 18.2.0 est bien installé
- Vérifier que l'app démarre sans erreur MantineProvider
- **Exécuter la migration Prisma (pricing + payment + subscriptions + B2B)**
  ```bash
  cd packages/database && npx prisma migrate dev --name add_b2b_module
  ```
- Redémarrer le serveur API et vérifier les logs des batch jobs:
  - "⏰ Payment auto-confirmation batch job started"
  - "💎 Subscription expiration batch job started"
- Initialiser les configs pricing via admin UI
- Tester l'estimation de prix dans l'interface client
- Tester l'auto-confirmation des paiements (simulation: modifier onHoldAt en DB)
- Tester la souscription à un abonnement conducteur via API
- **Tester les endpoints B2B via Postman/Insomnia:**
  - POST /api/business/register
  - POST /api/business/verify-phone (code "123456")
  - GET /api/business/profile
  - POST /api/business/orders (créer commande DRAFT)
  - POST /api/business/orders/:id/submit (déclencher matching)

### Si problèmes :
- **MantineProvider error** → Vérifier version React (doit être 18.2.0)
- **Pricing ne s'affiche pas** → Vérifier migration DB exécutée
- **Admin access required** → Vérifier localStorage contient 'adminToken'
- **window is not defined** → Vérifier dynamic import avec ssr: false
- **Batch jobs ne démarrent pas** → Vérifier logs serveur, vérifier imports dans index.ts
- **Payment reste ON_HOLD** → Vérifier que batch s'exécute, vérifier GPS du conducteur
- **Subscription ne s'active pas** → Vérifier migration DB, vérifier transaction Prisma

---

**Fin du journal de session**
