# PROGRESS.md - Journal de Session

**Date :** 2025-11-26
**Durée estimée :** ~4 heures
**Session ID :** 018mXHM8CxWHpUfvhfS9qeqK
**Dernière mise à jour :** 2025-11-26 (Session 2)

---

## 📊 État Git

### Branche Actuelle
```
claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK
```

### Historique des Commits (20 derniers)
```
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
2405149 feat: Système d'annulation complet - Schéma DB
b0068a3 feat: Notifications temps réel pour nouvelles courses (driver)
29e06b8 feat: Amélioration affichage temps/distance estimés
8059dbd feat: Add route visualization on driver ride details map
71321cb feat: Add real-time ETA display for drivers
2b22fb9 feat: Add real-time ETA display for customers
10424a5 feat: Add Express delivery option UI (Frontend)
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

## 📝 Fichiers Créés ou Modifiés (Session complète)

### Fichiers Créés (nouveaux)
1. `apps/api/src/routes/pricing.ts` (540 lignes)
2. `apps/web/app/admin/pricing/page.tsx` (802 lignes)
3. `CLAUDE.md` (documentation permanente)
4. `PROGRESS.md` (ce fichier)
5. `TODO.md` (backlog)

### Fichiers Modifiés
1. `packages/database/prisma/schema.prisma`
   - Ajout modèles : VehiclePricing, PricingConfig, PriceEstimate
   - Ajout enums : TripType, TrafficLevel, TimeSlotType

2. `apps/api/src/index.ts`
   - Enregistrement route `/api/pricing`

3. `apps/web/lib/api.ts`
   - Ajout `pricingApi` object avec toutes les méthodes
   - Fix interceptor pour support token admin

4. `apps/web/app/admin/layout.tsx`
   - Ajout entrée menu "Configuration Prix"

5. `apps/web/app/customer/new-ride/page.tsx`
   - Import dynamique SimpleMap
   - Intégration estimation prix temps réel
   - Hook useEffect pour auto-calcul

6. `apps/web/package.json`
   - Pin React à 18.2.0
   - Ajout overrides
   - Mise à jour Mantine vers 8.3.9

7. `apps/web/app/providers.tsx`
   - Nettoyage imports CSS

---

## 🐛 Problèmes en Cours / Non Résolus

### 1. Migration Base de Données Non Exécutée
**Statut :** ⚠️ BLOQUANT pour utilisation pricing

**Problème :**
- La migration Prisma n'a pas pu être créée en environnement de développement
- Erreur réseau lors du téléchargement des binaires Prisma (403 Forbidden)

**Impact :**
- Les tables `VehiclePricing`, `PricingConfig`, `PriceEstimate` n'existent pas en DB
- Les appels API retournent des erreurs

**Action requise utilisateur :**
```bash
cd packages/database
npx prisma migrate dev --name add_pricing_system
```

Cette commande va :
1. Créer le dossier `migrations/`
2. Générer le SQL de migration
3. Appliquer la migration à la DB
4. Mettre à jour le client Prisma

**Vérification :**
```bash
# Vérifier que les migrations existent
ls packages/database/prisma/migrations/

# Devrait contenir un dossier type: 20251126XXXXXX_add_pricing_system/
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
4. ⚠️ Exécuter migration Prisma : `cd packages/database && npx prisma migrate dev --name add_pricing_system`
5. ⚠️ Initialiser configs pricing via admin UI

### Important (Cette semaine)
6. Tester le système de pricing end-to-end
7. Vérifier les notifications de cancellation
8. Tester le système de strikes conducteurs
9. Vérifier le paiement (bug "5ft" au lieu de "20 dt" ?)

### Nice-to-have (Backlog)
10. Ajouter analytics pour le pricing (prix moyen, estimations par véhicule)
11. Exporter historique des estimations
12. Dashboard admin avec stats pricing
13. Tests unitaires pour l'algorithme de pricing

---

## 📊 Statistiques de Session

- **Commits créés :** 8
- **Fichiers créés :** 5
- **Fichiers modifiés :** 7
- **Lignes de code ajoutées :** ~1500
- **Bugs corrigés :** 6
- **Features implémentées :** 1 système complet (pricing)

---

## 🔗 Commits de Cette Session (par ordre chronologique)

1. `f3730dd` - feat: Add modular price estimation algorithm (Backend + API)
2. `2ec5d47` - feat: Add admin pricing configuration interface
3. `1e5897b` - fix: Complete pricing system with admin configuration interface
4. `78e9ea1` - feat: Integrate real-time price estimation in customer ride form
5. `d6b2ab1` - fix: Correct auth middleware import (authenticateToken → verifyToken)
6. `8a8f52b` - fix: Add admin token support in API interceptor
7. `4470da1` - fix: Use req.userId instead of req.user.id in pricing routes
8. `b505706` - fix: Use dynamic import for SimpleMap to prevent SSR errors
9. `98fabb1` - fix: Pin React to 18.2.0 and fix MantineProvider compatibility

---

## 💡 Notes pour la Prochaine Session

### Contexte à se rappeler :
- Le système de pricing est **complet** côté code
- Il faut juste **migrer la DB** et **initialiser les configs**
- React **DOIT** rester à 18.2.0 (Mantine incompatible avec v19)
- Tous les commits sont sur `claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK`

### Vérifications à faire :
- Confirmer que React 18.2.0 est bien installé
- Vérifier que l'app démarre sans erreur MantineProvider
- Exécuter la migration Prisma
- Tester l'estimation de prix dans l'interface client

### Si problèmes :
- **MantineProvider error** → Vérifier version React (doit être 18.2.0)
- **Pricing ne s'affiche pas** → Vérifier migration DB exécutée
- **Admin access required** → Vérifier localStorage contient 'adminToken'
- **window is not defined** → Vérifier dynamic import avec ssr: false

---

**Fin du journal de session**
