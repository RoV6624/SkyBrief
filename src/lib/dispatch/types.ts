/**
 * Digital Dispatch packet types.
 *
 * A DispatchPacket bundles every artifact a student pilot must produce
 * before departure — weather briefing, FRAT, W&B, and checklist — into
 * a single reviewable record that an instructor can approve or reject.
 */

import type { ComplianceRecord, GoNoGoResult, FlightType } from "@/lib/briefing/types";
import type { FRATInputs, FRATResult } from "@/lib/frat/types";
import type { NormalizedMetar } from "@/lib/api/types";

export type DispatchStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "preflight"
  | "departed";

export interface WBSnapshot {
  aircraftType: string;
  totalWeight: number;
  cg: number;
  withinLimits: boolean;
  timestamp: Date;
}

export interface DispatchPacket {
  id: string;
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  tenantId: string;
  station: string;
  stationName: string;
  flightType: FlightType;
  status: DispatchStatus;

  // Bundled data
  briefingRecord: ComplianceRecord | null;
  fratResult: FRATResult | null;
  fratInputs: FRATInputs | null;
  wbSnapshot: WBSnapshot | null;
  goNoGoResult: GoNoGoResult | null;
  weatherSnapshot: NormalizedMetar | null;

  // Tracking
  completedSteps: DispatchSteps;
  createdAt: Date;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewerComment: string | null;
  preflightStartedAt: Date | null;
  departedAt: Date | null;
}

export interface DispatchSteps {
  briefing: boolean;
  frat: boolean;
  wb: boolean;
  checklist: boolean;
}

export const DISPATCH_STEP_LABELS: Record<keyof DispatchSteps, string> = {
  briefing: "Weather Briefing",
  frat: "FRAT Assessment",
  wb: "Weight & Balance",
  checklist: "Preflight Checklist",
};

/** Ordered keys used by the step indicator and wizard flow. */
export const DISPATCH_STEP_ORDER: (keyof DispatchSteps)[] = [
  "briefing",
  "frat",
  "wb",
  "checklist",
];

/** Create a blank DispatchSteps record with all steps incomplete. */
export function emptySteps(): DispatchSteps {
  return { briefing: false, frat: false, wb: false, checklist: false };
}

/** Check whether every step in a DispatchSteps record is complete. */
export function allStepsComplete(steps: DispatchSteps): boolean {
  return steps.briefing && steps.frat && steps.wb && steps.checklist;
}
