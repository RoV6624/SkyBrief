/**
 * Aviation wind component calculations
 *
 * Unified implementation for headwind and crosswind calculations
 * used throughout the application for consistency.
 */

export interface WindComponents {
  headwind: number;
  crosswind: number;
}

/**
 * Calculate headwind and crosswind components
 *
 * @param heading - Aircraft/runway heading (0-360°)
 * @param windDirection - Wind direction FROM (0-360°)
 * @param windSpeed - Wind speed in knots
 * @returns {headwind, crosswind} in knots (rounded to nearest integer)
 *
 * @example
 * // Runway 09 (090°), wind from 120° at 15 knots
 * calculateWindComponents(90, 120, 15)
 * // Returns: { headwind: 13, crosswind: 8 }
 */
export function calculateWindComponents(
  heading: number,
  windDirection: number,
  windSpeed: number
): WindComponents {
  // Normalize angle difference to -180 to +180
  // This ensures we get the shortest angular distance
  let diff = windDirection - heading;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  const diffRadians = (diff * Math.PI) / 180;

  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = windSpeed * Math.cos(diffRadians);

  // Crosswind component (always return absolute value)
  const crosswind = windSpeed * Math.sin(diffRadians);

  return {
    headwind: Math.round(headwind),
    crosswind: Math.round(Math.abs(crosswind)),
  };
}

/**
 * Determine if crosswind is from the left or right
 *
 * @param heading - Aircraft/runway heading (0-360°)
 * @param windDirection - Wind direction FROM (0-360°)
 * @returns 'left' | 'right' | 'none'
 */
export function getCrosswindDirection(
  heading: number,
  windDirection: number
): 'left' | 'right' | 'none' {
  let diff = windDirection - heading;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  if (Math.abs(diff) < 5) return 'none'; // Within 5° is essentially no crosswind
  return diff > 0 ? 'right' : 'left';
}
