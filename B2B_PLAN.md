# B2B Module - Plan d'Implémentation Complet

**Date :** 2025-11-26
**Branche :** `claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK`
**Status :** 🚧 En cours - Phase 1 (MVP)

---

## 🎯 Objectif

Ajouter un module B2B complet à Truck4u permettant aux commerces, PME et vendeurs en ligne de :
- S'inscrire facilement (2 minutes)
- Commander des livraisons avec COD
- Être matchés avec des conducteurs qualifiés
- Suivre leurs commandes en temps réel
- Bénéficier de tarifs préférentiels selon leur Trust Level

---

## 📊 Cible B2B

### Segments
1. **Commerce de proximité** : Épiceries, boutiques, pharmacies
2. **Vendeurs en ligne** : Facebook, Instagram, marketplaces
3. **PME locales** : E-commerce émergent, grossistes
4. **Restaurants** : Traiteurs, dark kitchens

### Besoins spécifiques
- **Friction minimale** : Inscription express, première commande en 5 min
- **COD simplifié** : 70-80% des commandes avec cash on delivery
- **Confiance progressive** : Vérification légère au début, complète si volume augmente
- **Conducteurs fiables** : Matching avec conducteurs habilités niveau 2+
- **Carnet d'adresses** : Sauvegarder destinations fréquentes

---

## 🏗️ Architecture Décision Records

### ADR-001: Business séparé du Customer
**Decision:** Créer un nouveau modèle `Business` au lieu d'étendre `Customer`

