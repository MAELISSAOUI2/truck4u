# Geolocation Architecture - Truck4u

**Date:** 2025-11-30
**Status:** Implementation Ready

---

## 🎯 Overview

This document defines the clean, modular architecture for geolocation services in Truck4u, built on:

- **Frontend:** Next.js 14 + React 18 + MapLibre GL JS + Mantine UI + Zustand
- **Backend:** Next.js API Routes + Express + Prisma + PostgreSQL + Socket.IO + Redis
- **External Services:** Pelias (geocoding) + OSRM/Valhalla (routing)

---

## 📊 Module Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  Map Component │  │  Address Search  │  │ Real-Time Track │ │
│  │  (MapLibre GL) │  │  (Autocomplete)  │  │   (Socket.IO)   │ │
│  └────────┬───────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                   │                      │          │
│           └───────────────────┴──────────────────────┘          │
│                               │                                 │
│                    ┌──────────▼──────────┐                      │
│                    │   Zustand Stores    │                      │
│                    │  - mapStore         │                      │
│                    │  - rideStore        │                      │
│                    │  - trackingStore    │                      │
│                    └──────────┬──────────┘                      │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                     HTTP + WebSocket
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Next.js API + Socket.IO)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     API ROUTES                             │ │
│  │                                                            │ │
│  │  /api/geocode/*  →  GeocodingService  →  Pelias          │ │
│  │  /api/routing/*  →  RoutingService    →  OSRM/Valhalla   │ │
│  │  /api/pricing/*  →  PricingService    →  PostgreSQL      │ │
│  │  /api/trips/*    →  TripService       →  PostgreSQL      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  SOCKET.IO SERVER                          │ │
│  │                                                            │ │
│  │  Events:                                                   │ │
│  │    - join-trip           (rider/driver joins room)        │ │
│  │    - driver:location     (driver sends GPS updates)       │ │
│  │    - trip:status-changed (status updates)                 │ │
│  │    - trip:eta-updated    (ETA recalculated)               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    REDIS LAYER                             │ │
│  │                                                            │ │
│  │  - Socket.IO Adapter (Pub/Sub for horizontal scale)       │ │
│  │  - Driver Location Cache: trip:{tripId}:driver:location   │ │
│  │  - Geocoding Cache: geocode:autocomplete:{query}          │ │
│  │  - Routing Cache: route:{hash}                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                │
                     ┌──────────┴──────────┐
                     │                     │
            ┌────────▼───────┐   ┌────────▼────────┐
            │  Pelias        │   │  OSRM/Valhalla  │
            │  (Geocoding)   │   │  (Routing)      │
            └────────────────┘   └─────────────────┘
```

---

## 🗃️ Data Models

### Enhanced Ride Model (Existing + Additions)

The `Ride` model already has most fields we need, but we'll add geolocation-specific enhancements:

```prisma
model Ride {
  // ... existing fields ...

  // Enhanced geolocation fields
  pickup               Json      // Enhanced: {lat, lng, address, placeId, details, bounds}
  dropoff              Json      // Enhanced: {lat, lng, address, placeId, details, bounds}
  routeGeometry        Json?     // NEW: GeoJSON LineString from OSRM
  routeWaypoints       Json?     // NEW: Detailed waypoints from routing

  // Real-time tracking
  driverCurrentLocation Json?    // NEW: Latest driver position {lat, lng, heading, speed, accuracy, timestamp}
  estimatedPickupTime   DateTime? // Already exists
  estimatedDeliveryTime DateTime? // Already exists
  actualPickupTime      DateTime? // Already exists
  actualDeliveryTime    DateTime? // Already exists

  // Tracking metadata
  trackingEnabled       Boolean   @default(true)  // NEW: Can be disabled for privacy
  lastLocationUpdate    DateTime? // NEW: When driver last sent location

  // ... rest of existing fields ...
}
```

### Driver Location Cache (Redis, not Prisma)

```typescript
// Redis keys:
// trip:{tripId}:driver:location
// Structure:
{
  lat: number;
  lng: number;
  heading: number;    // 0-360 degrees
  speed: number;      // km/h
  accuracy: number;   // meters
  timestamp: number;  // Unix timestamp
}

// TTL: 15 minutes (auto-expire if no updates)
```

### Geocoding Cache (Redis)

```typescript
// Redis keys:
// geocode:autocomplete:{query}
// geocode:reverse:{lat}:{lng}

// Structure:
{
  results: GeocodingResult[];
  timestamp: number;
}

// TTL: 1 hour
```

### Routing Cache (Redis)

```typescript
// Redis keys:
// route:{hash}  // hash = md5(pickupLat,pickupLng,dropoffLat,dropoffLng,profile)

// Structure:
{
  geometry: GeoJSON.LineString;
  distance: number;    // meters
  duration: number;    // seconds
  waypoints: Array<{lat: number; lng: number;}>;
  timestamp: number;
}

// TTL: 6 hours
```

---

## 🔌 API Contracts

### 1. Geocoding API

#### `GET /api/geocode/autocomplete`
**Query Params:**
- `q` (string, required): Search query
- `lat` (number, optional): User's latitude for proximity bias
- `lng` (number, optional): User's longitude for proximity bias
- `limit` (number, optional): Max results (default: 5)

**Response:**
```typescript
{
  results: Array<{
    id: string;           // Pelias feature ID
    label: string;        // Display text (e.g., "Avenue Habib Bourguiba, Tunis")
    address: string;      // Full formatted address
    lat: number;
    lng: number;
    type: 'venue' | 'address' | 'street' | 'locality' | 'region';
    confidence: number;   // 0-1
    bounds?: {            // Bounding box if available
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
    };
  }>
}
```

#### `GET /api/geocode/reverse`
**Query Params:**
- `lat` (number, required)
- `lng` (number, required)

**Response:**
```typescript
{
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  components: {
    street?: string;
    housenumber?: string;
    locality?: string;
    region?: string;
    postalcode?: string;
    country?: string;
  }
}
```

---

### 2. Routing API

#### `POST /api/routing/route`
**Body:**
```typescript
{
  pickup: { lat: number; lng: number; };
  dropoff: { lat: number; lng: number; };
  waypoints?: Array<{ lat: number; lng: number; }>; // Optional intermediate points
  profile?: 'car' | 'truck' | 'foot';  // Default: 'truck'
  alternatives?: boolean;  // Return alternative routes (default: false)
}
```

**Response:**
```typescript
{
  route: {
    geometry: GeoJSON.LineString;  // Decoded polyline
    distance: number;              // meters
    duration: number;              // seconds
    waypoints: Array<{
      lat: number;
      lng: number;
      name?: string;
    }>;
  };
  alternatives?: Array<{...}>;  // If requested
}
```

---

### 3. Pricing API (Enhanced)

#### `POST /api/pricing/estimate`
**Body:**
```typescript
{
  pickup: { lat: number; lng: number; };
  dropoff: { lat: number; lng: number; };
  vehicleType: 'CAMIONNETTE' | 'FOURGON' | 'CAMION_3_5T' | 'CAMION_LOURD';
  tripType: 'ALLER_SIMPLE' | 'ALLER_RETOUR';
  hasConvoyeur: boolean;
  departureTime?: string;  // ISO 8601
  trafficLevel: 'FLUIDE' | 'MOYEN' | 'DENSE';

  // NEW: Include driver location for driver-to-pickup distance
  driverLocation?: { lat: number; lng: number; };
}
```

**Response:**
```typescript
{
  route: {
    geometry: GeoJSON.LineString;
    distance: number;  // meters
    duration: number;  // seconds
  };

  // If driverLocation provided
  driverToPickup?: {
    distance: number;
    duration: number;
  };

  pricing: {
    basePrice: number;
    tripTypeMultiplier: number;
    timeSlotMultiplier: number;
    trafficMultiplier: number;
    convoyeurFee: number;
    finalPrice: number;
    breakdown: {
      step1_base: number;
      step2_tripType: number;
      step3_timeSlot: number;
      step4_traffic: number;
      step5_convoyeur: number;
      step6_final: number;
    };
  };
}
```

---

### 4. Trip API (Enhanced)

#### `POST /api/trips/create`
**Body:**
```typescript
{
  pickup: {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
    details?: string;
    accessNotes?: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
    details?: string;
  };
  vehicleType: VehicleType;
  loadAssistance: boolean;
  description?: string;
  itemPhotos?: string[];
  serviceType: 'IMMEDIATE' | 'SCHEDULED';
  scheduledFor?: string;  // ISO 8601
  isExpress?: boolean;
}
```

**Response:**
```typescript
{
  trip: {
    id: string;
    status: 'PENDING_BIDS';
    pickup: {...};
    dropoff: {...};
    distance: number;
    estimatedDuration: number;
    routeGeometry: GeoJSON.LineString;
    estimatedMinPrice: number;
    estimatedMaxPrice: number;
    createdAt: string;
  }
}
```

---

### 5. Socket.IO Events

#### Client → Server Events

**`join-trip`**
```typescript
{
  tripId: string;
  userType: 'customer' | 'driver';
}
```

**`driver:location` (Driver only)**
```typescript
{
  tripId: string;
  location: {
    lat: number;
    lng: number;
    heading: number;    // 0-360
    speed: number;      // km/h
    accuracy: number;   // meters
    timestamp: number;  // Unix timestamp
  }
}
```

**`driver:eta-request` (Customer only)**
```typescript
{
  tripId: string;
}
```

#### Server → Client Events

**`driver:location` (Broadcast to trip room)**
```typescript
{
  tripId: string;
  location: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    accuracy: number;
    timestamp: number;
  }
}
```

**`trip:eta-updated` (Broadcast to trip room)**
```typescript
{
  tripId: string;
  estimatedArrival: number;  // seconds
  estimatedDelivery: number; // seconds
}
```

**`trip:status-changed` (Broadcast to trip room)**
```typescript
{
  tripId: string;
  status: RideStatus;
  timestamp: string;
}
```

---

## 📦 TypeScript Interfaces / DTOs

Create `/apps/web/types/geolocation.ts`:

```typescript
// ============================================
// GEOCODING TYPES
// ============================================

export interface GeocodingResult {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  type: 'venue' | 'address' | 'street' | 'locality' | 'region';
  confidence: number;
  bounds?: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
}

export interface ReverseGeocodeResult {
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  components: {
    street?: string;
    housenumber?: string;
    locality?: string;
    region?: string;
    postalcode?: string;
    country?: string;
  };
}

// ============================================
// ROUTING TYPES
// ============================================

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteRequest {
  pickup: Coordinate;
  dropoff: Coordinate;
  waypoints?: Coordinate[];
  profile?: 'car' | 'truck' | 'foot';
  alternatives?: boolean;
}

export interface Route {
  geometry: GeoJSON.LineString;
  distance: number;  // meters
  duration: number;  // seconds
  waypoints: Array<{
    lat: number;
    lng: number;
    name?: string;
  }>;
}

export interface RouteResponse {
  route: Route;
  alternatives?: Route[];
}

// ============================================
// REAL-TIME TRACKING TYPES
// ============================================

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;    // 0-360 degrees
  speed: number;      // km/h
  accuracy: number;   // meters
  timestamp: number;  // Unix timestamp
}

export interface TripTrackingState {
  tripId: string;
  status: string;
  driverLocation: DriverLocation | null;
  estimatedPickupTime: number | null;  // seconds from now
  estimatedDeliveryTime: number | null; // seconds from now
  isConnected: boolean;
}

// ============================================
// PRICING TYPES
// ============================================

export interface PricingEstimateRequest {
  pickup: Coordinate;
  dropoff: Coordinate;
  vehicleType: 'CAMIONNETTE' | 'FOURGON' | 'CAMION_3_5T' | 'CAMION_LOURD';
  tripType: 'ALLER_SIMPLE' | 'ALLER_RETOUR';
  hasConvoyeur: boolean;
  departureTime?: string;
  trafficLevel: 'FLUIDE' | 'MOYEN' | 'DENSE';
  driverLocation?: Coordinate;  // For driver-to-pickup calculation
}

export interface PricingEstimateResponse {
  route: Route;
  driverToPickup?: {
    distance: number;
    duration: number;
  };
  pricing: {
    basePrice: number;
    tripTypeMultiplier: number;
    timeSlotMultiplier: number;
    trafficMultiplier: number;
    convoyeurFee: number;
    finalPrice: number;
    breakdown: {
      step1_base: number;
      step2_tripType: number;
      step3_timeSlot: number;
      step4_traffic: number;
      step5_convoyeur: number;
      step6_final: number;
    };
  };
}

// ============================================
// TRIP TYPES
// ============================================

export interface TripLocation {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
  details?: string;
  accessNotes?: string;
}

export interface CreateTripRequest {
  pickup: TripLocation;
  dropoff: TripLocation;
  vehicleType: string;
  loadAssistance: boolean;
  description?: string;
  itemPhotos?: string[];
  serviceType: 'IMMEDIATE' | 'SCHEDULED';
  scheduledFor?: string;
  isExpress?: boolean;
}
```

---

## 🏗️ Directory Structure

```
apps/
├── web/                              # Frontend Next.js
│   ├── app/
│   │   ├── api/                      # API Routes
│   │   │   ├── geocode/
│   │   │   │   ├── autocomplete/route.ts
│   │   │   │   ├── forward/route.ts
│   │   │   │   └── reverse/route.ts
│   │   │   ├── routing/
│   │   │   │   └── route/route.ts
│   │   │   ├── pricing/
│   │   │   │   └── estimate/route.ts
│   │   │   └── trips/
│   │   │       ├── create/route.ts
│   │   │       └── [id]/
│   │   │           ├── track/route.ts
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   └── map/
│   │   │       ├── TripMap.tsx
│   │   │       ├── AddressAutocomplete.tsx
│   │   │       └── DriverMarker.tsx
│   │   └── customer/
│   │       └── new-ride/
│   │           └── page.tsx
│   ├── lib/
│   │   ├── services/
│   │   │   ├── geocoding/
│   │   │   │   └── peliasClient.ts
│   │   │   ├── routing/
│   │   │   │   └── osrmClient.ts
│   │   │   ├── pricing/
│   │   │   │   └── pricingService.ts
│   │   │   └── realtime/
│   │   │       └── socketServer.ts
│   │   ├── stores/
│   │   │   ├── mapStore.ts
│   │   │   ├── rideStore.ts
│   │   │   └── trackingStore.ts
│   │   ├── hooks/
│   │   │   ├── useMap.ts
│   │   │   ├── useTripMap.ts
│   │   │   ├── useTripTracking.ts
│   │   │   └── useGeocoding.ts
│   │   └── utils/
│   │       ├── redis.ts
│   │       └── cache.ts
│   └── types/
│       └── geolocation.ts
│
└── api/                              # Separate API server (if needed)
    └── src/
        ├── socket/
        │   └── index.ts
        └── server.ts
```

---

## 🔄 Integration Points

### 1. Ride Creation Flow

```
Customer UI
    ↓
Address Autocomplete (Pelias)
    ↓
Select Pickup & Dropoff
    ↓
Call /api/pricing/estimate (OSRM + Pricing)
    ↓
Show route on map (MapLibre)
    ↓
Create Trip (POST /api/trips/create)
    ↓
Show in "Pending Bids" state
```

### 2. Real-Time Tracking Flow

```
Trip Status: BID_ACCEPTED
    ↓
Customer & Driver join Socket.IO room
    ↓
Driver sends GPS updates (every 5s)
    ↓
Server caches in Redis
    ↓
Server broadcasts to room
    ↓
Customer's map updates in real-time
```

### 3. Pricing with Driver Distance

```
Driver views available ride
    ↓
Frontend sends driverLocation to /api/pricing/estimate
    ↓
Backend calculates:
  - Pickup → Dropoff route (OSRM)
  - Driver → Pickup distance (OSRM)
    ↓
Returns combined estimate
    ↓
Driver sees total distance & earnings
```

---

## 🧪 Testing Scenarios

### Scenario 1: Address Search
1. Type "Avenue Habib" in autocomplete
2. Verify Pelias returns results
3. Select a result
4. Verify map centers on location

### Scenario 2: Route Display
1. Select pickup and dropoff
2. Verify route drawn on map
3. Verify distance and duration shown

### Scenario 3: Real-Time Tracking
1. Create a trip and accept bid
2. Simulate driver location updates
3. Verify customer sees moving marker
4. Verify ETA updates

### Scenario 4: Cache Hit
1. Search for same address twice
2. Verify second search is instant (cache hit)

---

## 🚀 Environment Variables

Add to `/apps/web/.env`:

```bash
# Pelias Geocoding
NEXT_PUBLIC_PELIAS_URL=http://localhost:4000
PELIAS_API_KEY=optional_if_secured

# OSRM Routing
NEXT_PUBLIC_OSRM_URL=http://localhost:5000
OSRM_PROFILE=truck  # car, truck, foot

# MapLibre
NEXT_PUBLIC_MAPLIBRE_STYLE=https://demotiles.maplibre.org/style.json
# Or use your own Maptiler/Mapbox GL compatible style

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=optional

# Socket.IO
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
```

---

## 📝 Next Steps

1. ✅ Architecture defined
2. 🔄 Implement Geocoding Service (Pelias wrapper)
3. 🔄 Implement Routing Service (OSRM wrapper)
4. 🔄 Implement Pricing Service (enhanced)
5. 🔄 Implement Real-Time Tracking (Socket.IO + Redis)
6. 🔄 Implement Map Frontend (MapLibre)
7. 🔄 Integration testing
8. 🔄 Documentation

---

**Ready to implement!** 🚀
