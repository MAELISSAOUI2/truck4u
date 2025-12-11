'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { connectSocket, onNewBid, onBidAccepted, onBidRejected, disconnectSocket } from '@/lib/socket';
import { notifications } from '@mantine/notifications';
import { IconTruck } from '@tabler/icons-react';
import { OfferStackedCards } from './OfferStackedCards';

export function SocketNotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();
  const { addNotification, updateNotificationStatus } = useNotificationStore();
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
        id: bid.bidId, // Backend sends bidId, not id
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

      // Add to active offers (stacked cards style)
      setActiveOffers((prev) => [...prev, bid]);

      // Browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle offre reçue!', {
          body: `${bid.driver.name} propose ${bid.proposedPrice} DT`,
          icon: '/icon-192x192.png',
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

  const handleAccept = async (bidId: string, rideId: string) => {
    if (!token) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté',
        color: 'red',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rides/${rideId}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bidId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Échec de l\'acceptation');
      }

      const data = await response.json();

      // Update notification status
      updateNotificationStatus(bidId, 'ACCEPTED');

      // Remove all offers for this ride from active offers
      setActiveOffers((prev) => prev.filter((offer) => offer.rideId !== rideId));

      // Reject all other offers for this ride in notification store
      activeOffers
        .filter((offer) => offer.rideId === rideId && offer.bidId !== bidId)
        .forEach((offer) => {
          updateNotificationStatus(offer.bidId, 'REJECTED');
        });

      notifications.show({
        title: 'Offre acceptée!',
        message: 'Redirection vers le paiement...',
        color: 'green',
      });

      // Redirect to payment page after short delay
      setTimeout(() => {
        router.push(`/customer/payment/${rideId}?bidId=${bidId}`);
      }, 1500);

    } catch (error: any) {
      console.error('Error accepting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'acceptation',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (bidId: string, rideId: string) => {
    if (!token) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté',
        color: 'red',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rides/${rideId}/bids/${bidId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Échec du rejet');
      }

      // Update notification status
      updateNotificationStatus(bidId, 'REJECTED');

      // Remove this offer from active offers
      setActiveOffers((prev) => prev.filter((offer) => offer.bidId !== bidId));

      notifications.show({
        title: 'Offre rejetée',
        message: 'L\'offre a été rejetée',
        color: 'orange',
      });
    } catch (error: any) {
      console.error('Error rejecting bid:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors du rejet',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {children}
      <OfferStackedCards
        offers={activeOffers}
        onAccept={handleAccept}
        onReject={handleReject}
        isProcessing={isProcessing}
      />
    </>
  );
}
