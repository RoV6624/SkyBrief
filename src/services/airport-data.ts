import type { AirportData } from "@/lib/airport/types";
import airportDatabase from "@/data/airport-database.json";

/**
 * Airport and Runway Data Service
 *
 * Uses a local database of all FAA-sanctioned airports with runway information
 * Database includes 19,459 US airports:
 * - 4-letter K-prefix ICAO codes (KJFK, KLAX, etc.)
 * - 3-letter K-prefix codes (K01, K07, etc.)
 * - 3-letter private strip identifiers (00A, 69S, 1E0, etc.)
 * - Heliports and seaplane bases
 */

// Type the imported database
const database: Record<string, AirportData> = airportDatabase as any;

// Cache for quick lookups
const airportCache = new Map<string, AirportData | null>();

// Reverse index for identifier -> primary ICAO lookup
const identifierIndex = new Map<string, string>();

// Build reverse index on initialization
function buildIdentifierIndex() {
  console.log('[AirportData] Building identifier index...');
  let aliasCount = 0;

  for (const [primary, airport] of Object.entries(database)) {
    // Register primary identifier
    identifierIndex.set(primary, primary);

    // Register all aliases
    for (const alias of airport.aliases || []) {
      identifierIndex.set(alias.toUpperCase(), primary);
      aliasCount++;
    }
  }

  console.log(`[AirportData] Index built: ${identifierIndex.size} identifiers (${aliasCount} aliases)`);
}

// Build index on module load
buildIdentifierIndex();

/**
 * Resolve any identifier to primary ICAO code
 */
export function resolveAirportIdentifier(identifier: string): string | null {
  return identifierIndex.get(identifier.toUpperCase()) || null;
}

/**
 * Format airport with aliases for display
 */
export function formatAirportWithAliases(airport: AirportData): string {
  if (airport.aliases.length === 0) {
    return airport.icao;
  }
  return `${airport.icao} (also: ${airport.aliases.join(', ')})`;
}

/**
 * Get airport and runway data for any valid identifier
 * Accepts: ICAO, IATA, GPS code, local code
 * Works offline with local database
 */
export async function getAirportData(icao: string): Promise<AirportData | null> {
  // Resolve identifier to primary ICAO
  const primaryKey = resolveAirportIdentifier(icao);

  if (!primaryKey) {
    console.log(`[AirportData] No data found for ${icao.toUpperCase()}`);
    return null;
  }

  // Check cache
  if (airportCache.has(primaryKey)) {
    return airportCache.get(primaryKey) || null;
  }

  // Look up in database
  const airportData = database[primaryKey];

  if (airportData) {
    console.log(`[AirportData] Found ${primaryKey}: ${airportData.runways.length} runways`);
    airportCache.set(primaryKey, airportData);
    return airportData;
  }

  airportCache.set(primaryKey, null);
  return null;
}

/**
 * Search airports by identifier, name, or city
 * Prioritizes exact matches on identifiers
 */
export function searchAirports(query: string): AirportData[] {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return [];

  const results: AirportData[] = [];
  const seen = new Set<string>();

  // Phase 1: Exact identifier matches (highest priority)
  for (const [icao, airport] of Object.entries(database)) {
    if (seen.has(icao)) continue;

    if (
      icao.toLowerCase() === searchTerm ||
      airport.aliases.some(a => a.toLowerCase() === searchTerm)
    ) {
      results.push(airport);
      seen.add(icao);
      if (results.length >= 20) return results;
    }
  }

  // Phase 2: Prefix matches on identifiers
  for (const [icao, airport] of Object.entries(database)) {
    if (seen.has(icao)) continue;

    if (
      icao.toLowerCase().startsWith(searchTerm) ||
      airport.aliases.some(a => a.toLowerCase().startsWith(searchTerm))
    ) {
      results.push(airport);
      seen.add(icao);
      if (results.length >= 20) return results;
    }
  }

  // Phase 3: Name and municipality matches
  for (const [icao, airport] of Object.entries(database)) {
    if (seen.has(icao)) continue;

    if (
      airport.name.toLowerCase().includes(searchTerm) ||
      airport.municipality.toLowerCase().includes(searchTerm)
    ) {
      results.push(airport);
      seen.add(icao);
      if (results.length >= 20) return results;
    }
  }

  return results;
}

/**
 * Get total number of airports in database
 */
export function getAirportCount(): number {
  return Object.keys(database).length;
}

/**
 * Clear the airport data cache
 */
export function clearAirportCache(): void {
  airportCache.clear();
}
