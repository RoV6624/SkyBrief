// ===== Raw API Response Types =====

export interface MetarCloud {
  cover: "CLR" | "FEW" | "SCT" | "BKN" | "OVC";
  base: number; // feet AGL
}

export interface MetarResponse {
  icaoId: string;
  receiptTime: string;
  obsTime: number; // UNIX epoch
  reportTime: string; // ISO 8601
  temp: number; // Celsius
  dewp: number; // Celsius
  wdir: number | "VRB";
  wspd: number; // knots
  wgst: number | null; // knots, null if no gusts
  visib: string; // "10+", "3", etc.
  altim: number; // altimeter setting
  slp: number | null; // sea level pressure mb
  qcField: number;
  presTend: number | null;
  metarType: "METAR" | "SPECI";
  rawOb: string;
  lat: number;
  lon: number;
  elev: number; // meters
  name: string;
  cover: string;
  clouds: MetarCloud[];
  fltCat: FlightCategory;
  wxString?: string; // Present weather (RA, SN, FG, etc.)
}

// ===== TAF Types =====

export interface TafCloud {
  cover: "FEW" | "SCT" | "BKN" | "OVC";
  base: number;
}

export interface TafForecast {
  timeFrom: number;
  timeTo: number;
  fcstChange: "FM" | "TEMPO" | "BECMG" | "PROB" | null;
  wdir: number;
  wspd: number;
  wgst: number | null;
  visib: string;
  clouds: TafCloud[];
  wxString?: string;
}

export interface TafResponse {
  icaoId: string;
  dbPopTime: string;
  bulletinTime: string;
  issueTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  rawTAF: string;
  mostRecent: number;
  remarks: string;
  lat: number;
  lon: number;
  elev: number;
  prior: number;
  name: string;
  fcsts: TafForecast[];
}

// ===== PIREP Types =====

export interface PirepResponse {
  receiptTime: string;
  obsTime: number;
  icaoId: string;
  acType: string;
  lat: number;
  lon: number;
  fltLvl: string;
  fltLvlType: string;
  temp: number | null;
  wdir: number | null;
  wspd: number | null;
  icgInt1: string | null;
  icgInt2: string | null;
  tbInt1: string | null;
  tbInt2: string | null;
  tbType1: string | null;
  tbType2: string | null;
  pirepType: "PIREP" | "UA" | "UUA" | "AIREP" | "AMDAR";
  rawOb: string;
}

// ===== NOTAM Types =====

export interface NotamResponse {
  icaoId: string;
  notamId: string;
  text: string;
  startTime: number; // UNIX epoch
  endTime: number; // UNIX epoch
  estimatedEnd: boolean;
  classification: string;
  accountId: string;
  type?: string;
  affectedFIR?: string;
  selectionCode?: string;
  traffic?: string;
  purpose?: string;
  scope?: string;
  minimumFL?: number;
  maximumFL?: number;
  coordinates?: string;
  radius?: number;
}

// ===== Domain Models =====

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export interface NormalizedMetar {
  station: string;
  stationName: string;
  observationTime: Date;
  isSpeci: boolean;
  temperature: { celsius: number; fahrenheit: number };
  dewpoint: { celsius: number; fahrenheit: number };
  tempDewpointSpread: number; // Celsius
  wind: {
    direction: number | "VRB";
    speed: number; // knots
    gust: number | null;
    isGusty: boolean; // gust > sustained + 10
  };
  visibility: { sm: number; isPlus: boolean };
  altimeter: number;
  clouds: MetarCloud[];
  ceiling: number | null; // lowest BKN/OVC base, null if clear
  flightCategory: FlightCategory;
  presentWeather: string | null;
  rawText: string;
  location: { lat: number; lon: number; elevation: number };
}

export interface AiBriefing {
  summary: string;
  hazards: string[];
  recommendation: "FAVORABLE" | "CAUTION" | "UNFAVORABLE";
  confidence: "high" | "medium" | "low";
  generatedAt: Date;
}

export interface AlertCondition {
  id: string;
  type:
    | "crosswind"
    | "temp_dewpoint"
    | "ceiling"
    | "visibility"
    | "gust"
    | "fog_risk"
    | "speci"
    | "night_vfr"
    | "low_altimeter"
    | "missing_data";
  severity: "green" | "amber" | "red";
  title: string;
  message: string;
  timestamp: Date;
}

// ===== Fuel Price Types =====

export interface ApiFuelPriceResponse {
  airport_icao: string;
  fuel_type: string;
  price: number;
  currency: string;
  fbo_name: string | null;
  updated_at: string; // ISO 8601
  source: "api" | "user";
}

export interface FuelPriceData {
  airport_id: string;
  price_100ll: number;
  updated_at: Date;
  updated_by_uid: string;
  fbo_name: string | null;
}

/**
 * Individual fuel price report with community verification
 */
export interface FuelPriceReport {
  id: string; // Firestore document ID
  airport_id: string;
  price_100ll: number;
  fbo_name: string | null;
  reported_at: Date;
  reported_by_uid: string; // Keep for backend, but don't show in UI
  upvotes: number; // Community verification count
  flags: number; // Outdated/incorrect flags
  verified_by_uids: string[]; // Users who upvoted
  flagged_by_uids: string[]; // Users who flagged as outdated
}

/**
 * Multiple fuel price reports for an airport
 */
export interface AirportFuelPrices {
  airport_id: string;
  reports: FuelPriceReport[];
  last_updated: Date;
}

/**
 * Freshness level for fuel price data
 */
export type FuelPriceFreshness = "fresh" | "recent" | "stale" | "outdated";

export interface CombinedFuelPrice {
  price_100ll: number;
  fbo_name: string | null;
  updated_at: Date;
  source: "api" | "user" | "merged";
  api_data?: ApiFuelPriceResponse;
  user_data?: FuelPriceData;
  confidence: "high" | "medium" | "low";
  // Enhanced fields
  reports?: FuelPriceReport[]; // Multiple community reports
  freshness?: FuelPriceFreshness;
  upvotes?: number;
  flags?: number;
}