**Raison:**
- Workflow B2B fondamentalement différent du B2C
- Trust Levels spécifiques B2B (STARTER/VERIFIED/PRO/ENTERPRISE)
- Champs métier différents (COD payout, carnet d'adresses, etc.)
- Évolutivité: permet features B2B sans impacter B2C

**Alternatives rejetées:**
- Étendre Customer avec champs conditionnels → code trop complexe
- Utiliser accountType: BUSINESS → limité, pas assez flexible

### ADR-002: BusinessOrder séparé du Ride
**Decision:** Créer un nouveau modèle `BusinessOrder` au lieu d'utiliser `Ride`

**Raison:**
- B2C: Système de bidding, client choisit conducteur
- B2B: Matching automatique, priorité vitesse
- B2B: COD obligatoire dans 70% des cas
- B2B: Proof of Delivery requis
- B2B: Champs spécifiques (recipient, savedAddressId, etc.)

**Alternatives rejetées:**
- Utiliser Ride avec champ businessId → trop de champs conditionnels
- Polymorphisme → complexité ORM, migrations difficiles

### ADR-003: Extension Driver (pas nouveau modèle)
**Decision:** Étendre modèle `Driver` existant avec champs B2B

**Raison:**
- Le KYC conducteur est déjà complet et validé
- Un conducteur peut faire B2C ET B2B
- Ajouter simple: b2bHabilitation (JSON), b2bPreferences (JSON)
- Utiliser système de niveaux existant (tier) comme base

**Alternatives rejetées:**
- Créer B2BDriver séparé → duplication, complexité auth
- Créer table de liaison → overhead inutile

### ADR-004: Matching avec rounds
**Decision:** Matching en 2 rounds (réguliers puis autres)

**Raison:**
- Fidéliser les conducteurs réguliers
- Business bénéficie de conducteurs qui connaissent déjà
- Améliore taux d'acceptation (relationshipScore = 0.35 du total)
- Round 1: 60s pour réguliers (2+ livraisons)
- Round 2: 90s pour autres

**Alternatives rejetées:**
- Matching simple distance → ignore relations
- Notification broadcast → spam conducteurs

---

## 📐 Database Schema - Phase 1 (MVP)

### Nouveaux Modèles

#### Business
```prisma
model Business {
  id                   String    @id @default(uuid())

  // === INFOS DE BASE ===
  businessName         String
  businessType         BusinessType
  ownerFirstName       String
  phone                String    @unique
  phoneVerified        Boolean   @default(false)
  phoneVerifiedAt      DateTime?

  // Localisation
  gouvernorat          String
  delegation           String
  addressLine          String
  coordinates          Json?     // {lat, lng}

  // === TRUST LEVEL ===
  trustLevel           TrustLevel @default(STARTER)
  trustLevelUpdatedAt  DateTime  @default(now())

  // Limites selon Trust Level (calculées dynamiquement)
  maxDailyCOD          Float     @default(300)
  maxSingleOrderCOD    Float     @default(100)
  maxDailyOrders       Int       @default(5)

  // === VÉRIFICATION (étape 2) ===
  verificationStatus   BusinessVerificationStatus @default(NONE)
  cinFront             String?
  cinBack              String?
  cinSelfie            String?
  cinNumber            String?
  verifiedAt           DateTime?
  rejectionReason      String?   @db.Text

  // === COD PAYOUT ===
  codPayoutMethod      CODPayoutMethod?
  codPayoutPhone       String?   // Pour D17/Flouci
  codPayoutBankRib     String?
  codPayoutBankName    String?

  // === PRÉFÉRENCES ===
  useBusinessAddressAsDefault Boolean @default(true)
  language             String    @default("FR") // FR ou AR

  // === STATS ===
  totalOrders          Int       @default(0)
  completedOrders      Int       @default(0)
  cancelledOrders      Int       @default(0)
  totalCODCollected    Float     @default(0)
  rating               Float     @default(0.0)  // Note par conducteurs

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  lastOrderAt          DateTime?

  // Relations
  orders               BusinessOrder[]
  addresses            BusinessAddress[]
  driverRelations      DriverBusinessRelation[]
  favoriteDrivers      BusinessFavoriteDriver[]

  @@index([trustLevel])
  @@index([phone])
  @@index([businessType])
  @@index([gouvernorat, delegation])
}
```

#### BusinessOrder
```prisma
model BusinessOrder {
  id                   String    @id @default(uuid())
  businessId           String
  orderNumber          String    @unique // TRK-YYYYMMDD-XXXX

  // === DESTINATAIRE ===
  recipientName        String
  recipientPhone       String
  recipientGouvernorat String
  recipientDelegation  String
  recipientAddress     String
  recipientCoordinates Json?     // {lat, lng}
  recipientNotes       String?   @db.Text
  savedAddressId       String?   // Si depuis carnet

  // === POINT D'ENLÈVEMENT ===
  pickupContactName    String
  pickupContactPhone   String
  pickupGouvernorat    String
  pickupDelegation     String
  pickupAddress        String
  pickupCoordinates    Json      // {lat, lng}

  // === COLIS ===
  cargoType            CargoType
  cargoDescription     String?   @db.Text
  estimatedWeight      Float?
  estimatedSize        CargoSize?

  // === VÉHICULE & SERVICE ===
  requiredVehicle      VehicleType
  distance             Float     // km (calculé via OSRM)
  estimatedDuration    Int       // minutes

  // === COD ===
  hasCOD               Boolean   @default(false)
  codAmount            Float?
  codStatus            CODStatus @default(PENDING)
  codCollectedAt       DateTime?

  // === PRICING ===
  baseFee              Float
  distanceFee          Float
  serviceFee           Float
  discount             Float     @default(0)
  totalPrice           Float

  // === MATCHING ===
  matchingStatus       MatchingStatus @default(PENDING)
  matchingStartedAt    DateTime?
  matchingRound        Int?      // 1 ou 2
  matchedAt            DateTime?

  // === CONDUCTEUR ===
  driverId             String?
  driverAcceptedAt     DateTime?

  // === STATUT ===
  status               BusinessOrderStatus @default(DRAFT)

  // === PROOF OF DELIVERY ===
  podPhoto             String?
  podSignature         String?
  podRecipientName     String?
  podTimestamp         DateTime?
  podLocation          Json?     // {lat, lng}

  // === ÉVALUATIONS ===
  businessRating       Int?      // 1-5
  businessReview       String?   @db.Text
  driverRating         Int?      // 1-5
  driverReview         String?   @db.Text

  // === TIMING ===
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  submittedAt          DateTime? // Quand soumise pour matching
  scheduledFor         DateTime? // Si programmée
  estimatedDeliveryAt  DateTime?
  actualPickupAt       DateTime?
  actualDeliveryAt     DateTime?
  completedAt          DateTime?
  cancelledAt          DateTime?

  // Relations
  business             Business  @relation(fields: [businessId], references: [id])
  driver               Driver?   @relation("BusinessOrders", fields: [driverId], references: [id])
  savedAddress         BusinessAddress? @relation(fields: [savedAddressId], references: [id])
  statusHistory        BusinessOrderStatusHistory[]

  @@index([businessId, createdAt])
  @@index([status])
  @@index([matchingStatus])
  @@index([driverId, status])
  @@index([orderNumber])
}
```

#### BusinessAddress (Carnet d'adresses)
```prisma
model BusinessAddress {
  id                   String    @id @default(uuid())
  businessId           String

  label                String    // Ex: "Client Habib - Bab Bhar"
  recipientName        String
  recipientPhone       String
  gouvernorat          String
  delegation           String
  addressLine          String
  coordinates          Json?     // {lat, lng}
  notes                String?   @db.Text

  // Stats d'utilisation
  usageCount           Int       @default(0)
  lastUsedAt           DateTime?

  isActive             Boolean   @default(true)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  business             Business  @relation(fields: [businessId], references: [id])
  orders               BusinessOrder[]

  @@index([businessId, isActive])
  @@index([businessId, lastUsedAt])
}
```

#### DriverBusinessRelation (Historique & Relations)
```prisma
model DriverBusinessRelation {
  id                   String    @id @default(uuid())
  driverId             String
  businessId           String

  // Stats relation
  totalDeliveries      Int       @default(0)
  completedDeliveries  Int       @default(0)
  cancelledDeliveries  Int       @default(0)

  // Scores
  averageRating        Float     @default(0)
  totalCODCollected    Float     @default(0)

  // Timing
  firstDeliveryAt      DateTime?
  lastDeliveryAt       DateTime?

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  driver               Driver    @relation("DriverBusinessRelations", fields: [driverId], references: [id])
  business             Business  @relation(fields: [businessId], references: [id])

  @@unique([driverId, businessId])
  @@index([businessId, totalDeliveries])
  @@index([driverId, totalDeliveries])
}
```

#### BusinessFavoriteDriver (Favoris)
```prisma
model BusinessFavoriteDriver {
  id                   String    @id @default(uuid())
  businessId           String
  driverId             String

  addedAt              DateTime  @default(now())

  business             Business  @relation(fields: [businessId], references: [id])
  driver               Driver    @relation("BusinessFavorites", fields: [driverId], references: [id])

  @@unique([businessId, driverId])
  @@index([businessId])
  @@index([driverId])
}
```

#### BusinessOrderStatusHistory
```prisma
model BusinessOrderStatusHistory {
  id                   String    @id @default(uuid())
  orderId              String

  status               BusinessOrderStatus
  timestamp            DateTime  @default(now())
  location             Json?     // {lat, lng}
  note                 String?   @db.Text
  actor                HistoryActor

  order                BusinessOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, timestamp])
}
```

### Enums

```prisma
enum BusinessType {
  LOCAL_SHOP      // Commerce de proximité
  SOCIAL_SELLER   // Vendeur en ligne (FB/Insta)
  SME             // PME
  RESTAURANT      // Restaurant / Food
}

enum TrustLevel {
  STARTER         // Débutant (phone vérifié)
  VERIFIED        // Vérifié (CIN + COD config)
  PRO             // Pro (RC/Patente)
  ENTERPRISE      // Enterprise (sur dossier)
}

enum BusinessVerificationStatus {
  NONE
  PENDING
  APPROVED
  REJECTED
}

enum CODPayoutMethod {
  D17
  FLOUCI
  BANK_TRANSFER
  CASH_PICKUP
}

enum CargoType {
  SMALL           // Petit colis
  MEDIUM          // Colis moyen
  LARGE           // Grand colis
  FRAGILE         // Fragile
  FOOD            // Alimentaire
}

enum CargoSize {
  S               // < 30x30x30cm
  M               // < 50x50x50cm
  L               // < 80x80x80cm
  XL              // > 80x80x80cm
}

enum CODStatus {
  PENDING         // En attente collecte
  COLLECTED       // Collecté par conducteur
  DEPOSITED       // Déposé par conducteur
  PAID_OUT        // Reversé au business
}

enum MatchingStatus {
  PENDING         // Pas encore démarré
  SEARCHING       // En cours
  MATCHED         // Conducteur trouvé
  NO_DRIVER       // Aucun conducteur disponible
}

enum BusinessOrderStatus {
  DRAFT               // Brouillon
  PENDING_PAYMENT     // En attente paiement
  SEARCHING_DRIVER    // Recherche conducteur
  DRIVER_ASSIGNED     // Conducteur assigné
  DRIVER_EN_ROUTE     // Conducteur en route vers pickup
  AT_PICKUP           // Arrivé au pickup
  PICKED_UP           // Colis récupéré
  IN_DELIVERY         // En livraison
  ARRIVED_DESTINATION // Arrivé à destination
  DELIVERED           // Livré
  FAILED              // Échec
  CANCELLED           // Annulé
}

enum HistoryActor {
  SYSTEM
  BUSINESS
  DRIVER
  RECIPIENT
}
```

### Extensions Modèle Driver

```prisma
// AJOUTER au modèle Driver existant:

model Driver {
  // ... champs existants ...

  // === B2B HABILITATION ===
  b2bLevel             Int       @default(1)  // 1-4
  b2bLevelUpdatedAt    DateTime?

  // Critères Level 2 (JSON)
  b2bHabilitation      Json?
  // {
  //   minDeliveries: 10,
  //   minRating: 4.2,
  //   insuranceValid: true,
  //   codTrainingPassed: false
  // }

  // Préférences B2B (JSON)
  b2bPreferences       Json?
  // {
  //   acceptsB2B: true,
  //   workingZones: ['TUNIS', 'ARIANA'],
  //   acceptsIntercity: false,
  //   acceptsNightDelivery: false,
  //   acceptsCOD: true,
  //   maxCODAmount: 500
  // }

  // B2B Stats
  totalB2BDeliveries   Int       @default(0)
  completedB2BDeliveries Int     @default(0)

  // Relations B2B
  businessOrders       BusinessOrder[] @relation("BusinessOrders")
  businessRelations    DriverBusinessRelation[] @relation("DriverBusinessRelations")
  favoritedByBusinesses BusinessFavoriteDriver[] @relation("BusinessFavorites")

  @@index([b2bLevel, isAvailable])
}
```

---

## 🔀 API Routes - Phase 1 (MVP)

### Business Auth & Profile

```typescript
POST   /api/business/register
       Body: { businessName, businessType, ownerFirstName, phone, address }
       → Crée compte, envoie OTP, retourne { businessId, otpSent: true }

POST   /api/business/verify-phone
       Body: { businessId, otp }
       → Valide téléphone, passe trustLevel: STARTER, retourne JWT

GET    /api/business/profile
       Headers: Authorization: Bearer <businessToken>
       → Retourne profil complet + limits actuelles

PUT    /api/business/profile
       Body: { businessName?, ownerFirstName?, address? }
       → Met à jour profil

GET    /api/business/limits
       → Retourne limites actuelles selon Trust Level
```

### Business Orders

```typescript
POST   /api/business/orders
       Body: { recipient, pickup, cargo, vehicle, hasCOD, codAmount }
       → Crée commande en DRAFT

GET    /api/business/orders
       Query: ?status=, ?page=, ?limit=
       → Liste paginée

GET    /api/business/orders/:id
       → Détail + status history

POST   /api/business/orders/:id/submit
       → Soumet commande, déclenche matching

POST   /api/business/orders/:id/cancel
       Body: { reason }
       → Annule commande

POST   /api/business/orders/:id/rate
       Body: { rating, review }
       → Note conducteur
```

### Business Addresses (Carnet)

```typescript
GET    /api/business/addresses
       → Liste toutes adresses

POST   /api/business/addresses
       Body: { label, recipient, address, coordinates }
       → Crée adresse

PUT    /api/business/addresses/:id
       → Met à jour

DELETE /api/business/addresses/:id
       → Supprime (soft delete: isActive = false)

GET    /api/business/addresses/recent
       → 5 dernières utilisées

GET    /api/business/addresses/frequent
       → Top 10 plus utilisées
```

### Business Drivers (Favoris)

```typescript
GET    /api/business/drivers/favorites
       → Liste favoris

POST   /api/business/drivers/:driverId/favorite
       → Ajoute favori

DELETE /api/business/drivers/:driverId/favorite
       → Retire favori

GET    /api/business/drivers/history
       → Liste conducteurs ayant livré (avec stats)
```

### Internal Matching (appelé par système)

```typescript
POST   /api/internal/business/matching/start
       Body: { orderId }
       → Lance matching, retourne { matchingId, status }

GET    /api/internal/business/matching/:orderId
       → Statut matching en cours

POST   /api/internal/business/matching/:orderId/offer
       Body: { driverId, offerDetails }
       → Envoie offre à un conducteur

POST   /api/internal/business/matching/:orderId/accept
       Body: { driverId }
       → Conducteur accepte
```

---

## 🎨 Frontend Pages - Phase 1 (MVP)

### Structure

```
apps/web/app/business/
├── register/
│   └── page.tsx                 # Inscription 3 étapes
├── dashboard/
│   └── page.tsx                 # Dashboard principal
├── orders/
│   ├── page.tsx                 # Liste commandes
│   ├── new/
│   │   └── page.tsx             # Nouvelle commande
│   └── [id]/
│       └── page.tsx             # Détail + tracking
├── addresses/
│   └── page.tsx                 # Carnet d'adresses
├── drivers/
│   └── page.tsx                 # Mes conducteurs
└── settings/
    └── page.tsx                 # Paramètres
```

### Composants Clés

```typescript
// Onboarding
<BusinessTypeSelector />         // Sélection type commerce
<PhoneVerification />           // OTP

// Dashboard
<TrustLevelBadge level={level} />
<TrustLevelProgress />          // Vers niveau suivant
<LimitsWidget limits={limits} />
<UpgradePrompt />               // CTA upgrade

// Commandes
<OrderForm />                   // Formulaire nouvelle commande
<AddressBookSelector />         // Sélecteur adresse (+ autocomplete)
<RecipientForm />               // Infos destinataire
<CargoTypeSelector />           // Type de colis
<VehicleSelector />             // Type véhicule
<CODToggle />                   // Activer/désactiver COD

// Tracking
<MatchingProgress />            // Recherche en cours (rounds, timer)
<DriverMatchCard />             // Carte conducteur trouvé
<OrderTimeline />               # Timeline statuts
<OrderTrackingMap />            // Carte GPS temps réel

// Carnet
<AddressCard />                 // Carte adresse
<AddressForm />                 // Formulaire ajout/édition

// Conducteurs
<FavoriteDriverCard />          // Carte favori
<DriverHistoryCard />           // Historique
```

---

## 🧮 Algorithme de Matching

### Service: `matchingEngine.ts`

```typescript
// Configuration
const MATCHING_CONFIG = {
  maxDistanceKm: 15,
  round1TimeoutMs: 60000,    // 1 min pour réguliers
  round2TimeoutMs: 90000,    // 1.5 min pour autres
  maxDriversPerRound: 3,

  weights: {
    proximity: 0.20,         // Distance
    reliability: 0.25,       // Rating + completion rate
    relationship: 0.35,      // ← BOOST si régulier
    vehicleFit: 0.10,        // Adéquation véhicule
    reactivity: 0.10,        // Temps de réponse
  }
};

// Workflow
async function matchOrder(order: BusinessOrder) {
  // 1. Filtrer conducteurs éligibles
  const candidates = await filterEligibleDrivers({
    pickupLocation: order.pickupCoordinates,
    maxDistance: 15,
    minB2BLevel: order.business.limits.requiredDriverLevel,
    vehicleType: order.requiredVehicle,
    acceptsCOD: order.hasCOD,
    isAvailable: true,
  });

  if (candidates.length === 0) {
    return { status: 'NO_DRIVERS' };
  }

  // 2. Récupérer relations
  const relations = await getDriverBusinessRelations(
    candidates.map(d => d.id),
    order.businessId
  );

  // 3. Scorer chaque conducteur
  const scored = candidates.map(driver => ({
    driver,
    score: calculateScore(driver, order, relations[driver.id]),
    isRegular: isRegularDriver(driver.id, order.businessId, relations),
  }));

  // 4. Séparer réguliers vs autres
  const regulars = scored.filter(s => s.isRegular).sort(byScore);
  const others = scored.filter(s => !s.isRegular).sort(byScore);

  // 5. ROUND 1: Réguliers (favoris ou 2+ livraisons)
  if (regulars.length > 0) {
    const topRegulars = regulars.slice(0, 3);
    await sendOffersToDrivers(topRegulars, order, 1);

    const accepted = await waitForAcceptance(order.id, 60000);
    if (accepted) {
      return { status: 'MATCHED', driver: accepted, round: 1 };
    }
  }

  // 6. ROUND 2: Autres
  if (others.length > 0) {
    const topOthers = others.slice(0, 3);
    await sendOffersToDrivers(topOthers, order, 2);

    const accepted = await waitForAcceptance(order.id, 90000);
    if (accepted) {
      return { status: 'MATCHED', driver: accepted, round: 2 };
    }
  }

  return { status: 'NO_ACCEPTANCE' };
}

// Scoring
function calculateScore(driver, order, relation) {
  const w = MATCHING_CONFIG.weights;

  // Proximité (0-1)
  const distance = getDistanceKm(driver.currentLocation, order.pickup);
  const proximityScore = Math.max(0, 1 - distance / 15);

  // Fiabilité (0-1)
  const reliabilityScore = (
    (driver.rating / 5) * 0.5 +
    driver.completionRate * 0.3 +
    (1 - driver.cancellationRate) * 0.2
  );

  // Relation (0-1) ← LE BOOST
  let relationshipScore = 0;
  if (isFavorite(driver.id, order.businessId)) {
    relationshipScore = 1.0;  // Favori = max
  } else if (relation && relation.totalDeliveries >= 10) {
    relationshipScore = 0.9;
  } else if (relation && relation.totalDeliveries >= 5) {
    relationshipScore = 0.7;
  } else if (relation && relation.totalDeliveries >= 2) {
    relationshipScore = 0.5;
  }

  // Véhicule (0-1)
  const vehicleScore = calculateVehicleFit(driver.vehicleType, order.cargo);

  // Réactivité (0-1)
  const reactivityScore = Math.max(0, 1 - driver.avgResponseTimeSec / 180);

  return (
    w.proximity * proximityScore +
    w.reliability * reliabilityScore +
    w.relationship * relationshipScore +
    w.vehicleFit * vehicleScore +
    w.reactivity * reactivityScore
  );
}

function isRegularDriver(driverId, businessId, relations) {
  // Favori OU 2+ livraisons
  return (
    isFavorite(driverId, businessId) ||
    (relations[driverId] && relations[driverId].totalDeliveries >= 2)
  );
}
```

---

## 📱 Notifications B2B

### Templates (FR + Derja)

```typescript
const BUSINESS_NOTIFICATIONS = {
  // Onboarding
  'business.welcome': {
    fr: "Bienvenue sur Truck4u ! Commandez votre première livraison.",
    ar: "مرحبا بيك في Truck4u! ابدأ أول توصيل."
  },

  // Matching
  'business.order.searching': {
    fr: "Recherche d'un conducteur en cours...",
    ar: "نبحثو على سواق..."
  },
  'business.order.driver_found': {
    fr: "Conducteur trouvé ! {driverName} arrive dans ~{eta} min.",
    ar: "{driverName} جاي! يوصل في ~{eta} دقيقة."
  },
  'business.order.no_driver': {
    fr: "Aucun conducteur disponible. Réessayez plus tard.",
    ar: "ما فماش سواق متوفر. عاود حاول بعد شوية."
  },

  // Progression
  'business.order.driver_arrived': {
    fr: "{driverName} est arrivé pour récupérer le colis.",
    ar: "{driverName} وصل باش ياخذ الكولي."
  },
  'business.order.picked_up': {
    fr: "Colis récupéré, en route vers {recipientName}.",
    ar: "الكولي تجمع، في الطريق لـ {recipientName}."
  },
  'business.order.delivered': {
    fr: "Livré ✓ {codAmount ? 'COD collecté: ' + codAmount + ' DT' : ''}",
    ar: "توصّل ✓ {codAmount ? 'COD: ' + codAmount + ' دينار' : ''}"
  },

  // Limites
  'business.limit.approaching': {
    fr: "Attention: vous approchez de votre limite COD journalière.",
    ar: "انتبه: قربت للحد اليومي متاع COD."
  },
};
```

---

## ⚙️ Configuration Trust Levels

```typescript
const TRUST_LEVEL_CONFIG = {
  STARTER: {
    name: 'Starter',
    requirements: { phoneVerified: true },
    limits: {
      maxDailyCOD: 300,
      maxSingleOrderCOD: 100,
      maxDailyOrders: 5,
      codPayoutDelay: 72,  // heures
      requiredDriverLevel: 2,
    },
    upgradePrompt: {
      afterOrders: 3,
      message: "Vérifiez votre compte pour augmenter vos limites !"
    }
  },

  VERIFIED: {
    name: 'Vérifié',
    requirements: {
      phoneVerified: true,
      cinVerified: true,
      codPayoutConfigured: true,
    },
    limits: {
      maxDailyCOD: 1000,
      maxSingleOrderCOD: 300,
      maxDailyOrders: 20,
      codPayoutDelay: 48,
      requiredDriverLevel: 2,
    },
    upgradePrompt: {
      afterOrders: 30,
      message: "Passez PRO pour des tarifs préférentiels !"
    }
  },

  // PRO et ENTERPRISE en Phase 2
};
```

---

## 📅 Planning Implémentation

### Phase 1 - MVP (12-16h)

#### Jour 1-2: Database & Backend Core
- ✅ Schéma Prisma (Business, BusinessOrder, etc.)
- ✅ Migration database
- ✅ Routes auth business (register, verify-phone)
- ✅ Routes orders CRUD
- ✅ Service matching engine basique

#### Jour 3-4: Frontend Core
- ✅ Pages registration (3 étapes)
- ✅ Dashboard business
- ✅ Formulaire nouvelle commande
- ✅ Page tracking commande

#### Jour 5: Testing & Polish
- ✅ Test parcours complet
- ✅ Notifications Socket.io
- ✅ Fix bugs
- ✅ Documentation

### Phase 2 - Features (À planifier)
- Vérification progressive (CIN upload)
- Trust Level PRO
- Carnet d'adresses complet
- COD payout management
- Analytics dashboard

### Phase 3 - Advanced (À planifier)
- Import bulk (CSV)
- API/Webhooks
- Trust Level ENTERPRISE
- Mobile app optimizations

---

## 🧪 Tests à Effectuer

### Parcours MVP
1. Inscription business (phone OTP)
2. Création première commande
3. Matching automatique
4. Acceptation conducteur
5. Suivi temps réel
6. Livraison + POD
7. Rating

### Edge Cases
- Aucun conducteur disponible
- Timeout matching (2 rounds)
- Annulation business
- Annulation conducteur
- COD > limite
- Commandes simultanées

---

## 📚 Références

- CLAUDE.md : Documentation permanente projet
- PROGRESS.md : Journal de session
- TODO.md : Backlog et tâches
- apps/api/src/routes/ : Routes API existantes
- apps/web/app/ : Structure frontend

---

**Status:** ✅ Documentation complète - Prêt pour implémentation
**Next:** Créer schéma database et lancer migration
