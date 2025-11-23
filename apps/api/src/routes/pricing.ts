import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const estimateSchema = z.object({
  vehicleType: z.enum(['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD']),
  distance: z.number().positive(), // en km
  duration: z.number().positive(), // en minutes
  tripType: z.enum(['ALLER_SIMPLE', 'ALLER_RETOUR']),
  hasConvoyeur: z.boolean(),
  departureTime: z.string().optional(), // ISO string
  trafficLevel: z.enum(['FLUIDE', 'MOYEN', 'DENSE']),
});

const vehiclePricingSchema = z.object({
  pricePerKm: z.number().positive(),
  pricePerHour: z.number().positive(),
  minimumPrice: z.number().positive(),
  description: z.string().optional(),
});

const pricingConfigSchema = z.object({
  convoyeurPrice: z.number().nonnegative(),
  tripSimpleCoeff: z.number().positive(),
  tripReturnCoeff: z.number().positive(),
  peakHoursCoeff: z.number().positive(),
  nightHoursCoeff: z.number().positive(),
  weekendCoeff: z.number().positive(),
  timeSlots: z.any().optional(),
  trafficFluidCoeff: z.number().positive(),
  trafficMoyenCoeff: z.number().positive(),
  trafficDenseCoeff: z.number().positive(),
});

interface TimeSlot {
  start: string; // Format "HH:MM"
  end: string;   // Format "HH:MM"
}

interface TimeSlots {
  peakHours?: TimeSlot[];
  nightHours?: TimeSlot[];
}

interface EstimateBreakdown {
  step1_basePrice: number;
  step2_afterTripType: number;
  step3_afterTimeSlot: number;
  step4_afterTraffic: number;
  step5_convoyeurFee: number;
  step6_finalPrice: number;
  appliedCoefficients: {
    tripType: number;
    timeSlot: number;
    traffic: number;
  };
  minimumPriceApplied: boolean;
}

// ============================================================================
// ALGORITHME D'ESTIMATION EN 6 ÉTAPES
// ============================================================================

/**
 * Calcule l'estimation de prix selon l'algorithme en 6 étapes
 */
async function calculatePriceEstimate(params: z.infer<typeof estimateSchema>) {
  const {
    vehicleType,
    distance,
    duration,
    tripType,
    hasConvoyeur,
    departureTime,
    trafficLevel,
  } = params;

  // Récupérer les tarifs du véhicule
  const vehiclePricing = await prisma.vehiclePricing.findUnique({
    where: { vehicleType },
  });

  if (!vehiclePricing) {
    throw new Error(`Aucun tarif configuré pour le véhicule ${vehicleType}`);
  }

  // Récupérer la configuration globale
  const config = await prisma.pricingConfig.findFirst({
    where: { configKey: 'default', isActive: true },
  });

  if (!config) {
    throw new Error('Configuration de pricing non trouvée');
  }

  const breakdown: EstimateBreakdown = {
    step1_basePrice: 0,
    step2_afterTripType: 0,
    step3_afterTimeSlot: 0,
    step4_afterTraffic: 0,
    step5_convoyeurFee: 0,
    step6_finalPrice: 0,
    appliedCoefficients: {
      tripType: 1.0,
      timeSlot: 1.0,
      traffic: 1.0,
    },
    minimumPriceApplied: false,
  };

  // ========================================================================
  // ÉTAPE 1 : Calcul du Coût de Base
  // ========================================================================
  const durationInHours = duration / 60;
  const basePrice = (distance * vehiclePricing.pricePerKm) + (durationInHours * vehiclePricing.pricePerHour);
  breakdown.step1_basePrice = Math.round(basePrice * 100) / 100;

  // ========================================================================
  // ÉTAPE 2 : Application du Facteur Type de Voyage
  // ========================================================================
  let tripCoeff = 1.0;
  if (tripType === 'ALLER_SIMPLE') {
    tripCoeff = config.tripSimpleCoeff;
  } else if (tripType === 'ALLER_RETOUR') {
    tripCoeff = config.tripReturnCoeff;
  }
  breakdown.appliedCoefficients.tripType = tripCoeff;
  breakdown.step2_afterTripType = Math.round(breakdown.step1_basePrice * tripCoeff * 100) / 100;

  // ========================================================================
  // ÉTAPE 3 : Application des Coefficients Horaires
  // ========================================================================
  let timeSlotCoeff = 1.0;

  if (departureTime) {
    const date = new Date(departureTime);
    const dayOfWeek = date.getDay(); // 0 = Dimanche, 6 = Samedi
    const timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    // Vérifier week-end
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      timeSlotCoeff *= config.weekendCoeff;
    }

    // Vérifier heures pleines et nuit (peuvent se cumuler)
    if (config.timeSlots) {
      const timeSlots = config.timeSlots as TimeSlots;

      // Heures pleines
      if (timeSlots.peakHours) {
        for (const slot of timeSlots.peakHours) {
          if (isTimeInSlot(timeString, slot.start, slot.end)) {
            timeSlotCoeff *= config.peakHoursCoeff;
            break;
          }
        }
      }

      // Heures de nuit
      if (timeSlots.nightHours) {
        for (const slot of timeSlots.nightHours) {
          if (isTimeInSlot(timeString, slot.start, slot.end)) {
            timeSlotCoeff *= config.nightHoursCoeff;
            break;
          }
        }
      }
    }
  }

  breakdown.appliedCoefficients.timeSlot = timeSlotCoeff;
  breakdown.step3_afterTimeSlot = Math.round(breakdown.step2_afterTripType * timeSlotCoeff * 100) / 100;

  // ========================================================================
  // ÉTAPE 4 : Application du Coefficient de Trafic
  // ========================================================================
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

  breakdown.appliedCoefficients.traffic = trafficCoeff;
  breakdown.step4_afterTraffic = Math.round(breakdown.step3_afterTimeSlot * trafficCoeff * 100) / 100;

  // ========================================================================
  // ÉTAPE 5 : Ajout du Prix Fixe Convoyeur
  // ========================================================================
  const convoyeurFee = hasConvoyeur ? config.convoyeurPrice : 0;
  breakdown.step5_convoyeurFee = Math.round((breakdown.step4_afterTraffic + convoyeurFee) * 100) / 100;

  // ========================================================================
  // ÉTAPE 6 : Vérification du Prix Minimum
  // ========================================================================
  let finalPrice = breakdown.step5_convoyeurFee;
  if (finalPrice < vehiclePricing.minimumPrice) {
    finalPrice = vehiclePricing.minimumPrice;
    breakdown.minimumPriceApplied = true;
  }
  breakdown.step6_finalPrice = Math.round(finalPrice * 100) / 100;

  return {
    finalPrice: breakdown.step6_finalPrice,
    breakdown,
    vehiclePricing: {
      pricePerKm: vehiclePricing.pricePerKm,
      pricePerHour: vehiclePricing.pricePerHour,
      minimumPrice: vehiclePricing.minimumPrice,
    },
  };
}

