const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * @returns distance in nautical miles
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate minimum distance from a point to a line segment on the globe.
 * Uses flat-earth approximation (adequate for distances < 200nm).
 * @returns distance in nautical miles
 */
export function pointToSegmentDistance(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  // Convert to flat coords (nm) centered on segment midpoint
  const cosLat = Math.cos(((aLat + bLat) / 2) * DEG_TO_RAD);
  const ax = 0, ay = 0;
  const bx = (bLon - aLon) * cosLat * 60;
  const by = (bLat - aLat) * 60;
  const px = (pLon - aLon) * cosLat * 60;
  const py = (pLat - aLat) * 60;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineDistance(pLat, pLon, aLat, aLon);
  }

  // Project point onto segment, clamped to [0, 1]
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * dx;
  const closestY = ay + t * dy;

  const distX = px - closestX;
  const distY = py - closestY;
  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Calculate initial bearing (forward azimuth) between two points.
 * This is the bearing you would initially follow when traveling from point 1 to point 2.
 * @param lat1 - Starting latitude in degrees
 * @param lon1 - Starting longitude in degrees
 * @param lat2 - Ending latitude in degrees
 * @param lon2 - Ending longitude in degrees
 * @returns Bearing in degrees (0-360), where 0° is North, 90° is East, etc.
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}
