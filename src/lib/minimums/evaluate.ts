import type { NormalizedMetar } from "@/lib/api/types";
import type { PersonalMinimums, MinimumsResult, MinimumsViolation } from "./types";

export function evaluateMinimums(
  metar: NormalizedMetar,
  minimums: PersonalMinimums,
  runwayHeading?: number
): MinimumsResult {
  const violations: MinimumsViolation[] = [];

  // Ceiling check
  if (metar.ceiling !== null && metar.ceiling < minimums.ceiling) {
    violations.push({
      field: "ceiling",
      label: "Ceiling",
      current: metar.ceiling,
      limit: minimums.ceiling,
      unit: "ft",
    });
  }

  // Visibility check
  if (metar.visibility.sm < minimums.visibility) {
    violations.push({
      field: "visibility",
      label: "Visibility",
      current: metar.visibility.sm,
      limit: minimums.visibility,
      unit: "SM",
    });
  }

  // Wind check
  if (metar.wind.direction !== "VRB" && metar.wind.speed > minimums.maxWind) {
    violations.push({
      field: "maxWind",
      label: "Wind Speed",
      current: metar.wind.speed,
      limit: minimums.maxWind,
      unit: "kts",
    });
  }

  // Gust check
  if (metar.wind.gust && metar.wind.gust > minimums.maxGust) {
    violations.push({
      field: "maxGust",
      label: "Gust",
      current: metar.wind.gust,
      limit: minimums.maxGust,
      unit: "kts",
    });
  }

  // Crosswind check (requires runway heading)
  if (
    runwayHeading != null &&
    metar.wind.direction !== "VRB" &&
    metar.wind.speed > 0
  ) {
    const angleDeg = Math.abs(
      ((metar.wind.direction - runwayHeading + 540) % 360) - 180
    );
    const angleRad = (angleDeg * Math.PI) / 180;
    const crosswind = Math.round(metar.wind.speed * Math.sin(angleRad));

    if (crosswind > minimums.crosswind) {
      violations.push({
        field: "crosswind",
        label: "Crosswind",
        current: crosswind,
        limit: minimums.crosswind,
        unit: "kts",
      });
    }
  }

  return {
    breached: violations.length > 0,
    violations,
  };
}
