# Guide de Déploiement Docker - Truck4u

## 🎯 Vue d'Ensemble

Ce guide explique comment déployer tous les services nécessaires pour Truck4u :

- **PostgreSQL** - Base de données
- **Redis** - Cache et sessions
- **Pelias** - Geocoding (recherche d'adresses)
- **OSRM** - Routing (calcul d'itinéraires)
- **API Backend** - Express server
- **Frontend** - Next.js application

---

## 📋 Prérequis

- Docker Desktop installé (Windows/Mac) ou Docker Engine (Linux)
- 8GB RAM minimum
- 50GB d'espace disque disponible
- Ports disponibles : 3000, 4000, 4001, 5000, 5432, 6379, 9200

---

## 🚀 Démarrage Rapide (Tous les Services)

### Étape 1 : Configuration

```bash
cd truck4u

# Copier le fichier d'environnement exemple
cp .env.local.example apps/web/.env.local
cp .env.local.example apps/api/.env

# Éditer les fichiers .env avec vos valeurs
```

### Étape 2 : Démarrer les Services Core

```bash
# PostgreSQL
docker-compose up -d postgres

# Redis
docker-compose -f docker-compose.redis.yml up -d

# Attendre 10 secondes
sleep 10

# Migrer la base de données
cd packages/database
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### Étape 3 : Démarrer les Services Géolocalisation

```bash
# OSRM (Routing) - Préparer les données d'abord
chmod +x scripts/setup-osrm-tunisia.sh
./scripts/setup-osrm-tunisia.sh

# Démarrer OSRM
docker-compose -f docker-compose.osrm.yml up -d

# Pelias (Geocoding) - Voir section Pelias ci-dessous
cd pelias-docker/projects/tunisia
docker-compose up -d
cd ../../..
```

### Étape 4 : Démarrer l'Application

```bash
# Backend API
cd apps/api
npm install
npm run dev

# Frontend (dans un autre terminal)
cd apps/web
npm install
npm run dev
```

---

## 🗺️ Configuration Détaillée de Pelias

### Installation Initiale

```bash
cd pelias-docker/projects/tunisia

# 1. Démarrer Elasticsearch
docker-compose up -d elasticsearch

# Attendre 60 secondes
sleep 60

# 2. Télécharger les données
docker-compose run --rm openstreetmap npm run download
docker-compose run --rm whosonfirst npm run download

# 3. Créer le schéma
docker-compose run --rm schema node scripts/create_index.js

# 4. Importer les données (10-30 minutes)
docker-compose run --rm openstreetmap ./bin/start
# Si ça ne marche pas, les données de base sont suffisantes

# 5. Démarrer tous les services
docker-compose up -d
```

### Tester Pelias

```bash
# Health check
curl http://localhost:4001/

# Recherche d'adresse
curl "http://localhost:4001/v1/search?text=Tunis"

# Autocomplete
curl "http://localhost:4001/v1/autocomplete?text=Avenue%20Habib"

# Reverse geocoding
curl "http://localhost:4001/v1/reverse?point.lat=36.8065&point.lon=10.1815"
```

---

## 🛣️ Configuration Détaillée d'OSRM

### Préparation des Données

Le script `setup-osrm-tunisia.sh` automatise tout :

```bash
# Exécuter le script de setup
chmod +x scripts/setup-osrm-tunisia.sh
./scripts/setup-osrm-tunisia.sh
```

**Étapes manuelles (si nécessaire) :**

```bash
mkdir -p osrm-data && cd osrm-data

# 1. Télécharger Tunisia OSM (~100MB)
wget https://download.geofabrik.de/africa/tunisia-latest.osm.pbf

# 2. Extraire (5-10 min)
docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf

# 3. Partitionner
docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/tunisia-latest.osrm

# 4. Customiser
docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/tunisia-latest.osrm

cd ..
```

### Démarrer OSRM

```bash
docker-compose -f docker-compose.osrm.yml up -d
```

### Tester OSRM

```bash
# Route entre deux points (Tunis → La Marsa)
curl "http://localhost:5000/route/v1/driving/10.1815,36.8065;10.3257,36.8766?overview=full&geometries=geojson"

# Table de distances (matrice)
curl "http://localhost:5000/table/v1/driving/10.1815,36.8065;10.3257,36.8766;10.1814,36.7923"

# Nearest road
curl "http://localhost:5000/nearest/v1/driving/10.1815,36.8065"
```

---

## 🔴 Configuration Redis

### Démarrer Redis

```bash
docker-compose -f docker-compose.redis.yml up -d
```

### Tester Redis

```bash
# Ping
docker exec truck4u_redis redis-cli ping
# Devrait retourner: PONG

# Set/Get
docker exec truck4u_redis redis-cli set test "Hello"
docker exec truck4u_redis redis-cli get test
```

### Surveillance Redis

```bash
# Voir les clés
docker exec truck4u_redis redis-cli keys '*'

# Monitorer en temps réel
docker exec truck4u_redis redis-cli monitor

# Info mémoire
docker exec truck4u_redis redis-cli info memory
```

---

## 🗄️ PostgreSQL

### Connexion

```bash
# Via docker
docker exec -it truck4u_postgres psql -U postgres -d truck4u

# Commandes utiles
\dt          # Lister les tables
\d rides     # Décrire la table rides
\q           # Quitter
```

### Backup & Restore

```bash
# Backup
docker exec truck4u_postgres pg_dump -U postgres truck4u > backup.sql

# Restore
docker exec -i truck4u_postgres psql -U postgres truck4u < backup.sql
```

---

## 📊 Surveillance des Services

### Voir les Logs

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f api
docker-compose -f docker-compose.osrm.yml logs -f osrm
docker-compose -f docker-compose.redis.yml logs -f redis

# Pelias
cd pelias-docker/projects/tunisia
docker-compose logs -f api
```

### Statut des Services

```bash
# Services principaux
docker-compose ps

# OSRM
docker-compose -f docker-compose.osrm.yml ps

# Redis
docker-compose -f docker-compose.redis.yml ps

# Pelias
cd pelias-docker/projects/tunisia && docker-compose ps
```

### Ressources Utilisées

```bash
# CPU et mémoire de tous les conteneurs
docker stats

# Espace disque
docker system df
```

---

## 🛑 Arrêter les Services

```bash
# Services principaux
docker-compose down

# OSRM
docker-compose -f docker-compose.osrm.yml down

# Redis
docker-compose -f docker-compose.redis.yml down

# Pelias
cd pelias-docker/projects/tunisia && docker-compose down

# Tout arrêter et supprimer les volumes
docker-compose down -v
```

---

## 🔄 Mise à Jour des Services

### Mettre à jour les images Docker

```bash
# Pull les dernières images
docker-compose pull
docker-compose -f docker-compose.osrm.yml pull
docker-compose -f docker-compose.redis.yml pull

# Redémarrer avec les nouvelles images
docker-compose up -d --force-recreate
```

### Mettre à jour les données OSRM

```bash
cd osrm-data
rm tunisia-latest.osm.pbf tunisia-latest.osrm*
cd ..
./scripts/setup-osrm-tunisia.sh
docker-compose -f docker-compose.osrm.yml restart
```

---

## 🐛 Dépannage

### Pelias ne retourne pas de résultats

**Problème** : API répond mais `features: []`

**Solution** : Les données ne sont pas importées. Essayez :
```bash
cd pelias-docker/projects/tunisia
docker-compose restart elasticsearch
sleep 30
docker-compose run --rm schema node scripts/create_index.js
```

### OSRM ne démarre pas

**Problème** : `Error loading data file`

**Solution** :
```bash
# Vérifier que les fichiers .osrm existent
ls -lh osrm-data/tunisia-latest.osrm*

# Si non, relancer la préparation
./scripts/setup-osrm-tunisia.sh
```

### Redis connection refused

**Problème** : `ECONNREFUSED 127.0.0.1:6379`

**Solution** :
```bash
# Vérifier que Redis tourne
docker ps | grep redis

# Si non, démarrer
docker-compose -f docker-compose.redis.yml up -d

# Tester la connexion
docker exec truck4u_redis redis-cli ping
```

### Port déjà utilisé

**Problème** : `Bind for 0.0.0.0:5000 failed: port is already allocated`

**Solution** :
```bash
# Trouver le processus
lsof -i :5000  # Linux/Mac
netstat -ano | findstr :5000  # Windows

# Tuer le processus ou changer le port dans docker-compose
```

---

## 📝 Checklist de Déploiement

Avant de déployer en production :

- [ ] Changer `JWT_SECRET` dans `.env`
- [ ] Configurer un vrai `DATABASE_URL` (pas localhost)
- [ ] Activer HTTPS pour les URLs publiques
- [ ] Configurer les sauvegardes automatiques PostgreSQL
- [ ] Configurer Redis avec mot de passe
- [ ] Limiter l'accès aux ports (firewall)
- [ ] Configurer les logs centralisés
- [ ] Configurer le monitoring (Sentry, Datadog, etc.)
- [ ] Tester la haute disponibilité
- [ ] Documenter les procédures de rollback

---

## 🔗 Liens Utiles

- [Pelias Documentation](https://github.com/pelias/pelias)
- [OSRM Documentation](http://project-osrm.org/)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**Besoin d'aide ?** Consultez les issues GitHub ou contactez l'équipe.
