# Docker Services Setup Guide

## Quick Start

### 1. Start Core Services (Postgres + Redis)

```bash
# Start only database and cache
docker-compose up -d postgres redis

# Check status
docker-compose ps
```

### 2. Start Geolocation Services

See detailed setup below for OSRM and Nominatim.

---

## OSRM (Routing Service) Setup

OSRM requires downloading and preprocessing OpenStreetMap data before it can run.

### Step 1: Download OSM Data for Tunisia

```bash
# Create data directory
mkdir -p osrm-data
cd osrm-data

# Download Tunisia OSM data (~100MB)
wget https://download.geofabrik.de/africa/tunisia-latest.osm.pbf

# Or use curl
curl -O https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
```

### Step 2: Process OSM Data

```bash
# Process with car profile (for OSRM)
docker run --rm -v $(pwd)/osrm-data:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf

# Partition the data
docker run --rm -v $(pwd)/osrm-data:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/tunisia-latest.osrm

# Customize (create shortcuts)
docker run --rm -v $(pwd)/osrm-data:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/tunisia-latest.osrm
```

**Note:** Processing takes 5-10 minutes depending on your machine.

### Step 3: Start OSRM Service

```bash
# Uncomment the osrm profiles line in docker-compose.yml
# Then start the service
docker-compose up -d osrm

# Test OSRM
curl "http://localhost:5000/route/v1/driving/10.1815,36.8065;10.1814,36.7923?overview=false"
```

### Alternative: Use Truck Profile

For truck routing, use the truck profile:

```bash
docker run --rm -v $(pwd)/osrm-data:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/truck.lua /data/tunisia-latest.osm.pbf

# Then partition and customize as above
```

---

## Nominatim (Geocoding Service) Setup

Nominatim is easier than Pelias and automatically downloads data on first start.

### Step 1: Start Nominatim

```bash
# Uncomment nominatim profiles line in docker-compose.yml
docker-compose up -d nominatim

# Monitor first import (takes 30-60 minutes for Tunisia)
docker-compose logs -f nominatim
```

**First import process:**
- Downloads Tunisia OSM data (~100MB)
- Imports to PostgreSQL database
- Creates search indexes
- Total time: 30-60 minutes

### Step 2: Wait for Import to Complete

```bash
# Check if ready
curl "http://localhost:4001/search?q=Tunis&format=json"

# Should return JSON results when ready
```

### Step 3: Test Nominatim

```bash
# Search for address
curl "http://localhost:4001/search?q=Avenue+Habib+Bourguiba,+Tunis&format=json"

# Reverse geocoding
curl "http://localhost:4001/reverse?lat=36.8065&lon=10.1815&format=json"
```

---

## Alternative: Use Pelias (Advanced)

If you prefer Pelias over Nominatim, use your existing Pelias clone.

### Configure Pelias Ports

Edit your Pelias `docker-compose.yml` to avoid port conflicts:

```yaml
# In your pelias/docker-compose.yml
services:
  api:
    ports:
      - "4001:4000"  # Changed from 4000:4000
```

### Start Pelias Services

```bash
cd /path/to/pelias
docker-compose up -d

# Import data (see Pelias documentation)
```

### Update Truck4u Configuration

In `apps/web/.env.local`:

```bash
NEXT_PUBLIC_PELIAS_URL=http://localhost:4001
```

---

## Complete Stack Startup

### Option 1: Core Services Only (Recommended for Development)

```bash
# Start database and cache
docker-compose up -d postgres redis

# Run API and frontend locally with npm
cd apps/api && npm run dev
cd apps/web && npm run dev
```

**Advantages:**
- Fast reload on code changes
- Easy debugging
- Less resource usage

### Option 2: Everything in Docker

```bash
# First time: Prepare OSRM data (see above)
# Then uncomment profile lines and start all services

docker-compose --profile api --profile web up -d

# Or start selectively
docker-compose up -d postgres redis osrm nominatim
```

