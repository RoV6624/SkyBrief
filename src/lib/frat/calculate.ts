import type { FlightCategory } from "@/lib/api/types";
import type { FRATInputs, FRATResult, RiskLevel } from "./types";

/**
 * Calculate weather risk score based on flight conditions
 * @param worstCategory - Worst flight category along route
 * @param avgCeiling - Average ceiling in feet AGL (null if CLR)
 * @param avgVisibility - Average visibility in SM
 * @param maxWind - Maximum wind speed in knots
 * @returns Weather score (0-20)
 */
export function calculateWeatherScore(
  worstCategory: FlightCategory | null,
  avgCeiling: number | null,
  avgVisibility: number | null,
  maxWind: number
): number {
  let score = 0;

  // Flight category base score
  if (worstCategory === "LIFR") score += 16;
  else if (worstCategory === "IFR") score += 12;
  else if (worstCategory === "MVFR") score += 7;
  else if (worstCategory === "VFR") score += 2;

  // Ceiling penalty
  if (avgCeiling !== null) {
    if (avgCeiling < 500) score += 3;
    else if (avgCeiling < 1000) score += 2;
    else if (avgCeiling < 2000) score += 1;
  }

  // Visibility penalty
  if (avgVisibility !== null) {
    if (avgVisibility < 1) score += 3;
    else if (avgVisibility < 3) score += 2;
    else if (avgVisibility < 5) score += 1;
  }

  // Wind penalty
  if (maxWind >= 30) score += 4;
  else if (maxWind >= 20) score += 3;
  else if (maxWind >= 15) score += 2;
  else if (maxWind >= 10) score += 1;

  return Math.min(score, 20); // Cap at 20
}

/**
 * Get risk recommendation text based on risk level
 */
function getRiskRecommendation(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case "low":
      return "Safe to Fly - Conditions are favorable";
    case "caution":
      return "Consider Mitigation - Review risk factors and plan accordingly";
    case "high":
      return "No Go Recommended - Risk factors exceed safe flight operations";
  }
}

/**
 * Calculate overall FRAT score and risk level
 * @param inputs - FRAT input values
 * @returns FRAT result with total score and risk level
 */
export function calculateFRAT(inputs: FRATInputs): FRATResult {
  // Pilot score: fatigue + airport familiarity + urgency
  const pilotScore =
    inputs.pilotFatigue + inputs.airportFamiliarity + inputs.tripUrgency;

  // Total score: weather weighted double — max = (20*2) + 10+10+10 = 70
  const totalScore = inputs.weatherScore * 2 + pilotScore;

  // Risk thresholds calibrated for max score of 70
  const riskLevel: RiskLevel =
    totalScore < 25 ? "low" : totalScore < 50 ? "caution" : "high";

  return {
    totalScore: Math.round(totalScore * 10) / 10, // Round to 1 decimal
    riskLevel,
    weatherScore: inputs.weatherScore,
    pilotScore: Math.round(pilotScore * 10) / 10,
    recommendation: getRiskRecommendation(riskLevel),
  };
}
