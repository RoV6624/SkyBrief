// Direct API calls to aviationweather.gov — no CORS proxy needed in React Native
import type { MetarResponse, TafResponse, PirepResponse, NotamResponse, FaaNotamApiResponse } from "@/lib/api/types";
import { getAirportData } from "@/services/airport-data";
import { findNearbyStations } from "@/lib/route/nearby-stations";

const AVIATION_WEATHER_BASE = "https://aviationweather.gov/api/data";

export async function fetchMetar(ids: string): Promise<MetarResponse[]> {
  const res = await fetch(
    `${AVIATION_WEATHER_BASE}/metar?ids=${encodeURIComponent(ids)}&format=json`
  );
  if (!res.ok) throw new Error(`METAR fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchTaf(ids: string): Promise<TafResponse[]> {
  const res = await fetch(
    `${AVIATION_WEATHER_BASE}/taf?ids=${encodeURIComponent(ids)}&format=json`
  );
  if (!res.ok) throw new Error(`TAF fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchNearbyMetars(
  ids: string
): Promise<MetarResponse[]> {
  // aviationweather.gov doesn't support radialDistance/bbox reliably.
  // Pass comma-separated station IDs instead.
  return fetchMetar(ids);
}

export async function fetchPireps(
  id: string,
  distance: number = 100
): Promise<PirepResponse[]> {
  const res = await fetch(
    `${AVIATION_WEATHER_BASE}/pirep?id=${encodeURIComponent(id)}&distance=${distance}&format=json`
  );
  if (!res.ok) throw new Error(`PIREP fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ===== Smart Station Resolution =====
// Tries all known identifiers for a station, then falls back to nearby stations

export interface ResolvedWeather<T> {
  data: T[];
  resolvedId: string;
  isNearby: boolean;
  distance?: number; // nautical miles, only when isNearby
}

/**
 * Build a deduplicated list of candidate ICAO IDs for a given station.
 * Includes: the input itself, the primary ICAO, and all aliases.
 */
async function buildCandidateIds(stationId: string): Promise<string[]> {
  const upper = stationId.toUpperCase();
  const candidates = new Set<string>([upper]);

  const airport = await getAirportData(upper);
  if (airport) {
    candidates.add(airport.icao.toUpperCase());
    for (const alias of airport.aliases) {
      candidates.add(alias.toUpperCase());
    }
  }

  return Array.from(candidates);
}

/**
 * Resolve a station identifier and fetch METAR data.
 * 1. Tries all known identifiers (primary ICAO + aliases) in one API call
 * 2. Falls back to nearest reporting station within 30nm
 */
export async function resolveAndFetchMetar(
  stationId: string
): Promise<ResolvedWeather<MetarResponse> | null> {
  // Step 1: Try all candidate identifiers
  const candidates = await buildCandidateIds(stationId);
  const data = await fetchMetar(candidates.join(","));

  if (data.length > 0) {
    return { data, resolvedId: data[0].icaoId, isNearby: false };
  }

  // Step 2: Nearby fallback — get coordinates from airport database
  const airport = await getAirportData(stationId);
  if (!airport) return null;

  const nearby = findNearbyStations(
    airport.latitude_deg,
    airport.longitude_deg,
    30,
    5
  );

  if (nearby.length === 0) return null;

  const nearbyIds = nearby.map((s) => s.icao).join(",");
  const nearbyData = await fetchMetar(nearbyIds);

  if (nearbyData.length === 0) return null;

  // Find the distance for the station that actually returned data
  const matchedStation = nearby.find(
    (s) => s.icao.toUpperCase() === nearbyData[0].icaoId.toUpperCase()
  );

  return {
    data: nearbyData,
    resolvedId: nearbyData[0].icaoId,
    isNearby: true,
    distance: matchedStation
      ? Math.round(matchedStation.distance)
      : undefined,
  };
}

/**
 * Resolve a station identifier and fetch TAF data.
 * Same resolution logic as METAR.
 */
export async function resolveAndFetchTaf(
  stationId: string
): Promise<ResolvedWeather<TafResponse> | null> {
  const candidates = await buildCandidateIds(stationId);
  const data = await fetchTaf(candidates.join(","));

  if (data.length > 0) {
    return { data, resolvedId: data[0].icaoId, isNearby: false };
  }

  const airport = await getAirportData(stationId);
  if (!airport) return null;

  const nearby = findNearbyStations(
    airport.latitude_deg,
    airport.longitude_deg,
    30,
    5
  );

  if (nearby.length === 0) return null;

  const nearbyIds = nearby.map((s) => s.icao).join(",");
  const nearbyData = await fetchTaf(nearbyIds);

  if (nearbyData.length === 0) return null;

  const matchedStation = nearby.find(
    (s) => s.icao.toUpperCase() === nearbyData[0].icaoId.toUpperCase()
  );

  return {
    data: nearbyData,
    resolvedId: nearbyData[0].icaoId,
    isNearby: true,
    distance: matchedStation
      ? Math.round(matchedStation.distance)
      : undefined,
  };
}

export async function fetchRouteWeather(
  ids: string
): Promise<{ metars: MetarResponse[]; tafs: TafResponse[] }> {
  const [metars, tafs] = await Promise.all([fetchMetar(ids), fetchTaf(ids)]);
  return { metars, tafs };
}

export async function fetchNotams(icao: string): Promise<NotamResponse[]> {
  // Proxy through Cloud Function to keep FAA credentials server-side
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const url = `https://us-central1-${projectId}.cloudfunctions.net/fetchNotams?icao=${encodeURIComponent(icao)}`;

  // Get auth token for the Cloud Function
  const { getCurrentIdToken } = await import("@/services/firebase");
  const token = await getCurrentIdToken();

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error(`NOTAM fetch failed: ${res.status}`);
  const data: FaaNotamApiResponse = await res.json();
  return data.items ?? [];
}
