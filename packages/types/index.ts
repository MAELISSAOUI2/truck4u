// Shared TypeScript types for Truck4u

export type VehicleType = 'CAMIONNETTE' | 'FOURGON' | 'CAMION_3_5T' | 'CAMION_LOURD';

export type RideStatus = 
  | 'PENDING_BIDS' 
  | 'BID_ACCEPTED' 
  | 'DRIVER_ARRIVING' 
  | 'PICKUP_ARRIVED' 
  | 'LOADING' 
  | 'IN_TRANSIT' 
  | 'DROPOFF_ARRIVED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'FLOUCI';

export type UserType = 'customer' | 'driver' | 'admin';

export interface Location {
  lat: number;
  lng: number;
  address: string;
  details?: string;
  access_notes?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Ride {
  id: string;
  status: RideStatus;
  pickup: Location;
  dropoff: Location;
  vehicleType: VehicleType;
  distance: number;
  finalPrice?: number;
  createdAt: string;
}

export interface Bid {
  id: string;
  rideId: string;
  driverId: string;
  proposedPrice: number;
  estimatedArrival: number;
  message?: string;
  status: string;
  createdAt: string;
}
