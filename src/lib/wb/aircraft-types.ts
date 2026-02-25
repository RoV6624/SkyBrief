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

// ═══════════════════════════════════════════════════════════════
//  CESSNA AIRCRAFT
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Cessna 150M (100 HP Continental O-200-A)
// Data source: Cessna Model 150M Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS 3A19
//   Section 6 – Weight & Balance / Section 5 – Performance
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const CESSNA_150M: AircraftType = {
  id: "c150m",
  name: "Cessna 150M",

  emptyWeight: 1111,       // lbs (typical equipped empty weight per POH Section 6)
  emptyArm: 33.5,          // in aft of datum (typical per POH Section 6 sample W&B)
  emptyMoment: 37219,      // lbs·in (emptyWeight × emptyArm)

  maxTakeoffWeight: 1600,  // lbs — TCDS 3A19 / POH Section 2 (Normal Category)
  maxLandingWeight: 1600,  // lbs — no separate landing limit
  fuelCapacity: 26,        // US gal total (22.5 gal usable) — standard tanks
  fuelArm: 42.0,           // in aft of datum — POH Section 6, fuel tank CG
  fuelWeightPerGal: 6.0,   // lbs/gal for 100LL Avgas

  // Station arms — POH Section 6, Loading Arrangements
  stations: [
    { name: "Pilot & Front Pax", arm: 39.0,  maxWeight: 400 }, // Side-by-side front seats
    { name: "Baggage",           arm: 64.0,  maxWeight: 120 }, // Aft baggage shelf
  ],

  // CG Envelope — TCDS 3A19, Normal Category
  // Forward: 31.5" at ≤1280 lbs, linear to 32.9" at 1600 lbs
  // Aft: 37.5" at all weights
  cgEnvelope: [
    { weight: 1000, fwdCG: 31.5, aftCG: 37.5 },
    { weight: 1280, fwdCG: 31.5, aftCG: 37.5 },
    { weight: 1600, fwdCG: 32.9, aftCG: 37.5 },
  ],

  // Cruise performance — POH Section 5
  // 75% BHP, 8,000 ft MSL, standard atmosphere, mixture leaned
  cruiseSpeedKts: 107,     // KTAS
  fuelBurnRateGPH: 6.1,    // US gal/hr
};

// ─────────────────────────────────────────────────────────────
// Cessna 152 (110 HP Lycoming O-235-L2C)
// Data source: Cessna Model 152 Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS 3A19
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const CESSNA_152: AircraftType = {
  id: "c152",
  name: "Cessna 152",

  emptyWeight: 1104,       // lbs (typical equipped empty weight per POH Section 6)
  emptyArm: 33.6,          // in aft of datum
  emptyMoment: 37094,      // lbs·in

  maxTakeoffWeight: 1670,  // lbs — TCDS 3A19 / POH Section 2
  maxLandingWeight: 1670,  // lbs
  fuelCapacity: 26,        // US gal total (24.5 gal usable) — standard tanks
  fuelArm: 42.0,           // in aft of datum — POH Section 6
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 39.0,  maxWeight: 400 },
    { name: "Baggage",           arm: 64.0,  maxWeight: 120 },
  ],

  // CG Envelope — TCDS 3A19, Normal Category
  // Forward: 31.0" at ≤1350 lbs, linear to 32.6" at 1670 lbs
  // Aft: 36.5" at all weights
  cgEnvelope: [
    { weight: 1000, fwdCG: 31.0, aftCG: 36.5 },
    { weight: 1350, fwdCG: 31.0, aftCG: 36.5 },
    { weight: 1670, fwdCG: 32.6, aftCG: 36.5 },
  ],

  cruiseSpeedKts: 107,     // KTAS at 75% BHP, 8000 ft
  fuelBurnRateGPH: 6.1,    // US gal/hr at 75% BHP, leaned
};

