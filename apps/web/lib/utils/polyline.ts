/**
 * Polyline decoder for Google's Encoded Polyline Algorithm Format
 * Supports both polyline5 and polyline6 precision
 *
 * Based on: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/**
 * Decode an encoded polyline string
 *
 * @param str - Encoded polyline string
 * @param precision - Precision (5 for polyline5, 6 for polyline6)
 * @returns Array of [latitude, longitude] pairs
 */
export function decode(str: string, precision: number = 5): Array<[number, number]> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<[number, number]> = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/**
 * Encode coordinates to polyline string
 *
 * @param coordinates - Array of [latitude, longitude] pairs
 * @param precision - Precision (5 for polyline5, 6 for polyline6)
 * @returns Encoded polyline string
 */
export function encode(coordinates: Array<[number, number]>, precision: number = 5): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  const factor = Math.pow(10, precision);
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    const latE5 = Math.round(lat * factor);
    const lngE5 = Math.round(lng * factor);

    output += encodeSignedNumber(latE5 - prevLat);
    output += encodeSignedNumber(lngE5 - prevLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return output;
}

/**
 * Encode a signed number to polyline format
 */
function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~sgnNum;
  }

  return encodeUnsignedNumber(sgnNum);
}

/**
 * Encode an unsigned number to polyline format
 */
function encodeUnsignedNumber(num: number): string {
  let output = '';

  while (num >= 0x20) {
    output += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }

  output += String.fromCharCode(num + 63);
  return output;
}
