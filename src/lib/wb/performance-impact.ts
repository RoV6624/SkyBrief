import { getDensityAltWarning } from "./performance";

export interface PerformanceImpact {
  standard: number;
  actual: number;
  increase: number;
  increasePercent: number;
}

export interface RunwayAdequacy {
  isAdequate: boolean;
  margin: number;
  marginPercent: number;
  label: "SUFFICIENT" | "MARGINAL" | "INSUFFICIENT";
}

export interface PerformanceParams {
  densityAlt: number;
  fieldElevation: number;
  temperature: number;
  aircraftName: string;
  stdTakeoffRoll?: number;
  stdClimbRate?: number;
  stdServiceCeiling?: number;
  availableRunway?: number;
}

export interface PerformanceReport {
  densityAlt: number;
  severity: "normal" | "caution" | "warning";
  takeoffRoll: PerformanceImpact;
  climbRate: PerformanceImpact;
  serviceCeiling: { effectiveCeiling: number; ceilingReduction: number };
  runway: RunwayAdequacy | null;
  warnings: string[];
  advisory: string;
}

export function calcTakeoffRollImpact(
  densityAlt: number,
  stdTakeoffRoll: number
): PerformanceImpact {
  const increasePercent = (densityAlt / 1000) * 10;
  const increase = stdTakeoffRoll * (increasePercent / 100);
  const actual = stdTakeoffRoll + increase;

  return {
    standard: stdTakeoffRoll,
    actual: Math.round(actual),
    increase: Math.round(increase),
    increasePercent: Math.round(increasePercent * 10) / 10,
  };
}

export function calcClimbRateImpact(
  densityAlt: number,
  stdClimbRate: number
): PerformanceImpact {
  const decrease = (densityAlt / 1000) * 80;
  const actual = stdClimbRate - decrease;

  return {
    standard: stdClimbRate,
    actual: Math.round(actual),
    increase: Math.round(-decrease),
    increasePercent: Math.round((-decrease / stdClimbRate) * 1000) / 10,
  };
}

export function calcServiceCeilingImpact(
  densityAlt: number,
  stdServiceCeiling: number
): { effectiveCeiling: number; ceilingReduction: number } {
  const ceilingReduction = densityAlt;
  const effectiveCeiling = stdServiceCeiling - ceilingReduction;

  return {
    effectiveCeiling: Math.round(effectiveCeiling),
    ceilingReduction: Math.round(ceilingReduction),
  };
}

export function evaluateRunwayAdequacy(
  requiredRoll: number,
  availableRunway: number
): RunwayAdequacy {
  const margin = availableRunway - requiredRoll;
  const marginPercent = (margin / availableRunway) * 100;
  const isAdequate = margin > 0;

  let label: "SUFFICIENT" | "MARGINAL" | "INSUFFICIENT";
  if (marginPercent >= 50) {
    label = "SUFFICIENT";
  } else if (marginPercent >= 20) {
    label = "MARGINAL";
  } else {
    label = "INSUFFICIENT";
  }

  return {
    isAdequate,
    margin: Math.round(margin),
    marginPercent: Math.round(marginPercent * 10) / 10,
    label,
  };
}

export function getPerformanceReport(
  params: PerformanceParams
): PerformanceReport {
  const {
    densityAlt,
    fieldElevation,
    temperature,
    aircraftName,
    stdTakeoffRoll = 1760,
    stdClimbRate = 730,
    stdServiceCeiling = 14000,
    availableRunway,
  } = params;

  const severity = getDensityAltWarning(densityAlt);
  const takeoffRoll = calcTakeoffRollImpact(densityAlt, stdTakeoffRoll);
  const climbRate = calcClimbRateImpact(densityAlt, stdClimbRate);
  const serviceCeiling = calcServiceCeilingImpact(densityAlt, stdServiceCeiling);

  const runway = availableRunway
    ? evaluateRunwayAdequacy(takeoffRoll.actual, availableRunway)
    : null;

  const warnings: string[] = [];

  if (densityAlt >= 8000) {
    warnings.push(
      "High density altitude: Aircraft performance severely degraded"
    );
  } else if (densityAlt >= 5000) {
    warnings.push(
      "Elevated density altitude: Expect reduced aircraft performance"
    );
  }

  if (takeoffRoll.increasePercent >= 50) {
    warnings.push(
      `Takeoff roll increased by ${takeoffRoll.increasePercent}%: Use caution`
    );
  }

  if (climbRate.actual <= 300) {
    warnings.push(
      "Climb performance critically degraded: Consider delaying flight"
    );
  } else if (climbRate.actual <= 500) {
    warnings.push("Reduced climb rate: Plan for extended climb to altitude");
  }

  if (runway) {
    if (runway.label === "INSUFFICIENT") {
      warnings.push(
        "Insufficient runway: Required takeoff roll exceeds available runway"
      );
    } else if (runway.label === "MARGINAL") {
      warnings.push(
        "Marginal runway length: Limited margin for error or abort"
      );
    }
  }

  let advisory = "";
  if (severity === "warning") {
    advisory =
      "High density altitude conditions exist. Aircraft performance will be significantly degraded. Reduce weight, use full available runway, and lean mixture properly. Consider postponing flight until cooler conditions.";
  } else if (severity === "caution") {
    advisory =
      "Elevated density altitude. Expect longer takeoff roll and reduced climb performance. Ensure adequate runway length and avoid maximum weight operations.";
  } else {
    advisory =
      "Density altitude is within normal operating range. Standard performance expected.";
  }

  return {
    densityAlt,
    severity,
    takeoffRoll,
    climbRate,
    serviceCeiling,
    runway,
    warnings,
    advisory,
  };
}
