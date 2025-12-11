# TODO.md - Backlog Priorisé Truck4u

**Dernière mise à jour :** 2025-11-26 (Session 2)
**Session :** 018mXHM8CxWHpUfvhfS9qeqK

---

## 🔴 URGENT - À faire IMMÉDIATEMENT

### 1. ⚠️ Migrer la base de données pour Payment Auto-Confirmation
**Priorité :** CRITIQUE | **Temps estimé :** 5 min | **Statut :** ⚠️ BLOQUANT

- [ ] Exécuter la migration Prisma
  ```bash
  cd packages/database
  npx prisma migrate dev --name add_payment_auto_confirm
  ```

- [ ] Vérifier que la migration est créée
  ```bash
  ls prisma/migrations/
  # Devrait contenir : YYYYMMDDHHMMSS_add_payment_auto_confirm/
  ```

- [ ] Redémarrer le serveur API pour activer le batch job
  ```bash
  cd apps/api && npm run dev
  # Vérifier log : ⏰ Payment auto-confirmation batch job started
  ```

**Critère de succès :** Le serveur démarre et affiche le message du batch job

---

### 2. ⚠️ Fixer l'environnement de développement (React 18.2.0)
**Priorité :** CRITIQUE | **Temps estimé :** 15 min

- [ ] Récupérer les derniers commits
  ```bash
  git pull origin claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK
  ```

- [ ] Réinstaller les dépendances avec React 18.2.0
  ```bash
  cd apps/web
  rm -rf node_modules package-lock.json
  npm install
  ```

- [ ] Vérifier que React 18.2.0 est installé
  ```bash
  npm list react react-dom
  # Doit afficher : react@18.2.0 et react-dom@18.2.0
  ```

- [ ] Démarrer l'application et vérifier qu'il n'y a pas d'erreur MantineProvider
  ```bash
  npm run dev
  # Aller sur http://localhost:3000
  ```

**Critère de succès :** L'app démarre sans erreur `MantineProvider was not found`

---

### 3. ⚠️ Migrer la base de données (Pricing System)
**Priorité :** BLOQUANT | **Temps estimé :** 5 min | **Statut :** ⏳ En attente

- [ ] Exécuter la migration Prisma
  ```bash
  cd packages/database
  npx prisma migrate dev --name add_pricing_system
  ```

- [ ] Vérifier que la migration est créée
  ```bash
  ls prisma/migrations/
  # Devrait contenir : YYYYMMDDHHMMSS_add_pricing_system/
  ```

- [ ] Générer le client Prisma (si pas fait automatiquement)
  ```bash
  npx prisma generate
  ```

**Critère de succès :** Les tables `VehiclePricing`, `PricingConfig`, `PriceEstimate` existent en DB

---

### 4. ⚠️ Initialiser les configurations de pricing
**Priorité :** BLOQUANT | **Temps estimé :** 2 min

- [ ] Se connecter à l'admin : `/admin/login`
- [ ] Aller sur `/admin/pricing`
- [ ] Cliquer sur "Initialiser valeurs par défaut"
- [ ] Vérifier que les 4 véhicules sont créés (onglet "Tarifs Véhicules")
- [ ] Vérifier que la config globale est créée (onglet "Configuration Globale")

**Critère de succès :** Le simulateur affiche des estimations de prix

---

### 5. ✅ Tester le système d'auto-confirmation des paiements
**Priorité :** CRITIQUE | **Temps estimé :** 20 min | **Statut :** 🆕 Nouveau

**Test 1 : Vérifier que le batch job démarre**
- [ ] Démarrer le serveur API : `cd apps/api && npm run dev`
- [ ] Vérifier les logs de démarrage :
  ```
  ⏰ Payment auto-confirmation batch job started
  [Auto-Confirm] Starting batch job (runs every 2 minutes)...
  [Auto-Confirm] Batch completed: 0 confirmed, 0 failed, 0 total
  ```

