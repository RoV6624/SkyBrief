import type { NormalizedMetar, AlertCondition } from "@/lib/api/types";
import type { Thresholds } from "./thresholds";
import { isNightVfr, getSunInfo } from "@/lib/minimums/night-vfr";

export type AlertRule = (
  metar: NormalizedMetar,
  thresholds: Thresholds,
  runwayHeading?: number
) => AlertCondition | null;

export const crosswindRule: AlertRule = (metar, thresholds, runwayHeading) => {
  if (runwayHeading == null || metar.wind.direction === "VRB") return null;

  const angleDeg = Math.abs(
    ((metar.wind.direction - runwayHeading + 540) % 360) - 180
  );
  const angleRad = (angleDeg * Math.PI) / 180;
  const crosswind = metar.wind.speed * Math.sin(angleRad);
  const gustCrosswind = metar.wind.gust
    ? metar.wind.gust * Math.sin(angleRad)
    : crosswind;

  const maxCrosswind = Math.max(crosswind, gustCrosswind);

  if (maxCrosswind > thresholds.crosswind.red) {
    return {
      id: `crosswind-${Date.now()}`,
      type: "crosswind",
      severity: "red",
      title: "Crosswind Exceeds Limits",
      message: `Crosswind component: ${maxCrosswind.toFixed(0)} kts (limit: ${thresholds.crosswind.red} kts)`,
      timestamp: new Date(),
    };
  }
  if (maxCrosswind > thresholds.crosswind.amber) {
    return {
      id: `crosswind-${Date.now()}`,
      type: "crosswind",
      severity: "amber",
      title: "Crosswind Advisory",
      message: `Crosswind component: ${maxCrosswind.toFixed(0)} kts`,
      timestamp: new Date(),
    };
  }
  return null;
};

export const tempDewpointRule: AlertRule = (metar, thresholds) => {
  if (metar.tempDewpointSpread <= thresholds.tempDewpointSpread.red) {
    return {
      id: `tdspread-${Date.now()}`,
      type: "temp_dewpoint",
      severity: "red",
      title: "Fog / Visibility Risk",
      message: `Temp/dewpoint spread: ${metar.tempDewpointSpread.toFixed(1)}°C — fog likely`,
      timestamp: new Date(),
    };
  }
  if (metar.tempDewpointSpread <= thresholds.tempDewpointSpread.amber) {
    return {
      id: `tdspread-${Date.now()}`,
      type: "temp_dewpoint",
      severity: "amber",
      title: "Narrowing Temp/Dewpoint Spread",
      message: `Spread: ${metar.tempDewpointSpread.toFixed(1)}°C — monitor for fog`,
      timestamp: new Date(),
    };
  }
  return null;
};

export const gustRule: AlertRule = (metar, thresholds) => {
  if (!metar.wind.gust) return null;
  const gustDelta = metar.wind.gust - metar.wind.speed;
  if (gustDelta > thresholds.gustFactor) {
    return {
      id: `gusto-${Date.now()}`,
      type: "gust",
      severity: "amber",
      title: "High-Workload Landing",
      message: `Gusts ${metar.wind.gust} kts (${gustDelta} kts above sustained) — turbulent approach expected`,
      timestamp: new Date(),
    };
  }
  return null;
};

export const ceilingRule: AlertRule = (metar, thresholds) => {
  if (metar.ceiling === null) return null;
  if (metar.ceiling < thresholds.ceiling.red) {
    return {
      id: `ceiling-${Date.now()}`,
      type: "ceiling",
      severity: "red",
      title: "Low Ceiling",
      message: `Ceiling at ${metar.ceiling} ft AGL`,
      timestamp: new Date(),
    };
  }
  if (metar.ceiling < thresholds.ceiling.amber) {
    return {
      id: `ceiling-${Date.now()}`,
      type: "ceiling",
      severity: "amber",
      title: "Reduced Ceiling",
      message: `Ceiling at ${metar.ceiling} ft AGL`,
      timestamp: new Date(),
    };
  }
  return null;
};

export const visibilityRule: AlertRule = (metar, thresholds) => {
  if (metar.visibility.sm < thresholds.visibility.red) {
    return {
      id: `vis-${Date.now()}`,
      type: "visibility",
      severity: "red",
      title: "Low Visibility",
      message: `Visibility ${metar.visibility.sm} SM`,
      timestamp: new Date(),
    };
  }
  if (metar.visibility.sm < thresholds.visibility.amber) {
    return {
      id: `vis-${Date.now()}`,
      type: "visibility",
      severity: "amber",
      title: "Reduced Visibility",
      message: `Visibility ${metar.visibility.sm} SM`,
      timestamp: new Date(),
    };
  }
  return null;
};

export const speciRule: AlertRule = (metar) => {
  if (metar.isSpeci) {
    return {
      id: `speci-${Date.now()}`,
      type: "speci",
      severity: "amber",
      title: "Special Observation",
      message: "SPECI issued — conditions changed rapidly since last scheduled report",
      timestamp: new Date(),
    };
  }
  return null;
};

export const nightVfrRule: AlertRule = (metar) => {
  const { lat, lon } = metar.location;
  if (!isNightVfr(lat, lon)) return null;

  const sunInfo = getSunInfo(lat, lon);
  const severity: "amber" | "red" =
    metar.flightCategory === "VFR" ? "amber" : "red";

  return {
    id: `nightvfr-${Date.now()}`,
    type: "night_vfr",
    severity,
    title: "Night VFR Operations",
    message: `Night conditions — increased minimums apply (ceiling >= 1500ft, visibility >= 5SM). Sunset ${sunInfo.sunset}, civil twilight ends ${sunInfo.civilTwilightEnd}`,
    timestamp: new Date(),
  };
};

export const lowAltimeterRule: AlertRule = (metar) => {
  if (metar.altimeter < 29.7) {
    return {
      id: `lowaltim-${Date.now()}`,
      type: "low_altimeter",
      severity: "amber",
      title: "Low Pressure System",
      message: `Altimeter ${metar.altimeter.toFixed(2)}" — low pressure detected. Expect higher true altitude than indicated.`,
      timestamp: new Date(),
    };
  }
  return null;
};

export const allRules: AlertRule[] = [
  crosswindRule,
  tempDewpointRule,
  gustRule,
  ceilingRule,
  visibilityRule,
  speciRule,
  nightVfrRule,
  lowAltimeterRule,
];
