// Direct API calls to aviationweather.gov — no CORS proxy needed in React Native
import type { MetarResponse, TafResponse, PirepResponse, NotamResponse } from "@/lib/api/types";

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

export async function fetchRouteWeather(
  ids: string
): Promise<{ metars: MetarResponse[]; tafs: TafResponse[] }> {
  const [metars, tafs] = await Promise.all([fetchMetar(ids), fetchTaf(ids)]);
  return { metars, tafs };
}

export async function fetchNotams(ids: string): Promise<NotamResponse[]> {
  const res = await fetch(
    `${AVIATION_WEATHER_BASE}/notam?ids=${encodeURIComponent(ids)}&format=json`
  );
  if (!res.ok) throw new Error(`NOTAM fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