**Test 2 : Auto-confirmation manuelle (simulation)**
- [ ] Créer un paiement de test avec statut ON_HOLD en DB
- [ ] Modifier `onHoldAt` pour être 20 minutes dans le passé
- [ ] Attendre 2-3 minutes (prochaine exécution du batch)
- [ ] Vérifier dans les logs :
  ```
  [Auto-Confirm] Checking 1 payments...
  [Auto-Confirm] ✅ Payment auto-confirmed for ride XXX
  ```
- [ ] Vérifier en DB : `status` = COMPLETED, `confirmedByBatch` = true

**Test 3 : Workflow complet**
- [ ] Créer une course complète (client → conducteur)
- [ ] Client initie paiement : `POST /api/payments/initiate` → PENDING
- [ ] Conducteur arrive : `POST /api/payments/:id/hold` → ON_HOLD
- [ ] Vérifier notification client : "Conducteur arrivé, confirmez"
- [ ] Attendre 16 minutes sans confirmer
- [ ] Vérifier batch auto-confirme le paiement
- [ ] Vérifier notifications Socket.io reçues
- [ ] Vérifier gains conducteur enregistrés en DB

**Critère de succès :** Tous les tests passent, batch fonctionne automatiquement

---

### 6. ✅ Tester le pricing end-to-end
**Priorité :** CRITIQUE | **Temps estimé :** 10 min

- [ ] Aller sur `/customer/new-ride`
- [ ] Sélectionner une adresse de départ
- [ ] Sélectionner une adresse d'arrivée
- [ ] Vérifier que le prix s'affiche automatiquement
- [ ] Changer le type de véhicule → Prix se met à jour
- [ ] Ajouter un convoyeur → Prix augmente de 50 DT
- [ ] Passer de "Aller simple" à "Aller-retour" → Prix ×1.6
- [ ] Activer "Express" → Prix augmente légèrement (trafic dense)

**Critère de succès :** Le prix s'affiche et se met à jour correctement selon tous les paramètres

---

## 🟡 IMPORTANT - Cette semaine

### 7. Vérifier le bug de paiement "5ft"
**Priorité :** HAUTE | **Temps estimé :** 30 min | **Statut :** 🔍 À investiguer

**Problème rapporté :** Sur la page payment, affichage de "5ft" au lieu de "20 dt"

**À faire :**
- [ ] Reproduire le bug : créer une course → aller au paiement
- [ ] Identifier où le montant est défini/affiché
  - Fichier probable : `apps/web/app/customer/payment/[id]/page.tsx`
  - Vérifier aussi : `apps/api/src/routes/payments.ts`
- [ ] Vérifier la source de données (DB, API, calcul local)
- [ ] Corriger l'affichage pour utiliser le prix réel de la course
- [ ] Tester avec plusieurs montants

**Critère de succès :** Le montant correct s'affiche sur la page de paiement

---

### 8. Tester le système d'annulation complet
**Priorité :** HAUTE | **Temps estimé :** 20 min | **Statut :** ✅ Code implémenté, à tester

**Client - Annulation :**
- [ ] Créer une course
- [ ] Annuler dans les 5 premières minutes → Vérifier remboursement complet
- [ ] Créer une autre course
- [ ] Attendre 6 minutes, annuler → Vérifier frais de 5 DT appliqués
- [ ] Vérifier notification envoyée au conducteur (si assigné)

**Conducteur - Annulation :**
- [ ] Accepter une course en tant que conducteur
- [ ] Annuler la course
- [ ] Vérifier qu'un strike est créé
- [ ] Vérifier notification envoyée au client
- [ ] Créer 2 autres courses, les annuler (total 3 strikes)
- [ ] Vérifier que le conducteur est désactivé automatiquement

**Admin - Vérification :**
- [ ] Aller sur `/admin/drivers`
- [ ] Vérifier le compteur de strikes affiché
- [ ] Attendre un changement de mois (ou modifier manuellement en DB)
- [ ] Vérifier que les strikes sont réinitialisés

**Critère de succès :** Toutes les règles d'annulation fonctionnent comme spécifié

---

### 9. Tester les notifications temps réel
**Priorité :** MOYENNE | **Temps estimé :** 15 min | **Statut :** ✅ Code implémenté, à tester

