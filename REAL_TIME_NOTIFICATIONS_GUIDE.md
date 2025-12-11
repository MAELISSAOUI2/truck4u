# Guide des Notifications en Temps Réel - Truck4u

## 🎯 Fonctionnalités Implémentées

### ✅ Système de Notifications en Temps Réel

Le système utilise **Socket.io** pour les communications bidirectionnelles en temps réel entre le client et le serveur.

#### Pour le Client (Customer):
1. **Notifications des nouvelles offres**
   - Toast notification quand un driver soumet une offre
   - Badge "NOUVEAU!" sur les offres fraîches
   - Bordure verte sur les nouvelles offres
   - Son de notification (optionnel)

2. **Mises à jour en temps réel**
   - Localisation du driver pendant le trajet
   - Changements de statut de la course
   - Toutes les notifications sans rafraîchir la page

3. **Actions sur les offres**
   - Bouton "Accepter" → Redirige vers le paiement
   - Bouton "Refuser" → Marque l'offre comme refusée

## 🚀 Comment Tester

### Prérequis
```bash
# 1. Démarrer l'API
cd apps/api
npm run dev

# 2. Démarrer le Frontend (dans un autre terminal)
cd apps/web
npm run dev

# 3. Vérifier que Redis tourne (pour Socket.io)
redis-cli ping
# Devrait retourner: PONG
```

### Scénario de Test Complet

#### 1. **Créer un Compte Client**
```
URL: http://localhost:3000/customer/register
- Nom: Test Client
- Téléphone: +216 12 345 678
- Email: client@test.com (optionnel)
```

#### 2. **Créer une Course**
```
URL: http://localhost:3000/customer/new-ride

Étape 1 - Adresses:
- Départ: Tunis Centre
- Arrivée: Aéroport Tunis-Carthage
- Type: Immédiatement

Étape 2 - Véhicule:
- Choisir: Fourgon (ou autre)

Étape 3 - Détails:
- Description: "Cartons de livres"
- Poids: 150 kg
- Aide: 0 personne
- Photos: Optionnel

→ Cliquer "Publier la course"
```

#### 3. **Créer un Compte Driver (dans un autre navigateur/incognito)**
```
URL: http://localhost:3000/driver/login
- Créer un compte driver
- Compléter le profil
```

#### 4. **Soumettre une Offre (en tant que Driver)**
```
URL: http://localhost:3000/driver/dashboard
- Voir la nouvelle course disponible
- Cliquer "Voir les détails"
- Soumettre une offre:
  * Prix: 45 DT
  * ETA: 15 minutes
  * Message: "Je suis proche, j'arrive vite!"
→ Cliquer "Soumettre l'offre"
```

#### 5. **Recevoir la Notification (côté Client)** 🎉
```
✅ Automatiquement:
- Toast notification en haut à droite
  "🎉 Nouvelle offre reçue !"
  "Nom du Driver vous propose 45 DT"

- Sur la page de détails de la course:
  * Badge "NOUVEAU!" apparaît
  * Bordure verte autour de l'offre
  * Son de notification joue

URL: http://localhost:3000/customer/rides/[rideId]
```

#### 6. **Accepter l'Offre**
```
- Cliquer sur "Accepter" sur l'offre
→ Redirection automatique vers:
  http://localhost:3000/customer/payment/[rideId]
```

#### 7. **Effectuer le Paiement**
```
Sur la page de paiement:
- Commission affichée: 4.5 DT (10% de 45 DT)
- Choisir méthode: Paymee ou Flouci
- Cliquer "Procéder au paiement"
→ Argent bloqué en escrow jusqu'à la fin
```

#### 8. **Suivre la Course en Temps Réel**
```
Après paiement:
URL: http://localhost:3000/customer/rides/[rideId]

✅ Mises à jour automatiques:
- Position du driver sur la carte
- Changements de statut:
  * BID_ACCEPTED → Offre acceptée
  * DRIVER_ARRIVING → En route vers vous
  * PICKUP_ARRIVED → Arrivé au point de départ
  * LOADING → Chargement
  * IN_TRANSIT → En route vers destination
  * DROPOFF_ARRIVED → Arrivé à destination
  * COMPLETED → Terminée

- Chaque changement affiche une notification
```

## 🎨 Événements Socket.io

### Côté Client (Customer)

#### Événements Émis:
```javascript
// Connexion au serveur
socket.emit('customer_connect', { customerId: userId });

// Suivre une course
socket.emit('track_ride', { rideId, customerId });

// Arrêter le suivi
socket.emit('stop_tracking', { rideId });
```

