'use client';

import { useEffect } from 'react';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { connectSocket, onNewBid, onBidAccepted, onBidRejected, disconnectSocket } from '@/lib/socket';
import { toast } from 'react-hot-toast';

export function SocketNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useAuthStore();
  const { addNotification, updateNotificationStatus } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated || !user || !token || user.userType !== 'customer') {
      return;
    }

    console.log('Connecting socket for notifications...');
    const socket = connectSocket(user.id, 'customer', token);

    // Listen for new bids
    const unsubscribeNewBid = onNewBid((bid: any) => {
      console.log('New bid received:', bid);

      // Add to notification store
      addNotification({
        id: bid.id,
        rideId: bid.rideId,
        driver: {
          id: bid.driver.id,
          name: bid.driver.name,
          phone: bid.driver.phone,
          rating: bid.driver.rating,
          vehicleType: bid.driver.vehicleType,
          totalRides: bid.driver.totalRides,
        },
        proposedPrice: bid.proposedPrice,
        estimatedArrival: bid.estimatedArrival,
        message: bid.message,
        status: 'ACTIVE',
        createdAt: bid.createdAt,
        ride: bid.ride,
      });

      // Show toast notification
      toast.success(`Nouvelle offre de ${bid.driver.name}: ${bid.proposedPrice} MAD`, {
        duration: 5000,
        icon: '🚚',
        position: 'top-right',
      });

      // Play notification sound (optional)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle offre reçue!', {
          body: `${bid.driver.name} propose ${bid.proposedPrice} MAD`,
          icon: '/truck-icon.png',
        });
      }
    });

    // Listen for bid accepted events (for confirmation)
    const unsubscribeBidAccepted = onBidAccepted((data: any) => {
      console.log('Bid accepted:', data);
      updateNotificationStatus(data.bidId, 'ACCEPTED');
    });

    // Listen for bid rejected events
    const unsubscribeBidRejected = onBidRejected((data: any) => {
      console.log('Bid rejected:', data);
      updateNotificationStatus(data.bidId, 'REJECTED');
    });

    // Request notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket listeners...');
      unsubscribeNewBid();
      unsubscribeBidAccepted();
      unsubscribeBidRejected();
      disconnectSocket();
    };
  }, [isAuthenticated, user, token, addNotification, updateNotificationStatus]);

  return <>{children}</>;
}
