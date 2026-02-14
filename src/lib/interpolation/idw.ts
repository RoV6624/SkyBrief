import type { MetarResponse, NormalizedMetar, FlightCategory, MetarCloud } from "@/lib/api/types";
import { haversineDistance } from "./haversine";
import { celsiusToFahrenheit } from "@/lib/utils/conversions";

export interface InterpolatedSource {
  icaoId: string;
  name: string;
  distance: number; // nm
}

export interface InterpolatedMetar extends NormalizedMetar {
  isGhost: true;
  sources: InterpolatedSource[];
  confidence: number; // 0-1
}

/**
 * Inverse Distance Weighting interpolation.
 * ẑ = Σ(w_i × z_i) / Σ(w_i) where w_i = 1/d_i²
 */
function idw(values: number[], distances: number[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < values.length; i++) {
    const dist = Math.max(distances[i], 0.1); // Prevent division by zero
    const weight = 1 / (dist * dist);
    weightedSum += weight * values[i];
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Average wind directions using vector decomposition.
 * Handles the 360°/0° wraparound correctly.
 */
function averageWindDirection(
  directions: (number | "VRB")[],
  speeds: number[],
  distances: number[]
): number | "VRB" {
  const numeric = directions.filter((d): d is number => d !== "VRB");
  if (numeric.length === 0) return "VRB";

  let uSum = 0;
  let vSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < numeric.length; i++) {
    const dist = Math.max(distances[i], 0.1);
    const weight = 1 / (dist * dist);
    const rad = (numeric[i] * Math.PI) / 180;
    uSum += weight * speeds[i] * Math.sin(rad);
    vSum += weight * speeds[i] * Math.cos(rad);
    totalWeight += weight;
  }

  if (totalWeight === 0) return "VRB";

  const avgU = uSum / totalWeight;
  const avgV = vSum / totalWeight;
  let avgDir = (Math.atan2(avgU, avgV) * 180) / Math.PI;
  if (avgDir < 0) avgDir += 360;

  return Math.round(avgDir);
}

function deriveFlightCategory(
  ceiling: number | null,
  visibility: number
): FlightCategory {
  if (
    ceiling !== null && ceiling < 500 ||
    visibility < 1
  ) {
    return "LIFR";
  }
  if (
    ceiling !== null && ceiling < 1000 ||
    visibility < 3
  ) {
    return "IFR";
  }
  if (
    ceiling !== null && ceiling < 3000 ||
    visibility < 5
  ) {
    return "MVFR";
  }
  return "VFR";
}

function parseVisibility(visib: string): number {
  if (visib.includes("+")) return 10;
  const val = parseFloat(visib);
  return isNaN(val) ? 10 : val;
}

export function interpolateMetar(
  targetLat: number,
  targetLon: number,
  targetIcao: string,
  neighbors: MetarResponse[]
): InterpolatedMetar | null {
  if (neighbors.length === 0) return null;

  // Calculate distances
  const distances = neighbors.map((n) =>
    haversineDistance(targetLat, targetLon, n.lat, n.lon)
  );

  // Sort by distance, take closest 5
  const indexed = neighbors.map((n, i) => ({ metar: n, distance: distances[i] }));
  indexed.sort((a, b) => a.distance - b.distance);
  const closest = indexed.slice(0, 5);

  const metars = closest.map((c) => c.metar);
  const dists = closest.map((c) => c.distance);

  // Interpolate numeric values
  const temp = idw(
    metars.map((m) => m.temp),
    dists
  );
  const dewp = idw(
    metars.map((m) => m.dewp),
    dists
  );
  const wspd = idw(
    metars.map((m) => m.wspd),
    dists
  );
  const altim = idw(
    metars.map((m) => m.altim),
    dists
  );
  const visVals = metars.map((m) => parseVisibility(m.visib));
  const vis = idw(visVals, dists);

  // Average wind direction
  const wdir = averageWindDirection(
    metars.map((m) => m.wdir),
    metars.map((m) => m.wspd),
    dists
  );

  // Get gusts (max of nearby stations weighted)
  const gustValues = metars.map((m) => m.wgst ?? 0);
  const gustInterp = idw(gustValues, dists);
  const gust = gustInterp > wspd + 3 ? Math.round(gustInterp) : null;

  // Use the clouds from the nearest station (cloud interpolation is not meaningful)
  const clouds: MetarCloud[] = metars[0]?.clouds ?? [];
  const ceiling =
    clouds
      .filter((c) => c.cover === "BKN" || c.cover === "OVC")
      .reduce<number | null>(
        (min, c) => (min === null ? c.base : Math.min(min, c.base)),
        null
      );

  const flightCategory = deriveFlightCategory(ceiling, vis);
  const tempDewpointSpread = temp - dewp;

  // Confidence: higher when stations are closer
  const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
  const confidence = Math.min(1, Math.max(0.1, 1 - avgDist / 60));

  const sources: InterpolatedSource[] = closest.map((c) => ({
    icaoId: c.metar.icaoId,
    name: c.metar.name,
    distance: Math.round(c.distance),
  }));

  return {
    station: targetIcao,
    stationName: `Estimated from ${sources.length} nearby stations`,
    observationTime: new Date(),
    isSpeci: false,
    temperature: {
      celsius: Math.round(temp * 10) / 10,
      fahrenheit: celsiusToFahrenheit(temp),
    },
    dewpoint: {
      celsius: Math.round(dewp * 10) / 10,
      fahrenheit: celsiusToFahrenheit(dewp),
    },
    tempDewpointSpread: Math.round(tempDewpointSpread * 10) / 10,
    wind: {
      direction: wdir,
      speed: Math.round(wspd),
      gust,
      isGusty: gust !== null && gust > Math.round(wspd) + 10,
    },
    visibility: {
      sm: Math.round(vis * 10) / 10,
      isPlus: vis >= 10,
    },
    altimeter: Math.round(altim * 100) / 100,
    clouds,
    ceiling,
    flightCategory,
    presentWeather: null,
    rawText: `[INTERPOLATED] ${targetIcao} — estimated from ${sources.map((s) => s.icaoId).join(", ")}`,
    location: {
      lat: targetLat,
      lon: targetLon,
      elevation: metars[0]?.elev ?? 0,
    },
    isGhost: true,
    sources,
    confidence,
  };
}
