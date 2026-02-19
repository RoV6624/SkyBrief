/**
 * Airport Familiarity Integration for FRAT
 *
 * Provides automated familiarity scoring based on visit history,
 * with contextual tips for unfamiliar airports.
 */

import type { AirportVisit } from "@/stores/familiarity-store";

export interface FamiliarityInfo {
  score: number; // 1-10 FRAT compatible
  label: "home" | "familiar" | "visited" | "unfamiliar";
  tips: string[];
  daysSinceLastVisit: number | null;
  visitCount: number;
}

/**
 * Get detailed familiarity info with tips for the pilot
 */
export function getFamiliarityInfo(
  visit: AirportVisit | null,
  familiarityScore: number
): FamiliarityInfo {
  const daysSince = visit
    ? Math.floor((Date.now() - new Date(visit.lastVisited).getTime()) / 86400000)
    : null;

  const label: FamiliarityInfo["label"] =
    familiarityScore <= 2 ? "home" :
    familiarityScore <= 5 ? "familiar" :
    familiarityScore <= 8 ? "visited" : "unfamiliar";

  const tips: string[] = [];

  if (label === "unfamiliar") {
    tips.push("Review airport diagram before departure");
    tips.push("Check for noise abatement procedures");
    tips.push("Verify pattern altitude and entry direction");
    tips.push("Review local NOTAMs carefully");
    tips.push("Consider calling the FBO for local procedures");
  } else if (label === "visited" && daysSince && daysSince > 180) {
    tips.push("It's been a while — review airport diagram");
    tips.push("Check for any new NOTAMs or procedure changes");
  } else if (label === "familiar" && daysSince && daysSince > 90) {
    tips.push("Check NOTAMs for any changes since your last visit");
  }

  return {
    score: familiarityScore,
    label,
    tips,
    daysSinceLastVisit: daysSince,
    visitCount: visit?.visitCount ?? 0,
  };
}

/**
 * Get a brief text description of familiarity
 */
export function getFamiliarityText(info: FamiliarityInfo): string {
  if (info.label === "home") return `Home base (${info.visitCount} visits)`;
  if (info.label === "familiar") return `Familiar (${info.visitCount} visits)`;
  if (info.label === "visited") {
    const ago = info.daysSinceLastVisit != null
      ? info.daysSinceLastVisit > 30
        ? `${Math.floor(info.daysSinceLastVisit / 30)}mo ago`
        : `${info.daysSinceLastVisit}d ago`
      : "";
    return `Visited ${info.visitCount}x ${ago}`.trim();
  }
  return "First visit";
}
