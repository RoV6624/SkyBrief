/**
 * Weather Change Detection Engine
 *
 * Compares a snapshot METAR (captured at preflight start) against the latest
 * METAR observation and detects significant weather changes that may affect
 * the safety of a planned flight.
 *
 * Severity levels:
 * - amber: noteworthy change, pilot should review
 * - red: critical change, flight safety may be compromised
 */

import type { NormalizedMetar, FlightCategory } from "@/lib/api/types";

export type ChangeSeverity = "amber" | "red";

export interface WeatherChange {
  id: string;
  type:
    | "category"
    | "wind"
    | "gust"
    | "visibility"
    | "ceiling"
    | "weather"
    | "speci";
  severity: ChangeSeverity;
  title: string;
  description: string;
  previousValue: string;
  currentValue: string;
  detectedAt: Date;
}

// ── Flight category helpers ───────────────────────────────────────────────

const CATEGORY_RANKS: Record<FlightCategory, number> = {
  VFR: 4,
  MVFR: 3,
  IFR: 2,
  LIFR: 1,
};

/**
 * Numeric rank for a flight category (higher = better conditions).
 */
function categoryRank(cat: FlightCategory): number {
  return CATEGORY_RANKS[cat] ?? 0;
}

/**
 * Returns true when current conditions are worse than the snapshot.
 */
function isDegradation(prev: FlightCategory, curr: FlightCategory): boolean {
  return categoryRank(curr) < categoryRank(prev);
}

// ── Hazardous weather tokens ──────────────────────────────────────────────

const HAZARDOUS_TOKENS = ["TS", "FZ", "FG", "+RA", "+SN", "GR", "FC", "VA"];

function containsHazardousWeather(wx: string | null): boolean {
  if (!wx) return false;
  const upper = wx.toUpperCase();
  return HAZARDOUS_TOKENS.some((token) => upper.includes(token));
}

function extractHazardTokens(wx: string | null): string[] {
  if (!wx) return [];
  const upper = wx.toUpperCase();
  return HAZARDOUS_TOKENS.filter((token) => upper.includes(token));
}

// ── Main detection ────────────────────────────────────────────────────────

/**
 * Detect significant weather changes between a snapshot and the current METAR.
 *
 * Returns an array of WeatherChange objects sorted by severity (red first).
 */