/**
 * Vérifie si une heure est dans une plage horaire
 * Gère les plages qui passent minuit (ex: 22:00 - 06:00)
 */
function isTimeInSlot(time: string, start: string, end: string): boolean {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // Si la plage ne passe pas minuit
  if (startMinutes <= endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  // Si la plage passe minuit (ex: 22:00 - 06:00)
  return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
}

/**
 * Convertit une heure "HH:MM" en minutes depuis minuit
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * POST /api/pricing/estimate
 * Calcule une estimation de prix
 */
router.post('/estimate', async (req, res) => {
  try {
    const params = estimateSchema.parse(req.body);
    const result = await calculatePriceEstimate(params);

    // Sauvegarder l'estimation dans l'historique
    const customerId = (req as any).user?.id; // Si authentifié
    await prisma.priceEstimate.create({
      data: {
        vehicleType: params.vehicleType,
        distance: params.distance,
        duration: params.duration,
        tripType: params.tripType,
        hasConvoyeur: params.hasConvoyeur,
        departureTime: params.departureTime ? new Date(params.departureTime) : null,
        trafficLevel: params.trafficLevel,
        basePrice: result.breakdown.step1_basePrice,
        afterTripType: result.breakdown.step2_afterTripType,
        afterTimeSlot: result.breakdown.step3_afterTimeSlot,
        afterTraffic: result.breakdown.step4_afterTraffic,
        convoyeurFee: result.breakdown.step5_convoyeurFee,
        finalPrice: result.breakdown.step6_finalPrice,
        breakdown: result.breakdown as any,
        customerId: customerId || null,
      },
    });

    res.json({
      success: true,
      estimate: result,
    });
  } catch (error: any) {
    console.error('Error calculating price estimate:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors du calcul de l\'estimation',
    });
  }
});

/**
 * GET /api/pricing/vehicle-configs
 * Récupère tous les tarifs de véhicules
 */
router.get('/vehicle-configs', async (req, res) => {
  try {
    const configs = await prisma.vehiclePricing.findMany({
      where: { isActive: true },
      orderBy: { vehicleType: 'asc' },
    });

    res.json({
      success: true,
      configs,
    });
  } catch (error: any) {
    console.error('Error fetching vehicle configs:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des configurations',
    });
  }
});

/**
 * GET /api/pricing/config
 * Récupère la configuration globale de pricing
 */
router.get('/config', async (req, res) => {
  try {
    const config = await prisma.pricingConfig.findFirst({
      where: { configKey: 'default', isActive: true },
    });

    if (!config) {
      return res.status(404).json({
        error: 'Configuration non trouvée',
      });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error('Error fetching pricing config:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la configuration',
    });
  }
});

/**
 * PUT /api/pricing/config (ADMIN ONLY)
 * Met à jour la configuration globale
 */
