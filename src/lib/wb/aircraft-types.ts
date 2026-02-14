export interface WBStation {
  name: string;
  arm: number; // inches aft of datum
  maxWeight: number; // lbs
}

export interface CGEnvelopePoint {
  weight: number;
  fwdCG: number;
  aftCG: number;
}

export interface AircraftType {
  id: string;
  name: string;
  emptyWeight: number;
  emptyArm: number;
  emptyMoment: number;
  maxTakeoffWeight: number;
  maxLandingWeight: number;
  fuelCapacity: number; // gallons
  fuelArm: number;
  fuelWeightPerGal: number; // lbs per gallon (6.0 for 100LL)
  stations: WBStation[];
  cgEnvelope: CGEnvelopePoint[];
  cruiseSpeedKts: number; // True Airspeed at cruise altitude
  fuelBurnRateGPH: number; // Gallons per hour at cruise power
}

// ─────────────────────────────────────────────────────────────
// Cessna 172S Skyhawk (180 HP Lycoming IO-360-L2A)
// Data source: Cessna Model 172S NAV III Pilot's Operating Handbook
//   (FAA Approved AFM, Revision 10, Document No. 172SPHUS-10)
//   Section 6 – Weight & Balance / Equipment List
//   Section 5 – Performance (Cruise, 75% BHP @ 8,000 ft, standard atmosphere)
// ─────────────────────────────────────────────────────────────
export const CESSNA_172S: AircraftType = {
  id: "c172s",
  name: "Cessna 172S",

  // Standard empty weight — actual aircraft W&B report will differ by serial number
  emptyWeight: 1680,       // lbs (typical equipped empty weight per POH Section 6)
  emptyArm: 40.5,          // in aft of datum (typical per POH Section 6 sample W&B)
  emptyMoment: 68040,      // lbs·in (emptyWeight × emptyArm)

  maxTakeoffWeight: 2550,  // lbs — POH Section 2 (Limitations)
  maxLandingWeight: 2550,  // lbs — POH Section 2 (no separate landing limit)
  fuelCapacity: 56,        // US gal total (53 gal usable) — POH Section 2
  fuelArm: 48.0,           // in aft of datum — POH Section 6, fuel tank CG
  fuelWeightPerGal: 6.0,   // lbs/gal for 100LL Avgas — standard

  // Station arms — POH Section 6, Loading Arrangements (Figure 6-3)
  stations: [
    { name: "Pilot & Front Pax", arm: 37.0,  maxWeight: 400 }, // Fwd seats
    { name: "Rear Passengers",   arm: 73.0,  maxWeight: 400 }, // Aft seats
    { name: "Baggage A",         arm: 95.0,  maxWeight: 120 }, // Aft baggage area A
    { name: "Baggage B",         arm: 123.0, maxWeight: 50  }, // Aft baggage area B
  ],

  // CG Envelope — POH Section 6, CG Moment Envelope (Figure 6-2)
  // The 172S has a trapezoid envelope; three defining corner points:
  //   Below 1,950 lbs: fwd limit = 35.0 in, aft limit = 47.3 in
  //   At max weight 2,550 lbs: fwd limit moves aft to 40.5 in
  cgEnvelope: [
    { weight: 1500, fwdCG: 35.0, aftCG: 47.3 },
    { weight: 1950, fwdCG: 35.0, aftCG: 47.3 },
    { weight: 2550, fwdCG: 40.5, aftCG: 47.3 },
  ],

  // Cruise performance — POH Section 5, Cruise (Table 5-6 / Figure 5-8)
  // 75% BHP, 8,000 ft MSL, standard atmosphere, mixture leaned to peak EGT
  cruiseSpeedKts: 122,     // KTAS (POH shows 124 KTAS at 75%, 8000 ft; 122 is conservative)
  fuelBurnRateGPH: 8.4,    // US gal/hr (POH fuel flow at 75% BHP, leaned)
};

