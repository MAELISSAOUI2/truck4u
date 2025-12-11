# 📋 Plan Structuré - Résolution des Anomalies et Évolutions Truck4u

**Date:** 2025-12-07
**Branche:** `claude/fix-completion-workflow-018mXHM8CxWHpUfvhfS9qeqK`
**Statut:** Version 1.0

---

## 🎯 Résumé Exécutif

Ce document présente un plan structuré pour résoudre toutes les anomalies identifiées et implémenter les évolutions requises pour la plateforme Truck4u. Les tâches sont classées par priorité et impact métier.

### Métriques Clés
- **Anomalies Critiques (Bloquantes):** 1 ✅ RÉSOLUE
- **Anomalies Majeures:** 4
- **Anomalies Mineures:** 7
- **Évolutions Nouvelles Fonctionnalités:** 5
- **Évolutions Architecture:** 5

---

## ✅ PHASE 0: Anomalies Critiques RÉSOLUES

### ✅ 1. Workflow Base de Données - Erreurs Prisma
**Statut:** RÉSOLU (commit b3681ff)

**Problème:**
```
Invalid `prisma.payment.findMany()` invocation
Unknown field `Ride` for include statement on model `Payment`
```

**Cause Racine:**
- Schéma Prisma local obsolète (manquait `@default(uuid())`)
- Noms de relations capitalisés dans le code vs lowercase dans le schéma

**Solution Appliquée:**
1. Mise à jour du schéma avec `@default(uuid())` sur tous les modèles
2. Correction des noms de relations: `ride`, `driver`, `customer` (lowercase)
3. Fichiers corrigés:
   - `apps/api/src/services/paymentAutoConfirmation.ts`
   - `apps/api/src/services/subscriptionExpiration.ts`

**Actions Utilisateur Requises:**
```powershell
# 1. Récupérer les derniers changements
git pull origin claude/fix-completion-workflow-018mXHM8CxWHpUfvhfS9qeqK

# 2. Vérifier le schéma est à jour
Select-String -Path "packages\database\prisma\schema.prisma" -Pattern "@default\(uuid\(\)\)"

# 3. Régénérer le client Prisma
cd packages\database
npx prisma generate
cd ..\..

# 4. Redémarrer le serveur
npm run dev:api
```

**Validation:**
Le serveur doit démarrer sans erreurs Prisma:
```
✅ [Auto-Confirm] Starting batch job (runs every 2 minutes)...
✅ [Subscription] Starting expiration batch job (runs every hour)...
🚀 Server running on port 4000
```

---

## 🔴 PHASE 1: Anomalies Majeures (Impact Métier Direct)

### 1.1 Géolocalisation et Adresses Imprécises
**Priorité:** TRÈS HAUTE
**Impact:** Expérience utilisateur dégradée, prix inexacts

**Problèmes Identifiés:**
- Adresses imprécises sans numéro de rue
- Pas d'autocomplétion d'adresse
- Points GPS approximatifs affectant le calcul de prix

**Actions Requises:**

#### Étape 1: Intégration API Géocodage (Nominatim ou Photon)
```typescript
// apps/web/lib/geocoding.ts (NOUVEAU FICHIER)
interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    postcode?: string;
  };
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&` +
    `format=json&addressdetails=1&limit=5&` +
    `countrycodes=tn`  // Limiter à la Tunisie
  );
  return response.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?` +
    `lat=${lat}&lon=${lon}&format=json&addressdetails=1`
  );
  return response.json();
}
```

#### Étape 2: Composant Autocomplete Adresse
```typescript
// apps/web/components/AddressAutocomplete.tsx
import { Autocomplete } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useState, useEffect } from 'react';

export function AddressAutocomplete({
  value,
  onChange,
  onSelect
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (result: GeocodingResult) => void;
}) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [debounced] = useDebouncedValue(value, 500);

  useEffect(() => {
    if (debounced.length >= 3) {
      searchAddress(debounced).then(setResults);
    }
  }, [debounced]);

  return (
    <Autocomplete
      label="Adresse"
      placeholder="Tapez une adresse..."
      value={value}
      onChange={onChange}
      data={results.map(r => ({
        value: r.display_name,
        label: r.display_name,
        result: r
      }))}
      onOptionSubmit={(option) => {
        onSelect(option.result);
      }}
    />
  );
}
```

