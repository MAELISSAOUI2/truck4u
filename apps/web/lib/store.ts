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
