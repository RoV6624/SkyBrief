/**
 * Aviation unit conversion utilities
 *
 * Common conversions for temperature, speed, distance, and altitude
 * used throughout the aviation app.
 */

// ─── Temperature Conversions ────────────────────────────────────────────────

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9);
}

// ─── Speed Conversions ──────────────────────────────────────────────────────

export function knotsToMph(knots: number): number {
  return Math.round(knots * 1.15078);
}

export function knotsToKph(knots: number): number {
  return Math.round(knots * 1.852);
}

export function mphToKnots(mph: number): number {
  return Math.round(mph / 1.15078);
}

export function kphToKnots(kph: number): number {
  return Math.round(kph / 1.852);
}

// ─── Distance Conversions ───────────────────────────────────────────────────

export function feetToMeters(feet: number): number {
  return Math.round(feet * 0.3048);
}

export function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084);
}

export function nauticalMilesToStatuteMiles(nm: number): number {
  return Math.round(nm * 1.15078);
}

export function statuteMilesToNauticalMiles(sm: number): number {
  return Math.round(sm / 1.15078);
}

export function nauticalMilesToKilometers(nm: number): number {
  return Math.round(nm * 1.852);
}

export function kilometersToNauticalMiles(km: number): number {
  return Math.round(km / 1.852);
}

// ─── Pressure Conversions ───────────────────────────────────────────────────

export function inHgToHpa(inHg: number): number {
  return Math.round(inHg * 33.8639);
}

export function hpaToInHg(hpa: number): number {
  return Math.round((hpa / 33.8639) * 100) / 100; // 2 decimal places
}

// ─── Time Formatting ───────────────────────────────────────────────────────

export function formatMinutesToHM(minutes: number): string {
  if (isNaN(minutes) || minutes < 0) return "---";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}m`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
