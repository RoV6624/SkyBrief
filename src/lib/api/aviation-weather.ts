import type { MetarResponse } from "./types";

const BASE_URL = "https://aviationweather.gov/api/data";

async function fetchAviationData<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Aviation API ${endpoint}: ${response.status}`);
  }

  return response.json();
}

export async function fetchMetar(ids: string): Promise<MetarResponse[]> {
  return fetchAviationData<MetarResponse[]>("metar", { ids });
}