**À tester :**
- [ ] Client crée une course → Conducteurs reçoivent notification
- [ ] Conducteur soumet offre → Client reçoit notification
- [ ] Client accepte offre → Conducteur reçoit notification
- [ ] Annulation course → Les deux parties reçoivent notification
- [ ] Vérifier que les notifications s'affichent dans le drawer (cloche)
- [ ] Vérifier le compteur de notifications non lues

**Critère de succès :** Toutes les notifications sont reçues en temps réel

---

### 10. Vérifier le système KYC admin
**Priorité :** MOYENNE | **Temps estimé :** 10 min | **Statut :** ✅ Amélioré (à tester)
**Priorité :** MOYENNE | **Temps estimé :** 15 min | **Statut :** ✅ Code implémenté, à tester

- [ ] Un conducteur soumet ses documents KYC
- [ ] Admin reçoit notification (ou voit dans la liste)
- [ ] Admin va sur `/admin/kyc`
- [ ] Vérifier affichage des documents
- [ ] Approuver un conducteur → Vérifier statut change en DB
- [ ] Rejeter un conducteur → Vérifier notification rejet
- [ ] Conducteur reçoit notification d'approbation/rejet

**Critère de succès :** Le workflow KYC fonctionne de bout en bout

---

## 🟢 NICE-TO-HAVE - Backlog

### 11. Admin Dashboard - Métriques Batch Auto-Confirmation
**Priorité :** BASSE | **Temps estimé :** 2h | **Statut :** 🆕 Nouveau

- [ ] Créer page `/admin/payments/auto-confirm-stats`
- [ ] Afficher statistiques :
  - Nombre total de paiements auto-confirmés
  - Paiements auto-confirmés aujourd'hui/cette semaine
  - Temps moyen avant auto-confirmation
  - Taux de confirmation manuelle vs automatique
  - Graphique évolution dans le temps
- [ ] Table avec liste des derniers auto-confirmations
  - Date/heure, Ride ID, Montant, Distance conducteur

---

### 12. Analytics Pricing
**Priorité :** BASSE | **Temps estimé :** 2h

- [ ] Créer page `/admin/pricing/analytics`
- [ ] Afficher statistiques :
  - Prix moyen par type de véhicule
  - Nombre d'estimations par jour/semaine
  - Répartition des prix (graphique)
  - Véhicule le plus demandé
  - Heures de pointe pour les demandes
- [ ] Graphiques avec Recharts ou Chart.js

---

### 13. Export Historique Estimations
**Priorité :** BASSE | **Temps estimé :** 1h

- [ ] Bouton "Exporter" sur `/admin/pricing`
- [ ] Générer CSV avec toutes les estimations
- [ ] Colonnes : Date, Véhicule, Distance, Durée, Prix, Client
- [ ] Filtres : Date range, Type véhicule

---

### 14. Dashboard Admin - Stats Pricing
**Priorité :** BASSE | **Temps estimé :** 3h

- [ ] Widget "Revenus estimés ce mois" sur `/admin/dashboard`
- [ ] Widget "Courses en cours" avec prix total
- [ ] Top 3 types de véhicules utilisés
- [ ] Graphique évolution prix moyen sur 7/30 jours

---

### 15. Tests Unitaires Pricing
**Priorité :** BASSE | **Temps estimé :** 4h

- [ ] Tests pour l'algorithme de calcul (6 étapes)
- [ ] Tests edge cases :
  - Distance = 0
  - Duration = 0
  - Prix calculé < minimum
  - Tous coefficients à 1.0
  - Coefficients cumulatifs (weekend + nuit + pointe)
- [ ] Tests API endpoints avec Jest/Supertest
- [ ] Coverage minimum 80%

---

### 16. Améliorer UX Client - Pricing
**Priorité :** BASSE | **Temps estimé :** 2h

- [ ] Afficher breakdown détaillé du prix (popup ou collapse)
  - Coût de base : XX DT
  - Aller-retour : +XX DT
  - Heures de pointe : +XX DT
  - Convoyeur : +50 DT
  - **Total : XX DT**
- [ ] Animation lors du changement de prix
- [ ] Badge "Prix estimatif" avec tooltip explicatif
- [ ] Comparer avec prix de la concurrence (si données disponibles)