#### Étape 3: Mise à Jour Schéma DB
```prisma
// packages/database/prisma/schema.prisma
model Ride {
  // Ajouter champs d'adresse détaillée
  pickupAddress        String    // Adresse complète
  pickupStreet         String?   // Rue
  pickupHouseNumber    String?   // Numéro
  pickupCity           String    // Ville
  pickupPostcode       String?   // Code postal

  dropoffAddress       String
  dropoffStreet        String?
  dropoffHouseNumber   String?
  dropoffCity          String
  dropoffPostcode      String?
}
```

**Fichiers à Modifier:**
- `apps/web/components/AddressAutocomplete.tsx` (CRÉER)
- `apps/web/lib/geocoding.ts` (CRÉER)
- `apps/web/app/customer/new-ride/page.tsx` (MODIFIER)
- `packages/database/prisma/schema.prisma` (MIGRATION)

**Validation:**
- Autocomplétion fonctionne avec 3+ caractères
- Adresses incluent numéro de rue quand disponible
- Points GPS précis à ±10m

---

### 1.2 Distance et Prix à Partir de la Position Conducteur
**Priorité:** HAUTE
**Impact:** Prix inexacts si conducteur loin du pickup

**Problème:**
Le prix actuel est calculé uniquement entre pickup et dropoff. Si le conducteur est à 20km du pickup, il perd de l'argent.

**Solution:**

#### Étape 1: Ajouter Distance Conducteur au Calcul
```typescript
// apps/api/src/routes/pricing.ts
interface EstimateWithDriverRequest {
  vehicleType: VehicleType;
  tripType: TripType;

  // Coordonnées conducteur (si disponible)
  driverLat?: number;
  driverLng?: number;

  // Pickup
  pickupLat: number;
  pickupLng: number;

  // Dropoff
  dropoffLat: number;
  dropoffLng: number;
}

export async function calculatePriceWithDriver(req: EstimateWithDriverRequest) {
  let totalDistance = 0;
  let totalDuration = 0;

  // Si conducteur fourni, calculer distance conducteur -> pickup
  if (req.driverLat && req.driverLng) {
    const toPickup = await getOSRMRoute(
      req.driverLat, req.driverLng,
      req.pickupLat, req.pickupLng
    );
    totalDistance += toPickup.distance;
    totalDuration += toPickup.duration;
  }

  // Puis pickup -> dropoff (charge utile)
  const mainRoute = await getOSRMRoute(
    req.pickupLat, req.pickupLng,
    req.dropoffLat, req.dropoffLng
  );
  totalDistance += mainRoute.distance;
  totalDuration += mainRoute.duration;

  // Si aller-retour, doubler la distance principale
  if (req.tripType === 'RETURN') {
    totalDistance += mainRoute.distance;
    totalDuration += mainRoute.duration;
  }

  // Calculer prix sur distance totale
  return calculatePrice(totalDistance, totalDuration, req.vehicleType);
}
```

#### Étape 2: Modifier Interface de Bidding
```typescript
// apps/web/app/driver/available-rides/page.tsx
async function submitBid(ride: Ride) {
  const driverPosition = await getCurrentPosition(); // Géolocalisation navigateur

  const estimateWithDriver = await api.post('/pricing/estimate-with-driver', {
    vehicleType: driver.vehicleType,
    tripType: ride.tripType,
    driverLat: driverPosition.lat,
    driverLng: driverPosition.lng,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng
  });

  // Pré-remplir le montant avec l'estimation incluant distance conducteur
  setBidAmount(estimateWithDriver.finalPrice);
}
```

