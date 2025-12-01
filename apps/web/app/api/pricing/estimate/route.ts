/**
 * API Route: POST /api/pricing/estimate
 *
 * Enhanced pricing estimation with OSRM routing integration
 * Supports driver-to-pickup distance calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculatePricingEstimate,
  getVehiclePricing,
  getPricingConfig,
} from '@/lib/services/pricing/pricingService';
import type { PricingEstimateRequest } from '@/types/geolocation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema
const PricingEstimateSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  dropoff: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  vehicleType: z.enum(['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD']),
  tripType: z.enum(['ALLER_SIMPLE', 'ALLER_RETOUR']),
  hasConvoyeur: z.boolean(),
  departureTime: z.string().optional(), // ISO 8601 string
  trafficLevel: z.enum(['FLUIDE', 'MOYEN', 'DENSE']),
  driverLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(), // Optional: for calculating driver-to-pickup distance
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validated = PricingEstimateSchema.parse(body);

    // Fetch pricing configuration from database
    const vehiclePricing = await getVehiclePricing(validated.vehicleType);
    const pricingConfig = await getPricingConfig();

    // Calculate pricing with routing
    const estimate = await calculatePricingEstimate(
      validated as PricingEstimateRequest,
      vehiclePricing,
      pricingConfig
    );

    // Calculate total distance if driver location provided
    let totalDistance: number | undefined;
    if (estimate.driverToPickup) {
      totalDistance = estimate.driverToPickup.distance + estimate.route.distance;
    }

    return NextResponse.json({
      ...estimate,

      // Additional metadata
      metadata: {
        vehicleType: validated.vehicleType,
        tripType: validated.tripType,
        hasConvoyeur: validated.hasConvoyeur,
        trafficLevel: validated.trafficLevel,
        totalDistance, // Total: driver→pickup + pickup→dropoff (if driver location provided)
        rideDistance: estimate.route.distance, // Just pickup→dropoff
        rideDuration: estimate.route.duration,
      },
    });
  } catch (error: any) {
    console.error('[API] Pricing estimation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    if (error.message?.includes('OSRM')) {
      return NextResponse.json(
        { error: 'Routing service unavailable', message: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
