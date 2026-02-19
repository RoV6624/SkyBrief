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
 *        with airport fallback — never generates synthetic WPT00 identifiers
 * - IFR: Dijkstra-based multi-airway pathfinding, falls back to corridor search
 */

import { getAirportData } from "@/services/airport-data";
import type { AirportData } from "@/lib/airport/types";
import { haversineDistance } from "@/lib/interpolation/haversine";
import { navaidDataService } from "@/services/navaid-data";
import { airwaysDataService } from "@/services/airways-data";
import { findNearbyStations } from "@/lib/route/nearby-stations";
import type {
  GeneratedWaypoint,
  RouteGenerationOptions,
  NavaidData,
  WaypointType,
} from "@/lib/route/types";

// Airway transition penalty (nm equivalent) to discourage excessive airway changes
const AIRWAY_TRANSITION_PENALTY = 20;

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
  const totalDistance = haversineDistance(
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
 * VFR: Corridor search with navaid preference scoring + airport fallback
 * IFR: Dijkstra multi-airway pathfinding, falls back to corridor search
 */
function generateDirectRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  const flightType = options.flightType || "VFR";
  const corridorWidthNm = options.corridorWidthNm || 30;

  console.log(`[WaypointGen] Flight type: ${flightType}, Corridor width: ${corridorWidthNm}nm`);

  // IFR: Try Dijkstra multi-airway routing first
  if (flightType === "IFR") {
    const airwaysRoute = generateIFRRoute(departure, destination, options);
    if (airwaysRoute.length > 0) {
      console.log("[WaypointGen] Using IFR airways routing");
      return airwaysRoute;
    }
    console.log("[WaypointGen] No airways found, falling back to corridor search");
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

  const totalDistance = haversineDistance(
    departure.latitude_deg,
    departure.longitude_deg,
    destination.latitude_deg,
    destination.longitude_deg
  );

  // Determine number of intermediate waypoints
  const maxSegment = options.maxSegmentNm || 80;
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
  const syntheticPoints: Array<{ lat: number; lon: number }> = [];
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

  // Corridor search: find real navaids along path
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

  // Track used identifiers to prevent duplicates
  const usedIdentifiers = new Set<string>([departure.icao, destination.icao]);

  // For each synthetic point, try to replace with real navaid or airport
  for (let i = 0; i < syntheticPoints.length; i++) {
    const synthetic = syntheticPoints[i];

    // Detour tolerance: 50% of segment length, but at least 20nm
    // (with 25nm segments, 12.5nm is too small since VORs average ~60nm apart)
    const detourTolerance = Math.max(maxSegment * 0.5, 20);

    // Find best navaid (with VOR preference scoring) that isn't already used
    const bestNavaid = findBestNavaid(synthetic, corridorNavaids, usedIdentifiers, detourTolerance);

    if (bestNavaid) {
      // Minimum 10nm spacing check to prevent clustering
      const lastWp = waypoints[waypoints.length - 1];
      const distFromPrev = haversineDistance(
        lastWp.latitude_deg,
        lastWp.longitude_deg,
        bestNavaid.latitude_deg,
        bestNavaid.longitude_deg
      );
      if (distFromPrev < 10) {
        console.log(`[WaypointGen] Skipping ${bestNavaid.identifier} — too close to previous (${distFromPrev.toFixed(1)}nm)`);
      } else {
        usedIdentifiers.add(bestNavaid.identifier);
        waypoints.push({
          identifier: bestNavaid.identifier,
          latitude_deg: bestNavaid.latitude_deg,
          longitude_deg: bestNavaid.longitude_deg,
          type: mapNavaidTypeToWaypointType(bestNavaid.type),
          name: bestNavaid.name,
        });
        console.log(`[WaypointGen] Using navaid ${bestNavaid.identifier} (${bestNavaid.type})`);
        continue;
      }
    }

    // Airport fallback: find nearest airport within tolerance
    const nearbyAirports = findNearbyStations(
      synthetic.lat,
      synthetic.lon,
      detourTolerance,
      5
    );

    const unusedAirport = nearbyAirports.find(
      (a) => !usedIdentifiers.has(a.icao) && a.icao.length === 4
    );

    if (unusedAirport) {
      // Minimum 10nm spacing check for airports too
      const lastWp = waypoints[waypoints.length - 1];
      const distFromPrev = haversineDistance(
        lastWp.latitude_deg,
        lastWp.longitude_deg,
        unusedAirport.lat,
        unusedAirport.lon
      );
      if (distFromPrev < 10) {
        console.log(`[WaypointGen] Skipping airport ${unusedAirport.icao} — too close to previous (${distFromPrev.toFixed(1)}nm)`);
      } else {
        usedIdentifiers.add(unusedAirport.icao);
        waypoints.push({
          identifier: unusedAirport.icao,
          latitude_deg: unusedAirport.lat,
          longitude_deg: unusedAirport.lon,
          type: "airport",
          name: unusedAirport.name,
        });
        console.log(`[WaypointGen] Using airport fallback ${unusedAirport.icao}`);
        continue;
      }
    }

    // Skip this point entirely — never produce synthetic WPT00 identifiers
    console.log(`[WaypointGen] No real waypoint found for segment ${i}, skipping`);
  }

  // Add destination
  waypoints.push({
    identifier: destination.icao,
    latitude_deg: destination.latitude_deg,
    longitude_deg: destination.longitude_deg,
    type: "airport",
    name: destination.name,
  });

  console.log(`[WaypointGen] Generated ${waypoints.length} waypoints (all real identifiers)`);
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
  const ifrOptions = { ...options, flightType: "IFR" as const };
  return generateDirectRoute(departure, destination, ifrOptions);
}

/**
 * IFR Airways Routing — Dijkstra-based multi-airway pathfinding
 *
 * Builds a graph from all airways (nodes = fixes, edges = consecutive fixes
 * on the same airway) and runs Dijkstra from navaids near departure to
 * navaids near destination. Airway transitions incur a penalty to keep
 * routes simple.
 */
function generateIFRRoute(
  departure: AirportData,
  destination: AirportData,
  _options: RouteGenerationOptions
): GeneratedWaypoint[] {
  const searchRadiusNm = 100;

  // Build graph from all airways
  const graph = airwaysDataService.buildGraph();

  if (graph.size === 0) {
    console.log("[IFR Routing] Empty airways graph");
    return [];
  }

  // Find fixes near departure and destination that exist in the graph
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

  // Filter to only navaids that are in the airway graph
  let depOnGraph = departureNavaids.filter((n) => graph.has(n.identifier));
  let destOnGraph = destinationNavaids.filter((n) => graph.has(n.identifier));

  // C2: Last-resort — find globally nearest graph node within 150nm
  if (depOnGraph.length === 0) {
    const closest = airwaysDataService.findClosestAirwayWaypoint(
      departure.latitude_deg,
      departure.longitude_deg
    );
    if (closest && closest.distance <= 150 && graph.has(closest.segment.fix_identifier)) {
      depOnGraph = [{
        identifier: closest.segment.fix_identifier,
        name: closest.segment.fix_identifier,
        type: "FIX" as const,
        latitude_deg: closest.segment.latitude_deg,
        longitude_deg: closest.segment.longitude_deg,
      }];
    }
  }
  if (destOnGraph.length === 0) {
    const closest = airwaysDataService.findClosestAirwayWaypoint(
      destination.latitude_deg,
      destination.longitude_deg
    );
    if (closest && closest.distance <= 150 && graph.has(closest.segment.fix_identifier)) {
      destOnGraph = [{
        identifier: closest.segment.fix_identifier,
        name: closest.segment.fix_identifier,
        type: "FIX" as const,
        latitude_deg: closest.segment.latitude_deg,
        longitude_deg: closest.segment.longitude_deg,
      }];
    }
  }

  console.log(`[IFR Routing] ${depOnGraph.length} departure navaids on airways, ${destOnGraph.length} destination navaids on airways`);

  if (depOnGraph.length === 0 || destOnGraph.length === 0) {
    return [];
  }

  // C3: Limit seed nodes to nearest 5 to avoid flooding Dijkstra
  depOnGraph = depOnGraph.slice(0, 5);
  destOnGraph = destOnGraph.slice(0, 5);

  // Create set of destination fix identifiers for fast lookup
  const destFixIds = new Set(destOnGraph.map((n) => n.identifier));

  // Dijkstra: find shortest path from any departure fix to any destination fix
  // dist map: fixId → best distance so far
  const dist = new Map<string, number>();
  // prev map: fixId → { from: fixId, airway: string }
  const prev = new Map<string, { from: string; airway: string }>();
  // Priority queue as sorted array (simple implementation, adequate for ~2000 nodes)
  const pq: Array<{ id: string; cost: number; airway: string }> = [];

  // Seed with departure navaids
  for (const nav of depOnGraph) {
    const startCost = haversineDistance(
      departure.latitude_deg,
      departure.longitude_deg,
      nav.latitude_deg,
      nav.longitude_deg
    );
    dist.set(nav.identifier, startCost);
    pq.push({ id: nav.identifier, cost: startCost, airway: "" });
  }

  // Sort initial queue
  pq.sort((a, b) => a.cost - b.cost);

  let foundDest: string | null = null;

  while (pq.length > 0) {
    const current = pq.shift()!;

    // Skip if we already found a better path to this node
    if (current.cost > (dist.get(current.id) ?? Infinity)) {
      continue;
    }

    // Check if we reached a destination fix
    if (destFixIds.has(current.id)) {
      foundDest = current.id;
      break;
    }

    // Explore neighbors
    const edges = graph.get(current.id) || [];
    for (const edge of edges) {
      // Add transition penalty if switching airways
      const transitionPenalty =
        current.airway && current.airway !== edge.airway
          ? AIRWAY_TRANSITION_PENALTY
          : 0;

      const newCost = current.cost + edge.distance + transitionPenalty;

      if (newCost < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newCost);
        prev.set(edge.to, { from: current.id, airway: edge.airway });

        // Binary insert into sorted pq
        let lo = 0;
        let hi = pq.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (pq[mid].cost < newCost) lo = mid + 1;
          else hi = mid;
        }
        pq.splice(lo, 0, { id: edge.to, cost: newCost, airway: edge.airway });
      }
    }
  }

  if (!foundDest) {
    console.log("[IFR Routing] Dijkstra found no path");
    return [];
  }

  // Reconstruct path
  const path: Array<{ fixId: string; airway: string }> = [];
  let current = foundDest;
  while (prev.has(current)) {
    const p = prev.get(current)!;
    path.unshift({ fixId: current, airway: p.airway });
    current = p.from;
  }
  // Add the start node (no airway for the first hop)
  path.unshift({ fixId: current, airway: "" });

  console.log(`[IFR Routing] Dijkstra path: ${path.map((p) => p.fixId).join(" → ")}`);

  // Build waypoint list
  const waypoints: GeneratedWaypoint[] = [];

  // Add departure airport
  waypoints.push({
    identifier: departure.icao,
    latitude_deg: departure.latitude_deg,
    longitude_deg: departure.longitude_deg,
    type: "airport",
    name: departure.name,
  });

  // Add airway fixes
  for (const step of path) {
    const navaid = navaidDataService.getNavaid(step.fixId);
    const coords = navaid
      ? { lat: navaid.latitude_deg, lon: navaid.longitude_deg }
      : airwaysDataService.getFixCoords(step.fixId);

    if (!coords) continue;

    const airwayLabel = step.airway || undefined;
    waypoints.push({
      identifier: step.fixId,
      latitude_deg: coords.lat,
      longitude_deg: coords.lon,
      type: navaid ? mapNavaidTypeToWaypointType(navaid.type) : "fix",
      name: airwayLabel ? `${step.fixId} (${airwayLabel})` : step.fixId,
      airway: airwayLabel,
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

  // Collect unique airways used for logging
  const airwaysUsed = [...new Set(path.map((p) => p.airway).filter(Boolean))];
  console.log(`[IFR Routing] Generated ${waypoints.length} waypoints via ${airwaysUsed.join(", ") || "direct"}`);

  return waypoints;
}

/**
 * Generate route avoiding terrain (simplified)
 */
function generateTerrainAvoidanceRoute(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  console.log("[WaypointGen] Terrain avoidance using higher waypoint density");
  return generateDirectRoute(departure, destination, {
    ...options,
    maxSegmentNm: 25,
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
  console.log("[WaypointGen] Weather avoidance not yet implemented, using direct route");
  return generateDirectRoute(departure, destination, options);
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

  if (d === 0) {
    return { lat: lat1, lon: lon1 };
  }

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

/** Navaid preference score — higher is better. VOR/VORTAC preferred for VFR. */
function navaidScore(navaid: NavaidData): number {
  const t = navaid.type.toUpperCase();
  if (t === "VORTAC") return 4;
  if (t === "VOR-DME") return 3;
  if (t === "VOR") return 2;
  if (t === "NDB") return 1;
  if (t === "FIX") return 0; // Lowest priority, used only when no VOR/NDB nearby
  return 0;
}

/**
 * Find the best navaid near a point from a list of candidates.
 * Prefers VOR/VORTAC over NDB, skips already-used identifiers,
 * and respects detour tolerance.
 */
function findBestNavaid(
  point: { lat: number; lon: number },
  candidates: NavaidData[],
  usedIdentifiers: Set<string>,
  toleranceNm: number
): NavaidData | null {
  let best: NavaidData | null = null;
  let bestScore = -Infinity;

  for (const navaid of candidates) {
    if (usedIdentifiers.has(navaid.identifier)) continue;

    const dist = haversineDistance(
      point.lat,
      point.lon,
      navaid.latitude_deg,
      navaid.longitude_deg
    );

    if (dist > toleranceNm) continue;

    // Score: preference bonus minus distance penalty (1 point per 5nm)
    const score = navaidScore(navaid) * 5 - dist;

    if (score > bestScore) {
      bestScore = score;
      best = navaid;
    }
  }

  return best;
}

/**
 * Map NavaidData type to GeneratedWaypoint type
 */
function mapNavaidTypeToWaypointType(navaidType: string): WaypointType {
  const type = navaidType.toUpperCase();

  if (type.includes("VOR")) return "vor";
  if (type.includes("NDB")) return "ndb";
  if (type === "GPS" || type === "FIX") return "fix";

  return "gps";
}
