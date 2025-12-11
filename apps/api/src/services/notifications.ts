import { Server } from 'socket.io';
import { prisma } from '@truck4u/database';

// Haversine formula to calculate distance between two coordinates (in km)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate ETA based on distance (simple approximation)
// Assumes average speed of 40 km/h in urban areas
const calculateETA = (distanceKm: number): number => {
  const avgSpeedKmh = 40;
  const hours = distanceKm / avgSpeedKmh;
  return Math.round(hours * 60); // Convert to minutes
};

interface LocationData {
  rideId: string;
  driverId: string;
  lat: number;
  lng: number;
  timestamp?: number;
}

interface NotificationThresholds {
  approaching: number; // Distance in km to trigger "approaching" notification
  arrived: number;     // Distance in km to consider "arrived"
  etaMinutes: number;  // ETA in minutes to trigger notification
}

// Thresholds for different notification types
const THRESHOLDS: NotificationThresholds = {
  approaching: 2.5,   // 2.5 km = ~10 min at 40 km/h average
  arrived: 0.1,       // 100 meters
  etaMinutes: 10,     // Notify when ETA is 10 minutes
};

// Track last notification sent for each ride to avoid spam
const lastNotifications = new Map<string, {
  driverArrivingNotified: boolean;
  driverArrivedAtPickup: boolean;
  deliveryApproachingNotified: boolean;
  deliveryArrivedNotified: boolean;
}>();

