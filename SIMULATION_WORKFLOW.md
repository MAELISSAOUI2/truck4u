# 🧪 SIMULATION DU WORKFLOW COMPLET

Ce document contient toutes les commandes nécessaires pour simuler le workflow complet de A à Z.

## 📋 PRÉREQUIS

1. **API Backend en cours d'exécution** sur `http://localhost:3001`
2. **Frontend en cours d'exécution** sur `http://localhost:3000`
3. **Token d'authentification client** (récupéré après login)

---

## 1️⃣ CRÉER UN COMPTE CLIENT

### Via l'interface web:
1. Allez sur `http://localhost:3000/customer/register`
2. Remplissez le formulaire
3. Connectez-vous sur `http://localhost:3000/customer/login`

### OU via API:

```bash
# Créer un compte client
curl -X POST http://localhost:3001/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21612345678",
    "name": "Client Test",
    "email": "client@test.tn",
    "password": "Test123!",
    "accountType": "INDIVIDUAL"
  }'

# Se connecter
curl -X POST http://localhost:3001/api/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21612345678",
    "password": "Test123!"
  }'
```

**💾 Sauvegarder le token retourné dans une variable:**
```bash
export CLIENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 2️⃣ CRÉER UNE COURSE

### Via l'interface web:
Utilisez `/customer/new-ride` avec le formulaire

### OU via API:

```bash
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{
    "pickup": {
      "lat": 36.8065,
      "lng": 10.1815,
      "address": "Avenue Habib Bourguiba, Tunis"
    },
    "dropoff": {
      "lat": 36.8188,
      "lng": 10.1658,
      "address": "La Marsa, Tunis"
    },
    "vehicleType": "FOURGON",
    "loadAssistance": true,
    "numberOfTrips": 1,
    "itemPhotos": [],
    "description": "Transport de cartons de livres",
    "serviceType": "IMMEDIATE"
  }'
```

**💾 Sauvegarder l'ID de la course retournée:**
```bash
export RIDE_ID="clxxx..."
```

---

## 3️⃣ VÉRIFIER LA COURSE SUR LE DASHBOARD

```bash
# Récupérer l'historique des courses
curl -X GET http://localhost:3001/api/rides/customer/history \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

---

## 4️⃣ CRÉER UN COMPTE DRIVER (pour simuler une offre)

```bash
# Créer un compte driver
curl -X POST http://localhost:3001/api/auth/driver/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21698765432",
    "name": "Driver Test",
    "email": "driver@test.tn",
    "password": "Test123!",
    "vehicleType": "FOURGON",
    "vehicleNumber": "123 TU 456",
    "licenseNumber": "DL123456"
  }'

# Se connecter en tant que driver
curl -X POST http://localhost:3001/api/auth/driver/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21698765432",
    "password": "Test123!"
  }'
```

**💾 Sauvegarder le token driver:**
```bash
export DRIVER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export DRIVER_ID="clxxx..."
```

---

## 5️⃣ CRÉER UNE OFFRE (BID)

```bash
# Driver soumet une offre
curl -X POST http://localhost:3001/api/rides/$RIDE_ID/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "amount": 45,
    "estimatedDuration": 25,
    "message": "Je peux prendre cette course immédiatement"
  }'
```

**💾 Sauvegarder l'ID de l'offre:**
```bash
export BID_ID="clxxx..."
```

---

## 6️⃣ VÉRIFIER LES OFFRES (côté client)

```bash
# Récupérer les offres pour une course
curl -X GET http://localhost:3001/api/rides/$RIDE_ID/bids \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

**🎯 Le dashboard devrait maintenant afficher "1 offre" sur la course !**

---

## 7️⃣ ACCEPTER L'OFFRE (côté client)

### Via l'interface web:
1. Cliquez sur la course sur le dashboard
2. Cliquez sur "Accepter" pour l'offre
3. Vous serez redirigé vers `/customer/payment/$RIDE_ID?bidId=$BID_ID`

### OU via API:

```bash
# Accepter l'offre
curl -X POST http://localhost:3001/api/rides/$RIDE_ID/bids/$BID_ID/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

**📊 Statut de la course → `BID_ACCEPTED`**

---

## 8️⃣ SIMULER LE PAIEMENT

```bash
# Créer un paiement
curl -X POST http://localhost:3001/api/rides/$RIDE_ID/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{
    "bidId": "'$BID_ID'",
    "paymentMethod": "paymee",
    "amount": 4.5
  }'
```

---

## 9️⃣ SIMULER L'AVANCEMENT DE LA COURSE

### Driver arrive au point de départ:
```bash
curl -X PATCH http://localhost:3001/api/rides/$RIDE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "status": "DRIVER_ARRIVING"
  }'
```

**🚚 Le client voit maintenant "En route" sur le dashboard !**

### Driver est arrivé:
```bash
curl -X PATCH http://localhost:3001/api/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"status": "PICKUP_ARRIVED"}'
```

### Chargement en cours:
```bash
curl -X PATCH http://localhost:3001/api/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"status": "LOADING"}'
```

### En transit:
```bash
curl -X PATCH http://localhost:3001/api/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"status": "IN_TRANSIT"}'
```

**🗺️ Le client suit maintenant le driver en temps réel sur la map !**

