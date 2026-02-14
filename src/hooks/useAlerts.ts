import { useMemo } from "react";
import { evaluateAlerts } from "@/lib/alerts/engine";
import type { NormalizedMetar, AlertCondition } from "@/lib/api/types";
import type { Thresholds } from "@/lib/alerts/thresholds";

export function useAlerts(
  metar: NormalizedMetar | null | undefined,
  thresholds: Thresholds,
  runwayHeading: number | null
): AlertCondition[] {
  return useMemo(() => {
    if (!metar) return [];
    return evaluateAlerts(metar, thresholds, runwayHeading ?? undefined);
  }, [metar, thresholds, runwayHeading]);
}
