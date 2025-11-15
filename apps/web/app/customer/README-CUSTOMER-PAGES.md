# 📦 Truck4u - Pages Customer

Ce package contient toutes les pages nécessaires pour l'interface **Client (Customer)** de l'application Truck4u.

## 📋 Fichiers inclus

1. **customer-register-page.tsx** - Page d'inscription
2. **customer-new-ride-page.tsx** - Créer une nouvelle course
3. **customer-rides-page.tsx** - Liste de toutes les courses
4. **customer-ride-details-page.tsx** - Détails d'une course + offres drivers
5. **customer-profile-page.tsx** - Profil utilisateur

## 🎯 Fonctionnalités complètes

### ✅ Page d'inscription (`/customer/register`)
- Choix du type de compte (Particulier / Entreprise)
- Formulaire complet avec validation
- Support pour les comptes entreprise
- Redirection automatique après inscription

### ✅ Nouvelle course (`/customer/new-ride`)
- Sélection des adresses départ/arrivée
- Choix du type de véhicule (5 types disponibles)
- Description de la marchandise
- Options : Course urgente, Aide au chargement
- Estimation de prix en temps réel
- Publication de la course

### ✅ Liste des courses (`/customer/rides`)
- Vue d'ensemble de toutes les courses
- Filtres par statut (En attente, En cours, Terminées, etc.)
- Statut visuel coloré
- Détails rapides : prix, adresses, distance
- Navigation vers les détails

### ✅ Détails d'une course (`/customer/rides/[id]`)
- Informations complètes de la course
- Liste des offres des drivers en temps réel
- Notation des drivers (étoiles, nombre de courses)
- Acceptation d'une offre
- Annulation de course
- Contact driver (appel, message)
- Évaluation après livraison

### ✅ Profil (`/customer/profile`)
- Édition des informations personnelles
- Statistiques : courses totales, terminées, en cours, montant dépensé
- Déconnexion

## 📁 Installation

### 1. Placer les fichiers dans la bonne structure

```bash
cd apps/web/app/customer
```

Créez les dossiers nécessaires et placez les fichiers :

```
apps/web/app/customer/
├── register/
│   └── page.tsx          ← customer-register-page.tsx
├── new-ride/
│   └── page.tsx          ← customer-new-ride-page.tsx
├── rides/
│   ├── page.tsx          ← customer-rides-page.tsx
│   └── [id]/
│       └── page.tsx      ← customer-ride-details-page.tsx
└── profile/
    └── page.tsx          ← customer-profile-page.tsx
```

### 2. Commandes d'installation

```bash
# Depuis le répertoire apps/web/app/customer

# Créer les dossiers
mkdir -p register new-ride rides/[id] profile

# Copier les fichiers
cp /path/to/customer-register-page.tsx register/page.tsx
cp /path/to/customer-new-ride-page.tsx new-ride/page.tsx
cp /path/to/customer-rides-page.tsx rides/page.tsx
cp /path/to/customer-ride-details-page.tsx rides/[id]/page.tsx
cp /path/to/customer-profile-page.tsx profile/page.tsx
```

### 3. Nettoyer le cache Next.js

```bash
cd apps/web
rm -rf .next
cd ../..
npm run dev:web
```

## 🔗 Routes disponibles

Après installation, ces routes seront accessibles :

- `http://localhost:3000/customer/login` - ✅ Connexion (existe déjà)
- `http://localhost:3000/customer/register` - ✅ Inscription (nouveau)
- `http://localhost:3000/customer/dashboard` - ✅ Tableau de bord (existe déjà)
- `http://localhost:3000/customer/new-ride` - ✅ Nouvelle course (nouveau)
- `http://localhost:3000/customer/rides` - ✅ Mes courses (nouveau)
- `http://localhost:3000/customer/rides/[id]` - ✅ Détails course (nouveau)
- `http://localhost:3000/customer/profile` - ✅ Mon profil (nouveau)

## 🎨 Design & UX

Toutes les pages suivent le même design system :
- **Couleur principale** : Bleu (#2563eb)
- **Design responsive** : Mobile, tablette, desktop
- **Icons** : Lucide React
- **Feedback visuel** : Loading states, messages d'erreur
- **Navigation intuitive** : Boutons retour, liens contextuels

## 🔧 Dépendances requises

Ces fichiers utilisent les dépendances déjà installées dans le projet :
- `next` - Framework React
- `react` - Library React
- `lucide-react` - Icons
- `axios` - HTTP client (via `/lib/api`)
- `zustand` - State management (via `/lib/store`)

## ✅ Checklist de vérification

Après installation, vérifiez que :

- [ ] Tous les fichiers sont dans les bons dossiers
- [ ] Le fichier `tsconfig.json` contient `"baseUrl": "."` et `"paths": { "@/*": ["./*"] }`
- [ ] Le fichier `/lib/api.ts` est correct (pas de template literals ``)
- [ ] Le cache `.next` est supprimé
- [ ] Le serveur de développement redémarre sans erreur
- [ ] La navigation fonctionne entre toutes les pages
- [ ] Les appels API vers le backend fonctionnent

## 🐛 Troubleshooting

### Erreur "Module not found: Can't resolve '@/lib/api'"
→ Vérifiez le `tsconfig.json` avec `baseUrl` et `paths`

### Erreur "404" sur les routes
→ Vérifiez la structure des dossiers et les noms des fichiers (`page.tsx`)

### Erreur de compilation TypeScript
→ Vérifiez qu'il n'y a pas de template literals dans `lib/api.ts`

### Les données ne s'affichent pas
→ Vérifiez que le backend API est lancé (`npm run dev:api`)

## 📊 Prochaines étapes

Après avoir installé les pages Customer, vous pouvez :

1. **Tester le flux complet** :
   - Inscription → Connexion → Créer une course → Voir les offres

2. **Installer les pages Driver** :
   - Pages pour les chauffeurs (inscription, courses disponibles, etc.)

3. **Ajouter des fonctionnalités** :
   - Carte interactive avec Google Maps ou Leaflet
   - Chat en temps réel avec Socket.io
   - Notifications push
   - Paiement en ligne (Paymee, Flouci)

## 💡 Notes importantes

- Les pages utilisent le **Web Geolocation API** pour la géolocalisation
- Les coordonnées GPS par défaut sont celles de **Tunis** (36.8065, 10.1815)
- Le système d'enchères permet aux drivers de faire des offres
- Le customer peut accepter l'offre de son choix
- Après acceptation, le contact driver devient disponible

## 🚀 Bon développement !

Si vous avez des questions ou rencontrez des problèmes, n'hésitez pas à demander de l'aide.