export function detectWeatherChanges(
  snapshot: NormalizedMetar,
  current: NormalizedMetar
): WeatherChange[] {
  const changes: WeatherChange[] = [];
  const now = new Date();

  // ── 1. Flight category change ───────────────────────────────────────────
  if (snapshot.flightCategory !== current.flightCategory) {
    const degraded = isDegradation(
      snapshot.flightCategory,
      current.flightCategory
    );
    const toCritical =
      current.flightCategory === "IFR" || current.flightCategory === "LIFR";

    changes.push({
      id: `cat-${now.getTime()}`,
      type: "category",
      severity: degraded && toCritical ? "red" : "amber",
      title: "Flight Category Changed",
      description: degraded
        ? `Conditions degraded from ${snapshot.flightCategory} to ${current.flightCategory}`
        : `Conditions improved from ${snapshot.flightCategory} to ${current.flightCategory}`,
      previousValue: snapshot.flightCategory,
      currentValue: current.flightCategory,
      detectedAt: now,
    });
  }

  // ── 2. Wind speed change ────────────────────────────────────────────────
  const windDelta = current.wind.speed - snapshot.wind.speed;
  const absWindDelta = Math.abs(windDelta);

  if (absWindDelta > 15) {
    changes.push({
      id: `wind-${now.getTime()}`,
      type: "wind",
      severity: "red",
      title: "Significant Wind Change",
      description:
        windDelta > 0
          ? `Wind increased by ${absWindDelta} kts`
          : `Wind decreased by ${absWindDelta} kts`,
      previousValue: `${snapshot.wind.speed} kts`,
      currentValue: `${current.wind.speed} kts`,
      detectedAt: now,
    });
  } else if (absWindDelta > 5) {
    changes.push({
      id: `wind-${now.getTime()}`,
      type: "wind",
      severity: "amber",
      title: "Wind Speed Change",
      description:
        windDelta > 0
          ? `Wind increased by ${absWindDelta} kts`
          : `Wind decreased by ${absWindDelta} kts`,
      previousValue: `${snapshot.wind.speed} kts`,
      currentValue: `${current.wind.speed} kts`,
      detectedAt: now,
    });
  }

  // ── 3. Gust onset / increase ────────────────────────────────────────────
  const prevGust = snapshot.wind.gust ?? 0;
  const currGust = current.wind.gust ?? 0;

  if (currGust > 0 && prevGust === 0) {
    // New gust onset
    const gustIncrease = currGust; // from 0 to currGust
    changes.push({
      id: `gust-${now.getTime()}`,
      type: "gust",
      severity: gustIncrease >= 10 ? "red" : "amber",
      title: "Gusts Detected",
      description: `Gusting to ${currGust} kts (no gusts at briefing time)`,
      previousValue: "No gusts",
      currentValue: `G${currGust} kts`,
      detectedAt: now,
    });
  } else if (currGust > prevGust && prevGust > 0) {
    // Gust increase
    const gustDelta = currGust - prevGust;
    if (gustDelta >= 10) {
      changes.push({
        id: `gust-${now.getTime()}`,
        type: "gust",
        severity: "red",
        title: "Gusts Increasing",
        description: `Gusts increased by ${gustDelta} kts`,
        previousValue: `G${prevGust} kts`,
        currentValue: `G${currGust} kts`,
        detectedAt: now,
      });
    } else if (gustDelta > 0) {
      changes.push({
        id: `gust-${now.getTime()}`,
        type: "gust",
        severity: "amber",
        title: "Gusts Increasing",
        description: `Gusts increased by ${gustDelta} kts`,
        previousValue: `G${prevGust} kts`,
        currentValue: `G${currGust} kts`,
        detectedAt: now,
      });
    }
  }

  // ── 4. Visibility drop ──────────────────────────────────────────────────
  const visDelta = snapshot.visibility.sm - current.visibility.sm;

  if (visDelta > 0) {
    // Visibility decreased
    if (current.visibility.sm < 3) {
      changes.push({
        id: `vis-${now.getTime()}`,
        type: "visibility",
        severity: "red",
        title: "Visibility Below 3 SM",
        description: `Visibility dropped to ${current.visibility.sm} SM (was ${snapshot.visibility.sm} SM)`,
        previousValue: `${snapshot.visibility.sm} SM`,
        currentValue: `${current.visibility.sm} SM`,
        detectedAt: now,
      });
    } else if (visDelta > 2) {
      changes.push({
        id: `vis-${now.getTime()}`,
        type: "visibility",
        severity: "amber",
        title: "Visibility Decreasing",
        description: `Visibility dropped ${visDelta.toFixed(1)} SM`,
        previousValue: `${snapshot.visibility.sm} SM`,
        currentValue: `${current.visibility.sm} SM`,
        detectedAt: now,
      });
    }
  }

  // ── 5. Ceiling drop ─────────────────────────────────────────────────────
  const prevCeiling = snapshot.ceiling;
  const currCeiling = current.ceiling;

  if (currCeiling !== null) {
    if (prevCeiling === null) {
      // Ceiling appeared where there was none (sky went from clear to broken/overcast)
      if (currCeiling < 1000) {
        changes.push({
          id: `ceil-${now.getTime()}`,
          type: "ceiling",
          severity: "red",
          title: "Low Ceiling Developing",
          description: `Ceiling appeared at ${currCeiling} ft AGL (previously clear)`,
          previousValue: "Clear",
          currentValue: `${currCeiling} ft AGL`,
          detectedAt: now,
        });
      } else {
        changes.push({
          id: `ceil-${now.getTime()}`,
          type: "ceiling",
          severity: "amber",
          title: "Ceiling Developing",
          description: `Ceiling appeared at ${currCeiling} ft AGL (previously clear)`,
          previousValue: "Clear",
          currentValue: `${currCeiling} ft AGL`,
          detectedAt: now,
        });
      }
    } else {
      // Both have ceilings — check for drop
      const ceilDelta = prevCeiling - currCeiling;

      if (ceilDelta > 0) {
        if (currCeiling < 1000) {
          changes.push({
            id: `ceil-${now.getTime()}`,
            type: "ceiling",
            severity: "red",
            title: "Ceiling Below 1000 ft",
            description: `Ceiling dropped to ${currCeiling} ft AGL (was ${prevCeiling} ft AGL)`,
            previousValue: `${prevCeiling} ft AGL`,
            currentValue: `${currCeiling} ft AGL`,
            detectedAt: now,
          });
        } else if (ceilDelta > 500) {
          changes.push({
            id: `ceil-${now.getTime()}`,
            type: "ceiling",
            severity: "amber",
            title: "Ceiling Lowering",
            description: `Ceiling dropped ${ceilDelta} ft`,
            previousValue: `${prevCeiling} ft AGL`,
            currentValue: `${currCeiling} ft AGL`,
            detectedAt: now,
          });
        }
      }
    }
  }

  // ── 6. Hazardous weather onset ──────────────────────────────────────────
  const prevHazards = extractHazardTokens(snapshot.presentWeather);
  const currHazards = extractHazardTokens(current.presentWeather);
  const newHazards = currHazards.filter((h) => !prevHazards.includes(h));

  if (newHazards.length > 0) {
    changes.push({
      id: `wx-${now.getTime()}`,
      type: "weather",
      severity: "red",
      title: "Hazardous Weather Reported",
      description: `New weather phenomena: ${newHazards.join(", ")}`,
      previousValue: snapshot.presentWeather || "None",
      currentValue: current.presentWeather || "None",
      detectedAt: now,
    });
  } else if (
    current.presentWeather &&
    current.presentWeather !== snapshot.presentWeather &&
    !containsHazardousWeather(current.presentWeather)
  ) {
    // Non-hazardous but changed weather (e.g., light rain onset)
    if (!snapshot.presentWeather) {
      changes.push({
        id: `wx-${now.getTime()}`,
        type: "weather",
        severity: "amber",
        title: "Weather Phenomena Reported",
        description: `New weather: ${current.presentWeather}`,
        previousValue: "None",
        currentValue: current.presentWeather,
        detectedAt: now,
      });
    }
  }

  // ── 7. SPECI observation ────────────────────────────────────────────────
  if (current.isSpeci && !snapshot.isSpeci) {
    changes.push({
      id: `speci-${now.getTime()}`,
      type: "speci",
      severity: "amber",
      title: "SPECI Observation Issued",
      description:
        "A special (unscheduled) observation was issued, indicating significant weather change at the station",
      previousValue: "METAR",
      currentValue: "SPECI",
      detectedAt: now,
    });
  }

  // Sort: red first, then amber
  changes.sort((a, b) => {
    if (a.severity === "red" && b.severity === "amber") return -1;
    if (a.severity === "amber" && b.severity === "red") return 1;
    return 0;
  });

  return changes;
}