**Fichiers à Modifier:**
- `apps/api/src/routes/pricing.ts` (NOUVEAU ENDPOINT)
- `apps/web/app/driver/available-rides/page.tsx` (MODIFIER)

**Validation:**
- Le prix affiché au conducteur inclut sa distance actuelle au pickup
- Le montant de bid est pré-rempli avec ce prix

---

### 1.3 Inscription Business Bloquée
**Priorité:** HAUTE
**Impact:** Perte de clients B2B

**Problème:**
Le flux d'inscription business est bloqué à l'étape d'adresse.

**Actions Requises:**

#### Étape 1: Diagnostic
```typescript
// Vérifier le composant d'inscription business
// apps/web/app/auth/register-business/page.tsx
```

#### Étape 2: Intégrer AddressAutocomplete
```typescript
// Remplacer input adresse par composant autocomplete
<AddressAutocomplete
  value={businessAddress}
  onChange={setBusinessAddress}
  onSelect={(result) => {
    setBusinessLat(parseFloat(result.lat));
    setBusinessLng(parseFloat(result.lon));
    setBusinessCity(result.address.city || '');
  }}
/>
```

**Fichiers à Modifier:**
- `apps/web/app/auth/register-business/page.tsx` (IDENTIFIER ET MODIFIER)

**Validation:**
- Inscription business complète jusqu'à création compte
- Coordonnées GPS correctement enregistrées

---

### 1.4 Montant de Bid Non Pré-rempli
**Priorité:** MOYENNE
**Impact:** Confusion conducteurs, bids inappropriés

**Problème:**
Le champ montant de bid est vide alors qu'on a une estimation de prix.

**Solution:**
```typescript
// apps/web/app/driver/available-rides/page.tsx
const [bidAmount, setBidAmount] = useState<number>(0);

useEffect(() => {
  if (selectedRide) {
    // Récupérer estimation depuis le ride ou recalculer
    const estimate = selectedRide.estimatedPrice ||
                     await recalculateWithDriverPosition();
    setBidAmount(estimate);
  }
}, [selectedRide]);

return (
  <NumberInput
    label="Votre proposition (DT)"
    value={bidAmount}
    onChange={setBidAmount}
    min={0}
    step={0.5}
    precision={2}
  />
);
```

**Fichiers à Modifier:**
- `apps/web/app/driver/available-rides/page.tsx`

**Validation:**
- Champ pré-rempli avec estimation
- Conducteur peut ajuster si nécessaire

---

## 🟡 PHASE 2: Anomalies Mineures (Impact UX)

### 2.1 Map Non Affichée sur Page Ride Conducteur
**Fichier:** `apps/web/app/driver/rides/[id]/page.tsx`

**Solution:**
```typescript
import dynamic from 'next/dynamic';

const SimpleMap = dynamic(() => import('@/components/SimpleMap'), {
  ssr: false,
  loading: () => <Skeleton height={400} />
});
```

---

### 2.2 Note Moyenne Dashboard Conducteur Affiche Zéro
**Fichier:** `apps/web/app/driver/dashboard/page.tsx`

**Vérifier:**
```typescript
// S'assurer que le calcul utilise la bonne relation
const driver = await prisma.driver.findUnique({
  where: { id: driverId },
  include: {
    rides: {
      where: { rating: { not: null } }
    }
  }
});

const avgRating = driver.rides.reduce((sum, r) => sum + (r.rating || 0), 0) /
                  driver.rides.filter(r => r.rating).length;
```

---

### 2.3 Taux de Réussite Conducteur Affiche Zéro
**Fichier:** `apps/api/src/routes/drivers.ts`

**Calcul:**
```typescript
const totalRides = await prisma.ride.count({
  where: { driverId, status: { in: ['COMPLETED', 'CANCELLED'] } }
});

const completedRides = await prisma.ride.count({
  where: { driverId, status: 'COMPLETED' }
});

const successRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 0;
```

---

### 2.4 Redirection Automatique Après Fin de Course
**Fichier:** `apps/web/app/customer/rides/[id]/page.tsx`

