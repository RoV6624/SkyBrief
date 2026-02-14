/**
 * AI-Powered Waypoint Generator
 *
 * Automatically generates GPS waypoints between departure and destination
 * using intelligent routing algorithms.
 *
 * Strategies:
 * 1. Great Circle Route - Direct path (shortest distance)
 * 2. Victor Airways - Follow published airways when available
 * 3. Terrain Avoidance - Route around obstacles/terrain
 * 4. Weather Avoidance - Route around bad weather
 *
 * Flight Types:
 * - VFR: Uses corridor search to find real navaids (VOR/NDB/GPS fixes) along route
 * - IFR: Attempts airways routing first, falls back to corridor search
 */

import { getAirportData } from "@/services/airport-data";
import type { AirportData } from "@/lib/airport/types";
import { calculateBearing as calcBearing } from "@/lib/interpolation/haversine";
import { navaidDataService } from "@/services/navaid-data";
import { airwaysDataService } from "@/services/airways-data";
import type {
  GeneratedWaypoint,
  RouteGenerationOptions,
  NavaidData,
  WaypointType,
} from "@/lib/route/types";

/**
 * Generate waypoints between departure and destination airports
 */
export async function generateWaypoints(
  departureICAO: string,
  destinationICAO: string,
  options: RouteGenerationOptions = { strategy: "direct" }
): Promise<GeneratedWaypoint[]> {
  console.log(`[WaypointGen] Generating route: ${departureICAO} → ${destinationICAO}`);
  console.log(`[WaypointGen] Strategy: ${options.strategy}`);

  // Fetch airport data
  const [departure, destination] = await Promise.all([
    getAirportData(departureICAO),
    getAirportData(destinationICAO),
  ]);

  if (!departure || !destination) {
    console.error("[WaypointGen] Invalid departure or destination airport");
    return [];
  }

  // Calculate total distance
  const totalDistance = calculateDistance(
    departure.latitude_deg,
    departure.longitude_deg,
    destination.latitude_deg,
    destination.longitude_deg
  );

  console.log(`[WaypointGen] Total distance: ${totalDistance.toFixed(1)} nm`);

  // Select routing strategy
  switch (options.strategy) {
    case "direct":
      return generateDirectRoute(departure, destination, options);
    case "airways":
      return generateAirwaysRoute(departure, destination, options);
    case "terrain":
      return generateTerrainAvoidanceRoute(departure, destination, options);
    case "weather":
      return generateWeatherAvoidanceRoute(departure, destination, options);
    default:
      return generateDirectRoute(departure, destination, options);
  }
}

/**
 * Generate direct (great circle) route with evenly spaced waypoints
 * Supports VFR corridor search for real navaid waypoints
 * IFR flights attempt airways routing first
 */
function generateDirectRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  const flightType = options.flightType || "VFR";
  const corridorWidthNm = options.corridorWidthNm || 10;

  console.log(`[WaypointGen] Flight type: ${flightType}, Corridor width: ${corridorWidthNm}nm`);

  // IFR: Try airways routing first
  if (flightType === "IFR") {
    const airwaysRoute = generateIFRRoute(departure, destination, options);
    if (airwaysRoute.length > 0) {
      console.log("[WaypointGen] Using IFR airways routing");
      return airwaysRoute;
    }
    console.log("[WaypointGen] No airways found, falling back to VFR corridor search");
  }

  const waypoints: GeneratedWaypoint[] = [];

  // Add departure
  waypoints.push({
    identifier: departure.icao,
    latitude_deg: departure.latitude_deg,
    longitude_deg: departure.longitude_deg,
    type: "airport",
    name: departure.name,
  });

  const totalDistance = calculateDistance(
    departure.latitude_deg,
    departure.longitude_deg,
    destination.latitude_deg,
    destination.longitude_deg
  );

  // Determine number of intermediate waypoints
  const maxSegment = options.maxSegmentNm || 50;
  const numSegments = Math.ceil(totalDistance / maxSegment);

  console.log(`[WaypointGen] Creating ${numSegments} segments (${totalDistance.toFixed(1)}nm total)`);

  if (numSegments <= 1) {
    // Direct flight, no intermediate waypoints needed
    waypoints.push({
      identifier: destination.icao,
      latitude_deg: destination.latitude_deg,
      longitude_deg: destination.longitude_deg,
      type: "airport",
      name: destination.name,
    });
    console.log(`[WaypointGen] Direct flight - no intermediate waypoints`);
    return waypoints;
  }

  // Generate synthetic waypoints along great circle
  const syntheticPoints: Array<{lat: number, lon: number}> = [];
  for (let i = 1; i < numSegments; i++) {
    const fraction = i / numSegments;
    const point = interpolateGreatCircle(
      departure.latitude_deg,
      departure.longitude_deg,
      destination.latitude_deg,
      destination.longitude_deg,
      fraction
    );
    syntheticPoints.push(point);
  }

  // VFR: Try to find real navaids along corridor
  if (flightType === "VFR" || flightType === "IFR") {
    const pathPoints = [
      { lat: departure.latitude_deg, lon: departure.longitude_deg },
      ...syntheticPoints,
      { lat: destination.latitude_deg, lon: destination.longitude_deg },
    ];

    // Find navaids within corridor
    const corridorNavaids = navaidDataService.findNavaidsAlongPath(
      pathPoints,
      corridorWidthNm
    );

    console.log(`[WaypointGen] Found ${corridorNavaids.length} navaids in ${corridorWidthNm}nm corridor`);

    // For each synthetic point, try to replace with closest real navaid
    for (let i = 0; i < syntheticPoints.length; i++) {
      const synthetic = syntheticPoints[i];

      // Find closest navaid to this point
      const closest = findClosestNavaid(synthetic, corridorNavaids);

      // Use real navaid if within reasonable detour (20% of segment length)
      const detourTolerance = maxSegment * 0.2;

      if (closest && isReasonableDetour(synthetic, closest, detourTolerance)) {
        // Use real navaid
        waypoints.push({
          identifier: closest.identifier,
          latitude_deg: closest.latitude_deg,
          longitude_deg: closest.longitude_deg,
          type: mapNavaidTypeToWaypointType(closest.type),
          name: closest.name,
        });
        console.log(`[WaypointGen] Using navaid ${closest.identifier} (${closest.type})`);
      } else {
        // Fall back to synthetic waypoint
        waypoints.push({
          identifier: `WPT${String(i).padStart(2, "0")}`,
          latitude_deg: synthetic.lat,
          longitude_deg: synthetic.lon,
          type: "gps",
          name: `GPS Waypoint ${i}`,
        });
        console.log(`[WaypointGen] No suitable navaid found, using WPT${String(i).padStart(2, "0")}`);
      }
    }
  } else {
    // Non-VFR/IFR: Use synthetic waypoints
    for (let i = 0; i < syntheticPoints.length; i++) {
      waypoints.push({
        identifier: `WPT${String(i).padStart(2, "0")}`,
        latitude_deg: syntheticPoints[i].lat,
        longitude_deg: syntheticPoints[i].lon,
        type: "gps",
      });
    }
  }

  // Add destination
  waypoints.push({
    identifier: destination.icao,
    latitude_deg: destination.latitude_deg,
    longitude_deg: destination.longitude_deg,
    type: "airport",
    name: destination.name,
  });

  console.log(`[WaypointGen] Generated ${waypoints.length} waypoints`);
  return waypoints;
}

/**
 * Generate route following Victor airways
 * Uses airways database to find published IFR routes
 */
function generateAirwaysRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  console.log("[WaypointGen] Attempting airways routing");

  // Set flight type to IFR for airways routing
  const ifrOptions = { ...options, flightType: "IFR" as const };
  return generateDirectRoute(departure, destination, ifrOptions);
}

/**
 * IFR Airways Routing Algorithm
 * Attempts to find published airways between departure and destination
 */
function generateIFRRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  const searchRadiusNm = 30; // Search radius for nearby airways

  // Step 1: Find navaids near departure and destination
  const departureNavaids = navaidDataService.findNavaidsNear(
    departure.latitude_deg,
    departure.longitude_deg,
    searchRadiusNm
  );

  const destinationNavaids = navaidDataService.findNavaidsNear(
    destination.latitude_deg,
    destination.longitude_deg,
    searchRadiusNm
  );

  console.log(`[IFR Routing] Found ${departureNavaids.length} navaids near departure`);
  console.log(`[IFR Routing] Found ${destinationNavaids.length} navaids near destination`);

  // Step 2: Try to find direct airway connection between nearby navaids
  for (const depNavaid of departureNavaids) {
    for (const destNavaid of destinationNavaids) {
      const connections = airwaysDataService.findConnectingAirways(
        depNavaid.identifier,
        destNavaid.identifier
      );

      if (connections.length > 0) {
        // Found a direct airway connection!
        const connection = connections[0]; // Use shortest airway
        console.log(`[IFR Routing] Found airway ${connection.airway.id} connecting ${depNavaid.identifier} → ${destNavaid.identifier}`);

        // Build waypoint list from airway segments
        const waypoints: GeneratedWaypoint[] = [];

        // Add departure airport
        waypoints.push({
          identifier: departure.icao,
          latitude_deg: departure.latitude_deg,
          longitude_deg: departure.longitude_deg,
          type: "airport",
          name: departure.name,
        });

        // Add airway waypoints
        const segments = airwaysDataService.getAirwaySegment(
          connection.airway.id,
          connection.fromIndex,
          connection.toIndex
        );

        for (const segment of segments) {
          waypoints.push({
            identifier: segment.fix_identifier,
            latitude_deg: segment.latitude_deg,
            longitude_deg: segment.longitude_deg,
            type: "fix",
            name: `${segment.fix_identifier} (${connection.airway.id})`,
            airway: connection.airway.id,
          });
        }

        // Add destination airport
        waypoints.push({
          identifier: destination.icao,
          latitude_deg: destination.latitude_deg,
          longitude_deg: destination.longitude_deg,
          type: "airport",
          name: destination.name,
        });

        console.log(`[IFR Routing] Generated ${waypoints.length} waypoints via ${connection.airway.id}`);
        return waypoints;
      }
    }
  }

  // Step 3: No direct airways found
  console.log("[IFR Routing] No direct airways found");

  // TODO: Future enhancement - multi-airway routing with A* pathfinding
  // For now, return empty array to trigger fallback to corridor search
  return [];
}

