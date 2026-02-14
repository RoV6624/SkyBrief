/**
 * Pivotal Altitude Calculations
 *
 * Calculates pivotal altitude for turns around a point maneuver.
 * The pivotal altitude depends on ground speed and is used to maintain
 * a constant radius turn around a ground reference point.
 *
 * Formula: Pivotal Altitude (AGL) = (Ground Speed in knots)² / 11.3
 */

import { calculateWindComponents } from "./wind-calculations";

/**
 * Calculate pivotal altitude for a given ground speed
 * @param groundSpeedKts - Ground speed in knots
 * @returns Pivotal altitude in feet AGL
 */
export function calculatePivotalAltitude(groundSpeedKts: number): number {
  // Formula: PA = GS² / 11.3
  // Where 11.3 is the constant for knots and feet
  return Math.round((groundSpeedKts * groundSpeedKts) / 11.3);
}

/**
 * Calculate ground speed from indicated airspeed and wind
 * @param indicatedAirspeed - Indicated airspeed in knots
 * @param windDirection - Wind direction FROM in degrees (360 = from north)
 * @param windSpeed - Wind speed in knots
 * @param trackDirection - Direction of travel (default 0 = north, for average)
 * @returns Ground speed in knots
 */
export function calculateGroundSpeedForPivotal(
  indicatedAirspeed: number,
  windDirection: number | "VRB",
  windSpeed: number,
  trackDirection: number = 0
): number {
  // If variable wind, use IAS as approximation
  if (windDirection === "VRB" || windSpeed === 0) {
    return indicatedAirspeed;
  }

  // For pivotal altitude, we typically use an average ground speed
  // Calculate for the track direction (default to north for simplicity)
  const { headwind } = calculateWindComponents(
    trackDirection,
    windDirection,
    windSpeed
  );

  // Ground speed = IAS + headwind (headwind is negative for tailwind)
  const groundSpeed = indicatedAirspeed + headwind;

  // Minimum ground speed of 10 kts to avoid nonsensical results
  return Math.max(Math.round(groundSpeed), 10);
}

/**
 * Calculate pivotal altitude from IAS and wind conditions
 * @param indicatedAirspeed - Indicated airspeed in knots
 * @param windDirection - Wind direction FROM in degrees
 * @param windSpeed - Wind speed in knots
 * @param trackDirection - Direction of travel (default 0 = north)
 * @returns Pivotal altitude in feet AGL
 */
export function calculatePivotalAltitudeFromIAS(
  indicatedAirspeed: number,
  windDirection: number | "VRB",
  windSpeed: number,
  trackDirection: number = 0
): number {
  const groundSpeed = calculateGroundSpeedForPivotal(
    indicatedAirspeed,
    windDirection,
    windSpeed,
    trackDirection
  );

  return calculatePivotalAltitude(groundSpeed);
}

/**
 * Calculate pivotal altitude range accounting for all possible headings
 * For a given wind, the extreme ground speeds occur when heading is parallel/anti-parallel to wind:
 * - Min GS (max headwind): When flying directly into the wind
 * - Max GS (max tailwind): When flying directly with the wind
 *
 * @param indicatedAirspeed - Indicated airspeed in knots
 * @param windDirection - Wind direction FROM in degrees (or "VRB" for variable)
 * @param windSpeed - Wind speed in knots
 * @returns Object with min and max pivotal altitudes in feet AGL
 */
export function calculatePivotalAltitudeRange(
  indicatedAirspeed: number,
  windDirection: number | "VRB",
  windSpeed: number
): { min: number; max: number } {
  // Variable wind or no wind: no range, use IAS for both
  if (windDirection === "VRB" || windSpeed === 0) {
    const pa = calculatePivotalAltitude(indicatedAirspeed);
    return { min: pa, max: pa };
  }

  // Calculate extreme ground speeds
  // Max headwind scenario: GS = IAS - windSpeed (flying into the wind)
  const minGS = Math.max(indicatedAirspeed - windSpeed, 10); // Enforce 10kt minimum

  // Max tailwind scenario: GS = IAS + windSpeed (flying with the wind)
  const maxGS = indicatedAirspeed + windSpeed;

  // Calculate PA for both extremes
  const minPA = calculatePivotalAltitude(minGS);
  const maxPA = calculatePivotalAltitude(maxGS);

  return { min: minPA, max: maxPA };
}

/**
 * Get typical airspeed range for an aircraft type
 * Returns [min, max, step] for the range
 */
export function getAircraftAirspeedRange(aircraftId: string): {
  min: number;
  max: number;
  step: number;
} {
  // Default ranges for common aircraft types
  const ranges: Record<string, { min: number; max: number; step: number }> = {
    c172s: { min: 85, max: 110, step: 5 },
    pa28: { min: 85, max: 120, step: 5 },
    default: { min: 85, max: 110, step: 5 },
  };

  return ranges[aircraftId] || ranges.default;
}

/**
 * Generate array of airspeeds for a given range
 */
export function generateAirspeedArray(
  min: number,
  max: number,
  step: number
): number[] {
  const speeds: number[] = [];
  for (let speed = min; speed <= max; speed += step) {
    speeds.push(speed);
  }
  return speeds;
}