**Solution:**
```typescript
useEffect(() => {
  if (ride.status === 'COMPLETED') {
    setTimeout(() => {
      router.push('/customer/dashboard');
    }, 3000); // 3 secondes après complétion
  }
}, [ride.status]);
```

---

### 2.5 Logout Disponible Partout
**Fichier:** `apps/web/components/Navbar.tsx`

Ajouter bouton logout dans tous les layouts (admin, customer, driver).

---

### 2.6 Correction Redirection KYC Conducteur
**Fichier:** `apps/web/app/driver/dashboard/page.tsx`

**Condition:**
```typescript
// Ne rediriger vers KYC QUE si aucun document soumis
if (driver.kycStatus === 'PENDING' && driver.kycDocuments.length === 0) {
  router.push('/driver/kyc');
}
```

---

### 2.7 État "Occupé" avec Proposition de Créneau
**Nouveauté:** Permettre aux conducteurs occupés de faire des bids avec horaire futur

**Schéma DB:**
```prisma
model Bid {
  id              String    @id @default(uuid())
  proposedAmount  Float

  // NOUVEAU: Proposition de créneau si conducteur occupé
  availableFrom   DateTime? // "Je peux à partir de 14h00"
  isScheduledBid  Boolean   @default(false)

  // Existing fields...
}
```

**UI:**
```typescript
<Checkbox
  label="Je suis actuellement occupé"
  checked={isOccupied}
  onChange={(e) => setIsOccupied(e.currentTarget.checked)}
/>

{isOccupied && (
  <TimeInput
    label="Je serai disponible à partir de"
    value={availableFrom}
    onChange={setAvailableFrom}
  />
)}
```

---

## 🟢 PHASE 3: Nouvelles Fonctionnalités

### 3.1 Système Wallet E-commerce (Hold/Release)
**Priorité:** HAUTE
**Impact:** Permet dark kitchens et retours produits

**Schéma DB:**
```prisma
model Wallet {
  id              String    @id @default(uuid())
  customerId      String    @unique
  customer        Customer  @relation(fields: [customerId], references: [id])

  balance         Float     @default(0)
  heldAmount      Float     @default(0) // Montant en attente (hold)
  availableAmount Float     @default(0) // balance - heldAmount

  transactions    WalletTransaction[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model WalletTransaction {
  id              String    @id @default(uuid())
  walletId        String
  wallet          Wallet    @relation(fields: [walletId], references: [id])

  type            WalletTransactionType // DEPOSIT, HOLD, RELEASE, REFUND, CHARGE
  amount          Float
  rideId          String?   // Si lié à une course
  ride            Ride?     @relation(fields: [rideId], references: [id])

  status          TransactionStatus // PENDING, COMPLETED, FAILED
  description     String
  createdAt       DateTime  @default(now())
}

enum WalletTransactionType {
  DEPOSIT       // Recharge wallet
  HOLD          // Bloquer montant (dark kitchen)
  RELEASE       // Libérer hold (livraison OK)
  REFUND        // Rembourser hold (annulation)
  CHARGE        // Débiter pour une course
}
```

**API Endpoints:**
```typescript
// POST /api/wallet/deposit
// POST /api/wallet/hold - Bloquer montant pour une course
// POST /api/wallet/release - Libérer après livraison
// POST /api/wallet/refund - Rembourser si problème
// GET /api/wallet/balance
```

**Flux Dark Kitchen:**
1. Client commande repas (50 DT)
2. `HOLD` 50 DT sur wallet
3. Conducteur livre
4. Client confirme réception
5. `RELEASE` → paiement conducteur
6. Si problème → `REFUND` au client

---

### 3.2 Abonnement B2B Obligatoire
**Priorité:** HAUTE
**Impact:** Revenus récurrents

**Schéma DB (existe déjà - vérifier):**
```prisma
model B2BSubscription {
  id              String    @id @default(uuid())
  customerId      String    @unique
  customer        Customer  @relation(fields: [customerId], references: [id])

  monthlyFee      Float     // Montant configurable admin
  status          SubscriptionStatus
  startDate       DateTime
  nextBillingDate DateTime

  createdAt       DateTime  @default(now())
}
```

