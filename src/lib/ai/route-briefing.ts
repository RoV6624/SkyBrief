import type { RouteWeatherPoint, ArrivalForecast } from "@/lib/route/types";
import type { NavLogLeg } from "@/lib/navlog/types";
import type { FlightCategory } from "@/lib/api/types";

export interface RouteBriefingResult {
  summary: string;
  legHazards: string[];
  recommendation: "FAVORABLE" | "CAUTION" | "UNFAVORABLE";
  generatedAt: Date;
}

// ─── Local Fallback Engine ──────────────────────────────────────────────────

const CATEGORY_RANK: Record<FlightCategory, number> = {
  VFR: 0,
  MVFR: 1,
  IFR: 2,
  LIFR: 3,
};

export function generateLocalRouteBriefing(
  weatherPoints: RouteWeatherPoint[],
  legs: NavLogLeg[],
  arrivalForecasts: (ArrivalForecast | null)[]
): RouteBriefingResult {
  const legHazards: string[] = [];
  let worstCat: FlightCategory = "VFR";
  let hasThunderstorm = false;
  let hasIcing = false;

  // Analyze each leg
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const fromWp = weatherPoints.find((w) => w.waypoint.icao === leg.from.icao);
    const toWp = weatherPoints.find((w) => w.waypoint.icao === leg.to.icao);
    const forecast = arrivalForecasts[i];

    // Check departure station
    if (fromWp?.metar) {
      const cat = fromWp.metar.flightCategory;
      if (CATEGORY_RANK[cat] > CATEGORY_RANK[worstCat]) worstCat = cat;

      if (fromWp.metar.presentWeather?.includes("TS")) {
        hasThunderstorm = true;
        legHazards.push(
          `${leg.from.icao}: Thunderstorms reported at departure`
        );
      }
      if (fromWp.metar.presentWeather?.includes("FZ")) {
        hasIcing = true;
      }

      // Strong crosswind
      if (fromWp.metar.wind.gust && fromWp.metar.wind.gust > 25) {
        legHazards.push(
          `${leg.from.icao}: Strong gusts to ${fromWp.metar.wind.gust}kt`
        );
      }
    }

    // Check destination station
    if (toWp?.metar) {
      const cat = toWp.metar.flightCategory;
      if (CATEGORY_RANK[cat] > CATEGORY_RANK[worstCat]) worstCat = cat;

      if (toWp.metar.presentWeather?.includes("TS")) {
        hasThunderstorm = true;
        legHazards.push(
          `${leg.to.icao}: Thunderstorms at destination`
        );
      }
    }

    // Check arrival forecast vs current conditions
    if (forecast) {
      if (CATEGORY_RANK[forecast.flightCategory] > CATEGORY_RANK[worstCat]) {
        worstCat = forecast.flightCategory;
      }

      const currentCat = toWp?.metar?.flightCategory;
      if (
        currentCat &&
        CATEGORY_RANK[forecast.flightCategory] > CATEGORY_RANK[currentCat]
      ) {
        legHazards.push(
          `${leg.to.icao}: Conditions forecast to deteriorate from ${currentCat} to ${forecast.flightCategory} by arrival`
        );
      }

      if (forecast.wxString?.includes("TS")) {
        hasThunderstorm = true;
        legHazards.push(
          `${forecast.station}: Thunderstorms forecast at arrival`
        );
      }
    }
  }

  // Build summary
  const parts: string[] = [];

  if (hasThunderstorm) {
    parts.push(
      "THUNDERSTORM ACTIVITY along your route. This is a no-go situation for VFR flight."
    );
  } else if (worstCat === "LIFR" || worstCat === "IFR") {
    parts.push(
      `${worstCat} conditions exist along your route. VFR flight is not recommended.`
    );
  } else if (worstCat === "MVFR") {
    parts.push(
      "Marginal VFR conditions along portions of your route. Proceed with caution and monitor conditions."
    );
  } else {
    parts.push(
      "VFR conditions prevail along your route. Good conditions for visual flight."
    );
  }

  // Arrival forecast insights
  const deteriorating = arrivalForecasts.filter((f) => {
    if (!f) return false;
    const wp = weatherPoints.find((w) => w.waypoint.icao === f.station);
    if (!wp?.metar) return false;
    return (
      CATEGORY_RANK[f.flightCategory] >
      CATEGORY_RANK[wp.metar.flightCategory]
    );
  });

  if (deteriorating.length > 0) {
    parts.push(
      `Weather is forecast to deteriorate at ${deteriorating.length} station${deteriorating.length > 1 ? "s" : ""} by your estimated arrival time.`
    );
  }

  if (hasIcing) {
    parts.push("Freezing precipitation reported enroute. Check PIREPs for icing.");
  }

  if (legHazards.length === 0 && worstCat === "VFR") {
    parts.push("No significant hazards identified.");
  }

  // Recommendation
  let recommendation: RouteBriefingResult["recommendation"];
  if (hasThunderstorm || worstCat === "IFR" || worstCat === "LIFR") {
    recommendation = "UNFAVORABLE";
  } else if (worstCat === "MVFR" || legHazards.length >= 2 || hasIcing) {
    recommendation = "CAUTION";
  } else if (legHazards.length === 1) {
    recommendation = "CAUTION";
  } else {
    recommendation = "FAVORABLE";
  }

  return {
    summary: parts.join(" "),
    legHazards,
    recommendation,
    generatedAt: new Date(),
  };
}
