/**
 * useTripTracking Hook
 *
 * React hook for real-time trip tracking using Socket.IO
 *
 * Features:
 * - Automatic connection with JWT authentication
 * - Join/leave trip rooms
 * - Real-time driver location updates
 * - Trip status changes
 * - ETA updates
 * - Automatic reconnection handling
 *
 * @example
 * ```tsx
 * const { driverLocation, status, isConnected, eta } = useTripTracking(rideId);
 *
 * return (
 *   <div>
 *     {driverLocation && (
 *       <MapMarker position={[driverLocation.lat, driverLocation.lng]} />
 *     )}
 *     <Status>{status}</Status>
 *   </div>
 * );
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  TripTrackingState,
  DriverLocationUpdate,
  TripStatusUpdate,
  ETAUpdate,
  DriverArrivedData,
  TripStartedData,
  TripCompletedData,
} from '@/types/realtime';
import { useAuthStore } from '@/lib/store';
import { notifications } from '@mantine/notifications';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseTripTrackingOptions {
  /**
   * Auto-connect on mount (default: true)
   */
  autoConnect?: boolean;

  /**
   * Show notifications for events (default: true)
   */
  showNotifications?: boolean;

  /**
   * Callback when driver location updates
   */
  onLocationUpdate?: (location: DriverLocationUpdate) => void;

  /**
   * Callback when trip status changes
   */
  onStatusChange?: (status: TripStatusUpdate) => void;

  /**
   * Callback when driver arrives
   */
  onDriverArrived?: (data: DriverArrivedData) => void;

  /**
   * Callback when trip starts
   */
  onTripStarted?: (data: TripStartedData) => void;

  /**
   * Callback when trip completes
   */
  onTripCompleted?: (data: TripCompletedData) => void;
}

interface UseTripTrackingReturn extends TripTrackingState {
  /**
   * Manually connect to socket
   */
  connect: () => void;

  /**
   * Manually disconnect from socket
   */
  disconnect: () => void;

  /**
   * Send driver location update (drivers only)
   */
  sendLocationUpdate: (location: Omit<DriverLocationUpdate, 'rideId' | 'driverId'>) => void;

  /**
   * Mark driver as arrived (drivers only)
   */
  markArrived: (location: { lat: number; lng: number }) => void;

  /**
   * Start trip (drivers only)
   */
  startTrip: (pickupLocation: { lat: number; lng: number }) => void;

  /**
   * Complete trip (drivers only)
   */
  completeTrip: (data: Omit<TripCompletedData, 'rideId'>) => void;

