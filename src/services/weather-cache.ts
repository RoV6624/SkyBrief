import { storage } from "./storage";
import type { MetarResponse, TafResponse } from "@/lib/api/types";

// Cache key prefixes
const METAR_PREFIX = "wx-metar-";
const TAF_PREFIX = "wx-taf-";
const STATIONS_KEY = "wx-stations";

// Default cache staleness threshold: 30 minutes
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000; // 1800000 ms

export interface CachedWeatherData<T> {
  data: T;
  cachedAt: number; // epoch ms
  station: string;
}

/**
 * Cache a METAR response
 */
export function cacheMetar(station: string, data: MetarResponse): void {
  const icao = station.toUpperCase();
  const cached: CachedWeatherData<MetarResponse> = {
    data,
    cachedAt: Date.now(),
    station: icao,
  };

  storage.set(`${METAR_PREFIX}${icao}`, JSON.stringify(cached));
  updateStationsList(icao);
}

/**
 * Cache a TAF response
 */
export function cacheTaf(station: string, data: TafResponse): void {
  const icao = station.toUpperCase();
  const cached: CachedWeatherData<TafResponse> = {
    data,
    cachedAt: Date.now(),
    station: icao,
  };

  storage.set(`${TAF_PREFIX}${icao}`, JSON.stringify(cached));
  updateStationsList(icao);
}

/**
 * Get cached METAR (returns null if not cached)
 */
export function getCachedMetar(
  station: string
): CachedWeatherData<MetarResponse> | null {
  const icao = station.toUpperCase();
  const cached = storage.getString(`${METAR_PREFIX}${icao}`);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as CachedWeatherData<MetarResponse>;
  } catch (error) {
    console.error(`Failed to parse cached METAR for ${icao}:`, error);
    return null;
  }
}

/**
 * Get cached TAF (returns null if not cached)
 */
export function getCachedTaf(
  station: string
): CachedWeatherData<TafResponse> | null {
  const icao = station.toUpperCase();
  const cached = storage.getString(`${TAF_PREFIX}${icao}`);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as CachedWeatherData<TafResponse>;
  } catch (error) {
    console.error(`Failed to parse cached TAF for ${icao}:`, error);
    return null;
  }
}

/**
 * Check if cached data is stale (older than maxAgeMs, default 30 minutes)
 */
export function isCacheStale(
  cachedAt: number,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): boolean {
  const age = Date.now() - cachedAt;
  return age > maxAgeMs;
}

/**
 * Get human-readable staleness text ("5 minutes ago", "2 hours ago")
 */
export function getCacheAgeText(cachedAt: number): string {
  const ageMs = Date.now() - cachedAt;
  const ageMinutes = Math.floor(ageMs / (60 * 1000));
  const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  if (ageMinutes < 1) {
    return "Just now";
  } else if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  } else if (ageHours < 24) {
    return `${ageHours} hr ago`;
  } else {
    return `${ageDays} ${ageDays === 1 ? "day" : "days"} ago`;
  }
}

/**
 * Clear all cached weather data
 */
export function clearWeatherCache(): void {
  const stations = getCachedStations();

  for (const station of stations) {
    storage.delete(`${METAR_PREFIX}${station}`);
    storage.delete(`${TAF_PREFIX}${station}`);
  }

  storage.delete(STATIONS_KEY);
}

/**
 * Get list of cached stations
 */
export function getCachedStations(): string[] {
  const stationsJson = storage.getString(STATIONS_KEY);

  if (!stationsJson) {
    return [];
  }

  try {
    return JSON.parse(stationsJson) as string[];
  } catch (error) {
    console.error("Failed to parse cached stations list:", error);
    return [];
  }
}

/**
 * Internal helper: Update the stations list when caching new data
 */
function updateStationsList(icao: string): void {
  const stations = getCachedStations();

  if (!stations.includes(icao)) {
    stations.push(icao);
    storage.set(STATIONS_KEY, JSON.stringify(stations));
  }
}
