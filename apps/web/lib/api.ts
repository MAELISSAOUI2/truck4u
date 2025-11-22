import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const authStore = localStorage.getItem('truck4u-auth');
      if (authStore) {
        const { token } = JSON.parse(authStore).state;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('truck4u-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: (phone: string, userType: 'customer' | 'driver') =>
    api.post('/auth/login', { phone, userType }),
  
  registerCustomer: (data: any) =>
    api.post('/auth/register/customer', data),
  
  registerDriver: (data: any) =>
    api.post('/auth/register/driver', data),
};

// Driver APIs
export const driverApi = {
  uploadDocuments: (formData: FormData) =>
    api.post('/drivers/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getVerificationStatus: () =>
    api.get('/drivers/verification-status'),
  
  updateAvailability: (isAvailable: boolean, location?: { lat: number; lng: number }) =>
    api.patch('/drivers/availability', { isAvailable, location }),
  
  getAvailableRides: () =>
    api.get('/drivers/available-rides'),
  
  getEarningsHistory: (period: string = 'month') =>
    api.get(`/drivers/earnings/history?period=${period}`),

  simulateEarnings: (params: {
    ridesPerDay: number;
    averageRidePrice: number;
    workDaysPerWeek: number;
    fuelCostPerKm?: number;
    avgDistancePerRide?: number;
    maintenanceCostPerMonth?: number;
  }) =>
    api.post('/drivers/earnings/simulate', params),

  getTierInfo: () =>
    api.get('/drivers/tier/info'),

  getSchedule: () =>
    api.get('/drivers/schedule'),

  updateSchedule: (weeklySchedule: Record<string, Array<{ start: string; end: string }>>) =>
    api.put('/drivers/schedule', { weeklySchedule }),

  getScheduleAnalytics: () =>
    api.get('/drivers/schedule/analytics'),

  getReturnLoads: (destinationLat?: number, destinationLng?: number) => {
    const params = new URLSearchParams();
    if (destinationLat !== undefined) params.append('destinationLat', destinationLat.toString());
    if (destinationLng !== undefined) params.append('destinationLng', destinationLng.toString());
    return api.get(`/drivers/return-loads${params.toString() ? '?' + params.toString() : ''}`);
  },

  updateHomeLocation: (lat: number, lng: number, address?: string) =>
    api.put('/drivers/home-location', { lat, lng, address }),
};

// Ride APIs
export const rideApi = {
  estimate: (data: any) =>
    api.post('/rides/estimate', data),
  
  create: (data: any) =>
    api.post('/rides', data),
  
  getById: (id: string) =>
    api.get(`/rides/${id}`),
  
  getBids: (id: string) =>
    api.get(`/rides/${id}/bids`),
  
  submitBid: (id: string, data: any) =>
    api.post(`/rides/${id}/bid`, data),
  
  acceptBid: (id: string, bidId: string) =>
    api.post(`/rides/${id}/accept-bid`, { bidId }),

  rejectBid: (id: string, bidId: string) =>
    api.post(`/rides/${id}/reject-bid`, { bidId }),

  confirmCompletionDriver: (id: string) =>
    api.post(`/rides/${id}/confirm-completion-driver`),

  confirmCompletionCustomer: (id: string) =>
    api.post(`/rides/${id}/confirm-completion-customer`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/rides/${id}/status`, { status }),
  
  uploadProofPhoto: (id: string, type: 'loading' | 'delivery', photoUrl: string) =>
    api.post(`/rides/${id}/proof-photo/${type}`, { photoUrl }),
  
  rate: (id: string, ratings: { punctuality: number; care: number; communication: number }, review?: string) =>
    api.post(`/rides/${id}/rate`, { ...ratings, review }),

  getHistory: () =>
    api.get('/rides/history'),

  cancel: (id: string) =>
    api.post(`/rides/${id}/cancel`),

  getNewBids: () =>
    api.get('/rides/new-bids'),
};

// Payment APIs
export const paymentApi = {
  initiate: (rideId: string, method: 'CASH' | 'CARD' | 'FLOUCI') =>
    api.post('/payments/initiate', { rideId, method }),
  
  confirmCash: (paymentId: string) =>
    api.post(`/payments/${paymentId}/confirm-cash`),
  
  getStatus: (rideId: string) =>
    api.get(`/payments/${rideId}`),
};

// Subscription APIs
export const subscriptionApi = {
  getPlans: () =>
    api.get('/subscriptions/plans'),
  
  subscribe: (planType: string) =>
    api.post('/subscriptions/subscribe', { planType }),
  
  getCurrent: () =>
    api.get('/subscriptions/current'),
  
  getInvoice: (month: string) =>
    api.get(`/subscriptions/invoice/${month}`),
};

// Customer APIs
export const customerApi = {
  getProfile: () =>
    api.get('/customers/profile'),
  
  updateProfile: (data: any) =>
    api.patch('/customers/profile', data),
};

export default api;