// ─────────────────────────────────────────────────────────────
// Cessna 172N Skyhawk (160 HP Lycoming O-320-H2AD)
// Data source: Cessna Model 172N Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS 3A12, Rev. 86
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const CESSNA_172N: AircraftType = {
  id: "c172n",
  name: "Cessna 172N",

  emptyWeight: 1453,       // lbs (typical equipped empty weight)
  emptyArm: 39.9,          // in aft of datum
  emptyMoment: 57975,      // lbs·in

  maxTakeoffWeight: 2300,  // lbs — TCDS 3A12
  maxLandingWeight: 2300,  // lbs
  fuelCapacity: 40,        // US gal total (38 gal usable) — standard tanks
  fuelArm: 48.0,           // in aft of datum
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 37.0,  maxWeight: 400 },
    { name: "Rear Passengers",   arm: 73.0,  maxWeight: 400 },
    { name: "Baggage",           arm: 95.0,  maxWeight: 120 },
  ],

  // CG Envelope — TCDS 3A12, Normal Category
  // Forward: 35.0" at ≤1500 lbs, linear to 41.0" at 2300 lbs
  // Aft: 47.2" at all weights
  cgEnvelope: [
    { weight: 1500, fwdCG: 35.0, aftCG: 47.2 },
    { weight: 1950, fwdCG: 35.0, aftCG: 47.2 },
    { weight: 2300, fwdCG: 41.0, aftCG: 47.2 },
  ],

  cruiseSpeedKts: 115,     // KTAS at 75% BHP, 8000 ft
  fuelBurnRateGPH: 8.4,    // US gal/hr
};

// ─────────────────────────────────────────────────────────────
// Cessna 172R Skyhawk (160 HP Lycoming IO-360-L2A)
// Data source: Cessna Model 172R Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS 3A12
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const CESSNA_172R: AircraftType = {
  id: "c172r",
  name: "Cessna 172R",

  emptyWeight: 1639,       // lbs (typical equipped empty weight per POH)
  emptyArm: 39.4,          // in aft of datum
  emptyMoment: 64576,      // lbs·in

  maxTakeoffWeight: 2450,  // lbs — TCDS 3A12 / POH Section 2
  maxLandingWeight: 2450,  // lbs
  fuelCapacity: 56,        // US gal total (53 gal usable) — POH Section 2
  fuelArm: 48.0,           // in aft of datum
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 37.0,  maxWeight: 400 },
    { name: "Rear Passengers",   arm: 73.0,  maxWeight: 400 },
    { name: "Baggage A",         arm: 95.0,  maxWeight: 120 },
    { name: "Baggage B",         arm: 123.0, maxWeight: 50  },
  ],

  // CG Envelope — TCDS 3A12, Normal Category
  // Forward: 35.0" at ≤1950 lbs, linear to 40.0" at 2450 lbs
  // Aft: 47.3" at all weights
  cgEnvelope: [
    { weight: 1500, fwdCG: 35.0, aftCG: 47.3 },
    { weight: 1950, fwdCG: 35.0, aftCG: 47.3 },
    { weight: 2450, fwdCG: 40.0, aftCG: 47.3 },
  ],

  cruiseSpeedKts: 116,     // KTAS at 75% BHP, 8000 ft (160 HP vs 180 HP in 172S)
  fuelBurnRateGPH: 8.4,    // US gal/hr at 75% BHP, leaned
};

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
// Cessna 182T Skylane (230 HP Lycoming IO-540-AB1A5)
// Data source: Cessna Model 182T Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS 3A13
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const CESSNA_182T: AircraftType = {
  id: "c182t",
  name: "Cessna 182T Skylane",

  emptyWeight: 1970,       // lbs (typical equipped empty weight per POH Section 6)
  emptyArm: 41.0,          // in aft of datum
  emptyMoment: 80770,      // lbs·in

  maxTakeoffWeight: 3100,  // lbs — TCDS 3A13 / POH Section 2
  maxLandingWeight: 2950,  // lbs — POH Section 2 (separate landing limit)
  fuelCapacity: 87,        // US gal total (78 gal usable) — two 43.5-gal wing tanks
  fuelArm: 46.6,           // in aft of datum — POH Section 6 / WVFC calculator
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 37.0,  maxWeight: 400 },
    { name: "Rear Passengers",   arm: 74.0,  maxWeight: 400 },
    { name: "Baggage A",         arm: 97.0,  maxWeight: 200 }, // Higher limit than 172
    { name: "Baggage B",         arm: 116.0, maxWeight: 80  },
    { name: "Baggage C",         arm: 129.0, maxWeight: 80  },
  ],

  // CG Envelope — TCDS 3A13 / WVFC calculator, Normal Category
  // Forward: 33.0" at ≤2250 lbs, linear to 35.5" at 2700 lbs, to 40.9" at 3100 lbs
  // Aft: 46.0" at all weights
  cgEnvelope: [
    { weight: 1800, fwdCG: 33.0, aftCG: 46.0 },
    { weight: 2250, fwdCG: 33.0, aftCG: 46.0 },
    { weight: 2700, fwdCG: 35.5, aftCG: 46.0 },
    { weight: 3100, fwdCG: 40.9, aftCG: 46.0 },
  ],

  // Cruise performance — POH Section 5
  // 75% BHP, 8,000 ft MSL, standard atmosphere, mixture leaned
  cruiseSpeedKts: 145,     // KTAS
  fuelBurnRateGPH: 14.5,   // US gal/hr
};

