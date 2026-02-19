import type { TafResponse, FlightCategory } from "@/lib/api/types";
import type { PersonalMinimums } from "@/lib/minimums/types";
import type { DepartureWindow, DepartureWindowResult } from "@/lib/briefing/types";
import { generateForecastTimeline } from "./forecast-timeline";

/**
 * Calculate optimal VFR departure windows based on TAF forecast
 * and pilot's personal minimums.
 *
 * Scans the forecast timeline at 30-minute intervals for the next 6 hours
 * and identifies windows where conditions meet the pilot's minimums.
 */
export function calculateDepartureWindows(
  taf: TafResponse,
  minimums: PersonalMinimums
): DepartureWindowResult {
  const now = new Date();
  const timeline = generateForecastTimeline(taf);

  if (timeline.length === 0) {
    return {
      windows: [],
      currentlyVfr: false,
      advisory: "Insufficient forecast data to calculate departure windows.",
    };
  }

  // Generate 30-minute sample points for smoother windows
  const samplePoints: Array<{
    time: Date;
    meetsMinimums: boolean;
    category: FlightCategory;
    reason?: string;
  }> = [];

  for (let i = 0; i <= 12; i++) {
    // 12 x 30 min = 6 hours
    const sampleTime = new Date(now.getTime() + i * 30 * 60_000);

    // Find closest forecast point
    const closest = findClosestPoint(timeline, sampleTime);
    if (!closest) continue;

    const { meetsMinimums, reason } = checkMinimums(closest, minimums);

    samplePoints.push({
      time: sampleTime,
      meetsMinimums,
      category: closest.flightCategory,
      reason,
    });
  }

  // Extract contiguous VFR windows
  const windows = extractWindows(samplePoints);

  // Check if current conditions are VFR
  const currentlyVfr = samplePoints.length > 0 && samplePoints[0].meetsMinimums;

  // Find best window (longest duration)
  const bestWindow = windows.length > 0
    ? windows.reduce((best, w) =>
        w.end.getTime() - w.start.getTime() > best.end.getTime() - best.start.getTime()
          ? w
          : best
      )
    : undefined;

  // Generate advisory text
  const advisory = generateAdvisory(windows, currentlyVfr, samplePoints, minimums);

  return {
    windows,
    currentlyVfr,
    bestWindow,
    advisory,
  };
}

// ===== Helpers =====

function findClosestPoint(
  timeline: Array<{ time: Date; flightCategory: FlightCategory; ceiling: number | null; visibility: number; wind: { speed: number; gust: number | null } }>,
  target: Date
): typeof timeline[number] | null {
  if (timeline.length === 0) return null;

  let closest = timeline[0];
  let minDiff = Math.abs(target.getTime() - closest.time.getTime());

  for (const point of timeline) {
    const diff = Math.abs(target.getTime() - point.time.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest;
}

function checkMinimums(
  point: { ceiling: number | null; visibility: number; wind: { speed: number; gust: number | null } },
  minimums: PersonalMinimums
): { meetsMinimums: boolean; reason?: string } {
  if (point.ceiling !== null && point.ceiling < minimums.ceiling) {
    return { meetsMinimums: false, reason: `Ceiling ${point.ceiling} ft below ${minimums.ceiling} ft minimum` };
  }

  if (point.visibility < minimums.visibility) {
    return { meetsMinimums: false, reason: `Visibility ${point.visibility} SM below ${minimums.visibility} SM minimum` };
  }

  if (point.wind.speed > minimums.maxWind) {
    return { meetsMinimums: false, reason: `Wind ${point.wind.speed} kts exceeds ${minimums.maxWind} kts limit` };
  }

  if (point.wind.gust && point.wind.gust > minimums.maxGust) {
    return { meetsMinimums: false, reason: `Gusts ${point.wind.gust} kts exceed ${minimums.maxGust} kts limit` };
  }

  return { meetsMinimums: true };
}

function extractWindows(
  points: Array<{ time: Date; meetsMinimums: boolean; category: FlightCategory; reason?: string }>
): DepartureWindow[] {
  const windows: DepartureWindow[] = [];
  let windowStart: Date | null = null;
  let windowCategory: FlightCategory = "VFR";

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (point.meetsMinimums && !windowStart) {
      // Start new window
      windowStart = point.time;
      windowCategory = point.category;
    } else if (!point.meetsMinimums && windowStart) {
      // Close current window
      windows.push({
        start: windowStart,
        end: point.time,
        category: windowCategory,
        reason: point.reason,
      });
      windowStart = null;
    }
  }

  // Close final window if still open
  if (windowStart && points.length > 0) {
    windows.push({
      start: windowStart,
      end: points[points.length - 1].time,
      category: windowCategory,
    });
  }

  return windows;
}

function generateAdvisory(
  windows: DepartureWindow[],
  currentlyVfr: boolean,
  points: Array<{ time: Date; meetsMinimums: boolean; reason?: string }>,
  minimums: PersonalMinimums
): string {
  if (windows.length === 0) {
    const reasons = points
      .filter((p) => !p.meetsMinimums && p.reason)
      .map((p) => p.reason!);
    const uniqueReasons = [...new Set(reasons)];
    return `No VFR windows forecast in the next 6 hours. ${uniqueReasons[0] || "Conditions below personal minimums."}`;
  }

  if (currentlyVfr && windows.length === 1) {
    const endTime = windows[0].end;
    const hoursRemaining = Math.round(
      (endTime.getTime() - Date.now()) / 3600_000 * 10
    ) / 10;

    if (hoursRemaining >= 5.5) {
      return "VFR conditions expected to persist for the next 6+ hours.";
    }

    const endLocal = endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `VFR window until ${endLocal} local. Conditions expected to deteriorate after that.${windows[0].reason ? ` ${windows[0].reason}.` : ""}`;
  }

  if (!currentlyVfr && windows.length > 0) {
    const nextWindow = windows[0];
    const waitMinutes = Math.round(
      (nextWindow.start.getTime() - Date.now()) / 60_000
    );
    const startLocal = nextWindow.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endLocal = nextWindow.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (waitMinutes <= 0) {
      return `VFR window available now until ${endLocal} local.`;
    }

    const durationMin = Math.round(
      (nextWindow.end.getTime() - nextWindow.start.getTime()) / 60_000
    );

    return `Currently below minimums. Next VFR window: ${startLocal}–${endLocal} local (${Math.round(durationMin / 60 * 10) / 10} hrs). Delay departure ${waitMinutes < 60 ? `${waitMinutes} minutes` : `${Math.round(waitMinutes / 60 * 10) / 10} hours`} for favorable conditions.`;
  }

  // Multiple windows
  const windowDescs = windows.map((w) => {
    const s = w.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const e = w.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${s}–${e}`;
  });

  return `${windows.length} VFR windows in next 6 hours: ${windowDescs.join(", ")}.`;
}
