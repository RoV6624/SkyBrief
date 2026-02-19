import type { BriefingTemplate, ChecklistItemId, FlightType } from "./types";

/**
 * Built-in briefing templates.
 * Flight schools can customize these via Firestore.
 */

const LOCAL_VFR_ITEMS: ChecklistItemId[] = [
  "weather_current",
  "weather_forecast",
  "notams",
  "tfrs",
  "wind_runway",
  "fuel_plan",
  "weight_balance",
  "personal_minimums",
  "frat",
];

const XC_VFR_ITEMS: ChecklistItemId[] = [
  ...LOCAL_VFR_ITEMS,
  "alternate",
  "departure_procedures",
  "arrival_procedures",
  "performance",
];

const NIGHT_ITEMS: ChecklistItemId[] = [
  ...LOCAL_VFR_ITEMS,
  "equipment",
];

const INSTRUMENT_ITEMS: ChecklistItemId[] = [
  ...XC_VFR_ITEMS,
  "equipment",
];

const CHECKRIDE_ITEMS: ChecklistItemId[] = [
  ...XC_VFR_ITEMS,
  "equipment",
];

/**
 * Get the default template for a given flight type
 */
export function getDefaultTemplate(flightType: FlightType): BriefingTemplate {
  const templates: Record<FlightType, { name: string; items: ChecklistItemId[]; maxFrat?: number }> = {
    local: {
      name: "Local VFR Flight",
      items: LOCAL_VFR_ITEMS,
      maxFrat: 25,
    },
    xc: {
      name: "Cross-Country VFR",
      items: XC_VFR_ITEMS,
      maxFrat: 20,
    },
    night: {
      name: "Night VFR Flight",
      items: NIGHT_ITEMS,
      maxFrat: 20,
    },
    instrument: {
      name: "Instrument Flight",
      items: INSTRUMENT_ITEMS,
      maxFrat: 30,
    },
    checkride: {
      name: "Checkride Preparation",
      items: CHECKRIDE_ITEMS,
      maxFrat: 15,
    },
  };

  const config = templates[flightType];
  return {
    id: `default-${flightType}`,
    tenantId: "default",
    name: config.name,
    flightType,
    description: `Standard ${config.name.toLowerCase()} briefing template`,
    requiredItems: config.items,
    maxFratScore: config.maxFrat,
    requireMinimumsPass: true,
    createdBy: "system",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validate a checklist against a template
 */
export function validateAgainstTemplate(
  template: BriefingTemplate,
  completedItems: ChecklistItemId[],
  fratScore?: number,
  minimumsPass?: boolean
): { valid: boolean; missing: ChecklistItemId[]; issues: string[] } {
  const missing = template.requiredItems.filter(
    (item) => !completedItems.includes(item)
  );
  const issues: string[] = [];

  if (missing.length > 0) {
    issues.push(`${missing.length} required item${missing.length > 1 ? "s" : ""} not completed`);
  }

  if (template.maxFratScore && fratScore !== undefined && fratScore > template.maxFratScore) {
    issues.push(
      `FRAT score (${fratScore}) exceeds template maximum (${template.maxFratScore})`
    );
  }

  if (template.requireMinimumsPass && minimumsPass === false) {
    issues.push("Personal minimums check failed");
  }

  return {
    valid: missing.length === 0 && issues.length === 0,
    missing,
    issues,
  };
}