// ═══════════════════════════════════════════════════════════════
//  PIPER AIRCRAFT
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Piper PA-28-140 Cherokee (150 HP Lycoming O-320-E2A)
// Data source: Piper PA-28-140 Owner's Handbook
//   (FAA Approved AFM) + FAA TCDS 2A13
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const PIPER_PA28_140: AircraftType = {
  id: "pa28-140",
  name: "Piper PA-28-140 Cherokee",

  emptyWeight: 1301,       // lbs (typical equipped, per MetarCentral TCDS data)
  emptyArm: 85.7,          // in aft of datum (per POH W&B calculator, trumpetb.net)
  emptyMoment: 111496,     // lbs·in

  maxTakeoffWeight: 2150,  // lbs — TCDS 2A13 / POH Section 2 (later S/N 28-20940+)
  maxLandingWeight: 2150,  // lbs
  fuelCapacity: 50,        // US gal total (48 gal usable)
  fuelArm: 95.0,           // in aft of datum
  fuelWeightPerGal: 6.0,

  // Station arms — POH Section 6 / WVFC N4351T / trumpetb.net calculator
  // NOTE: The 140 was originally a 2-seat trainer; rear seats and baggage share
  // the same arm at 117.0", unlike later PA-28 models (118.1/142.8).
  stations: [
    { name: "Pilot & Front Pax", arm: 85.5,  maxWeight: 340 },
    { name: "Rear Passengers",   arm: 117.0, maxWeight: 170 },
    { name: "Baggage",           arm: 117.0, maxWeight: 100 },
  ],

  // CG Envelope — WVFC POH-based calculator (N4351T), Normal Category
  cgEnvelope: [
    { weight: 1200, fwdCG: 84.0, aftCG: 95.9 },
    { weight: 1650, fwdCG: 84.0, aftCG: 95.9 },
    { weight: 1980, fwdCG: 85.8, aftCG: 95.9 },
    { weight: 2150, fwdCG: 88.4, aftCG: 95.9 },
  ],

  cruiseSpeedKts: 115,     // KTAS at 75% BHP, 8000 ft
  fuelBurnRateGPH: 8.4,    // US gal/hr at 75% BHP, leaned (POH)
};

// ─────────────────────────────────────────────────────────────
// Piper PA-28-161 Warrior III (160 HP Lycoming O-320-D3G)
// Data source: Piper PA-28-161 Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS 2A13
// Datum: front face of firewall
// ─────────────────────────────────────────────────────────────
export const PIPER_PA28_161: AircraftType = {
  id: "pa28-161",
  name: "Piper PA-28-161 Warrior III",

  emptyWeight: 1509,       // lbs (typical equipped, per planephd/AOPA)
  emptyArm: 85.4,          // in aft of datum (per WVFC POH-based calculator)
  emptyMoment: 128869,     // lbs·in

  maxTakeoffWeight: 2440,  // lbs — TCDS 2A13 / POH Section 2
  maxLandingWeight: 2440,  // lbs
  fuelCapacity: 50,        // US gal total (48 gal usable)
  fuelArm: 95.0,           // in aft of datum
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 80.5,  maxWeight: 340 },
    { name: "Rear Passengers",   arm: 118.1, maxWeight: 340 },
    { name: "Baggage",           arm: 142.8, maxWeight: 200 },
  ],

  // CG Envelope — WVFC POH-based calculator, Normal Category
  cgEnvelope: [
    { weight: 1200, fwdCG: 83.0, aftCG: 93.0 },
    { weight: 1950, fwdCG: 83.0, aftCG: 93.0 },
    { weight: 2440, fwdCG: 87.0, aftCG: 93.0 },
  ],

  cruiseSpeedKts: 117,     // KTAS at 75% BHP, 8000 ft
  fuelBurnRateGPH: 8.0,    // US gal/hr at 75% BHP, leaned (planephd POH data)
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

