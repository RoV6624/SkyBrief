export interface FRATInputs {
  weatherScore: number;        // 0-20 (auto-calculated from route conditions)
  pilotFatigue: number;        // 1-10 (manual slider)
  airportFamiliarity: number;  // 1-10 (1=home base/familiar, 10=new/challenging airport)
  tripUrgency: number;         // 1-10 (manual slider)
}

export interface FRATResult {
  totalScore: number;
  riskLevel: RiskLevel;
  weatherScore: number;
  pilotScore: number;
  recommendation: string;
}

export type RiskLevel = "low" | "caution" | "high";