#### Événements Reçus:
```javascript
// Nouvelle offre reçue
socket.on('new_bid', (data) => {
  // data = { bidId, rideId, driver, proposedPrice, estimatedArrival, message }
});

// Mise à jour localisation driver
socket.on('driver_location', (data) => {
  // data = { rideId, lat, lng, speed, heading }
});

// Changement de statut
socket.on('ride_status_update', (data) => {
  // data = { rideId, status }
});
```

### Côté Driver

#### Événements Émis:
```javascript
// Driver en ligne
socket.emit('driver_online', {
  driverId,
  location: { lat, lng }
});

// Mise à jour position
socket.emit('driver_location_update', {
  rideId,
  lat,
  lng,
  speed,
  heading,
  timestamp
});

// Soumettre une offre (via API, puis Socket.io notifie le client)
POST /api/rides/:id/bid
```

#### Événements Reçus:
```javascript
// Course acceptée
socket.on('bid_accepted', (data) => {
  // data = { rideId, bidId }
});

// Course refusée
socket.on('bid_rejected', (data) => {
  // data = { rideId, bidId }
});
```

## 🔧 Architecture

```
┌─────────────────┐
│  Customer App   │ ←─┐
│  (React/Next)   │   │
└────────┬────────┘   │
         │            │ Socket.io
         │ HTTP       │ Events
         ↓            │
┌─────────────────┐   │
│   API Server    │   │
│  (Express.js)   │ ──┘
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Database     │
│   (PostgreSQL)  │
└─────────────────┘
```

### Flux de Données:

1. **Client → API:** Requêtes HTTP (REST)
2. **API → Socket.io:** Émission des événements
3. **Socket.io → Client:** Notifications temps réel
4. **Client → UI:** Mise à jour automatique

## 🎯 États de la Course

```
PENDING_BIDS        → En attente d'offres
  ↓
BID_ACCEPTED        → Offre acceptée (paiement requis)
  ↓
DRIVER_ARRIVING     → Transporteur en route
  ↓
PICKUP_ARRIVED      → Arrivé au départ
  ↓
LOADING             → Chargement en cours
  ↓
IN_TRANSIT          → En transit vers destination
  ↓
DROPOFF_ARRIVED     → Arrivé à destination
  ↓
COMPLETED           → Course terminée ✓
```

## 📱 Notifications Toast

### Types de Notifications:

| Événement | Couleur | Icône | Durée |
|-----------|---------|-------|-------|
| Nouvelle offre | Vert | 🔔 | 5s |
| Offre refusée | Rouge | ❌ | 3s |
| Statut changé | Variable | ℹ️ | 4s |

### Personnalisation:
```typescript
notifications.show({
  title: 'Titre',
  message: 'Message détaillé',
  color: 'green',
  icon: <IconBell />,
  autoClose: 5000, // ms
  position: 'top-right'
});
```

## 🐛 Débogage

### Console du Navigateur:
```javascript
// Activer les logs Socket.io
localStorage.debug = 'socket.io-client:socket';

// Logs personnalisés
console.log('🎯 New bid received:', bidData);
console.log('📍 Driver location updated:', locationData);
console.log('📦 Ride status changed:', statusData);
```

### Vérifier la Connexion Socket:
```bash
# Dans la console du navigateur
socket.connected
// true = connecté, false = déconnecté

socket.id
// ID unique de la connexion
```

### Logs API:
```bash
cd apps/api
npm run dev

# Vous verrez:
# ✅ Socket connected: [socket-id]
# 📢 Joined customer room: [customerId]
# 🎯 New bid received: [bidData]
```

## 🎉 Résultat Final

Quand un driver soumet une offre:

```
┌──────────────────────────────────────┐
│  🎉 Nouvelle offre reçue !          │
│  Mohamed Ben Ali vous propose 45 DT │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│ ┃ NOUVEAU!                     ┃   │
│ ┃ Mohamed Ben Ali  ✓ Vérifié  ┃   │
│ ┃ ⭐⭐⭐⭐⭐ (127 courses)      ┃   │
│ ┃ 🕐 ETA: 15 min  🚚 Fourgon  ┃   │
│ ┃ "Je suis proche, j'arrive!" ┃   │
│ ┃                              ┃   │
│ ┃      45 DT                   ┃   │
│ ┃ [Refuser] [Accepter]        ┃   │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
└──────────────────────────────────────┘
```

## 📚 Ressources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Mantine Notifications](https://mantine.dev/others/notifications/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)

---

**Développé avec ❤️ pour Truck4u**
