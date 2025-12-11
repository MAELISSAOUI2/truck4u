#!/bin/bash

# OSRM Data Setup Script
# Automates the download and processing of OSM data for OSRM

set -e

echo "🚀 OSRM Data Setup for Tunisia"
echo "================================"

# Configuration
DATA_DIR="osrm-data"
REGION="tunisia"
OSM_FILE="${REGION}-latest.osm.pbf"
PROFILE="${1:-car}"  # car, truck, or foot

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

# Download OSM data if not exists
if [ ! -f "$OSM_FILE" ]; then
    echo ""
    echo "📥 Downloading Tunisia OSM data (~100MB)..."
    echo "   Source: https://download.geofabrik.de/africa/${OSM_FILE}"

    curl -L -O "https://download.geofabrik.de/africa/${OSM_FILE}"

    echo "✅ Download complete!"
else
    echo ""
    echo "✅ OSM file already exists: $OSM_FILE"
fi

# Extract with selected profile
echo ""
echo "🔨 Step 1/3: Extracting with $PROFILE profile..."
docker run --rm -t \
    -v "$(pwd):/data" \
    ghcr.io/project-osrm/osrm-backend \
    osrm-extract -p "/opt/${PROFILE}.lua" "/data/$OSM_FILE"

echo "✅ Extract complete!"

# Partition
echo ""
echo "🔨 Step 2/3: Partitioning..."
docker run --rm -t \
    -v "$(pwd):/data" \
    ghcr.io/project-osrm/osrm-backend \
    osrm-partition "/data/${REGION}-latest.osrm"

echo "✅ Partition complete!"

# Customize
echo ""
echo "🔨 Step 3/3: Customizing..."
docker run --rm -t \
    -v "$(pwd):/data" \
    ghcr.io/project-osrm/osrm-backend \
    osrm-customize "/data/${REGION}-latest.osrm"

echo "✅ Customize complete!"

# Go back to project root
cd ..

echo ""
echo "🎉 OSRM data preparation complete!"
echo ""
echo "Next steps:"
echo "  1. Start OSRM service:"
echo "     docker-compose up -d osrm"
echo ""
echo "  2. Test OSRM:"
echo "     curl \"http://localhost:5000/route/v1/driving/10.1815,36.8065;10.1814,36.7923\""
echo ""
echo "  3. Update your .env.local:"
echo "     NEXT_PUBLIC_OSRM_URL=http://localhost:5000"
echo ""
