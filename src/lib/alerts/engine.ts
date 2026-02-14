import type { NormalizedMetar, AlertCondition } from "@/lib/api/types";
import { allRules } from "./rules";
import type { Thresholds } from "./thresholds";

export function evaluateAlerts(
  metar: NormalizedMetar,
  thresholds: Thresholds,
  runwayHeading?: number
): AlertCondition[] {
  return allRules
    .map((rule) => rule(metar, thresholds, runwayHeading))
    .filter((alert): alert is AlertCondition => alert !== null)
    .sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 };
      return order[a.severity] - order[b.severity];
    });
}