### Arrivé à destination:
```bash
curl -X PATCH http://localhost:3001/api/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"status": "DROPOFF_ARRIVED"}'
```

### Course terminée:
```bash
curl -X PATCH http://localhost:3001/api/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"status": "COMPLETED"}'
```

**💰 Paiement automatiquement libéré au driver !**

---

## 🔟 ÉVALUER LA COURSE

### Via l'interface web:
1. Modal "Évaluer la course" apparaît
2. Donner une note (1-5 ⭐)
3. Ajouter un commentaire

### OU via API:

```bash
curl -X POST http://localhost:3001/api/rides/$RIDE_ID/rating \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{
    "rating": 5,
    "review": "Excellent service, rapide et professionnel !"
  }'
```

---

## 🎯 SCRIPT AUTOMATIQUE COMPLET

Voici un script bash qui simule tout le workflow:

```bash
#!/bin/bash

# Couleurs pour l'output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api"

echo -e "${BLUE}🚀 SIMULATION WORKFLOW TRUCK4U${NC}\n"

# 1. Créer client
echo -e "${GREEN}1. Création compte client...${NC}"
CLIENT_RESPONSE=$(curl -s -X POST $API_URL/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21612345678",
    "name": "Client Test",
    "email": "client@test.tn",
    "password": "Test123!",
    "accountType": "INDIVIDUAL"
  }')
echo "✓ Client créé"

# 2. Login client
echo -e "${GREEN}2. Connexion client...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21612345678",
    "password": "Test123!"
  }')
CLIENT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✓ Token client: $CLIENT_TOKEN"

# 3. Créer course
echo -e "${GREEN}3. Création de la course...${NC}"
RIDE_RESPONSE=$(curl -s -X POST $API_URL/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{
    "pickup": {
      "lat": 36.8065,
      "lng": 10.1815,
      "address": "Avenue Habib Bourguiba, Tunis"
    },
    "dropoff": {
      "lat": 36.8188,
      "lng": 10.1658,
      "address": "La Marsa, Tunis"
    },
    "vehicleType": "FOURGON",
    "loadAssistance": true,
    "numberOfTrips": 1,
    "description": "Transport de cartons"
  }')
RIDE_ID=$(echo $RIDE_RESPONSE | jq -r '.id')
echo "✓ Course créée: $RIDE_ID"

# 4. Créer driver
echo -e "${GREEN}4. Création compte driver...${NC}"
DRIVER_RESPONSE=$(curl -s -X POST $API_URL/auth/driver/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21698765432",
    "name": "Driver Test",
    "email": "driver@test.tn",
    "password": "Test123!",
    "vehicleType": "FOURGON",
    "vehicleNumber": "123 TU 456"
  }')
echo "✓ Driver créé"

# 5. Login driver
echo -e "${GREEN}5. Connexion driver...${NC}"
DRIVER_LOGIN=$(curl -s -X POST $API_URL/auth/driver/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+21698765432",
    "password": "Test123!"
  }')
DRIVER_TOKEN=$(echo $DRIVER_LOGIN | jq -r '.token')
echo "✓ Token driver: $DRIVER_TOKEN"

# 6. Créer offre
echo -e "${GREEN}6. Création offre driver...${NC}"
BID_RESPONSE=$(curl -s -X POST $API_URL/rides/$RIDE_ID/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "amount": 45,
    "estimatedDuration": 25
  }')
BID_ID=$(echo $BID_RESPONSE | jq -r '.id')
echo "✓ Offre créée: $BID_ID"

echo -e "\n${BLUE}✅ SIMULATION TERMINÉE !${NC}\n"
echo "Informations pour continuer manuellement:"
echo "RIDE_ID=$RIDE_ID"
echo "BID_ID=$BID_ID"
echo "CLIENT_TOKEN=$CLIENT_TOKEN"
echo "DRIVER_TOKEN=$DRIVER_TOKEN"
echo ""
echo "Accédez au dashboard: http://localhost:3000/customer/dashboard"
echo "Vous devriez voir la course avec 1 offre disponible !"
```

---

## 📊 VÉRIFIER LE WORKFLOW

### Dashboard client (`http://localhost:3000/customer/dashboard`):
- ✅ Doit afficher `1` dans "En attente"
- ✅ La course doit avoir un badge "1 offre"

### Page détails (`http://localhost:3000/customer/rides/$RIDE_ID`):
- ✅ Map avec les 2 points (📍 🏁)
- ✅ Liste des offres reçues
- ✅ Bouton "Accepter" pour chaque offre

### Page paiement (`/customer/payment/$RIDE_ID?bidId=$BID_ID`):
- ✅ Résumé de la course
- ✅ Montant commission (10%)
- ✅ Choix méthode paiement

---

## 🆘 DÉPANNAGE

### Le dashboard affiche "0 en attente":
```bash
# Vérifier que la course existe
curl -X GET http://localhost:3001/api/rides/customer/history \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

### La page /customer/rides donne 404:
- ✅ Vérifiez que vous avez pull les derniers commits
- ✅ Redémarrez le serveur frontend

### L'API retourne des erreurs:
```bash
# Vérifier que l'API est bien démarrée
curl http://localhost:3001/health

# Vérifier les logs de l'API
cd apps/api
npm run dev
```

---

Tout est prêt pour tester ! 🎉
