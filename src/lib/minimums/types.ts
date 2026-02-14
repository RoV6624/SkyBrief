export interface PersonalMinimums {
  ceiling: number; // ft AGL
  visibility: number; // SM
  crosswind: number; // kts
  maxGust: number; // kts
  maxWind: number; // kts
}

export const DEFAULT_PERSONAL_MINIMUMS: PersonalMinimums = {
  ceiling: 3000,
  visibility: 5,
  crosswind: 15,
  maxGust: 25,
  maxWind: 25,
};

export interface MinimumsViolation {
  field: keyof PersonalMinimums;
  label: string;
  current: number;
  limit: number;
  unit: string;
}

export interface MinimumsResult {
  breached: boolean;
  violations: MinimumsViolation[];
}
