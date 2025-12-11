# Guide du Workflow Complet Truck4U

Ce document explique le nouveau workflow complet de réservation, incluant l'acceptation/rejet des offres, le paiement en attente, la confirmation de livraison par les deux parties, et le système de notation.

## 🔄 Workflow Complet

### 1. **Création de Course et Réception d'Offres**
- Le client crée une course → Statut: `PENDING_BIDS`
- Les conducteurs à proximité reçoivent une notification
- Les conducteurs soumettent des offres (bids)
- Le client reçoit des notifications temps réel pour chaque nouvelle offre

### 2. **Acceptation ou Rejet d'Offre**
- Le client peut **Accepter** ou **Refuser** chaque offre
- En cas d'**acceptation** :
  - La course passe en statut `BID_ACCEPTED`
  - Le conducteur est marqué comme **occupé** (`isAvailable = false`)
  - Le conducteur est retiré de la map des conducteurs disponibles
  - Un paiement en attente (`PENDING`) est créé
  - Le client voit les détails du conducteur
  - Le client est invité à effectuer le paiement
- En cas de **refus** :
  - L'offre est marquée comme `REJECTED`
  - Le conducteur est notifié
  - L'offre est retirée de la liste

### 3. **Paiement Sécurisé**
- Le montant est **retenu** (pas encore transféré)
- Options de paiement :
  - 💳 **Carte bancaire** (via Paymee)
  - 📱 **Flouci**
  - 💵 **Espèces** (confirmé par le conducteur à la fin)
- Le paiement reste en statut `PENDING` jusqu'à la fin de la course

### 4. **Déroulement de la Course**
Le conducteur met à jour le statut au fur et à mesure :
- `DRIVER_ARRIVING` - En route vers le point de départ
- `PICKUP_ARRIVED` - Arrivé au point de départ
- `LOADING` - Chargement en cours
- `IN_TRANSIT` - Transport en cours
- `DROPOFF_ARRIVED` - Arrivé à destination

### 5. **Confirmation de Livraison (Double Validation)**

#### 5.1 Le conducteur confirme en premier
- Le conducteur clique sur **"Confirmer la livraison"**
- Le système enregistre `driverConfirmedCompletion = true`
- Le client reçoit une notification

#### 5.2 Le client confirme ensuite
- Le client voit que le conducteur a confirmé
- Le client clique sur **"Confirmer la livraison"**
- **À ce moment précis** :
  - ✅ La course passe en statut `COMPLETED`
  - 💰 Le **paiement est prélevé** et marqué `COMPLETED`
  - 📊 Les gains sont enregistrés pour le conducteur
  - 🚗 Le conducteur redevient **disponible** (`isAvailable = true`)
  - 🗺️ Le conducteur réapparaît sur la map pour de nouvelles courses

### 6. **Notation**
- Une fois la course terminée, le client peut noter le conducteur
- Note de 1 à 5 étoiles + commentaire optionnel
- La moyenne du conducteur est mise à jour automatiquement

## 💡 Jeu de Données de Test

Pour tester le workflow complet, exécutez :

```bash
cd packages/database
npx ts-node prisma/seed-workflow.ts
```

### Comptes de Test Créés

**Client :**
- Téléphone : `+21650000001`
- Nom : Ahmed Test Client

**Conducteurs :**
1. Téléphone : `+21650000010` - Mohamed Transporteur
2. Téléphone : `+21650000011` - Karim Express

### Courses de Test Créées

1. **Course 1** - `PENDING_BIDS` avec 2 offres
   - Permet de tester : Acceptation/Rejet d'offres

2. **Course 2** - `BID_ACCEPTED`
   - Permet de tester : Paiement après acceptation

3. **Course 3** - `IN_TRANSIT`
   - Permet de tester : Suivi en temps réel

4. **Course 4** - `DROPOFF_ARRIVED` (conducteur a confirmé)
   - Permet de tester : Confirmation de livraison par le client

5. **Course 5** - `COMPLETED` et notée
   - Exemple de course terminée avec succès