router.put('/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = pricingConfigSchema.parse(req.body);
    const adminId = (req as any).user.id;

    // Mettre à jour ou créer la config par défaut
    const config = await prisma.pricingConfig.upsert({
      where: { configKey: 'default' },
      update: {
        ...data,
        lastModifiedBy: adminId,
        updatedAt: new Date(),
      },
      create: {
        configKey: 'default',
        ...data,
        lastModifiedBy: adminId,
      },
    });

    res.json({
      success: true,
      message: 'Configuration mise à jour avec succès',
      config,
    });
  } catch (error: any) {
    console.error('Error updating pricing config:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la mise à jour de la configuration',
    });
  }
});

/**
 * PUT /api/pricing/vehicle/:type (ADMIN ONLY)
 * Met à jour les tarifs d'un type de véhicule
 */
router.put('/vehicle/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vehicleType = req.params.type as any;
    const data = vehiclePricingSchema.parse(req.body);

    // Valider que le type de véhicule existe
    const validTypes = ['CAMIONNETTE', 'FOURGON', 'CAMION_3_5T', 'CAMION_LOURD'];
    if (!validTypes.includes(vehicleType)) {
      return res.status(400).json({
        error: 'Type de véhicule invalide',
      });
    }

    const pricing = await prisma.vehiclePricing.upsert({
      where: { vehicleType },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        vehicleType,
        ...data,
      },
    });

    res.json({
      success: true,
      message: `Tarifs du véhicule ${vehicleType} mis à jour avec succès`,
      pricing,
    });
  } catch (error: any) {
    console.error('Error updating vehicle pricing:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la mise à jour des tarifs',
    });
  }
});

/**
 * POST /api/pricing/init-defaults (ADMIN ONLY)
 * Initialise les configurations par défaut
 */
router.post('/init-defaults', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user.id;

    // Créer les tarifs par défaut pour chaque véhicule
    const vehiclePricings = [
      {
        vehicleType: 'CAMIONNETTE',
        pricePerKm: 1.2,
        pricePerHour: 50.0,
        minimumPrice: 30.0,
        description: 'Idéal pour petits colis et livraisons urbaines',
      },
      {
        vehicleType: 'FOURGON',
        pricePerKm: 1.5,
        pricePerHour: 60.0,
        minimumPrice: 40.0,
        description: 'Parfait pour déménagements et livraisons moyennes',
      },
      {
        vehicleType: 'CAMION_3_5T',
        pricePerKm: 1.8,
        pricePerHour: 75.0,
        minimumPrice: 50.0,
        description: 'Pour charges importantes et déménagements complets',
      },
      {
        vehicleType: 'CAMION_LOURD',
        pricePerKm: 2.5,
        pricePerHour: 100.0,
        minimumPrice: 80.0,
        description: 'Transport de marchandises lourdes et volumineuses',
      },
    ];

    for (const pricing of vehiclePricings) {
      await prisma.vehiclePricing.upsert({
        where: { vehicleType: pricing.vehicleType as any },
        update: pricing,
        create: pricing as any,
      });
    }

    // Créer la configuration par défaut
    const defaultConfig = await prisma.pricingConfig.upsert({
      where: { configKey: 'default' },
      update: {
        convoyeurPrice: 50.0,
        tripSimpleCoeff: 1.0,
        tripReturnCoeff: 1.6,
        peakHoursCoeff: 1.3,
        nightHoursCoeff: 1.2,
        weekendCoeff: 1.1,
        timeSlots: {
          peakHours: [
            { start: '07:00', end: '09:00' },
            { start: '17:00', end: '19:00' },
          ],
          nightHours: [
            { start: '22:00', end: '06:00' },
          ],
        },
        trafficFluidCoeff: 1.0,
        trafficMoyenCoeff: 1.05,
        trafficDenseCoeff: 1.15,
        lastModifiedBy: adminId,
      },
      create: {
        configKey: 'default',
        convoyeurPrice: 50.0,
        tripSimpleCoeff: 1.0,
        tripReturnCoeff: 1.6,
        peakHoursCoeff: 1.3,
        nightHoursCoeff: 1.2,
        weekendCoeff: 1.1,
        timeSlots: {
          peakHours: [
            { start: '07:00', end: '09:00' },
            { start: '17:00', end: '19:00' },
          ],
          nightHours: [
            { start: '22:00', end: '06:00' },
          ],
        },
        trafficFluidCoeff: 1.0,
        trafficMoyenCoeff: 1.05,
        trafficDenseCoeff: 1.15,
        lastModifiedBy: adminId,
      },
    });

    res.json({
      success: true,
      message: 'Configurations par défaut initialisées avec succès',
      vehiclePricings: vehiclePricings.length,
      config: defaultConfig,
    });
  } catch (error: any) {
    console.error('Error initializing defaults:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'initialisation',
    });
  }
});

export default router;
