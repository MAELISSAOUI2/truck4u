/**
 * Service de géocodage utilisant l'API Nominatim d'OpenStreetMap
 * Pour la Tunisie uniquement (countrycodes=tn)
 */

export interface AddressDetails {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
  suburb?: string;
  neighbourhood?: string;
}

export interface GeocodingResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: AddressDetails;
  boundingbox: string[];
}

/**
 * Recherche d'adresse avec autocomplétion
 * @param query - Texte de recherche (min 3 caractères recommandé)
 * @returns Liste de résultats géocodés
 */
export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  if (query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=5&` +
      `countrycodes=tn&` + // Limiter à la Tunisie
      `accept-language=fr`, // Préférence français
      {
        headers: {
          'User-Agent': 'Truck4u/1.0 (Transport App)', // Requis par Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const results: GeocodingResult[] = await response.json();
    return results;
  } catch (error) {
    console.error('Geocoding search error:', error);
    return [];
  }
}

/**
 * Géocodage inverse : coordonnées → adresse
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Détails de l'adresse
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${lat}&` +
      `lon=${lon}&` +
      `format=json&` +
      `addressdetails=1&` +
      `accept-language=fr`,
      {
        headers: {
          'User-Agent': 'Truck4u/1.0 (Transport App)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const result: GeocodingResult = await response.json();
    return result;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Formatte une adresse complète depuis les détails
 */
export function formatAddress(address: AddressDetails): string {
  const parts: string[] = [];

  if (address.house_number && address.road) {
    parts.push(`${address.house_number} ${address.road}`);
  } else if (address.road) {
    parts.push(address.road);
  }

  if (address.neighbourhood || address.suburb) {
    parts.push(address.neighbourhood || address.suburb!);
  }

  const city = address.city || address.town || address.village;
  if (city) {
    parts.push(city);
  }

  if (address.postcode) {
    parts.push(address.postcode);
  }

  return parts.join(', ');
}

/**
 * Extrait la ville principale de l'adresse
 */
export function extractCity(address: AddressDetails): string {
  return address.city || address.town || address.village || address.state || '';
}
