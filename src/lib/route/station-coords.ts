import airportDatabase from "@/data/airport-database.json";
import type { AirportData } from "@/lib/airport/types";

export interface StationCoord {
  icao: string;
  lat: number;
  lon: number;
  name: string;
  city?: string;
  state?: string;
}

// Comprehensive US airport database (~19,459 airports)
// Sourced from OurAirports (https://ourairports.com/data/)
// Convert object-based database to array for backward compatibility
const database: Record<string, AirportData> = airportDatabase as any;
export const STATION_DATABASE: StationCoord[] = Object.values(database).map(airport => ({
  icao: airport.icao,
  lat: airport.latitude_deg,
  lon: airport.longitude_deg,
  name: airport.name,
  city: airport.municipality,
}));

/**
 * Find airport coordinates by any valid identifier
 * @param identifier - ICAO code, IATA code, or other identifier (e.g., "KJFK", "JFK")
 * @returns StationCoord if found, null otherwise
 */
export function findStationCoords(identifier: string): StationCoord | null {
  const query = identifier.toUpperCase();

  // Try exact match first
  const exactMatch = STATION_DATABASE.find((s) => s.icao === query);
  if (exactMatch) return exactMatch;

  // Try alias match - check if any airport in database has matching alias
  const aliasMatch = Object.values(database).find((airport) =>
    airport.aliases?.some(alias => alias.toUpperCase() === query)
  );

  if (aliasMatch) {
    return {
      icao: aliasMatch.icao,
      lat: aliasMatch.latitude_deg,
      lon: aliasMatch.longitude_deg,
      name: aliasMatch.name,
      city: aliasMatch.municipality,
    };
  }

  return null;
}

/**
 * Search airports by ICAO code, name, or city
 * @param query - Search query (partial match supported)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching airports
 */
export function searchAirports(query: string, limit: number = 20): StationCoord[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const results: StationCoord[] = [];

  for (const airport of STATION_DATABASE) {
    if (results.length >= limit) break;

    // Exact ICAO match - highest priority
    if (airport.icao === q) {
      results.unshift(airport);
      continue;
    }

    // ICAO starts with query
    if (airport.icao.startsWith(q)) {
      results.push(airport);
      continue;
    }

    // Name contains query
    if (airport.name.toUpperCase().includes(q)) {
      results.push(airport);
      continue;
    }

    // City contains query
    if (airport.city && airport.city.toUpperCase().includes(q)) {
      results.push(airport);
    }
  }

  return results.slice(0, limit);
}
