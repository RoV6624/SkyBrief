export type ChartRegion = "CONUS" | "EAST" | "CENTRAL" | "WEST" | "ALASKA" | "HAWAII";

export type ChartType =
  | "surface_analysis"
  | "prog_12hr"
  | "prog_24hr"
  | "sigwx_mid";

export interface ChartMetadata {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  regions: ChartRegion[];
  updateIntervalMinutes: number;
  validHours: number;
  altitude?: string;
}

export interface ChartData {
  id: string;
  metadata: ChartMetadata;
  region: ChartRegion;
  imageUrl: string;
  issuedAt: Date;
  validFrom: Date;
  validTo: Date;
}

export interface ChartConfig {
  metadata: ChartMetadata;
  urlBuilder: (region: ChartRegion) => string;
}
