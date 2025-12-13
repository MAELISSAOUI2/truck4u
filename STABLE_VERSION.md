# 📌 VERSION STABLE DE RÉFÉRENCE

**Date de Référence:** 2025-11-28
**Commit Stable:** `98fabb1` - "fix: Pin React to 18.2.0 and fix MantineProvider compatibility"
**Dernier Commit Testé:** `5bbdf8a` - "fix: Restore all working Mantine UI pages from commit 98fabb1"

---

## ✅ FONCTIONNALITÉS TESTÉES ET VALIDÉES

### Frontend (Web App)

#### Pages Customer:
- ✅ `/customer/login` - Authentification Mantine
- ✅ `/customer/register` - Inscription Mantine avec validation
- ✅ `/customer/dashboard` - Dashboard avec liste des courses
- ✅ `/customer/new-ride` - **Création course COMPLÈTE:**
  - SimpleMap (Leaflet) pour visualisation
  - AddressAutocomplete pour pickup/delivery
  - API pricing estimation réelle
  - Sélection véhicule avec stepper Mantine
  - Upload photos (Dropzone Mantine)
  - DateTimePicker pour courses programmées
  - Choix convoyeur/express
- ✅ `/customer/rides/[id]` - Détails course avec RideTrackingMap
- ✅ `/customer/profile` - Profil utilisateur

#### Pages Admin:
- ✅ `/admin/login` - **Vraie API authentication** (pas mock!)
- ✅ `/admin/dashboard` - Stats et métriques
- ✅ `/admin/kyc` - **Interface KYC complète:**
  - Liste documents en attente
  - Validation/Rejet avec raisons
  - Upload documents
  - Filtres et recherche
- ✅ `/admin/drivers` - Gestion conducteurs avec tableau Mantine
- ✅ `/admin/layout` - Navigation admin

#### Composants Partagés:
- ✅ `components/SimpleMap.tsx` - Leaflet map (dynamic import, no SSR)
- ✅ `components/AddressAutocomplete.tsx` - Géocodage OSRM
- ✅ `components/RideTrackingMap.tsx` - Suivi en temps réel
- ✅ `components/ChatBox.tsx` - Chat conducteur-client
- ✅ `components/NewBidsNotification.tsx` - Notifications offres

---

## 📦 DÉPENDANCES FONCTIONNELLES (Web)

### Production Dependencies:

```json
{
  "@mantine/core": "^8.3.9",
  "@mantine/hooks": "^8.3.9",
  "@mantine/notifications": "^8.3.9",
  "@mantine/dates": "^8.3.9",
  "@mantine/dropzone": "^8.3.9",
  "@tabler/icons-react": "^3.35.0",

  "next": "^14.2.33",
  "react": "18.2.0",      // ⚠️ EXACT VERSION
  "react-dom": "18.2.0",  // ⚠️ EXACT VERSION
  "styled-jsx": "^5.1.1", // Requis par Next.js

  "zustand": "^4.5.0",
  "axios": "^1.6.2",
  "socket.io-client": "^4.7.2",

  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",

  "date-fns": "^3.0.0",
  "dayjs": "^1.11.19",
  "zod": "^3.22.4",
  "clsx": "^2.1.0",

  "next-pwa": "^5.6.0"
}
```

### Dev Dependencies:

```json
{
  "typescript": "^5.3.3",
  "@types/node": "^20.10.0",
  "@types/react": "^18.2.45",
  "@types/react-dom": "^18.2.18",
  "@types/mapbox-gl": "^3.0.0",

  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32",
  "tailwindcss": "^3.4.0",
  "tailwindcss-animate": "^1.0.7",

  "eslint": "^8.56.0",
  "eslint-config-next": "14.2.0"
}
```

### ⚠️ Overrides Requis (Root package.json):

```json
{
  "overrides": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

---

## 🗄️ BACKEND (API)

### Dépendances Critiques:

```json
{
  "@prisma/client": "^5.20.0",
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "ioredis": "^5.3.2",
  "bullmq": "^5.1.0",
  "@socket.io/redis-adapter": "^8.2.1",

  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "multer": "^1.4.5-lts.1",

  "ts-node": "^10.9.2",
  "@cspotcode/source-map-support": "^0.8.1", // ⚠️ Requis pour ts-node
  "nodemon": "^3.0.2"
}
```

---

## 🎨 CONFIGURATION UI

### Layout (apps/web/app/layout.tsx):

```typescript
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from './providers';
import './globals.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Dans <head>:
<ColorSchemeScript defaultColorScheme="light" />
```

### Providers (apps/web/app/providers.tsx):

```typescript
'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'md',
  // ...
});

