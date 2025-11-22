# Plan d'Implémentation - Features Avancées Truck4u

## ✅ Fonctionnalités Déjà Implémentées

1. **Photos du véhicule au profil** ✓
   - Affichage des photos depuis les documents KYC
   - Grid 3 colonnes avec aperçu
   - Clic pour agrandir

## 📋 Fonctionnalités à Implémenter

### 1. Mode "Retour à Vide" 🚛

**Objectif**: Permettre aux conducteurs d'indiquer leurs trajets de retour à vide et recevoir des suggestions de courses correspondantes.

**Architecture Technique**:

#### Base de données
```prisma
model ReturnTrip {
  id                String    @id @default(uuid())
  driverId          String
  fromCity          String
  toCity            String
  departureDate     DateTime
  departureTime     String    // "08:00", "14:00", etc.
  flexibility       Int       @default(2) // Heures de flexibilité
  maxDetour         Int       @default(20) // km de détour max
  vehicleType       VehicleType
  status            ReturnTripStatus @default(ACTIVE)
  createdAt         DateTime  @default(now())

  driver            Driver    @relation(fields: [driverId], references: [id])
  matchedRides      Ride[]    @relation("ReturnTripMatches")

  @@index([fromCity, toCity, departureDate])
  @@index([driverId, status])
}

enum ReturnTripStatus {
  ACTIVE
  MATCHED
  EXPIRED
  CANCELLED
}
```

#### Backend (apps/api/src/routes/return-trips.ts)
- `POST /api/return-trips` - Créer un trajet retour
- `GET /api/return-trips/suggestions` - Obtenir suggestions de courses
- `GET /api/return-trips/active` - Voir ses trajets actifs
- `DELETE /api/return-trips/:id` - Annuler un trajet

#### Algorithme de matching
```typescript
function findMatchingRides(returnTrip: ReturnTrip): Ride[] {
  // 1. Filtrer par date (± flexibility hours)
  // 2. Filtrer par type de véhicule
  // 3. Calculer si le trajet ride.pickup → ride.dropoff
  //    est sur la route returnTrip.from → returnTrip.to
  // 4. Calculer le détour nécessaire
  // 5. Filtrer par maxDetour
  // 6. Scorer par: distance détour, prix proposé, urgence
  // 7. Retourner top 10 suggestions
}
```

#### Frontend (apps/web/app/driver/return-trip)
- Page formulaire pour créer un trajet retour
- Carte interactive pour visualiser suggestions
- Liste des courses correspondantes
- Notification push quand nouvelle course disponible

---

### 2. Planning Intelligent 📅

**Objectif**: Vue calendrier des courses + suggestions d'enchaînement pour minimiser km à vide.

#### Base de données
Utilise les modèles existants (Ride, Bid) avec calculs côté serveur.

#### Backend (apps/api/src/routes/planning.ts)
- `GET /api/planning/calendar?month=2025-01` - Courses du mois
- `GET /api/planning/suggestions` - Suggestions d'enchaînement
- `POST /api/planning/optimize` - Optimiser planning du jour

#### Algorithme d'optimisation
```typescript
function optimizeDailyRoutes(driverId: string, date: Date): Suggestion[] {
  // 1. Récupérer toutes les courses disponibles pour ce jour
  // 2. Récupérer les courses déjà acceptées/confirmées
  // 3. Pour chaque course disponible, calculer:
  //    - Distance depuis position actuelle ou dernière course
  //    - Gain potentiel (prix - coût carburant)
  //    - Score de rentabilité
  // 4. Utiliser algorithme TSP (Traveling Salesman Problem) simplifié
  // 5. Retourner séquence optimale avec gains estimés
}
```

#### Frontend (apps/web/app/driver/planning)
- Calendrier mensuel (react-big-calendar ou @fullcalendar/react)
- Vue journalière détaillée
- Carte avec trajet optimisé
- Timeline des courses de la journée

---

### 3. Simulation de Gains 💰

