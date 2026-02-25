import type { MetarResponse, NormalizedMetar } from "@/lib/api/types";
import { celsiusToFahrenheit, hpaToInHg } from "@/lib/utils/conversions";

export function normalizeMetar(raw: MetarResponse): NormalizedMetar {
  try {
    const tempC = raw.temp ?? 0;
    const dewpC = raw.dewp ?? 0;
    const spread = Math.max(tempC - dewpC, 0);

    const ceiling = findCeiling(raw);
    // Convert visibility to string (API might return number or string)
    const visibStr = String(raw.visib ?? "10+");
    const visibNum = parseVisibility(visibStr);

    return {
      station: raw.icaoId,
      stationName: raw.name ?? raw.icaoId,
      observationTime: new Date(raw.reportTime),
      isSpeci: raw.metarType === "SPECI",
      temperature: {
        celsius: tempC,
        fahrenheit: celsiusToFahrenheit(tempC),
      },
      dewpoint: {
        celsius: dewpC,
        fahrenheit: celsiusToFahrenheit(dewpC),
      },
      tempDewpointSpread: spread,
      wind: {
        direction: raw.wdir ?? "VRB",
        speed: raw.wspd ?? 0,
        gust: raw.wgst ?? null,
        isGusty:
          raw.wgst != null && raw.wgst - (raw.wspd ?? 0) > 10,
      },
      visibility: {
        sm: visibNum,
        isPlus: visibStr.includes("+"),
      },
      altimeter: raw.altim ? hpaToInHg(raw.altim) : 29.92,
      clouds: raw.clouds ?? [],
      ceiling,
      flightCategory: raw.fltCat ?? "VFR",
      presentWeather: raw.wxString ?? null,
      rawText: raw.rawOb ?? "",
      location: {
        lat: raw.lat,
        lon: raw.lon,
        elevation: raw.elev ?? 0,
      },
      isDegraded: false,
    };
  } catch (error) {
    // Fail-safe: if parsing throws (e.g. malformed SPECI), return a safe default
    console.warn(`[METAR] Failed to parse station ${raw?.icaoId}: ${error}`);
    return {
      station: raw?.icaoId ?? "UNKN",
      stationName: raw?.name ?? "Unknown",
      observationTime: new Date(),
      isSpeci: raw?.metarType === "SPECI",
      temperature: { celsius: 0, fahrenheit: 32 },
      dewpoint: { celsius: 0, fahrenheit: 32 },
      tempDewpointSpread: 0,
      wind: { direction: "VRB", speed: 0, gust: null, isGusty: false },
      visibility: { sm: 10, isPlus: true },
      altimeter: 29.92,
      clouds: [],
      ceiling: null,
      flightCategory: raw?.fltCat ?? "VFR",
      presentWeather: null,
      rawText: raw?.rawOb ?? "",
      location: {
        lat: raw?.lat ?? 0,
        lon: raw?.lon ?? 0,
        elevation: raw?.elev ?? 0,
      },
      isDegraded: true,
    };
  }
}

function findCeiling(raw: MetarResponse): number | null {
  const clouds = raw.clouds ?? [];
  const ceilingLayers = clouds.filter(
    (c) => c.cover === "BKN" || c.cover === "OVC"
  );
  if (ceilingLayers.length === 0) return null;
  const bases = ceilingLayers.map((c) => c.base).filter(b => typeof b === 'number' && b > 0);
  return bases.length > 0 ? Math.min(...bases) : null;
}

function parseVisibility(visib: string): number {
  if (!visib) return 10;
  if (visib.includes("+")) return parseFloat(visib.replace("+", "")) || 10;
  return parseFloat(visib) || 10;
}
