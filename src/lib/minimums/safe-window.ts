import type { TafResponse } from "@/lib/api/types";
import type { PersonalMinimums } from "./types";

export interface SafeWindow {
  from: number; // epoch
  to: number; // epoch
  fromZulu: string; // formatted
  toZulu: string; // formatted
}

function formatZulu(epoch: number): string {
  const d = new Date(epoch * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
}

function findCeiling(
  clouds: { cover: string; base: number }[]
): number | null {
  const ceilingLayers = clouds.filter(
    (c) => c.cover === "BKN" || c.cover === "OVC"
  );
  if (ceilingLayers.length === 0) return null;
  return Math.min(...ceilingLayers.map((c) => c.base));
}

function parseVisibility(visib: string): number {
  if (visib === "10+") return 10;
  const val = parseFloat(visib);
  return isNaN(val) ? 10 : val;
}

export function findSafeWindow(
  taf: TafResponse,
  minimums: PersonalMinimums
): SafeWindow | null {
  for (const fcst of taf.fcsts) {
    // Skip TEMPO/PROB periods — only look at base forecasts (FM or null change type)
    if (fcst.fcstChange === "TEMPO" || fcst.fcstChange === "PROB") {
      continue;
    }

    const ceiling = findCeiling(fcst.clouds);
    const vis = parseVisibility(fcst.visib);
    const wind = fcst.wspd;
    const gust = fcst.wgst ?? 0;

    // Check if all minimums are met
    const ceilingOk = ceiling === null || ceiling >= minimums.ceiling;
    const visOk = vis >= minimums.visibility;
    const windOk = wind <= minimums.maxWind;
    const gustOk = gust <= minimums.maxGust;

    if (ceilingOk && visOk && windOk && gustOk) {
      return {
        from: fcst.timeFrom,
        to: fcst.timeTo,
        fromZulu: formatZulu(fcst.timeFrom),
        toZulu: formatZulu(fcst.timeTo),
      };
    }
  }

  return null;
}