**Objectif**: Afficher gains potentiels en temps réel.

#### Backend (apps/api/src/routes/earnings.ts)
- `GET /api/earnings/simulation?rideIds[]=id1&rideIds[]=id2` - Simuler gains
- `GET /api/earnings/daily-goal` - Objectif journalier

#### Calcul
```typescript
interface EarningsSimulation {
  rides: RideSimulation[];
  totalRevenue: number;        // Somme des prix conducteur
  fuelCost: number;             // distance × prix_litre × consommation
  platformFees: number;         // 0 (conducteur reçoit 100%)
  netEarnings: number;          // Revenue - fuelCost
  timeRequired: number;         // Temps total estimé (minutes)
  kmTotal: number;              // Distance totale
  efficiencyScore: number;      // Earnings / (time + fuel)
}
```

#### Frontend
- Widget "Gains Potentiels" sur dashboard
- Mise à jour en temps réel lors sélection courses
- Graphique comparatif (aujourd'hui vs hier vs moyenne)
- Progress bar vers objectif journalier

---

### 4. Badges & Niveaux (Bronze/Silver/Gold) 🏆

**Objectif**: Système de niveaux avec avantages.

#### Base de données
```prisma
model Driver {
  // Ajouter:
  level              DriverLevel @default(BRONZE)
  levelPoints        Int         @default(0)
  levelProgress      Float       @default(0.0) // % vers prochain niveau

  // ...
}

enum DriverLevel {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  DIAMOND
}
```

#### Système de points
```typescript
// Points gagnés:
- Course complétée: +10 points
- Note 5 étoiles: +5 points bonus
- Course dans les temps: +3 points
- Zéro annulation sur 10 courses: +20 points
- Retour à vide utilisé: +15 points

// Seuils de niveau:
BRONZE:   0 - 99 points
SILVER:   100 - 499 points
GOLD:     500 - 1499 points
PLATINUM: 1500 - 4999 points
DIAMOND:  5000+ points
```

#### Avantages par niveau
```typescript
const LEVEL_BENEFITS = {
  BRONZE: {
    priority: 1,
    commissionReduction: 0,
    features: ['Profil basique']
  },
  SILVER: {
    priority: 2,
    commissionReduction: 0, // Future: 2%
    features: ['Badge argenté', 'Planning 7 jours']
  },
  GOLD: {
    priority: 3,
    commissionReduction: 0, // Future: 5%
    features: ['Badge doré', 'Priorité sur nouvelles courses', 'Planning 30 jours']
  },
  PLATINUM: {
    priority: 4,
    commissionReduction: 0, // Future: 8%
    features: ['Badge platine', 'Support prioritaire', 'Analytiques avancées']
  },
  DIAMOND: {
    priority: 5,
    commissionReduction: 0, // Future: 10%
    features: ['Badge diamant', 'Support VIP', 'Accès beta features']
  }
};
```

#### Frontend
- Indicateur de niveau sur profil
- Progress bar vers niveau suivant
- Page dédiée "Mon Niveau" avec:
  - Historique des points
  - Avantages débloqués
  - Défis pour gagner des points

---

### 5. Notation Multi-critères ⭐

**Objectif**: Notes détaillées au lieu d'une seule étoile.

#### Base de données
```prisma
model Ride {
  // Remplacer customerRating par:
  customerRatingPunctuality  Int?
  customerRatingCare         Int?
  customerRatingCommunication Int?
  customerRatingOverall      Int? // Moyenne auto-calculée
  customerReview             String?

  // Pareil pour driver rating:
  driverRatingRespect        Int?
  driverRatingClarity        Int?
  driverRatingPayment        Int?
  driverRatingOverall        Int?
  driverReview               String?
}
```

#### Backend
- Modifier `POST /api/rides/:id/rate` pour accepter notes multiples
- Recalculer moyenne globale du driver

#### Frontend
- Modal de notation avec 3-4 critères
- Sliders ou étoiles pour chaque critère
- Calcul automatique de la moyenne
- Affichage détaillé dans profil (radar chart)

---

### 6. Messagerie In-App 💬

**Objectif**: Chat temps réel entre client et conducteur.

#### Base de données
```prisma
model ChatMessage {
  id              String    @id @default(uuid())
  rideId          String
  senderId        String
  senderType      UserType  // CUSTOMER, DRIVER
  message         String    @db.Text
  isQuickMessage  Boolean   @default(false)
  isRead          Boolean   @default(false)
  createdAt       DateTime  @default(now())

  ride            Ride      @relation(fields: [rideId], references: [id])

  @@index([rideId, createdAt])
}

enum UserType {
  CUSTOMER
  DRIVER
}
```

#### Backend (apps/api/src/routes/chat.ts)
- `GET /api/chat/:rideId/messages` - Historique
- `POST /api/chat/:rideId/message` - Envoyer message
- `PATCH /api/chat/:rideId/read` - Marquer comme lu

#### Socket.io Events
```typescript
// Client → Server
socket.emit('send_message', {
  rideId,
  message,
  senderType
});

// Server → Client
socket.on('new_message', (data) => {
  // Afficher notification + message
});
```

#### Messages Rapides
```typescript
const QUICK_MESSAGES = {
  DRIVER: [
    "Je suis arrivé",
    "Je suis en route",
    "Je suis en retard de 10 min",
    "Veuillez m'appeler",
    "Où êtes-vous?"
  ],
  CUSTOMER: [
    "J'arrive dans 5 minutes",
    "Je suis là",
    "Pouvez-vous attendre 5 min?",
    "Merci!"
  ]
};
```

#### Frontend
- Icône chat sur page de course
- Modal ou page dédiée pour conversation
- Bulles de messages (style WhatsApp)
- Boutons pour messages rapides
- Indicateur "en train d'écrire..."
- Badge nombre de non-lus

---

### 7. Notifications Intelligentes 🔔

**Objectif**: Notifications contextuelles basées sur position GPS et statut.

#### Types de notifications

**Pour le Client**:
1. **Conducteur en route**: "Votre conducteur arrive dans 10 minutes"
   - Trigger: GPS conducteur à < 15 min de pickup
2. **Conducteur arrivé**: "Votre conducteur est arrivé"
   - Trigger: GPS conducteur à < 100m de pickup
3. **Chargement commencé**: "Chargement en cours"
   - Trigger: Statut = LOADING
4. **En transit**: "Votre marchandise est en route"
   - Trigger: Statut = IN_TRANSIT
5. **Arrivée prochaine**: "Livraison dans 10 minutes"
   - Trigger: GPS à < 15 min de dropoff
6. **Livraison effectuée**: "Marchandise livrée"
   - Trigger: Statut = DROPOFF_ARRIVED

**Pour le Conducteur**:
1. **Nouvelle course proche**: "Nouvelle demande à 3 km de vous"
   - Trigger: Nouvelle course dans rayon 10 km
2. **Course bientôt expirée**: "Une course expire dans 5 min"
   - Trigger: Course avec expiresAt proche
3. **Rappel fin de course**: "N'oubliez pas de confirmer la fin de course"
   - Trigger: GPS à destination + pas de confirmation après 10 min
4. **Retour à vide match**: "Nouvelle course sur votre trajet retour!"
   - Trigger: Course matchant un ReturnTrip
5. **Objectif journalier**: "Plus que 2 courses pour atteindre votre objectif!"
   - Trigger: Proche de l'objectif

#### Backend (apps/api/src/services/notifications.ts)
```typescript
class NotificationService {
  async sendLocationBasedNotifications(
    driverId: string,
    location: { lat: number; lng: number }
  ) {
    // 1. Récupérer course active du driver
    // 2. Calculer distance/temps vers pickup/dropoff
    // 3. Vérifier si seuils franchis (10 min, arrivé, etc.)
    // 4. Envoyer notification via Socket.io + Push
  }

  async sendProximityRideAlert(
    driverId: string,
    newRide: Ride
  ) {
    // Notifier si course dans rayon 10km
  }
}
```

#### Intégration GPS
- Mettre à jour position driver toutes les 30 secondes
- Calculer ETA en temps réel
- Déclencher notifications basées sur position

#### Push Notifications
- Utiliser Firebase Cloud Messaging (FCM)
- Stocker device tokens dans DB
- Envoyer push même si app fermée

---

## 🏗️ Ordre d'Implémentation Recommandé

### Phase 1 (Immédiat - 1 semaine)
1. ✅ Photos véhicule (Fait)
2. **Messagerie in-app** (Critique pour communication)
3. **Notifications GPS de base** (Améliore UX)

### Phase 2 (Court terme - 2 semaines)
4. **Notation multi-critères** (Améliore qualité service)
5. **Simulation de gains** (Aide conducteurs)
6. **Badges Bronze/Silver/Gold** (Gamification)

### Phase 3 (Moyen terme - 3 semaines)
7. **Planning intelligent** (Optimisation)
8. **Mode retour à vide** (Feature unique)

---

## 📊 Estimation des Efforts

| Feature | Backend | Frontend | Tests | Total |
|---------|---------|----------|-------|-------|
| Photos véhicule | 2h | 2h | 1h | 5h ✅ |
| Messagerie | 8h | 12h | 4h | 24h |
| Notifications GPS | 12h | 8h | 6h | 26h |
| Notation multi | 4h | 6h | 2h | 12h |
| Simulation gains | 6h | 8h | 3h | 17h |
| Badges niveaux | 10h | 10h | 5h | 25h |
| Planning | 16h | 16h | 8h | 40h |
| Retour à vide | 20h | 12h | 10h | 42h |

**Total estimé**: ~191 heures de développement

---

## 🔧 Stack Technique Nécessaire

### Nouvelles dépendances
```json
{
  "@fullcalendar/react": "^6.1.10",
  "@fullcalendar/daygrid": "^6.1.10",
  "recharts": "^2.10.0",
  "firebase-admin": "^12.0.0",
  "geolib": "^3.3.4",
  "node-cron": "^3.0.3"
}
```

### Services externes
- **Firebase Cloud Messaging**: Push notifications
- **MapBox/OpenStreetMap**: Calculs de routes
- **Redis**: Cache pour matching temps réel

---

## 📝 Notes d'Implémentation

### Priorités Business
1. **Messagerie**: Essentiel pour coordination client-conducteur
2. **Notifications GPS**: Améliore grandement l'expérience
3. **Retour à vide**: Feature différenciante vs concurrents
4. **Planning intelligent**: Augmente revenus conducteurs

### Considérations Techniques
- **Scaling**: Mode retour à vide nécessite indexation géospatiale (PostGIS)
- **Performance**: Algorithmes d'optimisation doivent être async
- **Batterie**: Mise à jour GPS optimisée (30s au lieu de temps réel continu)
- **Offline**: Messagerie doit supporter mode hors-ligne

### Sécurité
- Validation stricte des messages (anti-spam, anti-abuse)
- Rate limiting sur notifications (max 10/min)
- Chiffrement des messages sensibles
- Vérification que seuls client et driver de la course peuvent chatter

---

## 🚀 Quick Wins (Implémentation Rapide)

Si besoin de résultats rapides, commencer par:

1. **Messages rapides** (sans chat complet): 4h
   - Juste des boutons prédéfinis qui envoient SMS/notification

2. **Notifications simples** (sans GPS temps réel): 6h
   - Basées uniquement sur changements de statut

3. **Simulation gains basique**: 4h
   - Simple calcul prix - estimation carburant

**Total Quick Wins**: 14 heures pour 3 features basiques

---

**Date**: $(date +'%Y-%m-%d')
**Version**: 1.0
**Status**: Planning Approuvé