**Logique Métier:**
```typescript
// apps/api/src/middleware/requireB2BSubscription.ts
export async function requireActiveB2BSubscription(req, res, next) {
  const customer = await prisma.customer.findUnique({
    where: { id: req.userId },
    include: { subscription: true }
  });

  if (customer.accountType === 'BUSINESS') {
    if (!customer.subscription || customer.subscription.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Abonnement B2B requis',
        redirectTo: '/customer/subscription'
      });
    }
  }

  next();
}
```

**Appliquer middleware:**
```typescript
// Sur route création course
router.post('/rides', requireAuth, requireB2BSubscription, createRide);
```

---

### 3.3 Abonnements Premium Conducteurs
**Statut:** Partiellement implémenté (vérifier DriverSubscription model)

**Vérifications requises:**
- Modèle `DriverSubscription` existe (ligne 325 du schéma)
- Batch job `subscriptionExpiration.ts` fonctionne
- Interface admin pour gérer les tiers
- Interface conducteur pour souscrire

**Fichiers à vérifier:**
- `packages/database/prisma/schema.prisma` (DriverSubscription)
- `apps/api/src/services/subscriptionExpiration.ts` ✅
- `apps/web/app/admin/subscriptions/page.tsx` (?)
- `apps/web/app/driver/subscription/page.tsx` (?)

---

### 3.4 Modèle Commission par Gouvernorat
**Priorité:** MOYENNE

**Schéma DB:**
```prisma
model GovernorateCommission {
  id              String    @id @default(uuid())
  governorate     String    @unique // "Tunis", "Sfax", etc.
  commissionRate  Float     // 0.10 = 10%
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Modification calcul prix:**
```typescript
// Détecter gouvernorat depuis coordonnées GPS (reverse geocoding)
const governorate = await getGovernorateFromCoordinates(pickupLat, pickupLng);

// Récupérer commission
const commissionConfig = await prisma.governorateCommission.findUnique({
  where: { governorate }
});

const platformFeeRate = commissionConfig?.commissionRate || 0.10; // Défaut 10%
```

---

### 3.5 Désactivation Manuelle Utilisateur (Admin)
**Priorité:** MOYENNE

**Ajouter dans Admin UI:**
```typescript
// apps/web/app/admin/users/[id]/page.tsx
<Button
  color="red"
  onClick={async () => {
    await api.put(`/admin/users/${userId}/deactivate`, {
      reason: 'Comportement inapproprié'
    });
  }}
>
  Désactiver le compte
</Button>
```

**API:**
```typescript
// apps/api/src/routes/admin.ts
router.put('/users/:id/deactivate', requireAdmin, async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: req.body.reason
    }
  });
});
```

---

## 🔧 PHASE 4: Évolutions Architecture

### 4.1 Migration vers BullMQ (Redis Job Queue)
**Priorité:** MOYENNE
**Bénéfice:** Scalabilité, retry automatique, monitoring

**Remplacer:**
```typescript
// AVANT: setInterval in-memory
setInterval(() => processAutoConfirmation(), 2 * 60 * 1000);
```

**PAR:**
```typescript
// APRÈS: BullMQ
import { Queue, Worker } from 'bullmq';

const autoConfirmQueue = new Queue('auto-confirm', {
  connection: { host: 'localhost', port: 6379 }
});

// Ajouter job répétitif
await autoConfirmQueue.add('process', {}, {
  repeat: { every: 2 * 60 * 1000 }
});

// Worker
const worker = new Worker('auto-confirm', async (job) => {
  await processAutoConfirmation();
}, { connection: { host: 'localhost', port: 6379 } });
```

---

### 4.2 Socket.io Redis Adapter
**Priorité:** HAUTE si scaling horizontal
**Bénéfice:** Multi-instances API

```typescript
// apps/api/src/socket.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

