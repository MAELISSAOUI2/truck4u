# Configuration Pelias pour Truck4u

## Installation Pelias Docker

Pelias est installé à : `C:\Users\maaissaoui\Downloads\truck4u-pwa-fixed\pelias-docker`

## Configuration des Ports (Éviter Conflit avec API)

### 1. Modifier le fichier `.env` de Pelias

Dans `pelias-docker/.env`, modifiez :

```bash
# Changez le port de l'API de 4000 à 4001
PELIAS_PORT=4001

# Ou si la variable s'appelle différemment :
API_PORT=4001
```

### 2. Modifier `docker-compose.yml` de Pelias

Ouvrez `pelias-docker/docker-compose.yml` et trouvez le service `api` :

```yaml
api:
  image: pelias/api:master
  container_name: pelias_api
  restart: always
  environment:
    PORT: 4001  # Changé de 4000 à 4001
  ports:
    - "4001:4001"  # Changé de 4000:4000 à 4001:4001
```

### 3. Configuration pour la Tunisie

Dans `pelias-docker/pelias.json`, assurez-vous que la configuration pointe vers la Tunisie :

```json
{
  "imports": {
    "openstreetmap": {
      "download": [
        {
          "sourceURL": "https://download.geofabrik.de/africa/tunisia-latest.osm.pbf"
        }
      ]
    }
  },
  "acceptance-tests": {
    "endpoints": {
      "local": "http://localhost:4001/v1/"
    }
  }
}
```

## Démarrage Pelias

### Télécharger les Données

```bash
cd C:\Users\maaissaoui\Downloads\truck4u-pwa-fixed\pelias-docker

# Télécharger les données de Tunisie
pelias download openstreetmap

# Ou manuellement
mkdir -p data
curl -O https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
mv tunisia-latest.osm.pbf data/
```

### Préparer les Données

```bash
# Importer dans Elasticsearch
pelias prepare all

# Cela prend 10-20 minutes pour la Tunisie
```

### Démarrer les Services

```bash
# Démarrer tous les services Pelias
docker-compose up -d

# Vérifier les logs
docker-compose logs -f api

# Attendre que tous les services soient prêts (2-3 minutes)
```

### Vérifier que Pelias Fonctionne

```bash
# Test autocomplete
curl "http://localhost:4001/v1/autocomplete?text=Tunis"

# Test search
curl "http://localhost:4001/v1/search?text=Avenue%20Habib%20Bourguiba"

# Test reverse
curl "http://localhost:4001/v1/reverse?point.lat=36.8065&point.lon=10.1815"
```

## Intégration avec Truck4u

### 1. Mettre à Jour le `.env.local` de Truck4u

Dans `/home/user/truck4u/apps/web/.env.local` :

```bash
# Pelias API locale (au lieu de Nominatim)
NEXT_PUBLIC_PELIAS_URL=http://localhost:4001

# OSRM local
NEXT_PUBLIC_OSRM_URL=http://localhost:5000

# MapLibre Style
NEXT_PUBLIC_MAPLIBRE_STYLE=https://demotiles.maplibre.org/style.json

# API Backend
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 2. Adapter le Client Pelias (Déjà Fait)

Le fichier `/apps/web/lib/services/geocoding/peliasClient.ts` est déjà configuré pour utiliser Pelias v1 API.

**Pas de modification nécessaire !** Il utilise déjà :
- `/v1/autocomplete` pour l'autocomplete
- `/v1/search` pour la recherche
- `/v1/reverse` pour le reverse geocoding

## Architecture Finale

```
┌─────────────────────────────────────────────┐
│                                             │
│  Truck4u Frontend (Next.js)                 │
│  Port: 3000                                 │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Components:                         │  │
│  │  - TripMap (MapLibre GL JS)          │  │
│  │  - AddressAutocomplete               │  │
│  │  - useTripTracking hook              │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────┬───────────────────────────┘
                  │
                  │ API Calls
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Pelias  │  │  OSRM   │  │ Backend │
│ API     │  │ Router  │  │   API   │
│ :4001   │  │ :5000   │  │ :4000   │
└─────────┘  └─────────┘  └─────────┘
    │             │
    │ Data from:  │
    ▼             ▼
Tunisia OSM   Tunisia OSM
(Geocoding)   (Routing)
```

## Comparaison Pelias vs Nominatim

| Feature | Pelias | Nominatim |
|---------|--------|-----------|
| **Setup** | Plus complexe (5 services) | Simple (1 service) |
| **Import Time** | 10-20 min | 30-60 min |
| **RAM** | 4-8 GB | 4-16 GB |
| **Search Quality** | Excellent | Très bon |
| **Autocomplete** | Optimisé | Bon |
| **API Format** | JSON propre | JSON verbose |
| **Maintenance** | Peu de maintenance | Auto-update |

## Commandes Utiles

```bash
# Dans pelias-docker/

# Arrêter tous les services
docker-compose down

# Voir les services actifs
docker-compose ps

# Logs d'un service spécifique
docker-compose logs -f api
docker-compose logs -f elasticsearch

# Redémarrer un service
docker-compose restart api

# Rebuild après changement de config
docker-compose down
docker-compose up -d --build

# Nettoyer les données (ATTENTION: efface tout)
docker-compose down -v
rm -rf data/elasticsearch
```

## Troubleshooting

### Port 4001 Already in Use

```bash
# Trouver le processus
netstat -ano | findstr :4001

# Tuer le processus (remplacer PID)
taskkill /PID <PID> /F
```

### Elasticsearch ne démarre pas

```bash
# Augmenter vm.max_map_count (Linux/WSL)
sudo sysctl -w vm.max_map_count=262144

# Windows (PowerShell en Admin)
wsl -d docker-desktop
sysctl -w vm.max_map_count=262144
```

### Pas de résultats pour la Tunisie

```bash
# Vérifier que les données sont importées
docker-compose exec elasticsearch curl -XGET localhost:9200/_cat/indices

# Réimporter si nécessaire
pelias prepare all
```

### Pelias API lent

```bash
# Vérifier les ressources
docker stats

# Allouer plus de RAM à Docker Desktop
# Paramètres > Resources > Memory: 8GB minimum
```

## Migration de Nominatim vers Pelias

Si vous avez déjà testé avec Nominatim et voulez passer à Pelias :

1. ✅ **Aucun changement de code nécessaire** - Le client `peliasClient.ts` est compatible
2. ✅ **Juste changer l'URL** dans `.env.local`
3. ✅ **Redémarrer le serveur Next.js**

```bash
# Arrêter Nominatim
docker-compose stop nominatim

# Démarrer Pelias
cd C:\Users\maaissaoui\Downloads\truck4u-pwa-fixed\pelias-docker
docker-compose up -d

# Redémarrer frontend
cd /home/user/truck4u/apps/web
npm run dev
```

## Performance

Pour de meilleures performances avec Pelias :

```bash
# Dans pelias.json, ajoutez :
{
  "api": {
    "textAnalyzer": "libpostal",
    "pipServices": ["libpostal"],
    "placeholderService": "http://placeholder:4100"
  }
}
```

Cela active libpostal pour une meilleure analyse de texte.

---

**Une fois Pelias configuré et démarré, testez avec :**

```bash
curl "http://localhost:4001/v1/autocomplete?text=Avenue%20Habib&focus.point.lat=36.8&focus.point.lon=10.18"
```

Vous devriez voir des résultats JSON pour des adresses en Tunisie.
