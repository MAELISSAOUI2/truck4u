/**
 * Real-Time Tracking Types
 *
 * TypeScript definitions for Socket.IO events used in real-time tracking.
 */

import { DriverLocation } from './geolocation';

// ============================================================================
// Socket.IO Event Data Types
// ============================================================================

/**
 * Data sent when driver updates their location
 */
export interface DriverLocationUpdate extends DriverLocation {
  rideId: string;
  driverId: string;
}

/**
 * Data sent when joining a trip room
 */
export interface TripJoinData {
  rideId: string;
  userId: string;
  userRole: 'CUSTOMER' | 'DRIVER';
}

/**
 * Data broadcasted when trip status changes
 */
export interface TripStatusUpdate {
  rideId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  updatedAt: string;
  metadata?: {
    cancelledBy?: 'CUSTOMER' | 'DRIVER';
    cancellationReason?: string;
    completedAt?: string;
    rating?: number;
  };
}

/**
 * Data sent when driver arrives at pickup location
 */
export interface DriverArrivedData {
  rideId: string;
  driverId: string;
  arrivedAt: string;
  location: {
    lat: number;
    lng: number;
  };
}

/**
 * Data sent when trip starts (pickup completed)
 */
export interface TripStartedData {
  rideId: string;
  startedAt: string;
  pickupLocation: {
    lat: number;
    lng: number;
  };
}

/**
 * Data sent when trip is completed
 */
export interface TripCompletedData {
  rideId: string;
  completedAt: string;
  dropoffLocation: {
    lat: number;
    lng: number;
  };
  totalDistance: number;
  totalDuration: number;
  finalPrice: number;
}

/**
 * ETA (Estimated Time of Arrival) update
 */
export interface ETAUpdate {
  rideId: string;
  estimatedArrival: string; // ISO timestamp
  distanceRemaining: number; // meters
  durationRemaining: number; // seconds
}

// ============================================================================
// Socket.IO Event Type Mappings
// ============================================================================

/**
 * Events that clients can emit to server
 */
export interface ClientToServerEvents {
  // Join a trip room to receive updates
  'join-trip': (data: TripJoinData) => void;

  // Leave a trip room
  'leave-trip': (data: { rideId: string }) => void;

  // Driver sends location update
  'driver:location': (data: DriverLocationUpdate) => void;

  // Driver marks as arrived at pickup
  'driver:arrived': (data: DriverArrivedData) => void;

  // Driver starts trip (after pickup)
  'trip:started': (data: TripStartedData) => void;

  // Driver completes trip
  'trip:completed': (data: TripCompletedData) => void;
}

/**
 * Events that server can emit to clients
 */
export interface ServerToClientEvents {
  // Broadcast driver location to trip room
  'driver:location': (data: DriverLocationUpdate) => void;

  // Broadcast trip status change
  'trip:status-changed': (data: TripStatusUpdate) => void;

  // Notify when driver arrives at pickup
  'driver:arrived': (data: DriverArrivedData) => void;

  // Notify when trip starts
  'trip:started': (data: TripStartedData) => void;

  // Notify when trip is completed
  'trip:completed': (data: TripCompletedData) => void;

  // Send ETA updates
  'trip:eta-update': (data: ETAUpdate) => void;

  // Error notifications
  'error': (data: { message: string; code?: string }) => void;

  // Connection established
  'connected': (data: { userId: string; role: string }) => void;
}

/**
 * Inter-server events (for Socket.IO adapter)
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data attached to each connection
 */
export interface SocketData {
  userId: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  authenticatedAt: number;
}

// ============================================================================
// Redis Cache Keys
// ============================================================================

/**
 * Generate Redis key for driver's latest location
 */
export function getDriverLocationKey(driverId: string): string {
  return `driver:${driverId}:location`;
}

/**
 * Generate Redis key for trip's active room members
 */
export function getTripRoomKey(rideId: string): string {
  return `trip:${rideId}:room`;
}

/**
 * Generate Redis key for trip's latest status
 */
export function getTripStatusKey(rideId: string): string {
  return `trip:${rideId}:status`;
}

/**
 * Generate Redis key for driver's ETA to destination
 */
export function getDriverETAKey(driverId: string, rideId: string): string {
  return `driver:${driverId}:ride:${rideId}:eta`;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Real-time tracking state for frontend
 */
export interface TripTrackingState {
  rideId: string;
  isConnected: boolean;
  driverLocation: DriverLocationUpdate | null;
  lastUpdate: number | null;
  eta: ETAUpdate | null;
  status: TripStatusUpdate['status'];
}

/**
 * Configuration for real-time tracking
 */
export interface TrackingConfig {
  // How often driver should send location updates (milliseconds)
  locationUpdateInterval: number;

  // How long to cache location in Redis (seconds)
  locationCacheTTL: number;

  // Distance threshold for ETA recalculation (meters)
  etaRecalculationThreshold: number;

  // Maximum age of cached location before considering stale (seconds)
  staleLocationThreshold: number;
}

/**
 * Default tracking configuration
 */
export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  locationUpdateInterval: 3000,      // 3 seconds
  locationCacheTTL: 300,              // 5 minutes
  etaRecalculationThreshold: 100,     // 100 meters
  staleLocationThreshold: 30,         // 30 seconds
};
