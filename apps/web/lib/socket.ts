import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      autoConnect: false,
      auth: {
        token
      }
    });
  }
  return socket;
};

export const connectSocket = (userId: string, userType: 'customer' | 'driver', token: string) => {
  const socket = getSocket(token);
  
  if (!socket.connected) {
    socket.connect();
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      
      if (userType === 'customer') {
        socket.emit('customer_connect', { customerId: userId });
      } else if (userType === 'driver') {
        // Driver will emit driver_online with location separately
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Customer socket events
export const trackRide = (rideId: string, customerId: string) => {
  const socket = getSocket();
  socket.emit('track_ride', { rideId, customerId });
};

export const stopTracking = (rideId: string) => {
  const socket = getSocket();
  socket.emit('stop_tracking', { rideId });
};

export const onNewBid = (callback: (bid: any) => void) => {
  const socket = getSocket();
  socket.on('new_bid', callback);
  return () => socket.off('new_bid', callback);
};

export const onDriverMoved = (callback: (location: any) => void) => {
  const socket = getSocket();
  socket.on('driver_moved', callback);
  return () => socket.off('driver_moved', callback);
};

export const onRideStatusChanged = (callback: (data: any) => void) => {
  const socket = getSocket();
  socket.on('ride_status_changed', callback);
  return () => socket.off('ride_status_changed', callback);
};

// Driver socket events
export const driverOnline = (driverId: string, location: { lat: number; lng: number }) => {
  const socket = getSocket();
  socket.emit('driver_online', { driverId, location });
};

export const driverOffline = (driverId: string) => {
  const socket = getSocket();
  socket.emit('driver_offline', { driverId });
};

export const updateDriverLocation = (data: {
  rideId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}) => {
  const socket = getSocket();
  socket.emit('driver_location_update', data);
};

export const onRideRequest = (callback: (ride: any) => void) => {
  const socket = getSocket();
  socket.on('ride_request', callback);
  return () => socket.off('ride_request', callback);
};

export const onBidAccepted = (callback: (data: any) => void) => {
  const socket = getSocket();
  socket.on('bid_accepted', callback);
  return () => socket.off('bid_accepted', callback);
};

export const onBidRejected = (callback: (data: any) => void) => {
  const socket = getSocket();
  socket.on('bid_rejected', callback);
  return () => socket.off('bid_rejected', callback);
};