// ─────────────────────────────────────────────────────────────
// Piper PA-28R-201 Arrow III (200 HP Lycoming IO-360-C1C6)
// Data source: Piper PA-28R-201 Pilot's Operating Handbook
//   (FAA Approved AFM, Part No. 761-658) + FAA TCDS 2A13
// Datum: front face of firewall
// Complex: retractable gear, constant-speed prop
// ─────────────────────────────────────────────────────────────
export const PIPER_PA28R_201: AircraftType = {
  id: "pa28r-201",
  name: "Piper PA-28R-201 Arrow III",

  emptyWeight: 1637,       // lbs (typical equipped empty weight)
  emptyArm: 84.2,          // in aft of datum
  emptyMoment: 137834,     // lbs·in

  maxTakeoffWeight: 2750,  // lbs — TCDS 2A13 / POH Section 2
  maxLandingWeight: 2750,  // lbs
  fuelCapacity: 72,        // US gal total (68 gal usable)
  fuelArm: 95.0,           // in aft of datum
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 80.5,  maxWeight: 400 },
    { name: "Rear Passengers",   arm: 118.1, maxWeight: 400 },
    { name: "Baggage",           arm: 142.8, maxWeight: 200 },
  ],

  // CG Envelope — TCDS 2A13, Normal Category
  // Similar to PA-28R-200 per WVFC calculator data
  cgEnvelope: [
    { weight: 1400, fwdCG: 80.0, aftCG: 93.0 },
    { weight: 1800, fwdCG: 80.0, aftCG: 93.0 },
    { weight: 2300, fwdCG: 82.0, aftCG: 93.0 },
    { weight: 2750, fwdCG: 87.0, aftCG: 93.0 },
  ],

  cruiseSpeedKts: 138,     // KTAS at 75% BHP, 8000 ft
  fuelBurnRateGPH: 11.6,   // US gal/hr at 75% BHP, leaned
};

// ─────────────────────────────────────────────────────────────
// Piper PA-38-112 Tomahawk (112 HP Lycoming O-235-L2C)
// Data source: Piper PA-38-112 Pilot's Operating Handbook
//   (FAA Approved AFM, Part No. 761-658) + FAA TCDS A25EU
// Datum: nose of aircraft (78.4" forward of firewall)
// ─────────────────────────────────────────────────────────────
export const PIPER_PA38_112: AircraftType = {
  id: "pa38-112",
  name: "Piper PA-38-112 Tomahawk",

  emptyWeight: 1128,       // lbs (typical equipped empty weight)
  emptyArm: 85.5,          // in aft of datum
  emptyMoment: 96444,      // lbs·in

  maxTakeoffWeight: 1670,  // lbs — TCDS A25EU / POH Section 2 (Normal Category)
  maxLandingWeight: 1670,  // lbs
  fuelCapacity: 32,        // US gal total (30 gal usable) — two 16-gal wing tanks
  fuelArm: 75.0,           // in aft of datum — ahead of occupants (wing tanks)
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Passenger", arm: 85.5,  maxWeight: 400 }, // Side-by-side seats
    { name: "Baggage",           arm: 115.0, maxWeight: 100 }, // Aft baggage compartment
  ],

  // CG Envelope — TCDS A25EU, Normal Category
  // Note: envelope converges at higher weights
  // Forward: 82.0" at ≤1230 lbs, linear to 84.6" at 1670 lbs
  // Aft: 93.0" at ≤1230 lbs, linear to 90.0" at 1670 lbs
  cgEnvelope: [
    { weight: 1100, fwdCG: 82.0, aftCG: 93.0 },
    { weight: 1230, fwdCG: 82.0, aftCG: 93.0 },
    { weight: 1670, fwdCG: 84.6, aftCG: 90.0 },
  ],

  cruiseSpeedKts: 108,     // KTAS at 75% BHP, 8000 ft
  fuelBurnRateGPH: 6.4,    // US gal/hr at 75% BHP, leaned
};