/**
 * Generate route avoiding terrain (simplified)
 */
function generateTerrainAvoidanceRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  // For now, use direct route with higher waypoint density
  console.log("[WaypointGen] Terrain avoidance using higher waypoint density");
  return generateDirectRoute(departure, destination, {
    ...options,
    maxSegmentNm: 25, // More waypoints for terrain tracking
  });
}

/**
 * Generate route avoiding weather
 */
function generateWeatherAvoidanceRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  // For now, fall back to direct route
  // Full implementation would fetch weather radar and route around
  console.log("[WaypointGen] Weather avoidance not yet implemented, using direct route");
  return generateDirectRoute(departure, destination, options);
}

/**
 * Calculate great circle distance between two points (Haversine formula)
 * Returns distance in nautical miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate a point along a great circle route
 * @param fraction - 0 to 1, where 0 is start and 1 is end
 */
function interpolateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): { lat: number; lon: number } {
  const lat1Rad = toRadians(lat1);
  const lon1Rad = toRadians(lon1);
  const lat2Rad = toRadians(lat2);
  const lon2Rad = toRadians(lon2);

  const d = Math.acos(
    Math.sin(lat1Rad) * Math.sin(lat2Rad) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad)
  );

  const a = Math.sin((1 - fraction) * d) / Math.sin(d);
  const b = Math.sin(fraction * d) / Math.sin(d);

  const x = a * Math.cos(lat1Rad) * Math.cos(lon1Rad) + b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
  const y = a * Math.cos(lat1Rad) * Math.sin(lon1Rad) + b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
  const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return {
    lat: toDegrees(lat),
    lon: toDegrees(lon),
  };
}

// Re-export calculateBearing from haversine for backward compatibility
export { calculateBearing } from "@/lib/interpolation/haversine";

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Format waypoint for display/export
 */
export function formatWaypoint(waypoint: GeneratedWaypoint): string {
  const lat = formatCoordinate(waypoint.latitude_deg, true);
  const lon = formatCoordinate(waypoint.longitude_deg, false);
  return `${waypoint.identifier} ${lat} ${lon}`;
}

function formatCoordinate(decimal: number, isLatitude: boolean): string {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const direction = isLatitude
    ? decimal >= 0
      ? "N"
      : "S"
    : decimal >= 0
    ? "E"
    : "W";

  return `${String(degrees).padStart(isLatitude ? 2 : 3, "0")}${minutes
    .toFixed(3)
    .padStart(6, "0")}${direction}`;
}

// ──────────────────────────────────────────────────────────────────
// Helper Functions for VFR Corridor Routing
// ──────────────────────────────────────────────────────────────────

/**
 * Find the closest navaid to a given point from a list of candidates
 */
function findClosestNavaid(
  point: {lat: number, lon: number},
  candidates: NavaidData[]
): NavaidData | null {
  if (candidates.length === 0) {
    return null;
  }

  let closest = candidates[0];
  let minDistance = calculateDistance(
    point.lat,
    point.lon,
    closest.latitude_deg,
    closest.longitude_deg
  );

  for (const navaid of candidates) {
    const distance = calculateDistance(
      point.lat,
      point.lon,
      navaid.latitude_deg,
      navaid.longitude_deg
    );

    if (distance < minDistance) {
      minDistance = distance;
      closest = navaid;
    }
  }

  return closest;
}

/**
 * Check if using a navaid would result in a reasonable detour
 * @param plannedPoint - Original synthetic waypoint position
 * @param actualNavaid - Actual navaid being considered
 * @param toleranceNm - Maximum acceptable detour distance in nautical miles
 * @returns true if detour is within tolerance
 */
function isReasonableDetour(
  plannedPoint: {lat: number, lon: number},
  actualNavaid: NavaidData,
  toleranceNm: number
): boolean {
  const detour = calculateDistance(
    plannedPoint.lat,
    plannedPoint.lon,
    actualNavaid.latitude_deg,
    actualNavaid.longitude_deg
  );

  return detour <= toleranceNm;
}

/**
 * Map NavaidData type to GeneratedWaypoint type
 */
function mapNavaidTypeToWaypointType(navaidType: string): WaypointType {
  const type = navaidType.toUpperCase();

  if (type.includes("VOR")) return "vor";
  if (type.includes("NDB")) return "ndb";
  if (type === "GPS" || type === "FIX") return "fix";

  // Default to GPS for unknown types
  return "gps";
}
