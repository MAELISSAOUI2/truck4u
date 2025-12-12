import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from './useAuthStore';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Axios instance with authentication interceptors
 * Automatically adds auth token to requests
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Auth API Methods
 */
export const authAPI = {
  login: async (phone: string, userType: 'customer' | 'driver') => {
    const { data } = await apiClient.post('/auth/login', { phone, userType });
    return data;
  },

  register: async (userData: any, userType: 'customer' | 'driver') => {
    const endpoint = `/auth/register/${userType}`;
    const { data } = await apiClient.post(endpoint, userData);
    return data;
  },

  logout: async (refreshToken?: string) => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout API error:', error);
    }
  },

  logoutAll: async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout all API error:', error);
    }
  },

  refreshToken: async (refreshToken: string) => {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken
    });
    return data;
  }
};