  /**
   * Error state
   */
  error: string | null;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Custom hook for real-time trip tracking
 */
export function useTripTracking(
  rideId: string | null,
  options: UseTripTrackingOptions = {}
): UseTripTrackingReturn {
  const {
    autoConnect = true,
    showNotifications = true,
    onLocationUpdate,
    onStatusChange,
    onDriverArrived,
    onTripStarted,
    onTripCompleted,
  } = options;

  const { token, user } = useAuthStore();
  const socketRef = useRef<TypedSocket | null>(null);

  const [state, setState] = useState<TripTrackingState>({
    rideId: rideId || '',
    isConnected: false,
    driverLocation: null,
    lastUpdate: null,
    eta: null,
    status: 'PENDING',
  });

  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Socket Connection Management
  // ==========================================================================

  const connect = useCallback(() => {
    if (!token || !user || !rideId) {
      console.warn('Cannot connect: missing token, user, or rideId');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log(`🔌 Connecting to ${SOCKET_URL}...`);

    const socket: TypedSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setState((prev) => ({ ...prev, isConnected: true }));
      setError(null);
    });

    socket.on('connected', ({ userId, role }) => {
      console.log(`✅ Authenticated: ${userId} (${role})`);

      // Join trip room
      socket.emit('join-trip', {
        rideId,
        userId,
        userRole: role as any,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setState((prev) => ({ ...prev, isConnected: false }));

      if (reason === 'io server disconnect') {
        // Server disconnected us, need to manually reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setError(err.message);
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    // ==========================================================================
    // Event Listeners
    // ==========================================================================

    // Driver location updates
    socket.on('driver:location', (data) => {
      console.log('📍 Driver location:', data);

      setState((prev) => ({
        ...prev,
        driverLocation: data,
        lastUpdate: Date.now(),
      }));

      onLocationUpdate?.(data);
    });

    // Trip status changes
    socket.on('trip:status-changed', (data) => {
      console.log('📊 Trip status:', data.status);

      setState((prev) => ({
        ...prev,
        status: data.status,
      }));

      if (showNotifications) {
        notifications.show({
          title: 'Statut de la course',
          message: getStatusMessage(data.status),
          color: getStatusColor(data.status),
        });
      }

      onStatusChange?.(data);
    });

    // Driver arrived
    socket.on('driver:arrived', (data) => {
      console.log('🚗 Driver arrived');

      if (showNotifications) {
        notifications.show({
          title: 'Conducteur arrivé',
          message: 'Le conducteur est arrivé au point de ramassage',
          color: 'green',
        });
      }

      onDriverArrived?.(data);
    });

    // Trip started
    socket.on('trip:started', (data) => {
      console.log('🚀 Trip started');

      if (showNotifications) {
        notifications.show({
          title: 'Course démarrée',
          message: 'La course a commencé',
          color: 'blue',
        });
      }

      onTripStarted?.(data);
    });

    // Trip completed
    socket.on('trip:completed', (data) => {
      console.log('🏁 Trip completed');

      if (showNotifications) {
        notifications.show({
          title: 'Course terminée',
          message: `Distance: ${(data.totalDistance / 1000).toFixed(1)} km - Prix: ${data.finalPrice.toFixed(2)} DT`,
          color: 'green',
        });
      }

      onTripCompleted?.(data);
    });

    // ETA updates
    socket.on('trip:eta-update', (data) => {
      console.log('⏱️ ETA update:', data);

      setState((prev) => ({
        ...prev,
        eta: data,
      }));
    });

    // Error handling
    socket.on('error', (data) => {
      console.error('❌ Socket error:', data.message);
      setError(data.message);

      if (showNotifications && data.code !== 'RATE_LIMIT') {
        notifications.show({
          title: 'Erreur',
          message: data.message,
          color: 'red',
        });
      }
    });
  }, [
    token,
    user,
    rideId,
    showNotifications,
    onLocationUpdate,
    onStatusChange,
    onDriverArrived,
    onTripStarted,
    onTripCompleted,
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting socket...');

      if (rideId) {
        socketRef.current.emit('leave-trip', { rideId });
      }

      socketRef.current.disconnect();
      socketRef.current = null;

      setState((prev) => ({
        ...prev,
        isConnected: false,
        driverLocation: null,
        lastUpdate: null,
      }));
    }
  }, [rideId]);

  // ==========================================================================
  // Driver Actions
  // ==========================================================================

  const sendLocationUpdate = useCallback(
    (location: Omit<DriverLocationUpdate, 'rideId' | 'driverId'>) => {
      if (!socketRef.current?.connected || !rideId || !user?.id) {
        console.warn('Cannot send location: socket not connected or missing data');
        return;
      }

      socketRef.current.emit('driver:location', {
        ...location,
        rideId,
        driverId: user.id,
      });
    },
    [rideId, user]
  );

  const markArrived = useCallback(
    (location: { lat: number; lng: number }) => {
      if (!socketRef.current?.connected || !rideId || !user?.id) {
        console.warn('Cannot mark arrived: socket not connected or missing data');
        return;
      }

      socketRef.current.emit('driver:arrived', {
        rideId,
        driverId: user.id,
        arrivedAt: new Date().toISOString(),
        location,
      });
    },
    [rideId, user]
  );

  const startTrip = useCallback(
    (pickupLocation: { lat: number; lng: number }) => {
      if (!socketRef.current?.connected || !rideId) {
        console.warn('Cannot start trip: socket not connected or missing rideId');
        return;
      }

      socketRef.current.emit('trip:started', {
        rideId,
        startedAt: new Date().toISOString(),
        pickupLocation,
      });
    },
    [rideId]
  );

  const completeTrip = useCallback(
    (data: Omit<TripCompletedData, 'rideId'>) => {
      if (!socketRef.current?.connected || !rideId) {
        console.warn('Cannot complete trip: socket not connected or missing rideId');
        return;
      }

      socketRef.current.emit('trip:completed', {
        ...data,
        rideId,
      });
    },
    [rideId]
  );

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && rideId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, rideId, connect, disconnect]);

  // Update rideId in state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      rideId: rideId || '',
    }));
  }, [rideId]);

  return {
    ...state,
    connect,
    disconnect,
    sendLocationUpdate,
    markArrived,
    startTrip,
    completeTrip,
    error,
  };
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function getStatusMessage(status: TripStatusUpdate['status']): string {
  const messages: Record<TripStatusUpdate['status'], string> = {
    PENDING: 'En attente de conducteur',
    ACCEPTED: 'Conducteur assigné',
    DRIVER_ARRIVED: 'Conducteur arrivé',
    IN_PROGRESS: 'Course en cours',
    COMPLETED: 'Course terminée',
    CANCELLED: 'Course annulée',
  };

  return messages[status] || status;
}

function getStatusColor(status: TripStatusUpdate['status']): string {
  const colors: Record<TripStatusUpdate['status'], string> = {
    PENDING: 'yellow',
    ACCEPTED: 'blue',
    DRIVER_ARRIVED: 'cyan',
    IN_PROGRESS: 'indigo',
    COMPLETED: 'green',
    CANCELLED: 'red',
  };

  return colors[status] || 'gray';
}
