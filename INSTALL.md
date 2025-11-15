# 🚀 Installation Truck4u MVP - Guide Corrigé

## ✅ Prérequis

1. **Node.js 20+** installé ([Télécharger](https://nodejs.org/))
2. **PostgreSQL 15+** installé et lancé
3. **Redis** installé et lancé

Vérifiez vos versions :
```bash
node --version  # doit être >= 20
npm --version   # doit être >= 9
```

## 📦 Installation étape par étape

### Étape 1 : Extraire et naviguer

```bash
# Extraire le ZIP
unzip truck4u-pwa-fixed.zip

# Naviguer dans le dossier
cd truck4u-pwa-fixed
```

### Étape 2 : Installer les dépendances

```bash
# Installer TOUTES les dépendances (root + tous les workspaces)
npm install
```

Cette commande va installer les dépendances pour :
- Le projet racine
- packages/database
- packages/types
- apps/api
- apps/web

### Étape 3 : Configurer la base de données

```bash
# 1. Créer le fichier .env dans packages/database
cd packages/database
cp .env.example .env
```

Éditer `packages/database/.env` :
```env
DATABASE_URL="postgresql://username:password@localhost:5432/truck4u"
```

**Remplacez** :
- `username` : votre nom d'utilisateur PostgreSQL
- `password` : votre mot de passe PostgreSQL
- `truck4u` : nom de la base de données (créez-la si nécessaire)

```bash
# 2. Créer la base de données (si elle n'existe pas)
# Ouvrir psql :
psql -U postgres

# Dans psql :
CREATE DATABASE truck4u;
\q

# 3. Pousser le schéma vers la base de données
cd ../..
npm run db:push
```

### Étape 4 : Configurer le Backend

```bash
# Créer le fichier .env
cd apps/api
cp .env.example .env
```

Éditer `apps/api/.env` avec les valeurs minimales :
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/truck4u"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="votre-secret-key-changez-en-production"

# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:4000"

# Storage (optionnel pour développement)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_ENDPOINT=""
S3_BUCKET="truck4u"
S3_PUBLIC_URL=""

# Payments (optionnel pour développement)
PAYMEE_API_URL="https://api.paymee.tn"
PAYMEE_API_KEY=""
PAYMEE_WEBHOOK_SECRET=""

FLOUCI_API_URL="https://developers.flouci.com"
FLOUCI_APP_PUBLIC=""
FLOUCI_APP_SECRET=""
```

### Étape 5 : Configurer le Frontend

```bash
# Retourner à la racine puis aller dans web
cd ../../apps/web
cp .env.example .env
```

Éditer `apps/web/.env` :
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.votre_token_mapbox_ici
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

**Pour Mapbox Token** (gratuit) :
1. Aller sur https://www.mapbox.com/
2. Créer un compte
3. Copier votre "Access Token"

### Étape 6 : Lancer l'application

**Terminal 1 - Backend :**
```bash
# Depuis la racine du projet
cd apps/api
npm run dev
```

Vous devriez voir :
```
🚀 Server running on port 4000
📡 Socket.io ready for connections
```

**Terminal 2 - Frontend :**
```bash
# Depuis la racine du projet (nouveau terminal)
cd apps/web
npm run dev
```

Vous devriez voir :
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### Étape 7 : Accéder à l'application

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:4000
- **Health Check** : http://localhost:4000/health

## ✅ Vérification de l'installation

### Test 1 : Backend fonctionne
```bash
curl http://localhost:4000/health
```

Devrait retourner :
```json
{"status":"ok","timestamp":"..."}
```

### Test 2 : Database connectée
Dans le terminal du backend, vous ne devriez voir aucune erreur de connexion Prisma.

### Test 3 : Frontend chargé
Ouvrir http://localhost:3000 - vous devriez voir la page d'accueil avec deux boutons.

## 🐛 Résolution des problèmes courants

### Problème : Port déjà utilisé

**Erreur** : `Error: listen EADDRINUSE: address already in use :::4000`

**Solution** :
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### Problème : PostgreSQL pas connecté

**Erreur** : `Can't reach database server`

**Solutions** :
```bash
# Vérifier que PostgreSQL tourne
# Windows
services.msc  # Chercher PostgreSQL

# Linux/Mac
sudo systemctl status postgresql
# ou
brew services list | grep postgresql
```

**Démarrer PostgreSQL** :
```bash
# Windows : via services.msc

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

### Problème : Redis pas connecté

**Erreur** : `Redis connection refused`

**Solutions** :
```bash
# Vérifier Redis
redis-cli ping  # Devrait retourner "PONG"

# Démarrer Redis
# Windows : télécharger depuis https://github.com/microsoftarchive/redis/releases
# Linux
sudo systemctl start redis

# Mac
brew services start redis
```

### Problème : Module introuvable

**Erreur** : `Cannot find module '@truck4u/database'`

**Solution** :
```bash
# Réinstaller depuis la racine
cd truck4u-pwa-fixed
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
npm install
```

### Problème : Prisma client pas généré

**Erreur** : `@prisma/client did not initialize yet`

**Solution** :
```bash
cd packages/database
npm run generate
```

### Problème : TypeScript errors

**Solution** :
```bash
# Installer TypeScript globalement
npm install -g typescript

# Vérifier
tsc --version
```

## 📋 Commandes utiles

```bash
# Depuis la RACINE du projet :

# Lancer backend
npm run dev:api

# Lancer frontend  
npm run dev:web

# Générer Prisma Client
npm run db:generate

# Pousser schéma DB
npm run db:push

# Ouvrir Prisma Studio (GUI database)
npm run db:studio

# Migration
npm run db:migrate
```

## 🎯 Prochaines étapes

Une fois que tout fonctionne :

1. **Tester le flow complet** (voir QUICKSTART.md)
2. **Créer un compte client**
3. **Créer un compte chauffeur**
4. **Tester une course complète**

## 📞 Besoin d'aide ?

Si vous rencontrez toujours des problèmes :

1. Vérifiez les logs dans les terminaux
2. Assurez-vous que PostgreSQL et Redis tournent
3. Vérifiez que les ports 3000 et 4000 sont libres
4. Vérifiez les fichiers .env

---

**Installation réussie ? Passez à QUICKSTART.md pour tester l'app ! 🎉**