export function Providers({ children }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" zIndex={1000} />
      {children}
    </MantineProvider>
  );
}
```

### PostCSS (apps/web/postcss.config.js):

```javascript
module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},
  },
};
```

⚠️ **NOTE:** Pas besoin de `postcss-preset-mantine` pour fonctionnement de base.

---

## 🌐 ENVIRONNEMENT

### Variables d'environnement requises:

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx  # Si utilisation Mapbox (optionnel avec Leaflet)
```

**Backend (.env):**
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/truck4u
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379

# Pour uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

---

## 🚀 COMMANDES DE DÉMARRAGE

```bash
# Installation
npm install --legacy-peer-deps

# Database
npm run db:generate
npm run db:migrate

# Développement
npm run dev:api    # Backend sur :5000
npm run dev:web    # Frontend sur :3000
```

---

## ⚠️ ERREURS CONNUES À ÉVITER

### ❌ NE JAMAIS:

1. **Upgrader React à 19.x**
   - Mantine 8.x incompatible avec React 19
   - Toujours vérifier: `npm list react` → doit être 18.2.0

2. **Supprimer ColorSchemeScript**
   - Requis par Mantine pour gestion thème
   - Doit être dans <head> du layout

3. **Oublier dynamic import pour SimpleMap**
   ```typescript
   // ❌ FAUX:
   import SimpleMap from '@/components/SimpleMap';

   // ✅ CORRECT:
   const SimpleMap = dynamic(() => import('@/components/SimpleMap'), {
     ssr: false,
     loading: () => <div>Chargement...</div>
   });
   ```

4. **Utiliser authenticateToken au lieu de verifyToken**
   - Backend: toujours `import { verifyToken } from '../middleware/auth'`
   - User ID: `req.userId` (pas `req.user.id`)

5. **Importer Prisma incorrectement**
   - ✅ `import { prisma } from '@truck4u/database'`
   - ❌ `import prisma from '../lib/prisma'`

---

## 📸 CAPTURES D'ÉCRAN (Interfaces Fonctionnelles)

### customer/new-ride:
- Stepper Mantine avec 3 étapes
- Map Leaflet affichée
- AddressAutocomplete fonctionnel
- Sélection véhicule avec cards Mantine
- Estimation prix en temps réel

### admin/login:
- Form Mantine (Paper, TextInput, PasswordInput)
- Appel API réel à `/api/admin/login`
- Notifications Mantine en cas d'erreur
- Redirection vers `/admin/kyc` après login

### admin/kyc:
- Tableau Mantine avec documents en attente
- Actions: Approuver/Rejeter
- Modal pour raison de rejet
- Mise à jour en temps réel

---

## 🏷️ TAGS GIT RECOMMANDÉS

```bash
# Tag cette version stable
git tag -a v1.0-stable-ui-complete -m "Version stable - Mantine UI complet, maps, admin fonctionnel"

# Après corrections futures
git tag -a v1.1-stable -m "UI restaurée après régressions"
```

---

## 📝 CHANGELOG (Commits Importants)

- `98fabb1` - Pin React 18.2.0, fix MantineProvider
- `b505706` - Dynamic import SimpleMap (fix SSR)
- `78e9ea1` - Integrate real-time price estimation
- `1e5897b` - Complete pricing system with admin config
- `2ec5d47` - Add admin pricing configuration interface
- `a25b388` - Implement comprehensive KYC system with Mantine UI
- `5bbdf8a` - **RESTORE** all working Mantine UI pages

---

## ✅ CHECKLIST VALIDATION VERSION STABLE

Avant de considérer une version comme "stable":

- [ ] `npm run dev:api` démarre sans erreur
- [ ] `npm run dev:web` démarre sans erreur
- [ ] http://localhost:3000/customer/new-ride affiche la map
- [ ] http://localhost:3000/admin/login fait appel API réel
- [ ] Aucune erreur console React
- [ ] `npm list react` → 18.2.0 exact
- [ ] Aucun package "extraneous"
- [ ] Toutes les dépendances dans package.json
- [ ] Documentation à jour (CLAUDE.md, STABLE_VERSION.md)
- [ ] Tag Git créé

---

**Dernière mise à jour:** 2025-12-13
**Maintenu par:** Claude (AI Assistant)
**Contact Projet:** Truck4u Team
