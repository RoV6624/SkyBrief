import type { ServerMetar, ServerTaf } from "./fetch-weather";

export interface BriefingSummary {
  summary: string;
  hazards: string[];
  recommendation: "FAVORABLE" | "CAUTION" | "UNFAVORABLE";
  goNoGo: "go" | "marginal" | "nogo";
}

/**
 * Server-side rule-based briefing engine.
 * Analyzes METAR and TAF data to produce a pilot-oriented weather briefing
 * with hazard identification and go/no-go recommendation.
 *
 * Port of the client-side local-briefing.ts logic for use in Cloud Functions.
 */
export function generateBriefing(
  metar: ServerMetar,
  taf: ServerTaf | null
): BriefingSummary {
  const hazards: string[] = [];
  const parts: string[] = [];
  let isNoGo = false;
  let isHighCaution = false;

  // ===== 1. CRITICAL WEATHER - Automatic no-go conditions =====
  if (metar.presentWeather) {
    const wx = metar.presentWeather.toUpperCase();

    // Thunderstorms = automatic no-go
    if (wx.includes("TS")) {
      hazards.push("THUNDERSTORMS PRESENT OR IN VICINITY - DO NOT FLY");
      parts.push("THUNDERSTORMS are active in the area. This is a no-go situation.");
      isNoGo = true;
    }

    // Severe icing - freezing rain or freezing drizzle
    if (wx.includes("FZRA") || wx.includes("FZDZ")) {
      hazards.push("FREEZING RAIN/DRIZZLE - Severe icing conditions");
      parts.push(
        "Freezing precipitation is falling - extremely hazardous for non-FIKI aircraft."
      );
      isNoGo = true;
    }

    // Convective activity
    if (wx.includes("FC") || wx.includes("SQ")) {
      hazards.push("FUNNEL CLOUD or SQUALLS reported");
      isNoGo = true;
    }
  }

  // ===== 2. Flight Category Assessment =====
  if (!isNoGo) {
    const catDesc = assessFlightCategory(metar.flightCategory);
    parts.push(catDesc);
  }

  // ===== 3. Wind Analysis =====
  const windResult = analyzeWind(metar);
  if (windResult.warning) {
    hazards.push(windResult.warning);
    if (windResult.noGo) isHighCaution = true;
  }
  if (windResult.description) {
    parts.push(windResult.description);
  }

  // ===== 4. Visibility Analysis =====
  if (metar.visibility < 1) {
    hazards.push(`VERY LOW VISIBILITY at ${metar.visibility} SM - IFR conditions`);
    if (metar.flightCategory === "LIFR") isNoGo = true;
  } else if (metar.visibility < 3) {
    hazards.push(`Low visibility at ${metar.visibility} SM - Reduced VFR margins`);
  }

  // ===== 5. Temperature/Dewpoint Spread (fog risk) =====
  const spread = metar.temperature - metar.dewpoint;
  if (spread <= 1) {
    hazards.push(
      `Temp/dewpoint spread ${spread.toFixed(1)} C - FOG FORMING NOW or imminent`
    );
    isHighCaution = true;
  } else if (spread <= 2) {
    hazards.push(
      `Temp/dewpoint spread ${spread.toFixed(1)} C - Monitor closely for fog development`
    );
  }

  // ===== 6. Ceiling Analysis =====
  if (metar.ceiling !== null) {
    if (metar.ceiling < 500) {
      hazards.push(
        `EXTREMELY LOW CEILING at ${metar.ceiling} ft AGL - LIFR conditions`
      );
      isNoGo = true;
    } else if (metar.ceiling < 1000) {
      hazards.push(
        `Low ceiling at ${metar.ceiling} ft AGL - Requires high proficiency`
      );
      isHighCaution = true;
    } else if (metar.ceiling < 3000) {
      const coverType =
        metar.clouds.find((c) => c.base === metar.ceiling)?.cover === "OVC"
          ? "overcast"
          : "broken";
      parts.push(`Ceiling ${metar.ceiling.toLocaleString()} ft ${coverType}.`);
    } else {
      parts.push(`Good ceiling at ${metar.ceiling.toLocaleString()} ft.`);
    }
  } else {
    parts.push("Skies are clear to scattered.");
  }

  // ===== 7. Present Weather (non-critical phenomena) =====
  if (metar.presentWeather && !isNoGo) {
    const wxDesc = describeWeatherPhenomena(metar.presentWeather);
    if (wxDesc) {
      parts.push(wxDesc);
      if (
        metar.presentWeather.includes("RA") ||
        metar.presentWeather.includes("SN")
      ) {
        hazards.push(`Active precipitation: ${metar.presentWeather}`);
      }
    }
  }

  // ===== 8. Altimeter Check =====
  if (metar.altimeter < 29.80) {
    hazards.push(
      `Low altimeter setting ${metar.altimeter.toFixed(2)} inHg - Density altitude concerns`
    );
  }

  // ===== 9. TAF Trend Analysis =====
  if (taf && taf.forecasts.length > 0) {
    const tafAnalysis = analyzeTafTrends(taf, metar.flightCategory);
    if (tafAnalysis.warning) {
      hazards.push(tafAnalysis.warning);
      if (tafAnalysis.deteriorating) isHighCaution = true;
    }
    if (tafAnalysis.description) {
      parts.push(tafAnalysis.description);
    }
  }

  // ===== 10. Final Recommendation =====
  let recommendation: BriefingSummary["recommendation"];
  let goNoGo: BriefingSummary["goNoGo"];

  if (isNoGo) {
    recommendation = "UNFAVORABLE";
    goNoGo = "nogo";
    parts.push(
      "RECOMMENDATION: DO NOT FLY. These conditions are too hazardous."
    );
  } else if (
    isHighCaution ||
    metar.flightCategory === "IFR" ||
    metar.flightCategory === "LIFR"
  ) {
    recommendation = "UNFAVORABLE";
    goNoGo = "nogo";
    parts.push(
      "RECOMMENDATION: Stay on the ground unless you are highly proficient and current."
    );
  } else if (metar.flightCategory === "MVFR" || hazards.length >= 2) {
    recommendation = "CAUTION";
    goNoGo = "marginal";
    parts.push(
      "RECOMMENDATION: Proceed with caution. Monitor conditions closely."
    );
  } else if (hazards.length === 1) {
    recommendation = "CAUTION";
    goNoGo = "marginal";
    parts.push("RECOMMENDATION: Acceptable for flight, but stay alert.");
  } else {
    recommendation = "FAVORABLE";
    goNoGo = "go";
    parts.push("RECOMMENDATION: Good conditions for VFR flight.");
  }

  return {
    summary: parts.join(" "),
    hazards,
    recommendation,
    goNoGo,
  };
}