// ─────────────────────────────────────────────────────────────
// Piper PA-44-180 Seminole (2× 180 HP Lycoming O-360-A1H6)
// Data source: Piper PA-44-180 Information Manual
//   (FAA Approved AFM, Part No. 761-662) + FAA TCDS A22SO
// Datum: nose of aircraft
// Multi-engine trainer
// ─────────────────────────────────────────────────────────────
export const PIPER_PA44_180: AircraftType = {
  id: "pa44-180",
  name: "Piper PA-44-180 Seminole",

  emptyWeight: 2406,       // lbs (typical equipped empty weight)
  emptyArm: 86.0,          // in aft of datum
  emptyMoment: 206916,     // lbs·in

  maxTakeoffWeight: 3800,  // lbs — TCDS A22SO / POH Section 2
  maxLandingWeight: 3800,  // lbs
  fuelCapacity: 110,       // US gal total (108 gal usable) — two 55-gal nacelle tanks
  fuelArm: 93.6,           // in aft of datum — nacelle fuel tanks
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 85.5,  maxWeight: 400 },
    { name: "Rear Passengers",   arm: 118.1, maxWeight: 400 },
    { name: "Baggage",           arm: 142.0, maxWeight: 200 },
  ],

  // CG Envelope — TCDS A22SO / POH, Normal Category
  cgEnvelope: [
    { weight: 2800, fwdCG: 84.0, aftCG: 93.0 },
    { weight: 3400, fwdCG: 85.0, aftCG: 93.0 },
    { weight: 3800, fwdCG: 89.0, aftCG: 93.0 },
  ],

  // Cruise performance — POH Section 5
  // 75% BHP, 8,000 ft MSL, standard atmosphere, mixture leaned (both engines)
  cruiseSpeedKts: 157,     // KTAS (planephd, risingup verified)
  fuelBurnRateGPH: 16.0,   // US gal/hr total (both engines, ~8 GPH each, economy cruise)
};

// ═══════════════════════════════════════════════════════════════
//  DIAMOND AIRCRAFT
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Diamond DA20-C1 Eclipse (125 HP Continental IO-240-B)
// Data source: Diamond DA20-C1 Airplane Flight Manual
//   (FAA Approved AFM, Doc No. 60101e) + TSAviation W&B calculator
// Datum: leading edge of wing root rib
// NOTE: Small arm values are correct — datum is at the wing, not the nose/firewall
// ─────────────────────────────────────────────────────────────
export const DIAMOND_DA20_C1: AircraftType = {
  id: "da20-c1",
  name: "Diamond DA20-C1 Eclipse",

  emptyWeight: 1186,       // lbs (typical equipped empty weight per AFM)
  emptyArm: 8.31,          // in aft of datum (wing LE datum — small arm is correct)
  emptyMoment: 9856,       // lbs·in

  maxTakeoffWeight: 1764,  // lbs — AFM / FAA TCDS
  maxLandingWeight: 1764,  // lbs
  fuelCapacity: 24,        // US gal usable (24.5 total) — single tank behind seats
  fuelArm: 32.44,          // in aft of datum — tank behind seats / under baggage
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Passenger", arm: 5.63,   maxWeight: 400 }, // Side-by-side seats
    { name: "Baggage",           arm: 32.44,  maxWeight: 44  }, // Behind seats, above fuel
  ],

  // CG Envelope — AFM Section 6
  // Envelope converges at higher weights
  // At ≤1653 lbs: fwd = 7.95", aft = 12.48"
  // At 1764 lbs: fwd = 8.07", aft = 12.16"
  cgEnvelope: [
    { weight: 1100, fwdCG: 7.95, aftCG: 12.48 },
    { weight: 1653, fwdCG: 7.95, aftCG: 12.48 },
    { weight: 1764, fwdCG: 8.07, aftCG: 12.16 },
  ],

  // Cruise performance — AFM Section 5
  // 75% power, 8,000 ft MSL, standard atmosphere, leaned
  cruiseSpeedKts: 138,     // KTAS at 75% power
  fuelBurnRateGPH: 5.5,    // US gal/hr at 75% power
};

