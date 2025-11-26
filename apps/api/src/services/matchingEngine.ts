import { prisma } from '@truck4u/database';

// ==================== TYPES ====================

interface DriverScore {
  driverId: string;
  score: number;
  breakdown: {
    distance: number;
    availability: number;
    rating: number;
    experience: number;
    relationship: number;
  };
  driver: any;
}

interface MatchingResult {
  success: boolean;
  driverId?: string;
  round?: 1 | 2;
  reason?: string;
}

// ==================== CONSTANTS ====================

const MATCHING_CONFIG = {
  // Round 1: Regulars only
  ROUND1: {
    DURATION: 60000, // 60 seconds
    MIN_DELIVERIES_FOR_REGULAR: 2
  },
  // Round 2: All eligible drivers
  ROUND2: {
    DURATION: 90000 // 90 seconds
  },
  // Scoring weights
  WEIGHTS: {
    DISTANCE: 0.25,      // 25%
    AVAILABILITY: 0.20,  // 20%
    RATING: 0.15,        // 15%
    EXPERIENCE: 0.05,    // 5%
    RELATIONSHIP: 0.35   // 35% (highest weight)
  },
  // Distance thresholds
  MAX_DISTANCE_KM: 50,
  IDEAL_DISTANCE_KM: 5
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if driver is a regular for this business
 */
async function isRegularDriver(driverId: string, businessId: string): Promise<boolean> {
  // Check if driver is in favorites
  const isFavorite = await prisma.businessFavoriteDriver.findUnique({
    where: {
      businessId_driverId: {
        businessId,
        driverId
      }
    }
  });

  if (isFavorite) return true;

  // Check if driver has 2+ completed deliveries
  const relation = await prisma.driverBusinessRelation.findUnique({
    where: {
      driverId_businessId: {
        driverId,
        businessId
      }
    }
  });

  return relation ? relation.completedDeliveries >= MATCHING_CONFIG.ROUND1.MIN_DELIVERIES_FOR_REGULAR : false;
}

/**
 * Calculate relationship score for a driver
 */
async function calculateRelationshipScore(
  driverId: string,
  businessId: string
): Promise<number> {
  // Check if favorite
  const isFavorite = await prisma.businessFavoriteDriver.findUnique({
    where: {
      businessId_driverId: {
        businessId,
        driverId
      }
    }
  });

  // Get relationship data
  const relation = await prisma.driverBusinessRelation.findUnique({
    where: {
      driverId_businessId: {
        driverId,
        businessId
      }
    }
  });

  let score = 0;

  // Favorite = 50 points
  if (isFavorite) {
    score += 50;
  }

  // Completed deliveries (max 30 points)
  if (relation) {
    const deliveryScore = Math.min(relation.completedDeliveries * 3, 30);
    score += deliveryScore;
  }

  // Average rating from this business (max 20 points)
  if (relation && relation.averageRating) {
    score += (relation.averageRating / 5) * 20;
  }

  return Math.min(score, 100);
}

/**
 * Calculate score for a driver
 */
async function calculateDriverScore(
  driver: any,
  order: any,
  businessId: string
): Promise<DriverScore> {
  const breakdown = {
    distance: 0,
    availability: 0,
    rating: 0,
    experience: 0,
    relationship: 0
  };

  // 1. Distance score (25%)
  const pickupCoords = order.pickupCoordinates as { lat: number; lng: number };
  if (driver.currentLat && driver.currentLng && pickupCoords) {
    const distance = calculateDistance(
      driver.currentLat,
      driver.currentLng,
      pickupCoords.lat,
      pickupCoords.lng
    );

    // Closer is better
    if (distance <= MATCHING_CONFIG.IDEAL_DISTANCE_KM) {
      breakdown.distance = 100;
    } else if (distance <= MATCHING_CONFIG.MAX_DISTANCE_KM) {
      breakdown.distance = 100 - ((distance - MATCHING_CONFIG.IDEAL_DISTANCE_KM) /
        (MATCHING_CONFIG.MAX_DISTANCE_KM - MATCHING_CONFIG.IDEAL_DISTANCE_KM)) * 100;
    } else {
      breakdown.distance = 0;
    }
  }

  // 2. Availability score (20%)
  breakdown.availability = driver.isAvailable ? 100 : 0;

  // 3. Rating score (15%)
  breakdown.rating = (driver.rating / 5) * 100;

  // 4. Experience score (5%)
  const completionRate = driver.totalDeliveries > 0
    ? (driver.completedDeliveries / driver.totalDeliveries) * 100
    : 0;
  breakdown.experience = Math.min(
    (driver.completedB2BDeliveries / 50) * 50 + completionRate * 0.5,
    100
  );

  // 5. Relationship score (35%) - highest weight
  breakdown.relationship = await calculateRelationshipScore(driver.id, businessId);

  // Calculate weighted total score
  const totalScore =
    breakdown.distance * MATCHING_CONFIG.WEIGHTS.DISTANCE +
    breakdown.availability * MATCHING_CONFIG.WEIGHTS.AVAILABILITY +
    breakdown.rating * MATCHING_CONFIG.WEIGHTS.RATING +
    breakdown.experience * MATCHING_CONFIG.WEIGHTS.EXPERIENCE +
    breakdown.relationship * MATCHING_CONFIG.WEIGHTS.RELATIONSHIP;

  return {
    driverId: driver.id,
    score: totalScore,
    breakdown,
    driver
  };
}

/**
 * Filter eligible drivers for an order
 */
async function filterEligibleDrivers(order: any, regularsOnly: boolean = false): Promise<any[]> {
  const business = await prisma.business.findUnique({
    where: { id: order.businessId }
  });

  if (!business) {
    throw new Error('Business not found');
  }

  // Determine required driver level based on Trust Level
  const requiredLevel = business.trustLevel === 'STARTER' ? 2 :
                        business.trustLevel === 'VERIFIED' ? 2 :
                        1; // PRO and ENTERPRISE

  // Build where clause
  const where: any = {
    verificationStatus: 'APPROVED',
    isAvailable: true,
    b2bLevel: { gte: requiredLevel }
  };

  // Check b2bPreferences for acceptsB2B and COD
  const allDrivers = await prisma.driver.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      currentLat: true,
      currentLng: true,
      rating: true,
      totalDeliveries: true,
      completedDeliveries: true,
      totalB2BDeliveries: true,
      completedB2BDeliveries: true,
      b2bLevel: true,
      b2bPreferences: true,
      isAvailable: true
    }
  });

  // Filter based on preferences
  let eligibleDrivers = allDrivers.filter(driver => {
    const prefs = driver.b2bPreferences as any;
    if (!prefs) return true; // No preferences set = accepts all

    // Check if accepts B2B
    if (prefs.acceptsB2B === false) return false;

    // Check if accepts COD (if order has COD)
    if (order.hasCOD && prefs.acceptsCOD === false) return false;

    // Check max COD amount
    if (order.hasCOD && prefs.maxCODAmount && order.codAmount > prefs.maxCODAmount) {
      return false;
    }

    return true;
  });

  // Filter regulars if round 1
  if (regularsOnly) {
    const regularDrivers: any[] = [];
    for (const driver of eligibleDrivers) {
      const isRegular = await isRegularDriver(driver.id, order.businessId);
      if (isRegular) {
        regularDrivers.push(driver);
      }
    }
    return regularDrivers;
  }

  return eligibleDrivers;
}

