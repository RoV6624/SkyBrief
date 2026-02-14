import type { RouteLeg, RouteWeatherPoint } from "@/lib/route/types";
import type { NavLog, NavLogLeg } from "./types";
import { calculateWindComponents as calcWind } from "@/lib/aviation/wind-calculations";

/**
 * Calculate ground speed using E6B wind triangle
 * @param trueAirspeed - True airspeed in knots
 * @param trueCourse - True course in degrees
 * @param windDirection - Wind direction FROM in degrees
 * @param windSpeed - Wind speed in knots
 * @returns Ground speed in knots
 */
export function calculateGroundSpeed(
  trueAirspeed: number,
  trueCourse: number,
  windDirection: number,
  windSpeed: number
): number {
  // Full E6B wind triangle (law of cosines):
  // GS² = TAS² + WS² − 2·TAS·WS·cos(windDir_rad − course_rad)
  const courseRad = (trueCourse * Math.PI) / 180;
  const windRad   = (windDirection * Math.PI) / 180;
  const gs = Math.sqrt(
    trueAirspeed ** 2 +
    windSpeed ** 2 -
    2 * trueAirspeed * windSpeed * Math.cos(windRad - courseRad)
  );
  // Minimum 30 kts — prevents absurd time/fuel on bad/missing wind data
  return Math.max(Math.round(gs), 30);
}

/**
 * Calculate wind correction angle
 * @param trueAirspeed - True airspeed in knots
 * @param trueCourse - True course in degrees
 * @param windDirection - Wind direction FROM in degrees
 * @param windSpeed - Wind speed in knots
 * @returns Wind correction angle in degrees (+ = right, - = left)
 */
export function calculateWindCorrectionAngle(
  trueAirspeed: number,
  trueCourse: number,
  windDirection: number,
  windSpeed: number
): number {
  const { crosswind } = calcWind(
    trueCourse,
    windDirection,
    windSpeed
  );

  // Avoid division by zero or invalid arcsin
  if (trueAirspeed === 0) return 0;
  const sinValue = crosswind / trueAirspeed;

  // Clamp to [-1, 1] to avoid Math.asin errors
  const clampedSin = Math.max(-1, Math.min(1, sinValue));
  const wca = (Math.asin(clampedSin) * 180) / Math.PI;

  return Math.round(wca);
}

/** Check if a weather point has usable numeric wind data */
function hasValidWind(wp: RouteWeatherPoint | undefined): boolean {
  return !!(
    wp?.metar?.wind &&
    wp.metar.wind.direction !== "VRB" &&
    typeof wp.metar.wind.direction === "number" &&
    typeof wp.metar.wind.speed === "number"
  );
}

/**
 * Find wind data for a leg.
 * 1) Tries exact ICAO match on from/to waypoints.
 * 2) Falls back to the nearest weather station to the leg midpoint.
 * This ensures time/fuel/heading always compute even when the user's
 * departure/destination airport has no METAR in the path-stations list.
 */
function getWindForLeg(
  leg: RouteLeg,
  weatherPoints: RouteWeatherPoint[]
): { windDirection: number; windSpeed: number } {
  if (weatherPoints.length === 0) return { windDirection: 0, windSpeed: 0 };

  // 1. Exact ICAO match on leg endpoints
  const fromWP = weatherPoints.find((wp) => wp.waypoint.icao === leg.from.icao);
  const toWP   = weatherPoints.find((wp) => wp.waypoint.icao === leg.to.icao);

  if (hasValidWind(fromWP) && hasValidWind(toWP)) {
    const avgDir   = ((fromWP!.metar!.wind.direction as number) + (toWP!.metar!.wind.direction as number)) / 2;
    const avgSpeed = (fromWP!.metar!.wind.speed + toWP!.metar!.wind.speed) / 2;
    return { windDirection: Math.round(avgDir), windSpeed: Math.round(avgSpeed) };
  }
  if (hasValidWind(fromWP)) {
    return { windDirection: fromWP!.metar!.wind.direction as number, windSpeed: fromWP!.metar!.wind.speed };
  }
  if (hasValidWind(toWP)) {
    return { windDirection: toWP!.metar!.wind.direction as number, windSpeed: toWP!.metar!.wind.speed };
  }

  // 2. Nearest weather station to the leg midpoint (handles the common case
  //    where user enters KLAX→KSFO but path-stations doesn't include those ICAOs)
  const midLat = (leg.from.lat + leg.to.lat) / 2;
  const midLon = (leg.from.lon + leg.to.lon) / 2;
  let best: RouteWeatherPoint | null = null;
  let bestDist = Infinity;
  for (const wp of weatherPoints) {
    if (!hasValidWind(wp)) continue;
    const dLat = wp.waypoint.lat - midLat;
    const dLon = wp.waypoint.lon - midLon;
    const d = dLat * dLat + dLon * dLon;
    if (d < bestDist) { bestDist = d; best = wp; }
  }
  if (best) {
    return { windDirection: best.metar!.wind.direction as number, windSpeed: best.metar!.wind.speed };
  }

  // 3. Calm winds — calculations still work, heading = true course
  return { windDirection: 0, windSpeed: 0 };
}

