import type { MetarCloud } from "@/lib/api/types";

const COVER_LABELS: Record<string, string> = {
  CLR: "Clear",
  FEW: "Few Clouds",
  SCT: "Scattered",
  BKN: "Broken",
  OVC: "Overcast",
};

const ORDER = ["CLR", "FEW", "SCT", "BKN", "OVC"];

export function getSkyConditionText(clouds: MetarCloud[]): string {
  if (!clouds.length) return "Clear";
  let best = clouds[0];
  for (const c of clouds) {
    if (ORDER.indexOf(c.cover) > ORDER.indexOf(best.cover)) best = c;
  }
  return COVER_LABELS[best.cover] ?? best.cover;
}