// ==================== MAIN MATCHING FUNCTION ====================

/**
 * Match an order with a driver using 2-round algorithm
 */
export async function matchOrder(orderId: string): Promise<MatchingResult> {
  const order = await prisma.businessOrder.findUnique({
    where: { id: orderId },
    include: {
      business: true
    }
  });

  if (!order) {
    return { success: false, reason: 'Order not found' };
  }

  if (order.status !== 'SEARCHING_DRIVER') {
    return { success: false, reason: 'Order is not in SEARCHING_DRIVER status' };
  }

  console.log(`[Matching Engine] Starting match for order ${order.orderNumber}`);

  // ==================== ROUND 1: REGULARS ONLY ====================
  console.log('[Matching Engine] Round 1: Searching among regular drivers...');

  await prisma.businessOrder.update({
    where: { id: orderId },
    data: { matchingRound: 1 }
  });

  const regularDrivers = await filterEligibleDrivers(order, true);
  console.log(`[Matching Engine] Found ${regularDrivers.length} regular drivers`);

  if (regularDrivers.length > 0) {
    // Score all regular drivers
    const scoredRegulars: DriverScore[] = [];
    for (const driver of regularDrivers) {
      const score = await calculateDriverScore(driver, order, order.businessId);
      scoredRegulars.push(score);
    }

    // Sort by score descending
    scoredRegulars.sort((a, b) => b.score - a.score);

    // TODO: Send offers to top 5 drivers
    // For now, auto-assign to best driver
    const bestDriver = scoredRegulars[0];
    console.log(`[Matching Engine] Round 1 - Best driver: ${bestDriver.driver.firstName} (score: ${bestDriver.score.toFixed(2)})`);

    // Assign driver
    await prisma.businessOrder.update({
      where: { id: orderId },
      data: {
        driverId: bestDriver.driverId,
        matchingStatus: 'MATCHED',
        status: 'DRIVER_ASSIGNED',
        assignedAt: new Date()
      }
    });

    // Create status history
    await prisma.businessOrderStatusHistory.create({
      data: {
        orderId,
        status: 'DRIVER_ASSIGNED',
        timestamp: new Date(),
        notes: `Matched in Round 1 (regular) - Score: ${bestDriver.score.toFixed(2)}`
      }
    });

    console.log(`[Matching Engine] Order ${order.orderNumber} assigned to driver ${bestDriver.driverId}`);

    return {
      success: true,
      driverId: bestDriver.driverId,
      round: 1
    };
  }

  // ==================== ROUND 2: ALL ELIGIBLE DRIVERS ====================
  console.log('[Matching Engine] Round 1 failed. Starting Round 2: All eligible drivers...');

  await prisma.businessOrder.update({
    where: { id: orderId },
    data: { matchingRound: 2 }
  });

  // Wait 60 seconds before round 2 (simulated - in production use setTimeout)
  // await new Promise(resolve => setTimeout(resolve, MATCHING_CONFIG.ROUND1.DURATION));

  const allDrivers = await filterEligibleDrivers(order, false);
  console.log(`[Matching Engine] Found ${allDrivers.length} eligible drivers`);

  if (allDrivers.length === 0) {
    // No drivers available
    await prisma.businessOrder.update({
      where: { id: orderId },
      data: {
        matchingStatus: 'NO_DRIVER',
        status: 'FAILED'
      }
    });

    await prisma.businessOrderStatusHistory.create({
      data: {
        orderId,
        status: 'FAILED',
        timestamp: new Date(),
        notes: 'No eligible drivers found'
      }
    });

    console.log(`[Matching Engine] Order ${order.orderNumber} failed - no drivers available`);

    return {
      success: false,
      reason: 'No eligible drivers found'
    };
  }

  // Score all drivers
  const scoredDrivers: DriverScore[] = [];
  for (const driver of allDrivers) {
    const score = await calculateDriverScore(driver, order, order.businessId);
    scoredDrivers.push(score);
  }

  // Sort by score descending
  scoredDrivers.sort((a, b) => b.score - a.score);

  // TODO: Send offers to top 10 drivers
  // For now, auto-assign to best driver
  const bestDriver = scoredDrivers[0];
  console.log(`[Matching Engine] Round 2 - Best driver: ${bestDriver.driver.firstName} (score: ${bestDriver.score.toFixed(2)})`);

  // Assign driver
  await prisma.businessOrder.update({
    where: { id: orderId },
    data: {
      driverId: bestDriver.driverId,
      matchingStatus: 'MATCHED',
      status: 'DRIVER_ASSIGNED',
      assignedAt: new Date()
    }
  });

  // Create status history
  await prisma.businessOrderStatusHistory.create({
    data: {
      orderId,
      status: 'DRIVER_ASSIGNED',
      timestamp: new Date(),
      notes: `Matched in Round 2 (all eligible) - Score: ${bestDriver.score.toFixed(2)}`
    }
  });

  console.log(`[Matching Engine] Order ${order.orderNumber} assigned to driver ${bestDriver.driverId}`);

  return {
    success: true,
    driverId: bestDriver.driverId,
    round: 2
  };
}

/**
 * Cancel matching for an order
 */
export async function cancelMatching(orderId: string): Promise<void> {
  await prisma.businessOrder.update({
    where: { id: orderId },
    data: {
      matchingStatus: 'TIMEOUT',
      status: 'CANCELLED'
    }
  });

  console.log(`[Matching Engine] Matching cancelled for order ${orderId}`);
}