---

### 4.3 Refresh Token Flow
**Priorité:** HAUTE (sécurité)

**Schéma DB:**
```prisma
model RefreshToken {
  id           String    @id @default(uuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  token        String    @unique
  expiresAt    DateTime
  isRevoked    Boolean   @default(false)
  createdAt    DateTime  @default(now())
}
```

**Auth Flow:**
1. Login → Access Token (15 min) + Refresh Token (7 jours)
2. Access Token expire → Frontend utilise Refresh Token
3. Backend vérifie Refresh Token → Émet nouveau Access Token
4. Logout → Révoquer Refresh Token

---

### 4.4 Application Mobile React Native
**Priorité:** BASSE (futur)

**Stack suggérée:**
- React Native avec Expo
- Réutiliser API existante
- Socket.io pour temps réel
- Géolocalisation native

---

### 4.5 WAF et Sécurité (Cloudflare)
**Priorité:** MOYENNE

**Actions:**
- Activer Cloudflare WAF
- Rate limiting par IP
- Protection DDoS
- Cache CDN pour assets statiques

---

## 📊 Ordonnancement Recommandé

### Sprint 1 (1 semaine) - CRITIQUE
1. ✅ Résoudre erreurs Prisma (FAIT)
2. 🔄 Géolocalisation et autocomplete adresse
3. 🔄 Distance depuis position conducteur
4. 🔄 Débloquer inscription business

### Sprint 2 (1 semaine) - FONCTIONNALITÉS CORE
1. Système Wallet e-commerce
2. Abonnement B2B obligatoire
3. Pré-remplissage montant bid
4. Map conducteur

### Sprint 3 (1 semaine) - UX ET CORRECTIFS
1. Note moyenne dashboard
2. Taux de réussite
3. Redirection auto après course
4. Logout partout
5. État occupé avec créneau

### Sprint 4 (2 semaines) - ARCHITECTURE
1. Migration BullMQ
2. Socket.io Redis Adapter
3. Refresh Token Flow
4. Commission par gouvernorat

### Sprint 5+ - ÉVOLUTIONS
1. Désactivation manuelle utilisateur
2. WAF Cloudflare
3. Application mobile (étude)

---

## 🧪 Checklist de Validation

Avant chaque déploiement:

### Tests Fonctionnels
- [ ] Inscription client/driver/business fonctionne
- [ ] Création course avec adresse précise
- [ ] Estimation prix correcte (avec distance conducteur)
- [ ] Bidding et acceptation
- [ ] Paiement (CASH, CARD, FLOUCI)
- [ ] Auto-confirmation après 15 min
- [ ] Expiration abonnements
- [ ] KYC admin

### Tests Non-Régression
- [ ] Aucune erreur Prisma au démarrage
- [ ] Socket.io connecté
- [ ] Batch jobs démarrent
- [ ] Maps s'affichent (SSR désactivé)

### Performance
- [ ] Temps réponse API < 200ms
- [ ] Chargement page < 2s
- [ ] Pas de memory leak

---

## 📝 Notes Importantes

### Conventions Prisma (CRITIQUE)
**Toujours utiliser les noms de relations EN LOWERCASE:**
```typescript
✅ include: { ride: { include: { driver: true, customer: true } } }
❌ include: { Ride: { include: { Driver: true, Customer: true } } }
```

### Migrations DB
Toujours créer migration avant modifier schéma:
```powershell
cd packages\database
npx prisma migrate dev --name <description>
npx prisma generate
```

### React Version
**NE JAMAIS** upgrader React à 19.x (incompatible Mantine 8).

---

## 🔗 Ressources

- **Nominatim API:** https://nominatim.org/release-docs/latest/api/Search/
- **BullMQ Docs:** https://docs.bullmq.io/
- **Socket.io Redis:** https://socket.io/docs/v4/redis-adapter/
- **Mantine Components:** https://mantine.dev/

---

**Dernière mise à jour:** 2025-12-07
**Prochaine revue:** Après Sprint 1
