import type { TafResponse, FlightCategory } from "@/lib/api/types";
import type { ArrivalForecast } from "./types";

function findCeiling(clouds: { cover: string; base: number }[]): number | null {
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

function deriveFlightCategory(
  visSm: number,
  ceiling: number | null
): FlightCategory {
  if (visSm < 1 || (ceiling !== null && ceiling < 500)) return "LIFR";
  if (visSm < 3 || (ceiling !== null && ceiling < 1000)) return "IFR";
  if (visSm <= 5 || (ceiling !== null && ceiling <= 3000)) return "MVFR";
  return "VFR";
}

/**
 * Given a TAF and an arrival time (epoch seconds), find the applicable
 * forecast period and return the forecasted conditions.
 */
export function getArrivalForecast(
  taf: TafResponse,
  arrivalTimeEpoch: number
): ArrivalForecast | null {
  // Find the FM/BECMG period that covers the arrival time
  // Prefer base forecasts (FM or null), fall back to BECMG
  let bestForecast = null;

  for (const fcst of taf.fcsts) {
    if (fcst.fcstChange === "TEMPO" || fcst.fcstChange === "PROB") continue;

    if (fcst.timeFrom <= arrivalTimeEpoch && arrivalTimeEpoch < fcst.timeTo) {
      bestForecast = fcst;
      // Don't break — later FM periods override earlier ones
    }
  }

  if (!bestForecast) return null;

  const visSm = parseVisibility(bestForecast.visib);
  const ceiling = findCeiling(bestForecast.clouds);
  const flightCategory = deriveFlightCategory(visSm, ceiling);

  const windDir = String(bestForecast.wdir).padStart(3, "0");
  const windStr = bestForecast.wgst
    ? `${windDir}@${bestForecast.wspd}G${bestForecast.wgst}kt`
    : `${windDir}@${bestForecast.wspd}kt`;

  return {
    station: taf.icaoId,
    arrivalTime: arrivalTimeEpoch,
    visibility: bestForecast.visib,
    wind: windStr,
    ceiling,
    flightCategory,
    wxString: bestForecast.wxString,
  };
}
