/**
 * Enhanced Pricing Service
 *
 * Integrates OSRM routing with pricing calculations
 * Supports driver-to-pickup distance for complete trip cost estimation
 */

import { getRoute, getDistance } from '../routing/osrmClient';
import type {
  Coordinate,
  PricingEstimateRequest,
  PricingEstimateResponse,
  PricingBreakdown,
} from '@/types/geolocation';

// Pricing configuration (will be fetched from database in real implementation)
interface VehiclePricing {
  pricePerKm: number;
  pricePerHour: number;
  minimumPrice: number;
}

interface PricingConfig {
  convoyeurPrice: number;
  tripSimpleCoeff: number;
  tripReturnCoeff: number;
  peakHoursCoeff: number;
  nightHoursCoeff: number;
  weekendCoeff: number;
  trafficFluidCoeff: number;
  trafficMoyenCoeff: number;
  trafficDenseCoeff: number;
  timeSlots?: {
    peakHours?: Array<{ start: string; end: string }>;
    nightHours?: Array<{ start: string; end: string }>;
  };
}

/**
 * Calculate complete pricing estimate with routing
 *
 * This function:
 * 1. Calls OSRM to get pickup → dropoff route
 * 2. Optionally calculates driver → pickup distance
 * 3. Applies 6-step pricing algorithm
 * 4. Returns route geometry + detailed pricing breakdown
 */
export async function calculatePricingEstimate(
  request: PricingEstimateRequest,
  vehiclePricing: VehiclePricing,
  config: PricingConfig
): Promise<PricingEstimateResponse> {
  const {
    pickup,
    dropoff,
    vehicleType,
    tripType,
    hasConvoyeur,
    departureTime,
    trafficLevel,
    driverLocation,
  } = request;

  // ========================================================================
  // Step 0: Get route from OSRM
  // ========================================================================
  const routeResponse = await getRoute({
    pickup,
    dropoff,
    profile: 'truck', // Use truck routing profile
    alternatives: false,
  });

  const route = routeResponse.route;
  const distanceKm = route.distance / 1000; // Convert meters to km
  const durationMinutes = route.duration / 60; // Convert seconds to minutes

  // ========================================================================
  // Step 0.5: Calculate driver-to-pickup distance if provided
  // ========================================================================
  let driverToPickup: PricingEstimateResponse['driverToPickup'] | undefined;

  if (driverLocation) {
    try {
      const driverRoute = await getDistance(driverLocation, pickup, 'truck');
      driverToPickup = {
        distance: driverRoute.distance,
        duration: driverRoute.duration,
      };
    } catch (error) {
      console.error('[Pricing] Failed to calculate driver-to-pickup distance:', error);
      // Continue without driver distance if it fails
    }
  }

  // ========================================================================
  // Step 1-6: Apply pricing algorithm
  // ========================================================================
  const breakdown: PricingBreakdown = {
    step1_base: 0,
    step2_tripType: 0,
    step3_timeSlot: 0,
    step4_traffic: 0,
    step5_convoyeur: 0,
    step6_final: 0,
  };

  // STEP 1: Base Price = (distance × pricePerKm) + (duration × pricePerHour)
  const durationHours = durationMinutes / 60;
  const basePrice = distanceKm * vehiclePricing.pricePerKm + durationHours * vehiclePricing.pricePerHour;
  breakdown.step1_base = Math.round(basePrice * 100) / 100;

  // STEP 2: Apply Trip Type Coefficient
  const tripCoeff = tripType === 'ALLER_SIMPLE' ? config.tripSimpleCoeff : config.tripReturnCoeff;
  breakdown.step2_tripType = Math.round(breakdown.step1_base * tripCoeff * 100) / 100;

  // STEP 3: Apply Time Slot Coefficients (peak hours, night, weekend)
  let timeSlotCoeff = 1.0;
  if (departureTime) {
    timeSlotCoeff = calculateTimeSlotCoefficient(departureTime, config);
  }
  breakdown.step3_timeSlot = Math.round(breakdown.step2_tripType * timeSlotCoeff * 100) / 100;

  // STEP 4: Apply Traffic Coefficient
  let trafficCoeff = 1.0;
  switch (trafficLevel) {
    case 'FLUIDE':
      trafficCoeff = config.trafficFluidCoeff;
      break;
    case 'MOYEN':
      trafficCoeff = config.trafficMoyenCoeff;
      break;
    case 'DENSE':
      trafficCoeff = config.trafficDenseCoeff;
      break;
  }
  breakdown.step4_traffic = Math.round(breakdown.step3_timeSlot * trafficCoeff * 100) / 100;

  // STEP 5: Add Convoyeur Fee
  const convoyeurFee = hasConvoyeur ? config.convoyeurPrice : 0;
  breakdown.step5_convoyeur = Math.round((breakdown.step4_traffic + convoyeurFee) * 100) / 100;

  // STEP 6: Apply Minimum Price
  let finalPrice = breakdown.step5_convoyeur;
  if (finalPrice < vehiclePricing.minimumPrice) {
    finalPrice = vehiclePricing.minimumPrice;
  }
  breakdown.step6_final = Math.round(finalPrice * 100) / 100;

  // ========================================================================
  // Return complete pricing estimate
  // ========================================================================
  return {
    route,
    driverToPickup,
    pricing: {
      basePrice: breakdown.step1_base,
      tripTypeMultiplier: tripCoeff,
      timeSlotMultiplier: timeSlotCoeff,
      trafficMultiplier: trafficCoeff,
      convoyeurFee,
      finalPrice: breakdown.step6_final,
      breakdown,
    },
  };
}