/**
 * Calculate complete NavLog for a route
 * @param legs - Route legs from useRouteBriefing
 * @param weatherPoints - Weather points with METAR data
 * @param trueAirspeed - Aircraft cruise TAS in knots
 * @param fuelBurnRate - Fuel burn rate in GPH
 * @returns Complete NavLog with leg-by-leg calculations
 */
export function calculateNavLog(
  legs: RouteLeg[],
  weatherPoints: RouteWeatherPoint[],
  trueAirspeed: number,
  fuelBurnRate: number
): NavLog {
  const navLogLegs: NavLogLeg[] = legs.map((leg) => {
    const wind = getWindForLeg(leg, weatherPoints);
    // Guard: bearing must be a valid number (undefined/NaN bearing → use 0)
    const safeBearing = typeof leg.bearing === "number" && !isNaN(leg.bearing) ? leg.bearing : 0;
    const wca = calculateWindCorrectionAngle(
      trueAirspeed,
      safeBearing,
      wind.windDirection,
      wind.windSpeed
    );
    const trueHeading = (safeBearing + wca + 360) % 360; // Normalize to 0-359
    const groundSpeed = calculateGroundSpeed(
      trueAirspeed,
      safeBearing,
      wind.windDirection,
      wind.windSpeed
    );
    console.log('[NavLog leg]', {
      from: leg.from.icao,
      to: leg.to.icao,
      TAS: trueAirspeed,
      windDir: wind.windDirection,
      windSpeed: wind.windSpeed,
      WCA: wca,
      GS: groundSpeed,
    });
    // Prevent division by zero and NaN values
    const timeEnroute =
      groundSpeed > 0 && leg.distanceNm > 0
        ? (leg.distanceNm / groundSpeed) * 60
        : 0; // minutes
    const fuelBurn =
      timeEnroute > 0 && fuelBurnRate > 0
        ? (timeEnroute / 60) * fuelBurnRate
        : 0; // gallons

    return {
      from: leg.from,
      to: leg.to,
      trueCourse: safeBearing,
      distanceNm: leg.distanceNm,
      windDirection: wind.windDirection,
      windSpeed: wind.windSpeed,
      trueAirspeed,
      windCorrectionAngle: wca,
      trueHeading: Math.round(trueHeading),
      groundSpeed,
      timeEnroute: Math.round(timeEnroute),
      fuelBurn: Math.round(fuelBurn * 10) / 10, // Round to 1 decimal
    };
  });

  // Calculate totals
  const totalDistance = navLogLegs.reduce(
    (sum, leg) => sum + leg.distanceNm,
    0
  );
  const totalTime = navLogLegs.reduce((sum, leg) => sum + leg.timeEnroute, 0);
  const totalFuel = navLogLegs.reduce((sum, leg) => sum + leg.fuelBurn, 0);

  return {
    legs: navLogLegs,
    totalDistance: Math.round(totalDistance),
    totalTime: Math.round(totalTime),
    totalFuel: Math.round(totalFuel * 10) / 10,
  };
}
