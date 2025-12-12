import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthStore } from './useAuthStore';
import { authAPI } from './authAPI';

interface AuthContextValue {
  user: ReturnType<typeof useAuthStore>['user'];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, userType: 'customer' | 'driver') => Promise<void>;
  register: (userData: any, userType: 'customer' | 'driver') => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the app and provides authentication functionality
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, setUser, setTokens, logout: clearAuth, setLoading } = useAuthStore();

  const login = async (phone: string, userType: 'customer' | 'driver') => {
    try {
      setLoading(true);
      const data = await authAPI.login(phone, userType);

      setUser(data.user);
      setTokens(data.token, data.refreshToken || '');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any, userType: 'customer' | 'driver') => {
    try {
      setLoading(true);
      const data = await authAPI.register(userData, userType);

      setUser(data.user);
      setTokens(data.token, data.refreshToken || '');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { refreshToken } = useAuthStore.getState();
      await authAPI.logout(refreshToken || undefined);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      setLoading(false);
    }
  };

  const logoutAll = async () => {
    try {
      setLoading(true);
      await authAPI.logoutAll();
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      clearAuth();
      setLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    logoutAll
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access authentication functionality from any component
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
