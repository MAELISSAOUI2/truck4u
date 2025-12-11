// ============================================
// GEOLOCATION TYPES - Truck4u
// ============================================

// ============================================
// GEOCODING TYPES
// ============================================

export interface GeocodingResult {
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

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
  distance?: number;  // Distance from start in meters
  duration?: number;  // Duration from start in seconds
}

export interface Route {
  geometry: GeoJSON.LineString;
  distance: number;  // meters
  duration: number;  // seconds
  waypoints: RouteWaypoint[];
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
  departureTime?: string;  // ISO 8601
  trafficLevel: 'FLUIDE' | 'MOYEN' | 'DENSE';
  driverLocation?: Coordinate;  // For driver-to-pickup calculation
}

export interface PricingBreakdown {
  step1_base: number;
  step2_tripType: number;
  step3_timeSlot: number;
  step4_traffic: number;
  step5_convoyeur: number;
  step6_final: number;
}

export interface PricingEstimateResponse {
  route: Route;
  driverToPickup?: {
    distance: number;
    duration: number;
    route?: Route;
  };
  pricing: {
    basePrice: number;
    tripTypeMultiplier: number;
    timeSlotMultiplier: number;
    trafficMultiplier: number;
    convoyeurFee: number;
    finalPrice: number;
    breakdown: PricingBreakdown;
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
  scheduledFor?: string;  // ISO 8601
  isExpress?: boolean;
}

// ============================================
// SOCKET.IO EVENT TYPES
// ============================================

export interface JoinTripEvent {
  tripId: string;
  userType: 'customer' | 'driver';
}

export interface DriverLocationEvent {
  tripId: string;
  location: DriverLocation;
}

export interface TripStatusChangedEvent {
  tripId: string;
  status: string;
  timestamp: string;
}

export interface TripETAUpdatedEvent {
  tripId: string;
  estimatedPickupTime: number;   // seconds from now
  estimatedDeliveryTime: number; // seconds from now
}
