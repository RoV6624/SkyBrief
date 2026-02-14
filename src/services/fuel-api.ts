import type { ApiFuelPriceResponse } from "@/lib/api/types";

const FUEL_API_BASE = "https://aviation-fuel-prices.com/api/v1";
const FUEL_API_KEY = process.env.EXPO_PUBLIC_FUEL_API_KEY || "";

export async function fetchApiFuelPrice(
  icao: string
): Promise<ApiFuelPriceResponse | null> {
  // Skip API call if no valid key configured
  if (!FUEL_API_KEY || FUEL_API_KEY === "your_api_key_here") {
    console.log(`[Fuel API] No API key configured, skipping external fetch for ${icao}`);
    return null;
  }

  try {
    const url = `${FUEL_API_BASE}/fuel-prices/${icao.toUpperCase()}`;
    console.log(`[Fuel API] Fetching fuel price for ${icao}...`);

    // Create timeout using AbortController (React Native compatible)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: { "X-API-Key": FUEL_API_KEY },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[Fuel API] No data found for ${icao}`);
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter for 100LL fuel type
    const fuel100LL = data.find((f: any) => f.fuel_type === "100LL");
    if (!fuel100LL) {
      console.log(`[Fuel API] No 100LL data for ${icao}`);
      return null;
    }

    console.log(`[Fuel API] Found price for ${icao}: $${fuel100LL.price}`);
    return {
      airport_icao: icao,
      fuel_type: "100LL",
      price: fuel100LL.price,
      currency: "USD",
      fbo_name: fuel100LL.fbo_name || null,
      updated_at: fuel100LL.updated_at,
      source: "api",
    };
  } catch (error) {
    console.warn(`[Fuel API] Fetch failed for ${icao}:`, error);
    return null; // Graceful degradation
  }
}