// ─────────────────────────────────────────────────────────────
// Piper PA-28-181 Archer III (180 HP Lycoming O-360-A4M)
// Data source: Piper Aircraft PA-28-181 Pilot's Operating Handbook
//   (FAA Approved AFM, Part No. 761-854, Revision 3)
//   Section 6 – Weight & Balance
//   Section 5 – Performance
// ─────────────────────────────────────────────────────────────
export const PIPER_PA28_181: AircraftType = {
  id: "pa28-181",
  name: "Piper PA-28-181 Archer",

  emptyWeight: 1603,       // lbs (typical equipped empty weight per POH Section 6)
  emptyArm: 86.43,         // in aft of datum (typical per POH Section 6 sample W&B)
  emptyMoment: 138511,     // lbs·in (emptyWeight × emptyArm, rounded)

  maxTakeoffWeight: 2550,  // lbs — POH Section 2 (Limitations)
  maxLandingWeight: 2550,  // lbs — POH Section 2 (no separate landing limit)
  fuelCapacity: 50,        // US gal total (48 gal usable) — POH Section 2
  fuelArm: 95.0,           // in aft of datum — POH Section 6, fuel tank CG
  fuelWeightPerGal: 6.0,   // lbs/gal for 100LL Avgas — standard

  // Station arms — POH Section 6, Loading Arrangements
  stations: [
    { name: "Pilot & Front Pax", arm: 80.5,  maxWeight: 400 }, // Fwd seats (datum = firewall)
    { name: "Rear Passengers",   arm: 118.1, maxWeight: 400 }, // Aft seats
    { name: "Baggage",           arm: 142.8, maxWeight: 200 }, // Aft baggage (100 lbs max if rear pax on board)
  ],

  // CG Envelope — POH Section 6, CG Limits (Figure 6-1)
  // Four corner points defining the approved CG range:
  cgEnvelope: [
    { weight: 1650, fwdCG: 82.0, aftCG: 93.0 },
    { weight: 1900, fwdCG: 82.0, aftCG: 93.0 },
    { weight: 2150, fwdCG: 84.0, aftCG: 93.0 },
    { weight: 2550, fwdCG: 84.0, aftCG: 93.0 },
  ],

  // Cruise performance — POH Section 5, Cruise Performance
  // 75% BHP, 8,000 ft MSL, standard atmosphere, mixture leaned
  cruiseSpeedKts: 128,     // KTAS (POH shows ~128 KTAS at 75% BHP, 8000 ft)
  fuelBurnRateGPH: 9.5,    // US gal/hr (POH fuel flow at 75% BHP, leaned)
};

export const AIRCRAFT_DATABASE: AircraftType[] = [CESSNA_172S, PIPER_PA28_181];

export function getAircraftById(id: string): AircraftType | null {
  return AIRCRAFT_DATABASE.find((a) => a.id === id) ?? null;
}

export function getAircraftByName(name: string): AircraftType | null {
  return AIRCRAFT_DATABASE.find((a) => a.name === name) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Aircraft Profile
// Lightweight user-defined aircraft stored in user-store (MMKV persisted).
// ─────────────────────────────────────────────────────────────────────────────
export interface CustomAircraftProfile {
  id: string;            // "custom-" + Date.now()
  nickname: string;      // e.g. "N12345" or "My Vision Jet"
  emptyWeight: number;   // lbs
  emptyArm: number;      // inches aft of datum
  maxGrossWeight: number; // lbs (max takeoff weight)
  cruiseTAS: number;     // KTAS at cruise altitude
  fuelBurnGPH: number;   // US gal/hr at cruise power
}

/**
 * Convert a CustomAircraftProfile to a minimal AircraftType so it works
 * everywhere an AircraftType is expected (W&B store, NavLog, etc.).
 * CG envelope is a simplified ±10 in range — not POH-accurate.
 */
export function customProfileToAircraftType(p: CustomAircraftProfile): AircraftType {
  return {
    id: p.id,
    name: p.nickname,
    emptyWeight: p.emptyWeight,
    emptyArm: p.emptyArm,
    emptyMoment: p.emptyWeight * p.emptyArm,
    maxTakeoffWeight: p.maxGrossWeight,
    maxLandingWeight: p.maxGrossWeight,
    fuelCapacity: 50,
    fuelArm: p.emptyArm,
    fuelWeightPerGal: 6.0,
    stations: [
      {
        name: "Occupants & Baggage",
        arm: p.emptyArm,
        maxWeight: p.maxGrossWeight - p.emptyWeight,
      },
    ],
    cgEnvelope: [
      { weight: p.emptyWeight,    fwdCG: p.emptyArm - 10, aftCG: p.emptyArm + 10 },
      { weight: p.maxGrossWeight, fwdCG: p.emptyArm - 10, aftCG: p.emptyArm + 10 },
    ],
    cruiseSpeedKts: p.cruiseTAS,
    fuelBurnRateGPH: p.fuelBurnGPH,
  };
}
