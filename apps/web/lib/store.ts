import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  phone: string;
  userType: 'customer' | 'driver';
  email?: string;
  // Driver-specific fields
  rating?: number;
  totalRides?: number;
  vehicleType?: string;
  vehiclePlate?: string;
  acceptanceRate?: number;
  verificationStatus?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'truck4u-auth',
    }
  )
);

interface Ride {
  id: string;
  status: string;
  pickup: any;
  dropoff: any;
  finalPrice?: number;
  driver?: any;
}

interface RideState {
  currentRide: Ride | null;
  rides: Ride[];
  setCurrentRide: (ride: Ride | null) => void;
  addRide: (ride: Ride) => void;
  updateRideStatus: (rideId: string, status: string) => void;
}

export const useRideStore = create<RideState>((set) => ({
  currentRide: null,
  rides: [],
  setCurrentRide: (ride) => set({ currentRide: ride }),
  addRide: (ride) => set((state) => ({ rides: [ride, ...state.rides] })),
  updateRideStatus: (rideId, status) =>
    set((state) => ({
      rides: state.rides.map((r) =>
        r.id === rideId ? { ...r, status } : r
      ),
      currentRide:
        state.currentRide?.id === rideId
          ? { ...state.currentRide, status }
          : state.currentRide,
    })),
}));

interface LocationState {
  currentLocation: { lat: number; lng: number } | null;
  setCurrentLocation: (location: { lat: number; lng: number }) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  setCurrentLocation: (location) => set({ currentLocation: location }),
}));

interface DriverState {
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set) => ({
      isOnline: false,
      setIsOnline: (isOnline) => set({ isOnline }),
    }),
    {
      name: 'truck4u-driver',
    }
  )
);

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating?: number;
  vehicleType?: string;
  totalRides?: number;
}

interface OfferNotification {
  id: string;
  rideId: string;
  driver: Driver;
  proposedPrice: number;
  estimatedArrival?: string;
  message?: string;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  ride?: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
  };
}

interface NotificationState {
  notifications: OfferNotification[];
  unreadCount: number;
  addNotification: (notification: OfferNotification) => void;
  removeNotification: (notificationId: string) => void;
  updateNotificationStatus: (notificationId: string, status: 'ACCEPTED' | 'REJECTED') => void;
  clearNotifications: () => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  updateNotificationStatus: (notificationId, status) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, status } : n
      ),
    })),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  markAllAsRead: () => set({ unreadCount: 0 }),
}));
