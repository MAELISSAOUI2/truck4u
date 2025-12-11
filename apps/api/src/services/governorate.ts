import { prisma } from '@truck4u/database';
import axios from 'axios';

/**
 * Tunisian governorates with approximate boundaries
 * Using simplified center coordinates for matching
 */
const GOVERNORATE_DATA = [
  { name: 'Tunis', center: { lat: 36.8065, lng: 10.1815 } },
  { name: 'Ariana', center: { lat: 36.8625, lng: 10.1956 } },
  { name: 'Ben Arous', center: { lat: 36.7469, lng: 10.2178 } },
  { name: 'Manouba', center: { lat: 36.8099, lng: 10.0969 } },
  { name: 'Nabeul', center: { lat: 36.4561, lng: 10.7376 } },
  { name: 'Zaghouan', center: { lat: 36.4028, lng: 10.1433 } },
  { name: 'Bizerte', center: { lat: 37.2744, lng: 9.8739 } },
  { name: 'Béja', center: { lat: 36.7256, lng: 9.1817 } },
  { name: 'Jendouba', center: { lat: 36.5011, lng: 8.7806 } },
  { name: 'Le Kef', center: { lat: 36.1741, lng: 8.7047 } },
  { name: 'Siliana', center: { lat: 36.0850, lng: 9.3700 } },
  { name: 'Sousse', center: { lat: 35.8256, lng: 10.6369 } },
  { name: 'Monastir', center: { lat: 35.7775, lng: 10.8262 } },
  { name: 'Mahdia', center: { lat: 35.5047, lng: 11.0622 } },
  { name: 'Sfax', center: { lat: 34.7406, lng: 10.7603 } },
  { name: 'Kairouan', center: { lat: 35.6781, lng: 10.0967 } },
  { name: 'Kasserine', center: { lat: 35.1672, lng: 8.8367 } },
  { name: 'Sidi Bouzid', center: { lat: 35.0381, lng: 9.4858 } },
  { name: 'Gabès', center: { lat: 33.8815, lng: 10.0982 } },
  { name: 'Médenine', center: { lat: 33.3545, lng: 10.5055 } },
  { name: 'Tataouine', center: { lat: 32.9297, lng: 10.4517 } },
  { name: 'Gafsa', center: { lat: 34.4250, lng: 8.7842 } },
  { name: 'Tozeur', center: { lat: 33.9197, lng: 8.1338 } },
  { name: 'Kebili', center: { lat: 33.7048, lng: 8.9721 } },
];

/**
 * Calculate distance between two points using Haversine formula (in km)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determine governorate from GPS coordinates using nearest center
 */
export function getGovernorateFromCoordinates(lat: number, lng: number): string {
  let nearest = GOVERNORATE_DATA[0];
  let minDistance = calculateDistance(lat, lng, nearest.center.lat, nearest.center.lng);

  for (const gov of GOVERNORATE_DATA) {
    const distance = calculateDistance(lat, lng, gov.center.lat, gov.center.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = gov;
    }
  }

  return nearest.name;
}

/**
 * Determine governorate using reverse geocoding (more accurate but requires API call)
 */
export async function getGovernorateFromCoordinatesAccurate(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Truck4u/1.0',
        },
      }
    );

    const address = response.data.address;

    // Try to extract governorate from address
    // In Tunisia, the governorate is usually in the "state" field
    if (address.state) {
      // Normalize governorate names
      const normalized = address.state
        .replace('Gouvernorat de ', '')
        .replace('Governorate of ', '');
      return normalized;
    }

    // Fallback to nearest center method
    return getGovernorateFromCoordinates(lat, lng);
  } catch (error) {
    console.error('Error fetching governorate from Nominatim:', error);
    // Fallback to nearest center method
    return getGovernorateFromCoordinates(lat, lng);
  }
}

/**
 * Get commission rate for a specific governorate
 */
export async function getCommissionRate(governorate: string): Promise<number> {
  try {
    const commission = await prisma.governorateCommission.findUnique({
      where: {
        governorate,
        isActive: true,
      },
    });

    if (commission) {
      return commission.commissionRate;
    }

    // Default commission rate if not found
    return 0.10; // 10%
  } catch (error) {
    console.error('Error fetching commission rate:', error);
    return 0.10; // Default 10%
  }
}

/**
 * Get commission rate from ride coordinates
 */
export async function getCommissionRateFromCoordinates(
  lat: number,
  lng: number
): Promise<{ governorate: string; rate: number }> {
  const governorate = getGovernorateFromCoordinates(lat, lng);
  const rate = await getCommissionRate(governorate);

  return { governorate, rate };
}

/**
 * List all governorates with their commission rates
 */
export async function getAllGovernorateCommissions() {
  const commissions = await prisma.governorateCommission.findMany({
    where: { isActive: true },
    orderBy: { governorate: 'asc' },
  });

  // Create a map of existing commissions
  const commissionMap = new Map(
    commissions.map((c) => [c.governorate, c.commissionRate])
  );

  // Return all 24 governorates with their rates (default 10% if not set)
  return GOVERNORATE_DATA.map((gov) => ({
    governorate: gov.name,
    commissionRate: commissionMap.get(gov.name) || 0.10,
    hasCustomRate: commissionMap.has(gov.name),
  }));
}
