/**
 * Airways Data Service
 * Provides lookup and routing functions for Victor airways
 */

import airwaysDatabase from "@/data/airways-database.json";
import type { Airway, AirwaySegment } from "@/lib/route/types";
import { haversineDistance } from "@/lib/interpolation/haversine";

interface AirwayConnection {
  airway: Airway;
  fromIndex: number;
  toIndex: number;
  distance: number;
}

class AirwaysDataService {
  private airways: Map<string, Airway>;

  constructor() {
    // Load airways database into Map for fast lookup
    this.airways = new Map(
      Object.entries(airwaysDatabase).map(([id, airway]) => [id, airway as Airway])
    );
  }

  /**
   * Get airway by ID
   */
  getAirway(airwayId: string): Airway | null {
    return this.airways.get(airwayId.toUpperCase()) || null;
  }

  /**
   * Get all airways
   */
  getAllAirways(): Airway[] {
    return Array.from(this.airways.values());
  }

  /**
   * Find airways that directly connect two waypoints
   * @returns Array of airways with segment indices
   */
  findConnectingAirways(
    fromIdentifier: string,
    toIdentifier: string
  ): AirwayConnection[] {
    const results: AirwayConnection[] = [];
    const fromId = fromIdentifier.toUpperCase();
    const toId = toIdentifier.toUpperCase();

    for (const airway of this.airways.values()) {
      const fromIndex = airway.segments.findIndex(
        (s) => s.fix_identifier === fromId
      );
      const toIndex = airway.segments.findIndex(
        (s) => s.fix_identifier === toId
      );

      // Check if both waypoints exist and fromIndex comes before toIndex
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        // Calculate total distance along airway
        let distance = 0;
        for (let i = fromIndex; i < toIndex; i++) {
          const seg1 = airway.segments[i];
          const seg2 = airway.segments[i + 1];
          distance += haversineDistance(
            seg1.latitude_deg,
            seg1.longitude_deg,
            seg2.latitude_deg,
            seg2.longitude_deg
          );
        }

        results.push({ airway, fromIndex, toIndex, distance });
      }
    }

    // Sort by distance (shortest first)
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find airways passing near a geographic point
   * @param lat Latitude in degrees
   * @param lon Longitude in degrees
   * @param radiusNm Search radius in nautical miles
   * @returns Array of airways with segments within radius
   */
  findAirwaysNear(lat: number, lon: number, radiusNm: number): Airway[] {
    const results: Airway[] = [];
    const seen = new Set<string>();

    for (const airway of this.airways.values()) {
      for (const segment of airway.segments) {
        const distance = haversineDistance(
          lat,
          lon,
          segment.latitude_deg,
          segment.longitude_deg
        );

        if (distance <= radiusNm && !seen.has(airway.id)) {
          results.push(airway);
          seen.add(airway.id);
          break; // Only add airway once
        }
      }
    }

    return results;
  }

  /**
   * Extract waypoint segments from an airway between two indices
   * @param airwayId Airway identifier (e.g., "V4")
   * @param fromIndex Starting segment index
   * @param toIndex Ending segment index
   * @returns Array of airway segments
   */
  getAirwaySegment(
    airwayId: string,
    fromIndex: number,
    toIndex: number
  ): AirwaySegment[] {
    const airway = this.airways.get(airwayId.toUpperCase());
    if (!airway) {
      return [];
    }

    // Ensure indices are valid
    const start = Math.max(0, fromIndex);
    const end = Math.min(airway.segments.length - 1, toIndex);

    if (start > end) {
      return [];
    }

    return airway.segments.slice(start, end + 1);
  }

  /**
   * Find the closest waypoint on any airway to a given position
   * @param lat Latitude in degrees
   * @param lon Longitude in degrees
   * @returns Closest airway segment and distance, or null
   */
  findClosestAirwayWaypoint(
    lat: number,
    lon: number
  ): { segment: AirwaySegment; airway: Airway; distance: number } | null {
    let closest: {
      segment: AirwaySegment;
      airway: Airway;
      distance: number;
    } | null = null;
    let minDistance = Infinity;

    for (const airway of this.airways.values()) {
      for (const segment of airway.segments) {
        const distance = haversineDistance(
          lat,
          lon,
          segment.latitude_deg,
          segment.longitude_deg
        );

        if (distance < minDistance) {
          minDistance = distance;
          closest = { segment, airway, distance };
        }
      }
    }

    return closest;
  }

  /**
   * Check if a waypoint exists in any airway
   * @param identifier Waypoint identifier
   * @returns Array of airways containing this waypoint
   */
  findAirwaysContaining(identifier: string): Airway[] {
    const results: Airway[] = [];
    const id = identifier.toUpperCase();

    for (const airway of this.airways.values()) {
      if (airway.segments.some((s) => s.fix_identifier === id)) {
        results.push(airway);
      }
    }

    return results;
  }

  /**
   * Build an adjacency graph from all airways for multi-airway pathfinding.
   * Nodes are fix identifiers; edges connect consecutive fixes on the same airway.
   * Each edge has a distance (nm) and the airway ID.
   */
  buildGraph(): Map<string, Array<{ to: string; distance: number; airway: string; lat: number; lon: number; toLat: number; toLon: number }>> {
    const graph = new Map<string, Array<{ to: string; distance: number; airway: string; lat: number; lon: number; toLat: number; toLon: number }>>();

    for (const airway of this.airways.values()) {
      const segs = airway.segments;
      for (let i = 0; i < segs.length - 1; i++) {
        const from = segs[i];
        const to = segs[i + 1];
        const dist = haversineDistance(
          from.latitude_deg,
          from.longitude_deg,
          to.latitude_deg,
          to.longitude_deg
        );

        // Add edge in both directions (Victor airways are bidirectional)
        if (!graph.has(from.fix_identifier)) {
          graph.set(from.fix_identifier, []);
        }
        graph.get(from.fix_identifier)!.push({
          to: to.fix_identifier,
          distance: dist,
          airway: airway.id,
          lat: from.latitude_deg,
          lon: from.longitude_deg,
          toLat: to.latitude_deg,
          toLon: to.longitude_deg,
        });

        if (!graph.has(to.fix_identifier)) {
          graph.set(to.fix_identifier, []);
        }
        graph.get(to.fix_identifier)!.push({
          to: from.fix_identifier,
          distance: dist,
          airway: airway.id,
          lat: to.latitude_deg,
          lon: to.longitude_deg,
          toLat: from.latitude_deg,
          toLon: from.longitude_deg,
        });
      }
    }

    return graph;
  }

  /**
   * Get coordinates for a fix identifier from any airway
   */
  getFixCoords(fixId: string): { lat: number; lon: number } | null {
    const id = fixId.toUpperCase();
    for (const airway of this.airways.values()) {
      const seg = airway.segments.find(s => s.fix_identifier === id);
      if (seg) {
        return { lat: seg.latitude_deg, lon: seg.longitude_deg };
      }
    }
    return null;
  }
}

// Export singleton instance
export const airwaysDataService = new AirwaysDataService();
