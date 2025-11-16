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
  
  updateStatus: (id: string, status: string) =>
    api.patch(`/rides/${id}/status`, { status }),
  
  uploadProofPhoto: (id: string, type: 'loading' | 'delivery', photoUrl: string) =>
    api.post(`/rides/${id}/proof-photo/${type}`, { photoUrl }),
  
  rate: (id: string, rating: number, review?: string) =>
    api.post(`/rides/${id}/rate`, { rating, review }),

  getHistory: () =>
    api.get('/rides/history'),

  createPayment: (id: string, data: any) =>
    api.post(`/rides/${id}/payment`, data),

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