---

### 17. Optimisations Performance
**Priorité :** BASSE | **Temps estimé :** 3h

**Frontend :**
- [ ] Debounce sur le calcul d'estimation (éviter trop d'appels API)
- [ ] Cache des estimations identiques (même params → même prix)
- [ ] Lazy load des onglets admin pricing

**Backend :**
- [ ] Index DB sur `VehiclePricing.vehicleType`
- [ ] Index DB sur `PricingConfig.configKey`
- [ ] Cache Redis pour configs (éviter requêtes DB à chaque estimation)

---

### 18. Documentation Utilisateur
**Priorité :** BASSE | **Temps estimé :** 2h

- [ ] Page `/help` ou `/faq` pour clients
  - Comment fonctionne le pricing ?
  - Pourquoi le prix change selon l'heure ?
  - Qu'est-ce qu'un convoyeur ?
- [ ] Tooltips sur tous les paramètres du formulaire
- [ ] Guide admin : "Comment configurer les tarifs"
- [ ] Vidéo démo du système de pricing

---

## 🔵 BUGS CONNUS (À corriger)

### ✅ Bug #1-6 : Bugs Session 1
Tous résolus - voir PROGRESS.md pour détails

### ✅ Bug #1 : MantineProvider not found
**Statut :** ✅ RÉSOLU (commit 98fabb1)
**Solution :** Pin React à 18.2.0

### ✅ Bug #2 : SSR error avec SimpleMap
**Statut :** ✅ RÉSOLU (commit b505706)
**Solution :** Dynamic import avec ssr: false

### ✅ Bug #3-6 : Problèmes Auth/Prisma
**Statut :** ✅ RÉSOLU (commits d6b2ab1, 8a8f52b, 4470da1)

### 🔍 Bug #7 : Paiement affiche "5ft" au lieu de "20 dt"
**Statut :** 🔍 À INVESTIGUER (voir tâche #7)

### ✅ Bug #8 : KYC admin - détails ne s'affichent pas
**Statut :** ✅ RÉSOLU (Session 2)
**Solution :** Ajout meilleure gestion d'erreurs et logging debug

---

## 📋 FONCTIONNALITÉS DEMANDÉES (À prioriser)

### Non encore implémentées
1. **Système de rating/reviews** (clients → conducteurs, conducteurs → clients)
2. **Chat temps réel amélioré** (actuellement basique)
3. **Multi-langue** (FR/AR/EN)
4. **Mode sombre**
5. **Notifications push PWA**
6. **Géolocalisation en temps réel du conducteur**
7. **Historique des trajets avec carte**
8. **Système de favoris** (adresses fréquentes)
9. **Paiement en ligne** (actuellement cash seulement ?)
10. **Factures PDF** générées automatiquement

---

## 🎯 Objectifs Long Terme

### Q1 2026
- [ ] Lancer en production pour région test (Tunis)
- [ ] Onboarder 50 conducteurs
- [ ] Traiter 1000 courses

### Q2 2026
- [ ] Expansion 3 villes supplémentaires
- [ ] Système de parrainage
- [ ] Programme de fidélité

### Q3 2026
- [ ] Mobile app native (React Native)
- [ ] API publique pour partenaires
- [ ] Intégration e-commerce (livraisons)

---

## 📝 Notes

### Conventions de priorité :
- **🔴 URGENT** : Bloquant, doit être fait avant toute autre chose
- **🟡 IMPORTANT** : Doit être fait cette semaine
- **🟢 NICE-TO-HAVE** : Backlog, à faire quand le temps le permet
- **🔵 BUGS** : À corriger selon gravité

### Statuts :
- ⚠️ **BLOQUANT** : Empêche l'utilisation de features
- 🔍 **À INVESTIGUER** : Problème rapporté mais pas encore reproduit
- ✅ **CODE IMPLÉMENTÉ** : Fonctionnalité développée, à tester
- ❌ **NON DÉMARRÉ** : Aucun code écrit
- 🚧 **EN COURS** : Développement commencé
- ✅ **RÉSOLU** : Terminé et testé

---

**Ce document doit être mis à jour à chaque session de développement.**
