import type {
  TafResponse,
  TafForecast,
  FlightCategory,
  NormalizedMetar,
} from "@/lib/api/types";
import type {
  ForecastPoint,
  WeatherTrend,
  TrendDirection,
} from "@/lib/briefing/types";

/**
 * Parse TAF data into hourly forecast points for the next 6 hours.
 * Each point represents the expected conditions at that time.
 */
export function generateForecastTimeline(
  taf: TafResponse,
  currentMetar?: NormalizedMetar | null
): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const now = new Date();

  for (let i = 0; i <= 6; i++) {
    const targetTime = new Date(now.getTime() + i * 3600_000);
    const targetEpoch = targetTime.getTime() / 1000;

    // Find the applicable forecast period
    const forecast = findApplicableForecast(taf.fcsts, targetEpoch);
    if (!forecast) continue;

    const ceiling = computeCeiling(forecast.clouds);
    const visibility = parseVisibility(forecast.visib);
    const category = computeFlightCategory(ceiling, visibility);

    points.push({
      time: targetTime,
      flightCategory: category,
      ceiling,
      visibility,
      wind: {
        direction: forecast.wdir,
        speed: forecast.wspd,
        gust: forecast.wgst,
      },
      wxString: forecast.wxString,
      clouds: forecast.clouds.map((c) => ({ cover: c.cover, base: c.base })),
    });
  }

  return points;
}

/**
 * Analyze trends by comparing current METAR conditions to TAF forecast.
 * Returns trend indicators for key weather metrics.
 */
export function analyzeWeatherTrends(
  currentMetar: NormalizedMetar,
  taf: TafResponse
): WeatherTrend[] {
  const trends: WeatherTrend[] = [];
  const timeline = generateForecastTimeline(taf);

  if (timeline.length < 2) return trends;

  // Use the 2-3 hour forecast for trend comparison
  const futurePoint = timeline[2] || timeline[1];
  if (!futurePoint) return trends;

  // Ceiling trend
  const currentCeiling = currentMetar.ceiling;
  const futureCeiling = futurePoint.ceiling;

  if (currentCeiling !== null && futureCeiling !== null) {
    const diff = futureCeiling - currentCeiling;
    const direction = getTrendDirection(diff, 500);
    trends.push({
      metric: "Ceiling",
      direction,
      currentValue: `${currentCeiling} ft`,
      forecastValue: `${futureCeiling} ft`,
      changeDescription: describeChange("Ceiling", currentCeiling, futureCeiling, "ft", direction),
    });
  } else if (currentCeiling !== null && futureCeiling === null) {
    trends.push({
      metric: "Ceiling",
      direction: "improving",
      currentValue: `${currentCeiling} ft`,
      forecastValue: "Clear",
      changeDescription: "Ceiling expected to clear",
    });
  } else if (currentCeiling === null && futureCeiling !== null) {
    trends.push({
      metric: "Ceiling",
      direction: "deteriorating",
      currentValue: "Clear",
      forecastValue: `${futureCeiling} ft`,
      changeDescription: `Ceiling expected to develop at ${futureCeiling} ft`,
    });
  }

  // Visibility trend
  const currentVis = currentMetar.visibility.sm;
  const futureVis = futurePoint.visibility;
  const visDiff = futureVis - currentVis;
  const visDirection = getTrendDirection(visDiff, 1);
  trends.push({
    metric: "Visibility",
    direction: visDirection,
    currentValue: `${currentVis} SM`,
    forecastValue: `${futureVis} SM`,
    changeDescription: describeChange("Visibility", currentVis, futureVis, "SM", visDirection),
  });

  // Wind trend
  const currentWind = currentMetar.wind.speed;
  const futureWind = futurePoint.wind.speed;
  const windDiff = futureWind - currentWind;
  // For wind, increasing = deteriorating
  const windDirection = windDiff > 3 ? "deteriorating" : windDiff < -3 ? "improving" : "stable";
  trends.push({
    metric: "Wind",
    direction: windDirection,
    currentValue: `${currentWind} kts`,
    forecastValue: `${futureWind} kts`,
    changeDescription:
      windDirection === "stable"
        ? "Wind speed expected to remain steady"
        : windDirection === "improving"
        ? `Wind decreasing from ${currentWind} to ${futureWind} kts`
        : `Wind increasing from ${currentWind} to ${futureWind} kts`,
  });

  // Flight category trend
  const currentCat = currentMetar.flightCategory;
  const futureCat = futurePoint.flightCategory;
  if (currentCat !== futureCat) {
    const catOrder: FlightCategory[] = ["LIFR", "IFR", "MVFR", "VFR"];
    const currentIdx = catOrder.indexOf(currentCat);
    const futureIdx = catOrder.indexOf(futureCat);
    trends.push({
      metric: "Flight Category",
      direction: futureIdx > currentIdx ? "improving" : "deteriorating",
      currentValue: currentCat,
      forecastValue: futureCat,
      changeDescription: `Conditions expected to change from ${currentCat} to ${futureCat}`,
    });
  }

  return trends;
}

// ===== Helpers =====

function findApplicableForecast(
  fcsts: TafForecast[],
  targetEpoch: number
): TafForecast | null {
  // Sort by timeFrom descending to find the most specific applicable period
  // TEMPO/PROB periods are ignored — we use FM periods only for the timeline
  const fmPeriods = fcsts.filter(
    (f) => f.fcstChange === "FM" || f.fcstChange === null
  );

  for (let i = fmPeriods.length - 1; i >= 0; i--) {
    const period = fmPeriods[i];
    if (targetEpoch >= period.timeFrom && targetEpoch < period.timeTo) {
      return period;
    }
  }

  // Fallback: return the first period that hasn't ended yet
  return fmPeriods.find((f) => targetEpoch < f.timeTo) ?? fmPeriods[0] ?? null;
}

function computeCeiling(clouds: Array<{ cover: string; base: number }>): number | null {
  for (const cloud of clouds) {
    if (cloud.cover === "BKN" || cloud.cover === "OVC") {
      return cloud.base;
    }
  }
  return null;
}

function parseVisibility(visib: string | number | undefined | null): number {
  if (visib == null) return 10;
  const str = String(visib);
  if (!str) return 10;
  const cleaned = str.replace("+", "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 10 : parsed;
}

function computeFlightCategory(
  ceiling: number | null,
  visibility: number
): FlightCategory {
  // LIFR: ceiling < 500 or vis < 1
  if ((ceiling !== null && ceiling < 500) || visibility < 1) return "LIFR";
  // IFR: ceiling 500-999 or vis 1-2.99
  if ((ceiling !== null && ceiling < 1000) || visibility < 3) return "IFR";
  // MVFR: ceiling 1000-2999 or vis 3-4.99
  if ((ceiling !== null && ceiling < 3000) || visibility < 5) return "MVFR";
  // VFR
  return "VFR";
}

function getTrendDirection(diff: number, threshold: number): TrendDirection {
  if (diff > threshold) return "improving";
  if (diff < -threshold) return "deteriorating";
  return "stable";
}

function describeChange(
  metric: string,
  current: number,
  future: number,
  unit: string,
  direction: TrendDirection
): string {
  if (direction === "stable") {
    return `${metric} expected to remain around ${current} ${unit}`;
  }
  return `${metric} ${direction === "improving" ? "improving" : "dropping"} from ${current} to ${future} ${unit}`;
}
