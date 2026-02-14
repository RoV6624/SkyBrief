/**
 * Navaid Data Service
 *
 * Provides lookup and spatial query functions for VOR, NDB, and GPS fix navaids.
 * Data source: OurAirports navaid database
 */

import navaidDatabase from "@/data/navaid-database.json";
import type { NavaidData } from "@/lib/route/types";
import { haversineDistance } from "@/lib/interpolation/haversine";

class NavaidDataService {
  private navaids: Map<string, NavaidData>;
  private spatialIndex: NavaidData[];  // Array for spatial queries

  constructor() {
    // Convert database object to Map for fast lookup
    this.navaids = new Map(
      Object.entries(navaidDatabase).map(([id, data]) => [id, data as NavaidData])
    );

    // Create array for spatial filtering
    this.spatialIndex = Array.from(this.navaids.values());

    console.log(`[NavaidData] Loaded ${this.navaids.size} navaids`);
  }

  /**
   * Get navaid by identifier
   * @param identifier - Navaid identifier (e.g., "STL", "FEPOT")
   * @returns Navaid data or null if not found
   */
  getNavaid(identifier: string): NavaidData | null {
    return this.navaids.get(identifier.toUpperCase()) || null;
  }

  /**
   * Find navaids within radius of a point
   * @param lat - Latitude in decimal degrees
   * @param lon - Longitude in decimal degrees
   * @param radiusNm - Search radius in nautical miles
   * @returns Array of navaids within radius, sorted by distance (closest first)
   */
  findNavaidsNear(lat: number, lon: number, radiusNm: number): NavaidData[] {
    const results: Array<{navaid: NavaidData, distance: number}> = [];

    for (const navaid of this.spatialIndex) {
      const distance = haversineDistance(
        lat,
        lon,
        navaid.latitude_deg,
        navaid.longitude_deg
      );

      if (distance <= radiusNm) {
        results.push({ navaid, distance });
      }
    }

    // Sort by distance, closest first
    results.sort((a, b) => a.distance - b.distance);

    return results.map(r => r.navaid);
  }

  /**
   * Find navaids along a path corridor
   * @param waypoints - Array of waypoints defining the path
   * @param corridorWidthNm - Half-width of the corridor in nautical miles
   * @returns Array of navaids within corridor
   */
  findNavaidsAlongPath(
    waypoints: Array<{lat: number, lon: number}>,
    corridorWidthNm: number
  ): NavaidData[] {
    if (waypoints.length < 2) {
      return [];
    }

    const results: NavaidData[] = [];
    const seen = new Set<string>(); // Prevent duplicates

    // Check each segment of the path
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];

      // Find navaids within corridor of this segment
      for (const navaid of this.spatialIndex) {
        if (seen.has(navaid.identifier)) {
          continue; // Already added
        }

        const distanceToPath = pointToSegmentDistance(
          navaid.latitude_deg,
          navaid.longitude_deg,
          from.lat,
          from.lon,
          to.lat,
          to.lon
        );

        if (distanceToPath <= corridorWidthNm) {
          results.push(navaid);
          seen.add(navaid.identifier);
        }
      }
    }

    return results;
  }

  /**
   * Get all navaids (for debugging/statistics)
   */
  getAllNavaids(): NavaidData[] {
    return this.spatialIndex;
  }

  /**
   * Get navaid count by type
   */
  getStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const navaid of this.spatialIndex) {
      stats[navaid.type] = (stats[navaid.type] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Calculate perpendicular distance from a point to a line segment
 * @param px Point X (latitude)
 * @param py Point Y (longitude)
 * @param x1 Segment start X (latitude)
 * @param y1 Segment start Y (longitude)
 * @param x2 Segment end X (latitude)
 * @param y2 Segment end Y (longitude)
 * @returns Distance in nautical miles
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Calculate the distance from point (px, py) to line segment (x1,y1)-(x2,y2)

  // Vector from segment start to point
  const dx = px - x1;
  const dy = py - y1;

  // Vector of the segment
  const segDx = x2 - x1;
  const segDy = y2 - y1;

  // Segment length squared
  const segLengthSq = segDx * segDx + segDy * segDy;

  // Handle degenerate case where segment has zero length
  if (segLengthSq === 0) {
    return haversineDistance(px, py, x1, y1);
  }

  // Calculate projection of point onto segment (0 = start, 1 = end)
  const t = Math.max(0, Math.min(1, (dx * segDx + dy * segDy) / segLengthSq));

  // Find closest point on segment
  const closestX = x1 + t * segDx;
  const closestY = y1 + t * segDy;

  // Return haversine distance from point to closest point on segment
  return haversineDistance(px, py, closestX, closestY);
}

// Singleton instance
export const navaidDataService = new NavaidDataService();
