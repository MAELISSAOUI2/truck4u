'use client';

import { Stack } from '@mantine/core';
import { OfferCard } from './OfferCard';

interface Offer {
  bidId: string;
  rideId: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    rating?: number;
    vehicleType?: string;
    totalRides?: number;
  };
  proposedPrice: number;
  estimatedArrival?: string;
  message?: string;
  ride?: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
  };
}

interface OfferStackedCardsProps {
  offers: Offer[];
  onAccept: (bidId: string, rideId: string) => void;
  onReject: (bidId: string, rideId: string) => void;
  isProcessing: boolean;
}

export function OfferStackedCards({ offers, onAccept, onReject, isProcessing }: OfferStackedCardsProps) {
  if (offers.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '500px',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      <Stack gap="md">
        {offers.map((offer, index) => (
          <OfferCard
            key={offer.bidId}
            {...offer}
            onAccept={onAccept}
            onReject={onReject}
            isProcessing={isProcessing}
            animationDelay={index * 100}
          />
        ))}
      </Stack>
    </div>
  );
}