export class NotificationService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Process driver location update and send relevant notifications
   */
  async processLocationUpdate(locationData: LocationData): Promise<void> {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: locationData.rideId },
        include: {
          customer: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      });

      if (!ride || !ride.customer || !ride.driver) return;

      const driverLocation = { lat: locationData.lat, lng: locationData.lng };
      const pickup = ride.pickup as any;
      const dropoff = ride.dropoff as any;

      // Initialize notification tracking for this ride if not exists
      if (!lastNotifications.has(ride.id)) {
        lastNotifications.set(ride.id, {
          driverArrivingNotified: false,
          driverArrivedAtPickup: false,
          deliveryApproachingNotified: false,
          deliveryArrivedNotified: false,
        });
      }

      const notifState = lastNotifications.get(ride.id)!;

      // Handle notifications based on ride status
      switch (ride.status) {
        case 'DRIVER_ARRIVING':
          await this.handleDriverArrivingNotifications(
            ride,
            driverLocation,
            pickup,
            notifState
          );
          break;

        case 'IN_TRANSIT':
          await this.handleInTransitNotifications(
            ride,
            driverLocation,
            dropoff,
            notifState
          );
          break;
      }
    } catch (error) {
      console.error('Error processing location update:', error);
    }
  }

  /**
   * Handle notifications when driver is on the way to pickup
   */
  private async handleDriverArrivingNotifications(
    ride: any,
    driverLocation: { lat: number; lng: number },
    pickup: { lat: number; lng: number; address: string },
    notifState: any
  ): Promise<void> {
    const distanceToPickup = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      pickup.lat,
      pickup.lng
    );

    const eta = calculateETA(distanceToPickup);

    // Notification: Driver is approaching (within 10 minutes)
    if (eta <= THRESHOLDS.etaMinutes && !notifState.driverArrivingNotified) {
      await this.sendNotification(
        ride.customerId,
        'customer',
        {
          type: 'driver_approaching',
          title: 'Conducteur en route',
          message: `${ride.driver.name} arrive dans environ ${eta} minutes`,
          rideId: ride.id,
          eta,
          icon: '🚚',
        }
      );
      notifState.driverArrivingNotified = true;
    }

    // Notification: Driver has arrived at pickup
    if (distanceToPickup <= THRESHOLDS.arrived && !notifState.driverArrivedAtPickup) {
      await this.sendNotification(
        ride.customerId,
        'customer',
        {
          type: 'driver_arrived_pickup',
          title: 'Conducteur arrivé',
          message: `${ride.driver.name} est arrivé au point de départ`,
          rideId: ride.id,
          icon: '📍',
        }
      );
      notifState.driverArrivedAtPickup = true;
    }
  }

  /**
   * Handle notifications during transit to dropoff
   */
  private async handleInTransitNotifications(
    ride: any,
    driverLocation: { lat: number; lng: number },
    dropoff: { lat: number; lng: number; address: string },
    notifState: any
  ): Promise<void> {
    const distanceToDropoff = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      dropoff.lat,
      dropoff.lng
    );

    const eta = calculateETA(distanceToDropoff);

    // Notification: Delivery approaching (within 10 minutes)
    if (eta <= THRESHOLDS.etaMinutes && !notifState.deliveryApproachingNotified) {
      await this.sendNotification(
        ride.customerId,
        'customer',
        {
          type: 'delivery_approaching',
          title: 'Livraison proche',
          message: `Votre livraison arrive dans environ ${eta} minutes`,
          rideId: ride.id,
          eta,
          icon: '📦',
        }
      );
      notifState.deliveryApproachingNotified = true;
    }

    // Notification: Arrived at dropoff
    if (distanceToDropoff <= THRESHOLDS.arrived && !notifState.deliveryArrivedNotified) {
      await this.sendNotification(
        ride.customerId,
        'customer',
        {
          type: 'delivery_arrived',
          title: 'Livraison arrivée',
          message: 'Votre marchandise est arrivée à destination',
          rideId: ride.id,
          icon: '✅',
        }
      );
      notifState.deliveryArrivedNotified = true;
    }
  }

  /**
   * Send proximity-based ride alert to driver
   */
  async sendProximityRideAlert(
    driverId: string,
    newRide: any,
    driverLocation: { lat: number; lng: number }
  ): Promise<void> {
    const pickup = newRide.pickup as any;

    if (!pickup || !pickup.lat || !pickup.lng) return;

    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      pickup.lat,
      pickup.lng
    );

    // Only notify if within 10 km radius
    if (distance <= 10) {
      await this.sendNotification(
        driverId,
        'driver',
        {
          type: 'new_ride_nearby',
          title: 'Nouvelle course à proximité',
          message: `Nouvelle demande à ${Math.round(distance)} km de vous`,
          rideId: newRide.id,
          distance: Math.round(distance * 10) / 10,
          estimatedPrice: newRide.estimatedMaxPrice,
          icon: '🎯',
        }
      );
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(
    ride: any,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const statusMessages: Record<string, { customer: string; driver: string }> = {
      PICKUP_ARRIVED: {
        customer: 'Le conducteur est arrivé au point de départ',
        driver: 'Vous êtes arrivé au point de départ',
      },
      LOADING: {
        customer: 'Le chargement de votre marchandise a commencé',
        driver: 'Chargement en cours',
      },
      IN_TRANSIT: {
        customer: 'Votre marchandise est en route vers la destination',
        driver: 'Transport en cours',
      },
      DROPOFF_ARRIVED: {
        customer: 'La livraison est arrivée à destination',
        driver: 'Vous êtes arrivé à destination',
      },
      COMPLETED: {
        customer: 'Votre course est terminée',
        driver: 'Course terminée avec succès',
      },
    };

    const messages = statusMessages[newStatus];
    if (!messages) return;

    // Notify customer
    await this.sendNotification(
      ride.customerId,
      'customer',
      {
        type: 'status_changed',
        title: 'Statut mis à jour',
        message: messages.customer,
        rideId: ride.id,
        status: newStatus,
        icon: '📋',
      }
    );

    // Notify driver if assigned
    if (ride.driverId) {
      await this.sendNotification(
        ride.driverId,
        'driver',
        {
          type: 'status_changed',
          title: 'Statut mis à jour',
          message: messages.driver,
          rideId: ride.id,
          status: newStatus,
          icon: '📋',
        }
      );
    }
  }

  /**
   * Send notification to specific user via Socket.io
   */
  private async sendNotification(
    userId: string,
    userType: 'customer' | 'driver',
    notification: any
  ): Promise<void> {
    const room = `${userType}:${userId}`;

    console.log(`📢 Sending notification to ${room}:`, notification);

    this.io.to(room).emit('notification', {
      ...notification,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear notification state for a ride (called when ride is completed)
   */
  clearRideNotifications(rideId: string): void {
    lastNotifications.delete(rideId);
  }

  /**
   * Get current ETA for driver to reach destination
   */
  async getCurrentETA(
    rideId: string,
    driverLocation: { lat: number; lng: number }
  ): Promise<{ eta: number; distance: number } | null> {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        select: { status: true, pickup: true, dropoff: true },
      });

      if (!ride) return null;

      let targetLocation: any;
      if (ride.status === 'DRIVER_ARRIVING') {
        targetLocation = ride.pickup;
      } else if (ride.status === 'IN_TRANSIT') {
        targetLocation = ride.dropoff;
      } else {
        return null;
      }

      const distance = calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        targetLocation.lat,
        targetLocation.lng
      );

      const eta = calculateETA(distance);

      return { eta, distance };
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }
}

// Export singleton instance
let notificationServiceInstance: NotificationService | null = null;

export const initNotificationService = (io: Server): NotificationService => {
  notificationServiceInstance = new NotificationService(io);
  return notificationServiceInstance;
};

export const getNotificationService = (): NotificationService | null => {
  return notificationServiceInstance;
};