### Option 3: Mixed (Core + Geolocation Services in Docker)

```bash
# Start infrastructure services
docker-compose up -d postgres redis osrm nominatim

# Run app locally
cd apps/api && npm run dev
cd apps/web && npm run dev
```

**This is the recommended setup for development.**

---

## Service URLs

| Service | URL | Port | Notes |
|---------|-----|------|-------|
| PostgreSQL | postgresql://localhost:5432 | 5432 | Database |
| Redis | redis://localhost:6379 | 6379 | Cache + Socket.IO adapter |
| OSRM | http://localhost:5000 | 5000 | Routing service |
| Nominatim | http://localhost:4001 | 4001 | Geocoding (changed from 4000) |
| API | http://localhost:4000 | 4000 | Backend (if in Docker) |
| Frontend | http://localhost:3000 | 3000 | Next.js (if in Docker) |

---

## Troubleshooting

### Port 4000 Already in Use

**Problem:** Port 4000 is occupied (by your local API or other service)

**Solutions:**

1. **Change Nominatim port in docker-compose.yml:**
   ```yaml
   nominatim:
     ports:
       - "4002:8080"  # Use 4002 instead
   ```

2. **Run API in Docker instead:**
   ```bash
   # Stop local API
   # Uncomment api profile in docker-compose.yml
   docker-compose --profile api up -d
   ```

3. **Find and kill the process:**
   ```bash
   lsof -i :4000
   kill -9 <PID>
   ```

### OSRM Health Check Failing

**Problem:** OSRM container restarts continuously

**Solution:**
- Make sure you processed the OSM data correctly
- Check file permissions on osrm-data folder
- Check logs: `docker-compose logs osrm`

### Nominatim Taking Too Long

**Problem:** First import is very slow

**Solutions:**
1. Use smaller region data:
   ```yaml
   PBF_URL: https://download.geofabrik.de/africa/tunisia-latest.osm.pbf
   # Instead of all of Africa
   ```

2. Increase resources:
   ```yaml
   environment:
     THREADS: 8  # Increase from 4
   ```

3. Use SSD for volume storage

### Redis Connection Refused

**Problem:** Can't connect to Redis

**Solution:**
```bash
# Check if Redis is running
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Check logs
docker-compose logs redis
```

---

## Resource Requirements

### Minimum

- **RAM:** 4GB
- **Disk:** 10GB
- **CPU:** 2 cores

### Recommended

- **RAM:** 8GB (16GB for Nominatim first import)
- **Disk:** 20GB SSD
- **CPU:** 4 cores

### Per Service

| Service | RAM | Disk | Notes |
|---------|-----|------|-------|
| PostgreSQL | 512MB | 2GB | Grows with data |
| Redis | 256MB | 1GB | For caching |
| OSRM | 1GB | 2GB | Preloads routes |
| Nominatim | 4GB | 10GB | First import needs 8-16GB |

---

## Cleanup Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove OSRM processed data
rm -rf osrm-data/*.osrm*

# Remove Nominatim data (to re-import)
docker-compose down
docker volume rm truck4u_nominatim_data
```

---

## Production Considerations

For production deployment:

1. **Change credentials:**
   ```yaml
   POSTGRES_PASSWORD: use-strong-password
   JWT_SECRET: use-random-secret
   ```

2. **Use managed services:**
   - AWS RDS for PostgreSQL
   - AWS ElastiCache for Redis
   - Keep OSRM/Nominatim self-hosted

3. **Add reverse proxy:**
   - Nginx or Traefik
   - SSL/TLS certificates
   - Rate limiting

4. **Resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

5. **Monitoring:**
   - Add Prometheus + Grafana
   - Log aggregation (ELK stack)

---

## Quick Reference

```bash
# Start core services
docker-compose up -d postgres redis

# Start geolocation services
docker-compose up -d osrm nominatim

# Check status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Stop all
docker-compose down

# Update images
docker-compose pull
docker-compose up -d
```
