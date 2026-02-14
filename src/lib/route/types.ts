import type { NormalizedMetar, TafResponse, FlightCategory } from "@/lib/api/types";

export interface RouteWaypoint {
  icao: string;
  lat: number;
  lon: number;
  name: string;
}

export interface RouteLeg {
  from: RouteWaypoint;
  to: RouteWaypoint;
  distanceNm: number;
  bearing: number;
}

export interface GapSegment {
  fromWaypoint: RouteWaypoint;
  toWaypoint: RouteWaypoint;
  gapDistanceNm: number;
  message: string;
}

export interface RouteWeatherPoint {
  waypoint: RouteWaypoint;
  distanceFromStart: number; // nm
  metar: NormalizedMetar | null;
  taf: TafResponse | null;
  flightCategory: FlightCategory | null;
  isInterpolated: boolean;
  gapWarning?: string;
}

export interface RouteBriefing {
  legs: RouteLeg[];
  weatherPoints: RouteWeatherPoint[];
  gaps: GapSegment[];
  totalDistanceNm: number;
  worstCategory: FlightCategory | null;
}

// ──────────────────────────────────────────────────────────────────
// Navaid Types (VOR, NDB, GPS fixes)
// ──────────────────────────────────────────────────────────────────

export type NavaidType = "VOR" | "VOR-DME" | "VORTAC" | "NDB" | "GPS" | "FIX";

export interface NavaidData {
  identifier: string;           // e.g., "STL", "FEPOT", "RIIVR"
  name: string;                 // Full name: "Spirit of St Louis VORTAC"
  type: NavaidType;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft?: number;
  frequency_khz?: number;       // For VOR/NDB (null for GPS fixes)
  magnetic_variation?: number;  // Degrees east/west
  usage_type?: string;          // "BOTH", "RNAV", "TERMINAL"
  associated_airport?: string;  // ICAO code if terminal navaid
}

// ──────────────────────────────────────────────────────────────────
// Airways Types (Victor airways, Jet routes)
// ──────────────────────────────────────────────────────────────────

export type AirwayType = "VICTOR" | "JET";

export interface AirwaySegment {
  airway_id: string;            // e.g., "V4", "V12", "J45"
  sequence: number;             // Order in airway
  fix_identifier: string;       // Waypoint/navaid identifier
  latitude_deg: number;
  longitude_deg: number;
  minimum_altitude?: number | null;    // MEA (Minimum Enroute Altitude)
  maximum_altitude?: number | null;    // MAA (Maximum Authorized Altitude)
  direction?: "forward" | "reverse" | "both" | string;
}

export interface Airway {
  id: string;                   // "V4"
  type: AirwayType | string;
  description?: string;         // Human-readable description
  segments: AirwaySegment[];
}

// ──────────────────────────────────────────────────────────────────
// Waypoint Generation
// ──────────────────────────────────────────────────────────────────

export type WaypointType = "gps" | "airport" | "vor" | "ndb" | "fix";

export interface GeneratedWaypoint {
  identifier: string;           // "KJFK", "WPT01", "STL", "FEPOT", etc.
  latitude_deg: number;
  longitude_deg: number;
  type: WaypointType;
  name?: string;
  airway?: string;              // Airway ID if waypoint is on an airway (e.g., "V4")
}

export type FlightType = "VFR" | "IFR";
export type RouteStrategy = "direct" | "airways" | "terrain" | "weather";

export interface RouteGenerationOptions {
  strategy?: RouteStrategy;
  maxSegmentNm?: number;           // Default: 50nm
  minSegmentNm?: number;           // Default: 20nm
  cruiseAltitude?: number;
  flightType?: FlightType;         // Determine routing logic (VFR corridor vs IFR airways)
  corridorWidthNm?: number;        // Default 10nm for VFR corridor search
  preferredNavaidTypes?: NavaidType[];  // Filter waypoint types
}