// ─────────────────────────────────────────────────────────────
// Diamond DA40 Diamond Star (180 HP Lycoming IO-360-M1A)
// Data source: Diamond DA40-180 Airplane Flight Manual
//   (FAA Approved AFM) — DA40-180FP (fixed-pitch) variant
// Datum: leading edge of wing root rib
// ─────────────────────────────────────────────────────────────
export const DIAMOND_DA40: AircraftType = {
  id: "da40",
  name: "Diamond DA40 Diamond Star",

  emptyWeight: 1757,       // lbs (typical equipped, per WVFC N566DS)
  emptyArm: 96.7,          // in aft of datum (WVFC verified)
  emptyMoment: 169904,     // lbs·in

  maxTakeoffWeight: 2535,  // lbs — AFM / FAA TCDS (standard 40-gal model)
  maxLandingWeight: 2535,  // lbs
  fuelCapacity: 40,        // US gal usable (DA40-180 standard wing tanks)
  fuelArm: 103.5,          // in aft of datum — wing tanks
  fuelWeightPerGal: 6.0,

  stations: [
    { name: "Pilot & Front Pax", arm: 90.6,  maxWeight: 340 },
    { name: "Rear Passengers",   arm: 128.0, maxWeight: 170 },
    { name: "Baggage",           arm: 143.7, maxWeight: 60  },
  ],

  // CG Envelope — AFM Section 6 / WVFC calculator (N566DS)
  // Forward limit moves aft at higher weights; aft limit constant
  cgEnvelope: [
    { weight: 1720, fwdCG: 94.5, aftCG: 100.4 },
    { weight: 2161, fwdCG: 94.5, aftCG: 100.4 },
    { weight: 2535, fwdCG: 97.6, aftCG: 100.4 },
  ],

  // Cruise performance — AFM Section 5
  // 75% power, 8,000 ft MSL, leaned
  cruiseSpeedKts: 147,     // KTAS
  fuelBurnRateGPH: 9.5,    // US gal/hr
};

// ═══════════════════════════════════════════════════════════════
//  CIRRUS AIRCRAFT
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Cirrus SR20 (200 HP Lycoming IO-360-ES)
// Data source: Cirrus SR20 Pilot's Operating Handbook
//   (FAA Approved AFM) — Generation 3 (G3) baseline model
// Datum: 100.0" forward of firewall
// NOTE: Large arm values are correct — datum is far forward of the nose
// ─────────────────────────────────────────────────────────────
export const CIRRUS_SR20: AircraftType = {
  id: "sr20",
  name: "Cirrus SR20",

  emptyWeight: 2162,       // lbs (typical equipped, per WVFC N8139D)
  emptyArm: 141.0,         // in aft of datum (Fuselage Station 0 = spinner tip)
  emptyMoment: 304842,     // lbs·in

  maxTakeoffWeight: 3050,  // lbs — POH Section 2 (G3+ model)
  maxLandingWeight: 2900,  // lbs
  fuelCapacity: 56,        // US gal usable (60.5 total) — wing tanks
  fuelArm: 153.8,          // in aft of datum — WVFC verified
  fuelWeightPerGal: 6.0,

  // Station arms — WVFC calculator (N8139D, programmed from POH)
  stations: [
    { name: "Pilot & Front Pax", arm: 143.5, maxWeight: 440 },
    { name: "Rear Passengers",   arm: 180.0, maxWeight: 440 },
    { name: "Baggage",           arm: 208.0, maxWeight: 130 },
  ],

  // CG Envelope — POH Section 6 / WVFC calculator
  cgEnvelope: [
    { weight: 2110, fwdCG: 138.7, aftCG: 144.6 },
    { weight: 2570, fwdCG: 140.5, aftCG: 147.4 },
    { weight: 2900, fwdCG: 143.0, aftCG: 148.1 },
    { weight: 3050, fwdCG: 144.0, aftCG: 148.0 },
  ],

  // Cruise performance — POH Section 5
  // 75% power, 8,000 ft MSL, leaned
  cruiseSpeedKts: 155,     // KTAS
  fuelBurnRateGPH: 11.6,   // US gal/hr
};

