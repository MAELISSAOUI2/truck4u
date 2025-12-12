import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  userType: 'customer' | 'driver' | 'admin';
  vehicleType?: string;
  rating?: number;
  verificationStatus?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

/**
 * Shared Authentication Store
 * Uses Zustand for state management across web and mobile
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        }),

      setLoading: (isLoading) =>
        set({ isLoading })
    }),
    {
      name: 'truck4u-auth',
      // Storage will be different for web (localStorage) vs mobile (AsyncStorage)
      // Configure in platform-specific initialization
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          // Default implementation for web
          if (typeof window !== 'undefined') {
            return window.localStorage.getItem(name);
          }
          return null;
        },
        setItem: (name, value) => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(name, value);
          }
        },
        removeItem: (name) => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(name);
          }
        }
      }))
    }
  )
);
