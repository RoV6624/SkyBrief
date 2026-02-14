/**
 * Calculate pressure altitude.
 * PA = (29.92 - altimeter_setting) × 1000 + field_elevation
 */
export function calcPressureAlt(
  fieldElevFt: number,
  altimeterInHg: number
): number {
  return Math.round((29.92 - altimeterInHg) * 1000 + fieldElevFt);
}

/**
 * ISA standard temperature at a given pressure altitude.
 * ISA = 15 - (PA / 1000) × 2 °C
 */
export function calcISATemp(pressureAltFt: number): number {
  return 15 - (pressureAltFt / 1000) * 2;
}

/**
 * Calculate density altitude.
 * DA = PA + 120 × (OAT - ISA_temp)
 */
export function calcDensityAlt(
  pressureAltFt: number,
  oatCelsius: number
): number {
  const isa = calcISATemp(pressureAltFt);
  return Math.round(pressureAltFt + 120 * (oatCelsius - isa));
}

/**
 * ISA deviation in °C.
 */
export function calcISADeviation(
  pressureAltFt: number,
  oatCelsius: number
): number {
  return oatCelsius - calcISATemp(pressureAltFt);
}

export type DensityAltSeverity = "normal" | "caution" | "warning";

/**
 * Get a severity level for the density altitude.
 */
export function getDensityAltWarning(densityAlt: number): DensityAltSeverity {
  if (densityAlt >= 8000) return "warning";
  if (densityAlt >= 5000) return "caution";
  return "normal";
}
