import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  phone: string;
  userType: 'customer' | 'driver';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
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

interface Notification {
  id: string;
  type: 'ride_request' | 'bid_received' | 'bid_accepted' | 'ride_status' | 'payment' | 'general';
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  updateNotificationStatus: (notificationId: string, status: any) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        read: false,
      };
      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }),
  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
  updateNotificationStatus: (notificationId, status) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, data: { ...n.data, ...status } } : n
      ),
    })),
}));
