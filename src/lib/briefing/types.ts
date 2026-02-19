import type { FlightCategory, NormalizedMetar, TafResponse, NotamResponse } from "@/lib/api/types";
import type { MinimumsResult } from "@/lib/minimums/types";
import type { FRATResult } from "@/lib/frat/types";

// ===== Briefing Checklist Types =====

export type ChecklistItemId =
  | "weather_current"
  | "weather_forecast"
  | "notams"
  | "tfrs"
  | "wind_runway"
  | "fuel_plan"
  | "weight_balance"
  | "personal_minimums"
  | "frat"
  | "alternate"
  | "departure_procedures"
  | "arrival_procedures"
  | "performance"
  | "equipment";

export type ChecklistItemStatus = "pending" | "checked" | "flagged";

export interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  description: string;
  category: "weather" | "planning" | "aircraft" | "risk";
  required: boolean;
  status: ChecklistItemStatus;
  checkedAt?: Date;
  notes?: string;
  autoData?: Record<string, unknown>;
}

export interface BriefingChecklist {
  id: string;
  station: string;
  stationName: string;
  createdAt: Date;
  completedAt?: Date;
  items: ChecklistItem[];
  flightType: FlightType;
  pilotName: string;
  aircraftType: string;
  route?: string;
  isComplete: boolean;
  complianceRecord?: ComplianceRecord;
}

export type FlightType = "local" | "xc" | "night" | "instrument" | "checkride";

export interface ComplianceRecord {
  briefingId: string;
  pilotName: string;
  station: string;
  stationName: string;
  route?: string;
  aircraftType: string;
  flightType: FlightType;
  briefedAt: Date;
  completedAt: Date;
  itemsSummary: {
    total: number;
    checked: number;
    flagged: number;
  };
  weatherSnapshot: {
    flightCategory: FlightCategory;
    ceiling: number | null;
    visibility: number;
    wind: string;
    rawMetar: string;
  };
  minimumsResult?: MinimumsResult;
  fratResult?: FRATResult;
  signature: string; // Hash for verification
}

// ===== Go/No-Go Types =====

export type GoNoGoVerdict = "go" | "marginal" | "nogo";

export interface GoNoGoFactor {
  id: string;
  category: "weather" | "minimums" | "wind" | "performance" | "risk" | "daylight" | "notam";
  label: string;
  detail: string;
  severity: "green" | "amber" | "red";
  current?: string;
  limit?: string;
}

export interface GoNoGoResult {
  verdict: GoNoGoVerdict;
  factors: GoNoGoFactor[];
  summary: string;
  timestamp: Date;
}

// ===== Briefing Template Types (Flight School) =====

export interface BriefingTemplate {
  id: string;
  tenantId: string;
  name: string;
  flightType: FlightType;
  description: string;
  requiredItems: ChecklistItemId[];
  maxFratScore?: number;
  requireMinimumsPass: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== CFI Review Types =====

export type BriefingSubmissionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface BriefingSubmission {
  id: string;
  briefingId: string;
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  tenantId: string;
  templateId?: string;
  status: BriefingSubmissionStatus;
  checklist: BriefingChecklist;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerComment?: string;
  fratScore?: number;
  minimumsPass?: boolean;
}

// ===== Weather Trend Types =====

export type TrendDirection = "improving" | "deteriorating" | "stable";

export interface WeatherTrend {
  metric: string;
  direction: TrendDirection;
  currentValue: string;
  forecastValue: string;
  changeDescription: string;
}

export interface ForecastPoint {
  time: Date;
  flightCategory: FlightCategory;
  ceiling: number | null;
  visibility: number;
  wind: { direction: number; speed: number; gust: number | null };
  wxString?: string;
  clouds: Array<{ cover: string; base: number }>;
}

// ===== Departure Window Types =====

export interface DepartureWindow {
  start: Date;
  end: Date;
  category: FlightCategory;
  reason?: string;
}

export interface DepartureWindowResult {
  windows: DepartureWindow[];
  currentlyVfr: boolean;
  bestWindow?: DepartureWindow;
  advisory: string;
}

// ===== Weather Annotation Types =====

export interface WeatherAnnotation {
  code: string;
  shortName: string;
  explanation: string;
  pilotImplication: string;
  acsReference?: string;
}
