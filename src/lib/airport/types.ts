// Airport and Runway Data Types

export interface RunwayData {
  runway_id: string; // e.g., "09/27", "18/36"
  le_ident: string; // Low end identifier, e.g., "09"
  he_ident: string; // High end identifier, e.g., "27"
  le_heading_degT: number; // Low end magnetic heading
  he_heading_degT: number; // High end magnetic heading
  length_ft: number;
  width_ft: number;
  surface: string; // e.g., "ASP" (asphalt), "CON" (concrete)
  lighted: boolean;
}

export interface AirportData {
  icao: string;
  name: string;
  type: string; // "small_airport", "medium_airport", "large_airport", "heliport"
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number;
  municipality: string;
  aliases: string[]; // Alternate identifiers (IATA, GPS code, local code, etc.)
  runways: RunwayData[];
}

export interface RunwayWindAnalysis {
  runway: RunwayData;
  runway_end: "le" | "he"; // Which end is active
  heading: number;
  headwind: number; // Positive = headwind, Negative = tailwind
  crosswind: number; // Absolute value
  is_favorable: boolean; // Headwind component is positive
}