// ===== Helper Functions =====

function assessFlightCategory(category: string): string {
  switch (category) {
    case "VFR":
      return "Conditions are VFR - good visibility and ceilings for visual flight.";
    case "MVFR":
      return "Conditions are Marginal VFR - ceiling and/or visibility are borderline. Extra vigilance required.";
    case "IFR":
      return "Conditions are IFR - you need an instrument rating and IFR clearance. VFR flight is NOT authorized.";
    case "LIFR":
      return "Conditions are Low IFR - extremely restricted visibility and/or ceiling. Even for IFR operations, this is challenging.";
    default:
      return `Current flight category: ${category}.`;
  }
}

function analyzeWind(metar: ServerMetar): {
  description: string | null;
  warning: string | null;
  noGo: boolean;
} {
  if (metar.windSpeed === 0) {
    return { description: "Winds are calm.", warning: null, noGo: false };
  }

  const dir =
    metar.windDirection === "VRB" || metar.windDirection === 0
      ? "variable"
      : `from ${String(metar.windDirection).padStart(3, "0")} degrees`;

  let desc = `Winds ${dir} at ${metar.windSpeed} kts`;
  let warning: string | null = null;
  let noGo = false;

  if (metar.windGust) {
    const gustSpread = metar.windGust - metar.windSpeed;
    desc += `, gusting ${metar.windGust} kts`;

    if (metar.windGust > 35) {
      warning = `STRONG GUSTS to ${metar.windGust} kts - Approach and landing will be challenging`;
      noGo = true;
    } else if (metar.windGust > 25 || gustSpread > 15) {
      warning = `Gusty winds (${gustSpread} kt gust spread) - Expect bumpy approach, use caution`;
    } else if (gustSpread > 10) {
      warning = `Moderate gusts (${gustSpread} kt spread) - Stay alert on approach`;
    }
  } else if (metar.windSpeed > 25) {
    warning = `Strong sustained winds at ${metar.windSpeed} kts - Crosswind component may be significant`;
  }

  desc += ".";
  return { description: desc, warning, noGo };
}

