/**
 * Find nearby weather stations
 *
 * Utility to find weather stations near a given point.
 */

import { haversineDistance } from "@/lib/interpolation/haversine";
import { STATION_DATABASE, type StationCoord } from "./station-coords";

export interface NearbyStation extends StationCoord {
  distance: number; // Distance in nautical miles
}

/**
 * Find weather stations within a radius of a point
 * @param lat - Latitude of center point
 * @param lon - Longitude of center point
 * @param radiusNm - Search radius in nautical miles (default: 50nm)
 * @param maxResults - Maximum number of results (default: 5)
 * @returns Array of nearby stations sorted by distance
 */
export function findNearbyStations(
  lat: number,
  lon: number,
  radiusNm: number = 50,
  maxResults: number = 5
): NearbyStation[] {
  const nearbyStations: NearbyStation[] = [];

  // Search through all stations in database
  for (const station of STATION_DATABASE) {
    const distance = haversineDistance(lat, lon, station.lat, station.lon);

    if (distance <= radiusNm) {
      nearbyStations.push({
        ...station,
        distance,
      });
    }
  }

  // Sort by distance (closest first) and limit results
  nearbyStations.sort((a, b) => a.distance - b.distance);

  return nearbyStations.slice(0, maxResults);
}

/**
 * Find nearby stations by ICAO code
 * @param icao - ICAO code of the reference station
 * @param radiusNm - Search radius in nautical miles (default: 50nm)
 * @param maxResults - Maximum number of results (default: 5)
 * @returns Array of nearby stations (excluding the reference station itself)
 */
export function findNearbyStationsByICAO(
  icao: string,
  radiusNm: number = 50,
  maxResults: number = 5
): NearbyStation[] {
  const upperIcao = icao.toUpperCase();

  // Find the reference station
  const refStation = STATION_DATABASE.find((s) => s.icao === upperIcao);

  if (!refStation) {
    return [];
  }

  // Find nearby stations
  const nearby = findNearbyStations(
    refStation.lat,
    refStation.lon,
    radiusNm,
    maxResults + 1 // Get one extra since we'll filter out the reference station
  );

  // Remove the reference station itself and limit results
  return nearby.filter((s) => s.icao !== upperIcao).slice(0, maxResults);
}
