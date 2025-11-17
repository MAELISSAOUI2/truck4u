'use client';

import { useState, useEffect } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import { useNotificationStore } from '@/lib/store';
import { OfferNotificationCard } from './OfferNotificationCard';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, updateNotificationStatus, markAllAsRead } = useNotificationStore();
  const { token } = useAuthStore();
  const [isAccepting, setIsAccepting] = useState(false);

  // Mark all as read when panel opens
  useEffect(() => {
    if (isOpen) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead]);

  const handleAccept = async (bidId: string, rideId: string) => {
    if (!token) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsAccepting(true);
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

      toast.success('Offre acceptée avec succès!', {
        duration: 4000,
        icon: '✅',
      });

      // Close panel after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      toast.error(error.message || 'Erreur lors de l\'acceptation de l\'offre');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async (bidId: string, rideId: string) => {
    if (!token) {
      toast.error('Vous devez être connecté');
      return;
    }

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

      toast.success('Offre rejetée', {
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Error rejecting bid:', error);
      toast.error('Erreur lors du rejet de l\'offre');
    }
  };

  if (!isOpen) return null;

  const activeNotifications = notifications.filter(n => n.status === 'ACTIVE');
  const pastNotifications = notifications.filter(n => n.status !== 'ACTIVE');

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Offres reçues</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {activeNotifications.length > 0
              ? `${activeNotifications.length} offre${activeNotifications.length > 1 ? 's' : ''} en attente`
              : 'Aucune offre en attente'
            }
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BellOff className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune notification
              </h3>
              <p className="text-gray-600">
                Vous recevrez des notifications quand les chauffeurs feront des offres
              </p>
            </div>
          ) : (
            <>
              {/* Active Notifications */}
              {activeNotifications.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Nouvelles offres
                  </h3>
                  {activeNotifications.map((notification) => (
                    <OfferNotificationCard
                      key={notification.id}
                      {...notification}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}

              {/* Past Notifications */}
              {pastNotifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Historique
                  </h3>
                  {pastNotifications.map((notification) => (
                    <OfferNotificationCard
                      key={notification.id}
                      {...notification}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
