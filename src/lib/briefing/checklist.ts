import type {
  ChecklistItem,
  ChecklistItemId,
  BriefingChecklist,
  ComplianceRecord,
  FlightType,
} from "./types";
import type { NormalizedMetar } from "@/lib/api/types";
import type { MinimumsResult } from "@/lib/minimums/types";
import type { FRATResult } from "@/lib/frat/types";

/**
 * Default checklist items for a standard preflight briefing.
 * Follows FAA Advisory Circular guidance for standard weather briefing.
 */
export function getDefaultChecklistItems(flightType: FlightType): ChecklistItem[] {
  const baseItems: ChecklistItem[] = [
    {
      id: "weather_current",
      label: "Current Weather (METAR)",
      description: "Review current conditions at departure, destination, and alternate airports",
      category: "weather",
      required: true,
      status: "pending",
    },
    {
      id: "weather_forecast",
      label: "Forecast (TAF)",
      description: "Review terminal aerodrome forecast for departure/arrival time windows",
      category: "weather",
      required: true,
      status: "pending",
    },
    {
      id: "notams",
      label: "NOTAMs",
      description: "Check NOTAMs for departure, enroute, and destination airports",
      category: "weather",
      required: true,
      status: "pending",
    },
    {
      id: "tfrs",
      label: "TFRs",
      description: "Check Temporary Flight Restrictions along planned route",
      category: "weather",
      required: true,
      status: "pending",
    },
    {
      id: "wind_runway",
      label: "Wind & Runway Analysis",
      description: "Evaluate wind components for active runway, check crosswind limits",
      category: "weather",
      required: true,
      status: "pending",
    },
    {
      id: "fuel_plan",
      label: "Fuel Planning",
      description: "Calculate fuel required with legal reserves (30 min day VFR / 45 min night)",
      category: "planning",
      required: true,
      status: "pending",
    },
    {
      id: "weight_balance",
      label: "Weight & Balance",
      description: "Verify aircraft is within weight and CG limits for takeoff and landing",
      category: "aircraft",
      required: true,
      status: "pending",
    },
    {
      id: "personal_minimums",
      label: "Personal Minimums Check",
      description: "Verify conditions meet your personal minimums for ceiling, visibility, and wind",
      category: "risk",
      required: true,
      status: "pending",
    },
    {
      id: "frat",
      label: "Flight Risk Assessment",
      description: "Complete FRAT to evaluate overall flight risk level",
      category: "risk",
      required: true,
      status: "pending",
    },
  ];

  // Add cross-country items
  if (flightType === "xc" || flightType === "instrument") {
    baseItems.push(
      {
        id: "alternate",
        label: "Alternate Airport",
        description: "Identify and brief alternate airport weather and NOTAMs",
        category: "planning",
        required: true,
        status: "pending",
      },
      {
        id: "departure_procedures",
        label: "Departure Procedures",
        description: "Review departure procedures, obstacle clearance, and noise abatement",
        category: "planning",
        required: false,
        status: "pending",
      },
      {
        id: "arrival_procedures",
        label: "Arrival Procedures",
        description: "Review arrival procedures, pattern entry, and traffic advisories",
        category: "planning",
        required: false,
        status: "pending",
      }
    );
  }

  // Add performance items for certain flight types
  if (flightType === "xc" || flightType === "checkride") {
    baseItems.push({
      id: "performance",
      label: "Performance Calculations",
      description: "Calculate takeoff/landing distance, density altitude impact, and climb performance",
      category: "aircraft",
      required: true,
      status: "pending",
    });
  }

  return baseItems;
}

/**
 * Create a new briefing checklist
 */
export function createBriefingChecklist(params: {
  station: string;
  stationName: string;
  flightType: FlightType;
  pilotName: string;
  aircraftType: string;
  route?: string;
  customItems?: ChecklistItemId[];
}): BriefingChecklist {
  const items = params.customItems
    ? getDefaultChecklistItems(params.flightType).filter(
        (item) => params.customItems!.includes(item.id)
      )
    : getDefaultChecklistItems(params.flightType);

  return {
    id: generateBriefingId(),
    station: params.station,
    stationName: params.stationName,
    createdAt: new Date(),
    items,
    flightType: params.flightType,
    pilotName: params.pilotName,
    aircraftType: params.aircraftType,
    route: params.route,
    isComplete: false,
  };
}

/**
 * Check/uncheck a checklist item
 */
export function toggleChecklistItem(
  checklist: BriefingChecklist,
  itemId: ChecklistItemId,
  notes?: string
): BriefingChecklist {
  const updatedItems = checklist.items.map((item) => {
    if (item.id !== itemId) return item;
    const newStatus = item.status === "checked" ? "pending" : "checked";
    return {
      ...item,
      status: newStatus as "pending" | "checked",
      checkedAt: newStatus === "checked" ? new Date() : undefined,
      notes: notes ?? item.notes,
    };
  });

  const requiredItems = updatedItems.filter((item) => item.required);
  const allRequiredChecked = requiredItems.every((item) => item.status === "checked");

  return {
    ...checklist,
    items: updatedItems,
    isComplete: allRequiredChecked,
    completedAt: allRequiredChecked ? new Date() : undefined,
  };
}