## 🧪 Scénarios de Test

### Scénario 1 : Cycle Complet d'une Course

1. **Se connecter comme client** (+21650000001)
2. **Voir la Course 1** avec 2 offres
3. **Refuser** une offre → Vérifier qu'elle disparaît
4. **Accepter** l'autre offre
5. **Effectuer le paiement** (choisir CASH ou CARD)
6. **Attendre** que le conducteur mette à jour les statuts
7. **Confirmer la livraison** quand le conducteur l'a confirmée
8. **Noter le conducteur**

### Scénario 2 : Test du Paiement

1. **Se connecter comme client**
2. **Voir la Course 2** (BID_ACCEPTED)
3. **Cliquer sur "Effectuer le paiement"**
4. **Tester les 3 méthodes** :
   - Espèces → Confirmation immédiate
   - Carte → Redirection vers Paymee (en dev)
   - Flouci → Redirection vers Flouci (en dev)

### Scénario 3 : Test de la Confirmation Finale

1. **Se connecter comme client**
2. **Voir la Course 4** (DROPOFF_ARRIVED)
3. **Observer** le message "Le conducteur a confirmé la livraison"
4. **Cliquer sur "Confirmer la livraison"**
5. **Vérifier** :
   - Course passe à COMPLETED
   - Notification de succès
   - Modal de notation apparaît
   - Le montant a été prélevé

## 📱 Fonctionnalités Implémentées

### Côté Client

- ✅ Réception de notifications temps réel pour nouvelles offres
- ✅ Acceptation d'offres avec modal de paiement
- ✅ Rejet d'offres avec notification
- ✅ Vue détails du conducteur après acceptation
- ✅ Paiement sécurisé en 3 méthodes
- ✅ Suivi de course en temps réel sur map
- ✅ Confirmation de livraison avec double validation
- ✅ Système de notation après livraison

### Côté Conducteur (API)

- ✅ Statut automatique : occupé → disponible
- ✅ Retrait/ajout automatique sur la map Redis
- ✅ Confirmation de livraison par le conducteur
- ✅ Mise à jour des gains automatique
- ✅ Mise à jour de la note moyenne

### Backend

- ✅ Endpoint `/api/rides/:id/accept-bid` - Accepter une offre
- ✅ Endpoint `/api/rides/:id/reject-bid` - Refuser une offre
- ✅ Endpoint `/api/payments/initiate` - Paiement avant course
- ✅ Endpoint `/api/rides/:id/confirm-completion-driver` - Conducteur confirme
- ✅ Endpoint `/api/rides/:id/confirm-completion-customer` - Client confirme
- ✅ Gestion automatique du statut `isAvailable` du conducteur
- ✅ Gestion Redis pour visibilité sur map

## 🔐 Sécurité du Paiement

Le système utilise un modèle de **paiement en attente** :

1. **Paiement initié** → Montant autorisé mais pas transféré
2. **Course en cours** → Montant retenu
3. **Conducteur confirme** → Attente validation client
4. **Client confirme** → **Transfert effectif du montant**

Cela protège :
- Le **client** : Ne paie que si livraison confirmée
- Le **conducteur** : Garantie de paiement après confirmation
- La **plateforme** : Arbitrage possible en cas de litige

## 📊 Statistiques et Gains

Après confirmation de livraison :
- Enregistrement dans `DriverEarnings`
- Mise à jour de `Driver.totalEarnings`
- Mise à jour de `Driver.totalRides`
- Calcul automatique des frais de plateforme (15% ou 8% B2B)

## 🎯 Prochaines Étapes

Pour une mise en production :

1. **Paiement** : Configurer les vraies clés API Paymee/Flouci
2. **SMS** : Ajouter notifications SMS via Twilio
3. **Photos** : Implémenter upload de photos de preuve
4. **Support** : Système de tickets en cas de litige
5. **Analytics** : Dashboard pour suivre les métriques

---

**Créé le** : 2025-11-16
**Version** : 1.0
**Auteur** : Claude Code