// ─────────────────────────────────────────────────────────────
// Cirrus SR22 (310 HP Continental IO-550-N)
// Data source: Cirrus SR22 Pilot's Operating Handbook
//   (FAA Approved AFM) — Generation 3 (G3) model
// Datum: 100.0" forward of firewall
// ─────────────────────────────────────────────────────────────
export const CIRRUS_SR22: AircraftType = {
  id: "sr22",
  name: "Cirrus SR22",

  emptyWeight: 2357,       // lbs (typical equipped, per WVFC N809SR)
  emptyArm: 138.0,         // in aft of datum (Fuselage Station 0 = spinner tip)
  emptyMoment: 325266,     // lbs·in

  maxTakeoffWeight: 3400,  // lbs — POH Section 2
  maxLandingWeight: 3400,  // lbs
  fuelCapacity: 81,        // US gal usable (84 total) — G1/G2 wing tanks
  fuelArm: 154.9,          // in aft of datum — WVFC verified
  fuelWeightPerGal: 6.0,

  // Station arms — WVFC calculator (N809SR, programmed from POH)
  stations: [
    { name: "Pilot & Front Pax", arm: 143.5, maxWeight: 400 },
    { name: "Rear Passengers",   arm: 180.0, maxWeight: 400 },
    { name: "Baggage",           arm: 208.0, maxWeight: 130 },
  ],

  // CG Envelope — POH Section 6 / WVFC calculator
  // Aft limit constant at 148.1"; forward limit varies with weight
  cgEnvelope: [
    { weight: 2100, fwdCG: 137.8, aftCG: 148.1 },
    { weight: 2700, fwdCG: 139.1, aftCG: 148.1 },
    { weight: 3400, fwdCG: 142.3, aftCG: 148.1 },
  ],

  // Cruise performance — POH Section 5
  // 75% power, 8,000 ft MSL, best power mixture
  cruiseSpeedKts: 181,     // KTAS
  fuelBurnRateGPH: 17.8,   // US gal/hr
};

// ═══════════════════════════════════════════════════════════════
//  BEECHCRAFT
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Beechcraft 76 Duchess (2× 180 HP Lycoming O-360-A1G6D)
// Data source: Beechcraft 76 Duchess Pilot's Operating Handbook
//   (FAA Approved AFM) + FAA TCDS A24CE
// Datum: 70.5" forward of wing leading edge at root
// Multi-engine trainer
// ─────────────────────────────────────────────────────────────
export const BEECHCRAFT_76: AircraftType = {
  id: "be76",
  name: "Beechcraft 76 Duchess",

  emptyWeight: 2460,       // lbs (typical equipped, per WVFC N6002K)
  emptyArm: 108.66,        // in aft of datum (Beechcraft datum: 78.4" fwd of nose)
  emptyMoment: 267263,     // lbs·in

  maxTakeoffWeight: 3900,  // lbs — TCDS A24CE / POH Section 2
  maxLandingWeight: 3900,  // lbs
  fuelCapacity: 100,       // US gal total (98 gal usable) — two 50-gal wing tanks
  fuelArm: 117.0,          // in aft of datum — wing tanks (WVFC verified)
  fuelWeightPerGal: 6.0,

  // Station arms — WVFC calculator (N6002K, programmed from POH)
  stations: [
    { name: "Pilot & Front Pax", arm: 108.0, maxWeight: 500 },
    { name: "Rear Passengers",   arm: 142.0, maxWeight: 400 },
    { name: "Baggage",           arm: 167.0, maxWeight: 200 },
  ],

  // CG Envelope — POH Section 6 / WVFC calculator
  // Aft limit constant at 117.5"; forward limit varies
  cgEnvelope: [
    { weight: 2500, fwdCG: 106.6, aftCG: 117.5 },
    { weight: 3250, fwdCG: 106.2, aftCG: 117.5 },
    { weight: 3900, fwdCG: 110.6, aftCG: 117.5 },
  ],

  // Cruise performance — POH Section 5
  // 75% BHP, 8,000 ft MSL, standard atmosphere (both engines)
  cruiseSpeedKts: 160,     // KTAS
  fuelBurnRateGPH: 19.7,   // US gal/hr total (both engines, ~9.85 GPH each)
};

// ═══════════════════════════════════════════════════════════════
//  DATABASE & HELPERS
// ═══════════════════════════════════════════════════════════════

export const AIRCRAFT_DATABASE: AircraftType[] = [
  // Cessna
  CESSNA_150M,
  CESSNA_152,
  CESSNA_172N,
  CESSNA_172R,
  CESSNA_172S,
  CESSNA_182T,
  // Piper
  PIPER_PA28_140,
  PIPER_PA28_161,
  PIPER_PA28_181,
  PIPER_PA28R_201,
  PIPER_PA38_112,
  PIPER_PA44_180,
  // Diamond
  DIAMOND_DA20_C1,
  DIAMOND_DA40,
  // Cirrus
  CIRRUS_SR20,
  CIRRUS_SR22,
  // Beechcraft
  BEECHCRAFT_76,
];

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
