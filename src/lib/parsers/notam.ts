import type { NotamResponse } from "@/lib/api/types";
import type { Notam } from "@/components/notam/NotamCard";

/**
 * Normalize FAA NOTAM API response to app-friendly format
 */
export function normalizeNotam(raw: NotamResponse): Notam {
  return {
    id: raw.number || raw.id,
    station: raw.icaoLocation,
    category: categorizeNotam(raw.text, raw.type),
    effectiveStart: new Date(raw.effectiveStart),
    effectiveEnd: new Date(raw.effectiveEnd),
    message: raw.text.trim(),
    priority: determinePriority(raw.text, raw.type),
  };
}

/**
 * Categorize NOTAM based on text content and type
 */
function categorizeNotam(
  text: string,
  type?: string
): "runway" | "taxiway" | "navaid" | "airspace" | "other" {
  const upperText = text.toUpperCase();

  if (
    upperText.includes("RWY") ||
    upperText.includes("RUNWAY") ||
    /\bR\d{2}[LRC]?\b/.test(upperText)
  ) {
    return "runway";
  }

  if (
    upperText.includes("TWY") ||
    upperText.includes("TAXIWAY") ||
    /\bTWY [A-Z]\b/.test(upperText)
  ) {
    return "taxiway";
  }

  if (
    upperText.includes("ILS") ||
    upperText.includes("VOR") ||
    upperText.includes("NAVAID") ||
    upperText.includes("LOCALIZER") ||
    upperText.includes("GLIDESLOPE") ||
    upperText.includes("GPS") ||
    upperText.includes("RNAV") ||
    upperText.includes("NDB")
  ) {
    return "navaid";
  }

  if (
    upperText.includes("AIRSPACE") ||
    upperText.includes("TFR") ||
    upperText.includes("TEMPORARY FLIGHT RESTRICTION") ||
    upperText.includes("RESTRICTED") ||
    upperText.includes("PROHIBITED")
  ) {
    return "airspace";
  }

  return "other";
}

/**
 * Determine priority based on content
 */
function determinePriority(
  text: string,
  type?: string
): "high" | "medium" | "low" {
  const upperText = text.toUpperCase();

  // High priority: Closures, restrictions, hazards
  if (
    upperText.includes("CLSD") ||
    upperText.includes("CLOSED") ||
    upperText.includes("NOT AVAILABLE") ||
    upperText.includes("OUT OF SERVICE") ||
    upperText.includes("INOP") ||
    upperText.includes("U/S") ||
    upperText.includes("UNSERVICEABLE") ||
    upperText.includes("TFR") ||
    upperText.includes("RESTRICTED") ||
    upperText.includes("PROHIBITED")
  ) {
    return "high";
  }

  // Medium priority: Partial outages, warnings
  if (
    upperText.includes("LIMITED") ||
    upperText.includes("REDUCED") ||
    upperText.includes("CAUTION") ||
    upperText.includes("UNMARKED") ||
    upperText.includes("UNLIT") ||
    upperText.includes("OBST") ||
    upperText.includes("OBSTACLE")
  ) {
    return "medium";
  }

  return "low";
}
