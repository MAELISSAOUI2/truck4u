# Configuration Manuelle OSRM pour Tunisia

Si les scripts automatisés ne fonctionnent pas, voici les étapes manuelles :

## Étape 1 : Télécharger les données Tunisia

### Option A : Navigateur Web
1. Ouvrez ce lien dans votre navigateur : https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
2. Le téléchargement devrait démarrer automatiquement (~100MB)
3. Déplacez le fichier téléchargé dans le dossier `osrm-data/` à la racine du projet

### Option B : PowerShell (si curl disponible)
```powershell
# Créer le dossier
mkdir osrm-data
cd osrm-data

# Télécharger
curl -L -o tunisia-latest.osm.pbf https://download.geofabrik.de/africa/tunisia-latest.osm.pbf

# Vérifier
dir tunisia-latest.osm.pbf
# Devrait afficher un fichier d'environ 100MB
```

### Option C : Git Bash (si installé)
```bash
mkdir -p osrm-data
cd osrm-data
curl -L -o tunisia-latest.osm.pbf https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
```

## Étape 2 : Préparer les données OSRM

Une fois le fichier `tunisia-latest.osm.pbf` dans le dossier `osrm-data/`, exécutez ces commandes Docker :

```powershell
# Aller dans le dossier osrm-data
cd osrm-data

# Obtenir le chemin complet
$PWD = (Get-Location).Path
Write-Host "Chemin actuel: $PWD"

# 1. Extract (5-10 minutes)
docker run --rm -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf

# 2. Partition (2-5 minutes)
docker run --rm -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/tunisia-latest.osrm

# 3. Customize (1-2 minutes)
docker run --rm -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/tunisia-latest.osrm

# Retourner à la racine
cd ..
```

### Si vous êtes dans Git Bash:
```bash
cd osrm-data

# 1. Extract
docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf

# 2. Partition
docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/tunisia-latest.osrm

# 3. Customize
docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/tunisia-latest.osrm

cd ..
```

## Étape 3 : Vérifier les fichiers créés

Après avoir exécuté toutes les commandes, vous devriez avoir ces fichiers dans `osrm-data/` :

```
osrm-data/
├── tunisia-latest.osm.pbf        # Fichier téléchargé (~100MB)
├── tunisia-latest.osrm            # Créé par extract
├── tunisia-latest.osrm.ebg        # Créé par extract
├── tunisia-latest.osrm.fileIndex  # Créé par extract
├── tunisia-latest.osrm.geometry   # Créé par extract
├── tunisia-latest.osrm.icd        # Créé par extract
├── tunisia-latest.osrm.names      # Créé par extract
├── tunisia-latest.osrm.nbg_nodes  # Créé par extract
├── tunisia-latest.osrm.edges      # Créé par extract
├── tunisia-latest.osrm.cells      # Créé par partition
├── tunisia-latest.osrm.mldgr      # Créé par partition
├── tunisia-latest.osrm.partition  # Créé par partition
└── tunisia-latest.osrm.hsgr       # Créé par customize ✅ IMPORTANT
```

**Important:** Le fichier `tunisia-latest.osrm.hsgr` est le plus important - c'est le dernier fichier créé et il indique que tout est prêt.

## Étape 4 : Démarrer OSRM

```powershell
# Depuis la racine du projet
docker-compose -f docker-compose.osrm.yml up -d

# Vérifier les logs
docker-compose -f docker-compose.osrm.yml logs -f
```

Vous devriez voir :
```
[info] starting up engines, v5.27.1
[info] Threads: 8
[info] IP address: 0.0.0.0
[info] IP port: 5000
[info] http 1.1 compression handled by zlib version 1.2.11
[info] running and waiting for requests
```

## Étape 5 : Tester

### PowerShell:
```powershell
# Test simple (route de Tunis centre vers La Marsa)
curl "http://localhost:5000/route/v1/driving/10.1815,36.8065;10.3257,36.8766?overview=full"

# Devrait retourner du JSON avec distance, duration, etc.
```

### Navigateur:
Ouvrez dans votre navigateur :
```
http://localhost:5000/route/v1/driving/10.1815,36.8065;10.3257,36.8766?overview=full
```

## Dépannage

### Erreur "permission denied" sur Windows
- Assurez-vous que Docker Desktop est en cours d'exécution
- Essayez de redémarrer PowerShell en tant qu'administrateur
- Vérifiez que le partage de disque est activé dans Docker Desktop

### Commande Docker échoue
- Vérifiez que Docker fonctionne : `docker ps`
- Vérifiez que l'image OSRM peut être téléchargée : `docker pull ghcr.io/project-osrm/osrm-backend`

### Le fichier .osm.pbf est corrompu
- Supprimez le fichier et retéléchargez-le
- Vérifiez la taille : devrait être ~100MB

### OSRM démarre mais ne répond pas
- Vérifiez le port 5000 : `netstat -an | findstr 5000`
- Vérifiez les logs : `docker-compose -f docker-compose.osrm.yml logs`
- Le fichier `.osrm.hsgr` doit exister

## Temps estimés

- Téléchargement : 2-5 minutes (selon connexion)
- Extract : 5-10 minutes
- Partition : 2-5 minutes
- Customize : 1-2 minutes

**Total : ~10-25 minutes**