/**
 * Calculate time slot coefficient based on departure time
 * Handles peak hours, night hours, and weekends
 */
function calculateTimeSlotCoefficient(departureTime: string, config: PricingConfig): number {
  const date = new Date(departureTime);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  let coeff = 1.0;

  // Check weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    coeff *= config.weekendCoeff;
  }

  // Check peak hours and night hours (can stack)
  if (config.timeSlots) {
    // Peak hours
    if (config.timeSlots.peakHours) {
      for (const slot of config.timeSlots.peakHours) {
        if (isTimeInSlot(timeString, slot.start, slot.end)) {
          coeff *= config.peakHoursCoeff;
          break;
        }
      }
    }

    // Night hours
    if (config.timeSlots.nightHours) {
      for (const slot of config.timeSlots.nightHours) {
        if (isTimeInSlot(timeString, slot.start, slot.end)) {
          coeff *= config.nightHoursCoeff;
          break;
        }
      }
    }
  }

  return coeff;
}

/**
 * Check if time is within a time slot
 * Handles slots that cross midnight (e.g., 22:00 - 06:00)
 */
function isTimeInSlot(time: string, start: string, end: string): boolean {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // If slot doesn't cross midnight
  if (startMinutes <= endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  // If slot crosses midnight (e.g., 22:00 - 06:00)
  return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
}

/**
 * Convert time string "HH:MM" to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Fetch vehicle pricing from database
 * TODO: This should call your existing API endpoint or Prisma directly
 */
export async function getVehiclePricing(vehicleType: string): Promise<VehiclePricing> {
  // For now, return default values
  // In production, fetch from database via API call
  const defaults: Record<string, VehiclePricing> = {
    CAMIONNETTE: { pricePerKm: 2.5, pricePerHour: 15, minimumPrice: 20 },
    FOURGON: { pricePerKm: 3.0, pricePerHour: 18, minimumPrice: 25 },
    CAMION_3_5T: { pricePerKm: 3.5, pricePerHour: 20, minimumPrice: 30 },
    CAMION_LOURD: { pricePerKm: 4.5, pricePerHour: 25, minimumPrice: 40 },
  };

  return defaults[vehicleType] || defaults.CAMIONNETTE;
}

/**
 * Fetch pricing configuration from database
 * TODO: This should call your existing API endpoint or Prisma directly
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  // For now, return default values
  // In production, fetch from database via API call
  return {
    convoyeurPrice: 50.0,
    tripSimpleCoeff: 1.0,
    tripReturnCoeff: 1.6,
    peakHoursCoeff: 1.3,
    nightHoursCoeff: 1.2,
    weekendCoeff: 1.1,
    trafficFluidCoeff: 1.0,
    trafficMoyenCoeff: 1.05,
    trafficDenseCoeff: 1.15,
    timeSlots: {
      peakHours: [
        { start: '07:00', end: '09:00' },
        { start: '17:00', end: '19:00' },
      ],
      nightHours: [{ start: '22:00', end: '06:00' }],
    },
  };
}
