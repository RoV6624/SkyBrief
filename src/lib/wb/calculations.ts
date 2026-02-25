import type { AircraftType, CGEnvelopePoint } from "./aircraft-types";

export interface WBItem {
  name: string;
  weight: number;
  arm: number;
  moment: number;
}

export interface WBResult {
  items: WBItem[];
  totalWeight: number;
  totalMoment: number;
  cg: number;
  zfw: number;
  isOverweight: boolean;
  isCGInEnvelope: boolean;
  isWeightOutOfEnvelope?: boolean;
  fwdLimit: number;
  aftLimit: number;
}

export function calcMoment(weight: number, arm: number): number {
  return weight * arm;
}

export function calcCG(totalWeight: number, totalMoment: number): number {
  if (totalWeight === 0) return 0;
  return totalMoment / totalWeight;
}

/**
 * Compute full W&B for an aircraft.
 * Supports optional custom empty weight/arm overrides from saved profiles.
 */
export function calcTotalWB(
  aircraft: AircraftType,
  stationWeights: number[],
  fuelGallons: number,
  fuelUnit: "gal" | "lbs",
  customEmptyWeight?: number | null,
  customEmptyArm?: number | null
): WBResult {
  const items: WBItem[] = [];

  // Empty aircraft — use custom overrides if provided
  const emptyW = customEmptyWeight ?? aircraft.emptyWeight;
  const emptyA = customEmptyArm ?? aircraft.emptyArm;
  items.push({
    name: "Aircraft Empty",
    weight: emptyW,
    arm: emptyA,
    moment: calcMoment(emptyW, emptyA),
  });

  // Stations
  let stationTotalWeight = 0;
  for (let i = 0; i < aircraft.stations.length; i++) {
    const station = aircraft.stations[i];
    const weight = stationWeights[i] ?? 0;
    stationTotalWeight += weight;
    items.push({
      name: station.name,
      weight,
      arm: station.arm,
      moment: calcMoment(weight, station.arm),
    });
  }

  // Fuel
  const fuelWeight =
    fuelUnit === "gal"
      ? fuelGallons * aircraft.fuelWeightPerGal
      : fuelGallons; // already in lbs
  items.push({
    name: "Fuel",
    weight: fuelWeight,
    arm: aircraft.fuelArm,
    moment: calcMoment(fuelWeight, aircraft.fuelArm),
  });

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const totalMoment = items.reduce((sum, item) => sum + item.moment, 0);
  const cg = calcCG(totalWeight, totalMoment);
  const zfw = totalWeight - fuelWeight;

  // Determine CG limits at this weight
  const { fwd, aft } = getCGLimitsAtWeight(totalWeight, aircraft.cgEnvelope);

  return {
    items,
    totalWeight,
    totalMoment,
    cg,
    zfw,
    isOverweight: totalWeight > aircraft.maxTakeoffWeight,
    isCGInEnvelope: checkCGInEnvelope(totalWeight, cg, aircraft.cgEnvelope),
    isWeightOutOfEnvelope: aircraft.cgEnvelope.length > 0 && (totalWeight < aircraft.cgEnvelope[0].weight || totalWeight > aircraft.cgEnvelope[aircraft.cgEnvelope.length - 1].weight),
    fwdLimit: fwd,
    aftLimit: aft,
  };
}

/**
 * Calculate landing W&B after fuel burn.
 */
export function calcLandingWB(
  takeoffResult: WBResult,
  fuelBurnGallons: number,
  aircraft: AircraftType
): WBResult {
  const burnWeight = fuelBurnGallons * aircraft.fuelWeightPerGal;
  const burnMoment = calcMoment(burnWeight, aircraft.fuelArm);

  const totalWeight = takeoffResult.totalWeight - burnWeight;
  const totalMoment = takeoffResult.totalMoment - burnMoment;
  const cg = calcCG(totalWeight, totalMoment);

  // Recalculate fuel item
  const fuelItem = takeoffResult.items.find((i) => i.name === "Fuel");
  const remainingFuel = (fuelItem?.weight ?? 0) - burnWeight;

  const items = takeoffResult.items.map((item) =>
    item.name === "Fuel"
      ? {
          ...item,
          weight: remainingFuel,
          moment: calcMoment(remainingFuel, aircraft.fuelArm),
        }
      : item
  );

  const { fwd, aft } = getCGLimitsAtWeight(totalWeight, aircraft.cgEnvelope);

  return {
    items,
    totalWeight,
    totalMoment,
    cg,
    zfw: takeoffResult.zfw,
    isOverweight: totalWeight > aircraft.maxLandingWeight,
    isCGInEnvelope: checkCGInEnvelope(totalWeight, cg, aircraft.cgEnvelope),
    isWeightOutOfEnvelope: aircraft.cgEnvelope.length > 0 && (totalWeight < aircraft.cgEnvelope[0].weight || totalWeight > aircraft.cgEnvelope[aircraft.cgEnvelope.length - 1].weight),
    fwdLimit: fwd,
    aftLimit: aft,
  };
}

/**
 * Interpolate CG limits at a given weight from the envelope table.
 */
function getCGLimitsAtWeight(
  weight: number,
  envelope: CGEnvelopePoint[]
): { fwd: number; aft: number } {
  if (envelope.length === 0) return { fwd: 0, aft: 0 };

  // Clamp weight within envelope range
  const minW = envelope[0].weight;
  const maxW = envelope[envelope.length - 1].weight;
  const clampedWeight = Math.max(minW, Math.min(maxW, weight));

  // Find interpolation segment
  for (let i = 0; i < envelope.length - 1; i++) {
    const lower = envelope[i];
    const upper = envelope[i + 1];
    if (clampedWeight >= lower.weight && clampedWeight <= upper.weight) {
      const t = (clampedWeight - lower.weight) / (upper.weight - lower.weight);
      return {
        fwd: lower.fwdCG + t * (upper.fwdCG - lower.fwdCG),
        aft: lower.aftCG + t * (upper.aftCG - lower.aftCG),
      };
    }
  }

  // Fallback to last point
  const last = envelope[envelope.length - 1];
  return { fwd: last.fwdCG, aft: last.aftCG };
}

/**
 * Check if CG is within the envelope at the given weight.
 */
function checkCGInEnvelope(
  weight: number,
  cg: number,
  envelope: CGEnvelopePoint[]
): boolean {
  const { fwd, aft } = getCGLimitsAtWeight(weight, envelope);
  return cg >= fwd && cg <= aft;
}