/**
 * Flag a checklist item (issue found)
 */
export function flagChecklistItem(
  checklist: BriefingChecklist,
  itemId: ChecklistItemId,
  notes: string
): BriefingChecklist {
  const updatedItems = checklist.items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      status: "flagged" as const,
      checkedAt: new Date(),
      notes,
    };
  });

  return {
    ...checklist,
    items: updatedItems,
    isComplete: false,
  };
}

/**
 * Generate a compliance record from a completed briefing
 */
export function generateComplianceRecord(
  checklist: BriefingChecklist,
  metar: NormalizedMetar | null,
  minimumsResult?: MinimumsResult,
  fratResult?: FRATResult
): ComplianceRecord | null {
  if (!checklist.completedAt || !metar) return null;

  const record: ComplianceRecord = {
    briefingId: checklist.id,
    pilotName: checklist.pilotName,
    station: checklist.station,
    stationName: checklist.stationName,
    route: checklist.route,
    aircraftType: checklist.aircraftType,
    flightType: checklist.flightType,
    briefedAt: checklist.createdAt,
    completedAt: checklist.completedAt,
    itemsSummary: {
      total: checklist.items.length,
      checked: checklist.items.filter((i) => i.status === "checked").length,
      flagged: checklist.items.filter((i) => i.status === "flagged").length,
    },
    weatherSnapshot: {
      flightCategory: metar.flightCategory,
      ceiling: metar.ceiling,
      visibility: metar.visibility.sm,
      wind: `${metar.wind.direction}@${metar.wind.speed}${metar.wind.gust ? `G${metar.wind.gust}` : ""}`,
      rawMetar: metar.rawText,
    },
    minimumsResult,
    fratResult,
    signature: generateSignature(checklist),
  };

  return record;
}

/**
 * Format compliance record as shareable text
 */
export function formatComplianceText(record: ComplianceRecord): string {
  const lines: string[] = [
    "═══ SKYBRIEF PREFLIGHT BRIEFING RECORD ═══",
    "",
    `Pilot: ${record.pilotName}`,
    `Station: ${record.station} (${record.stationName})`,
    record.route ? `Route: ${record.route}` : "",
    `Aircraft: ${record.aircraftType}`,
    `Flight Type: ${record.flightType.toUpperCase()}`,
    "",
    `Briefing Started: ${record.briefedAt.toISOString()}`,
    `Briefing Completed: ${record.completedAt.toISOString()}`,
    "",
    "── Weather Snapshot ──",
    `Flight Category: ${record.weatherSnapshot.flightCategory}`,
    `Ceiling: ${record.weatherSnapshot.ceiling ? `${record.weatherSnapshot.ceiling} ft AGL` : "Clear"}`,
    `Visibility: ${record.weatherSnapshot.visibility} SM`,
    `Wind: ${record.weatherSnapshot.wind}`,
    `Raw METAR: ${record.weatherSnapshot.rawMetar}`,
    "",
    "── Checklist Summary ──",
    `Items Completed: ${record.itemsSummary.checked}/${record.itemsSummary.total}`,
    record.itemsSummary.flagged > 0
      ? `Items Flagged: ${record.itemsSummary.flagged}`
      : "",
    "",
  ];

  if (record.minimumsResult) {
    lines.push("── Personal Minimums ──");
    if (record.minimumsResult.breached) {
      lines.push("STATUS: EXCEEDED");
      record.minimumsResult.violations.forEach((v) => {
        lines.push(`  ${v.label}: ${v.current} ${v.unit} (limit: ${v.limit} ${v.unit})`);
      });
    } else {
      lines.push("STATUS: WITHIN LIMITS");
    }
    lines.push("");
  }

  if (record.fratResult) {
    lines.push("── Flight Risk Assessment ──");
    lines.push(`Score: ${record.fratResult.totalScore}/70`);
    lines.push(`Risk Level: ${record.fratResult.riskLevel.toUpperCase()}`);
    lines.push(`Recommendation: ${record.fratResult.recommendation}`);
    lines.push("");
  }

  lines.push(`Verification: ${record.signature}`);
  lines.push("═══════════════════════════════════════════");

  return lines.filter(Boolean).join("\n");
}

// ===== Helpers =====

function generateBriefingId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `BRF-${timestamp}-${random}`;
}

function generateSignature(checklist: BriefingChecklist): string {
  // Simple hash-like signature for verification
  const data = `${checklist.id}|${checklist.pilotName}|${checklist.station}|${checklist.completedAt?.toISOString()}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `SB-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
}
