'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Star, Truck } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating?: number;
  vehicleType?: string;
  totalRides?: number;
}

interface OfferNotificationCardProps {
  id: string;
  rideId: string;
  driver: Driver;
  proposedPrice: number;
  estimatedArrival?: string;
  message?: string;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  ride?: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
  };
  onAccept: (bidId: string, rideId: string) => void;
  onReject: (bidId: string, rideId: string) => void;
}

export function OfferNotificationCard({
  id,
  rideId,
  driver,
  proposedPrice,
  estimatedArrival,
  message,
  status,
  ride,
  onAccept,
  onReject,
}: OfferNotificationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(id, rideId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(id, rideId);
    } finally {
      setIsProcessing(false);
    }
  };

  const isActionable = status === 'ACTIVE';

  return (
    <div className={`rounded-lg border p-4 mb-3 transition-all ${
      status === 'ACCEPTED' ? 'bg-green-50 border-green-200' :
      status === 'REJECTED' ? 'bg-red-50 border-red-200' :
      status === 'EXPIRED' ? 'bg-gray-50 border-gray-200' :
      'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Driver Info */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{driver.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {driver.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{driver.rating.toFixed(1)}</span>
                  </div>
                )}
                {driver.totalRides && (
                  <span>• {driver.totalRides} courses</span>
                )}
                {driver.vehicleType && (
                  <span>• {driver.vehicleType}</span>
                )}
              </div>
            </div>
          </div>

          {/* Ride Details */}
          {ride && (
            <div className="bg-gray-50 rounded p-3 mb-3 text-sm">
              <div className="flex gap-2 mb-1">
                <span className="text-gray-600">De:</span>
                <span className="text-gray-900 font-medium">{ride.pickupAddress}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-600">À:</span>
                <span className="text-gray-900 font-medium">{ride.dropoffAddress}</span>
              </div>
            </div>
          )}

          {/* Offer Details */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-sm text-gray-600">Prix proposé</p>
              <p className="text-xl font-bold text-orange-600">{proposedPrice} MAD</p>
            </div>
            {estimatedArrival && (
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Arrivée estimée
                </p>
                <p className="text-sm font-semibold text-gray-900">{estimatedArrival}</p>
              </div>
            )}
          </div>

          {/* Driver Message */}
          {message && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
              <p className="text-sm text-gray-700 italic">"{message}"</p>
            </div>
          )}

          {/* Status Badge */}
          {!isActionable && (
            <div className="mb-3">
              {status === 'ACCEPTED' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Acceptée
                </span>
              )}
              {status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  Rejetée
                </span>
              )}
              {status === 'EXPIRED' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Expirée
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isActionable && (
        <div className="flex gap-3 mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {isProcessing ? 'Traitement...' : 'Accepter'}
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            {isProcessing ? 'Traitement...' : 'Rejeter'}
          </button>
        </div>
      )}
    </div>
  );
}
