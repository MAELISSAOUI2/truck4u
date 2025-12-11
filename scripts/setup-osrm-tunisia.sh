#!/bin/bash

# Script pour configurer OSRM avec les données de Tunisia
# Usage: ./scripts/setup-osrm-tunisia.sh

set -e

echo "🗺️  Configuration OSRM pour Tunisia"
echo "===================================="

# Créer le dossier de données
mkdir -p osrm-data
cd osrm-data

# Télécharger les données OSM Tunisia si pas déjà présentes
if [ ! -f "tunisia-latest.osm.pbf" ]; then
    echo "📥 Téléchargement des données OSM Tunisia (~100MB)..."
    wget https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
else
    echo "✅ Fichier tunisia-latest.osm.pbf déjà présent"
fi

# Extraction des données (si pas déjà fait)
if [ ! -f "tunisia-latest.osrm" ]; then
    echo "🔧 Extraction des données OSRM (peut prendre 5-10 minutes)..."
    docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend \
        osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf
else
    echo "✅ Fichiers .osrm déjà présents"
fi

# Partitionnement (si pas déjà fait)
if [ ! -f "tunisia-latest.osrm.mldgr" ]; then
    echo "📊 Partitionnement des données..."
    docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend \
        osrm-partition /data/tunisia-latest.osrm
else
    echo "✅ Fichiers .osrm.mldgr déjà présents"
fi

# Customisation (si pas déjà fait)
if [ ! -f "tunisia-latest.osrm.hsgr" ]; then
    echo "⚙️  Customisation des données..."
    docker run --rm -v "$(pwd):/data" ghcr.io/project-osrm/osrm-backend \
        osrm-customize /data/tunisia-latest.osrm
else
    echo "✅ Fichiers .osrm.hsgr déjà présents"
fi

cd ..

echo ""
echo "✅ OSRM configuré avec succès!"
echo ""
echo "📍 Pour démarrer OSRM:"
echo "   docker-compose -f docker-compose.osrm.yml up -d"
echo ""
echo "🧪 Pour tester:"
echo "   curl 'http://localhost:5000/route/v1/driving/10.1815,36.8065;10.1814,36.7923?overview=full'"
echo ""