function describeWeatherPhenomena(wx: string): string | null {
  const phenomena: Record<string, string> = {
    RA: "rain",
    SN: "snow",
    FG: "fog",
    BR: "mist",
    HZ: "haze",
    TS: "thunderstorms",
    FZ: "freezing precipitation",
    FZRA: "freezing rain",
    FZSN: "freezing snow",
    GR: "hail",
    SQ: "squalls",
    FC: "funnel cloud",
    DZ: "drizzle",
    FZDZ: "freezing drizzle",
    SH: "showers",
  };

  const found: string[] = [];
  for (const [code, desc] of Object.entries(phenomena)) {
    if (wx.includes(code)) {
      found.push(desc);
    }
  }

  if (found.length === 0) return null;
  return `Reporting ${found.join(", ")} in the vicinity.`;
}

/**
 * Analyze TAF forecasts for trend information and deterioration warnings.
 * Focuses on the next 6 hours of forecast data.
 */
function analyzeTafTrends(
  taf: ServerTaf,
  currentCategory: string
): { description: string | null; warning: string | null; deteriorating: boolean } {
  const now = Date.now();
  const sixHoursLater = now + 6 * 60 * 60 * 1000;

  // Filter forecasts within the next 6 hours
  const upcoming = taf.forecasts.filter((f) => {
    const fromTime = new Date(f.timeFrom).getTime();
    return fromTime <= sixHoursLater;
  });

  if (upcoming.length === 0) {
    return { description: null, warning: null, deteriorating: false };
  }

  // Check for deteriorating conditions
  const categoryRank: Record<string, number> = {
    VFR: 4,
    MVFR: 3,
    IFR: 2,
    LIFR: 1,
  };

  const currentRank = categoryRank[currentCategory] ?? 4;
  let worstForecastRank = currentRank;
  let worstCategory = currentCategory;
  let hasThunderstorms = false;
  let hasFreezingPrecip = false;

  for (const fcst of upcoming) {
    const fcstRank = categoryRank[fcst.flightCategory] ?? 4;
    if (fcstRank < worstForecastRank) {
      worstForecastRank = fcstRank;
      worstCategory = fcst.flightCategory;
    }

    if (fcst.wxString) {
      const wx = fcst.wxString.toUpperCase();
      if (wx.includes("TS")) hasThunderstorms = true;
      if (wx.includes("FZ")) hasFreezingPrecip = true;
    }
  }

  const deteriorating = worstForecastRank < currentRank;

  let warning: string | null = null;
  let description: string | null = null;

  if (hasThunderstorms) {
    warning = "TAF forecasts THUNDERSTORMS within the next 6 hours";
  } else if (hasFreezingPrecip) {
    warning = "TAF forecasts FREEZING PRECIPITATION within the next 6 hours";
  } else if (deteriorating) {
    warning = `Conditions forecast to deteriorate to ${worstCategory} within the next 6 hours`;
  }

  if (deteriorating) {
    description = `FORECAST TREND: Conditions expected to worsen from ${currentCategory} to ${worstCategory} in the next 6 hours.`;
  } else if (worstForecastRank > currentRank) {
    description = `FORECAST TREND: Conditions expected to improve to ${worstCategory} in the next 6 hours.`;
  } else {
    description = `FORECAST TREND: Conditions expected to remain ${currentCategory} for the next 6 hours.`;
  }

  return { description, warning, deteriorating };
}
