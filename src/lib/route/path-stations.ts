import { haversineDistance, pointToSegmentDistance } from "@/lib/interpolation/haversine";
import { STATION_DATABASE, type StationCoord } from "./station-coords";
import type { RouteWaypoint, GapSegment } from "./types";

export interface PathResult {
  stations: StationCoord[];
  gaps: GapSegment[];
}

/**
 * Find all stations within `radiusNm` nautical miles of the route path
 * defined by the given waypoints. Also detects gaps where no station
 * coverage exists for more than `gapThresholdNm`.
 */
export function findStationsAlongPath(
  waypoints: RouteWaypoint[],
  radiusNm: number = 25,
  gapThresholdNm: number = 60
): PathResult {
  if (waypoints.length < 2) {
    return { stations: [], gaps: [] };
  }

  const foundSet = new Set<string>();
  const stationsWithDist: { station: StationCoord; distFromStart: number }[] = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const legDist = haversineDistance(from.lat, from.lon, to.lat, to.lon);

    for (const station of STATION_DATABASE) {
      if (foundSet.has(station.icao)) continue;

      const dist = pointToSegmentDistance(
        station.lat,
        station.lon,
        from.lat,
        from.lon,
        to.lat,
        to.lon
      );

      if (dist <= radiusNm) {
        foundSet.add(station.icao);
        // Approximate along-path distance
        const distFromLegStart = haversineDistance(from.lat, from.lon, station.lat, station.lon);
        stationsWithDist.push({
          station,
          distFromStart: cumulativeDistance + distFromLegStart,
        });
      }
    }

    cumulativeDistance += legDist;
  }

  // Sort by distance from start
  stationsWithDist.sort((a, b) => a.distFromStart - b.distFromStart);

  // Detect gaps
  const gaps: GapSegment[] = [];
  for (let i = 0; i < stationsWithDist.length - 1; i++) {
    const gapDist = stationsWithDist[i + 1].distFromStart - stationsWithDist[i].distFromStart;
    if (gapDist > gapThresholdNm) {
      const sA = stationsWithDist[i].station;
      const sB = stationsWithDist[i + 1].station;
      gaps.push({
        fromWaypoint: { icao: sA.icao, lat: sA.lat, lon: sA.lon, name: sA.name },
        toWaypoint: { icao: sB.icao, lat: sB.lat, lon: sB.lon, name: sB.name },
        gapDistanceNm: Math.round(gapDist),
        message: `Gap in data. Interpolating from nearest stations ${Math.round(gapDist)} miles away.`,
      });
    }
  }

  return {
    stations: stationsWithDist.map((s) => s.station),
    gaps,
  };
}
