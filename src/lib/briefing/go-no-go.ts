import type { NormalizedMetar, TafResponse, AiBriefing, AlertCondition } from "@/lib/api/types";
import type { PersonalMinimums, MinimumsResult } from "@/lib/minimums/types";
import type { FRATResult } from "@/lib/frat/types";
import type { GoNoGoResult, GoNoGoFactor, GoNoGoVerdict } from "./types";

/**
 * Smart Go/No-Go Decision Engine
 *
 * Combines all risk data into a single unified verdict:
 * - Current weather vs. personal minimums
 * - FRAT score
 * - Alert conditions
 * - AI briefing recommendation
 * - Daylight remaining
 * - Forecast trends (if TAF available)
 */
export function evaluateGoNoGo(params: {
  metar: NormalizedMetar;
  minimums: PersonalMinimums;
  minimumsResult: MinimumsResult;
  fratResult?: FRATResult;
  alerts?: AlertCondition[];
  briefing?: AiBriefing;
  taf?: TafResponse | null;
  daylightRemaining?: number; // minutes
  runwayLength?: number; // feet
}): GoNoGoResult {
  const factors: GoNoGoFactor[] = [];

  // 1. Flight Category Assessment
  evaluateFlightCategory(params.metar, factors);

  // 2. Personal Minimums
  evaluateMinimums(params.minimumsResult, params.minimums, factors);

  // 3. Wind Assessment
  evaluateWind(params.metar, params.minimums, factors);

  // 4. Visibility Assessment
  evaluateVisibility(params.metar, params.minimums, factors);

  // 5. Ceiling Assessment
  evaluateCeiling(params.metar, params.minimums, factors);

  // 6. Present Weather Hazards
  evaluatePresentWeather(params.metar, factors);

  // 7. FRAT Score
  if (params.fratResult) {
    evaluateFrat(params.fratResult, factors);
  }

  // 8. AI Briefing Recommendation
  if (params.briefing) {
    evaluateAiBriefing(params.briefing, factors);
  }

  // 9. Alert Conditions
  if (params.alerts) {
    evaluateAlerts(params.alerts, factors);
  }

  // 10. Daylight Check
  if (params.daylightRemaining !== undefined) {
    evaluateDaylight(params.daylightRemaining, factors);
  }

  // Calculate final verdict
  const verdict = calculateVerdict(factors);
  const summary = generateSummary(verdict, factors);

  return {
    verdict,
    factors,
    summary,
    timestamp: new Date(),
  };
}

// ===== Factor Evaluators =====

function evaluateFlightCategory(metar: NormalizedMetar, factors: GoNoGoFactor[]) {
  const cat = metar.flightCategory;
  const severity = cat === "VFR" ? "green" : cat === "MVFR" ? "amber" : "red";

  factors.push({
    id: "flight_category",
    category: "weather",
    label: "Flight Category",
    detail:
      cat === "VFR"
        ? "VFR conditions — ceiling and visibility well above minimums"
        : cat === "MVFR"
        ? "Marginal VFR — conditions near minimums, exercise caution"
        : cat === "IFR"
        ? "IFR conditions — not suitable for VFR flight"
        : "Low IFR — dangerous conditions for VFR flight",
    severity,
    current: cat,
  });
}

function evaluateMinimums(
  result: MinimumsResult,
  minimums: PersonalMinimums,
  factors: GoNoGoFactor[]
) {
  if (result.breached) {
    result.violations.forEach((violation) => {
      factors.push({
        id: `minimums_${violation.field}`,
        category: "minimums",
        label: `${violation.label} Below Minimums`,
        detail: `${violation.current} ${violation.unit} is below your personal minimum of ${violation.limit} ${violation.unit}`,
        severity: "red",
        current: `${violation.current} ${violation.unit}`,
        limit: `${violation.limit} ${violation.unit}`,
      });
    });
  } else {
    factors.push({
      id: "minimums_pass",
      category: "minimums",
      label: "Personal Minimums",
      detail: "All conditions meet your personal minimums",
      severity: "green",
    });
  }
}

function evaluateWind(
  metar: NormalizedMetar,
  minimums: PersonalMinimums,
  factors: GoNoGoFactor[]
) {
  const gustFactor = metar.wind.gust
    ? metar.wind.gust - metar.wind.speed
    : 0;

  if (gustFactor >= 15) {
    factors.push({
      id: "wind_gust_spread",
      category: "wind",
      label: "High Gust Spread",
      detail: `Wind gusting ${gustFactor} kts above sustained — significant turbulence and shear likely`,
      severity: "red",
      current: `${metar.wind.speed}G${metar.wind.gust} kts`,
    });
  } else if (gustFactor >= 10) {
    factors.push({
      id: "wind_gust_spread",
      category: "wind",
      label: "Moderate Gust Spread",
      detail: `Wind gusting ${gustFactor} kts above sustained — expect bumpy conditions`,
      severity: "amber",
      current: `${metar.wind.speed}G${metar.wind.gust} kts`,
    });
  }
}

function evaluateVisibility(
  metar: NormalizedMetar,
  minimums: PersonalMinimums,
  factors: GoNoGoFactor[]
) {
  const vis = metar.visibility.sm;
  if (vis < 3) {
    factors.push({
      id: "visibility_low",
      category: "weather",
      label: "Low Visibility",
      detail: `Visibility ${vis} SM — IFR conditions, not suitable for VFR flight`,
      severity: "red",
      current: `${vis} SM`,
      limit: `${minimums.visibility} SM`,
    });
  } else if (vis < 5) {
    factors.push({
      id: "visibility_marginal",
      category: "weather",
      label: "Marginal Visibility",
      detail: `Visibility ${vis} SM — consider delaying for improved conditions`,
      severity: "amber",
      current: `${vis} SM`,
      limit: `${minimums.visibility} SM`,
    });
  }
}

function evaluateCeiling(
  metar: NormalizedMetar,
  minimums: PersonalMinimums,
  factors: GoNoGoFactor[]
) {
  if (metar.ceiling === null) return; // Clear skies

  if (metar.ceiling < 1000) {
    factors.push({
      id: "ceiling_low",
      category: "weather",
      label: "Low Ceiling",
      detail: `Ceiling ${metar.ceiling} ft AGL — IFR/LIFR conditions`,
      severity: "red",
      current: `${metar.ceiling} ft`,
      limit: `${minimums.ceiling} ft`,
    });
  } else if (metar.ceiling < 2000) {
    factors.push({
      id: "ceiling_marginal",
      category: "weather",
      label: "Marginal Ceiling",
      detail: `Ceiling ${metar.ceiling} ft AGL — limited maneuvering altitude`,
      severity: "amber",
      current: `${metar.ceiling} ft`,
      limit: `${minimums.ceiling} ft`,
    });
  }
}

function evaluatePresentWeather(metar: NormalizedMetar, factors: GoNoGoFactor[]) {
  if (!metar.presentWeather) return;

  const wx = metar.presentWeather.toUpperCase();

  if (wx.includes("TS")) {
    factors.push({
      id: "wx_thunderstorm",
      category: "weather",
      label: "Thunderstorms",
      detail: "Thunderstorm activity reported — avoid area. No VFR flight into thunderstorms.",
      severity: "red",
      current: metar.presentWeather,
    });
  }

  if (wx.includes("FZ")) {
    factors.push({
      id: "wx_freezing",
      category: "weather",
      label: "Freezing Precipitation",
      detail: "Freezing precipitation reported — severe icing hazard",
      severity: "red",
      current: metar.presentWeather,
    });
  }

  if (wx.includes("FG") && !wx.includes("BR")) {
    factors.push({
      id: "wx_fog",
      category: "weather",
      label: "Fog",
      detail: "Fog reported — reduced visibility, conditions may deteriorate rapidly",
      severity: "red",
      current: metar.presentWeather,
    });
  }

  if (wx.includes("SN") || wx.includes("+RA")) {
    factors.push({
      id: "wx_precip",
      category: "weather",
      label: "Significant Precipitation",
      detail: "Snow or heavy rain reported — reduced visibility and potential icing",
      severity: "amber",
      current: metar.presentWeather,
    });
  }
}

function evaluateFrat(result: FRATResult, factors: GoNoGoFactor[]) {
  factors.push({
    id: "frat_score",
    category: "risk",
    label: "FRAT Score",
    detail: result.recommendation,
    severity:
      result.riskLevel === "low"
        ? "green"
        : result.riskLevel === "caution"
        ? "amber"
        : "red",
    current: `${result.totalScore}/70`,
  });
}

function evaluateAiBriefing(briefing: AiBriefing, factors: GoNoGoFactor[]) {
  if (briefing.recommendation === "UNFAVORABLE") {
    factors.push({
      id: "ai_briefing",
      category: "risk",
      label: "AI Briefing Assessment",
      detail: briefing.summary,
      severity: "red",
    });
  } else if (briefing.recommendation === "CAUTION") {
    factors.push({
      id: "ai_briefing",
      category: "risk",
      label: "AI Briefing Assessment",
      detail: briefing.summary,
      severity: "amber",
    });
  }
}

function evaluateAlerts(alerts: AlertCondition[], factors: GoNoGoFactor[]) {
  const redAlerts = alerts.filter((a) => a.severity === "red");
  if (redAlerts.length > 0) {
    factors.push({
      id: "alerts_red",
      category: "weather",
      label: `${redAlerts.length} Critical Alert${redAlerts.length > 1 ? "s" : ""}`,
      detail: redAlerts.map((a) => a.title).join(", "),
      severity: "red",
    });
  }

  const amberAlerts = alerts.filter((a) => a.severity === "amber");
  if (amberAlerts.length > 0) {
    factors.push({
      id: "alerts_amber",
      category: "weather",
      label: `${amberAlerts.length} Caution Alert${amberAlerts.length > 1 ? "s" : ""}`,
      detail: amberAlerts.map((a) => a.title).join(", "),
      severity: "amber",
    });
  }
}

function evaluateDaylight(minutesRemaining: number, factors: GoNoGoFactor[]) {
  if (minutesRemaining < 30) {
    factors.push({
      id: "daylight_critical",
      category: "daylight",
      label: "Insufficient Daylight",
      detail: `Only ${minutesRemaining} minutes of daylight remaining — not enough for safe VFR flight`,
      severity: "red",
      current: `${minutesRemaining} min`,
    });
  } else if (minutesRemaining < 60) {
    factors.push({
      id: "daylight_marginal",
      category: "daylight",
      label: "Limited Daylight",
      detail: `${minutesRemaining} minutes of daylight remaining — plan accordingly`,
      severity: "amber",
      current: `${minutesRemaining} min`,
    });
  }
}

// ===== Verdict Calculation =====

function calculateVerdict(factors: GoNoGoFactor[]): GoNoGoVerdict {
  const redFactors = factors.filter((f) => f.severity === "red");
  const amberFactors = factors.filter((f) => f.severity === "amber");

  // Any red factor = No-Go
  if (redFactors.length > 0) return "nogo";

  // 2+ amber factors = Marginal
  if (amberFactors.length >= 2) return "marginal";

  // 1 amber factor = Marginal
  if (amberFactors.length === 1) return "marginal";

  return "go";
}

function generateSummary(verdict: GoNoGoVerdict, factors: GoNoGoFactor[]): string {
  const redCount = factors.filter((f) => f.severity === "red").length;
  const amberCount = factors.filter((f) => f.severity === "amber").length;

  switch (verdict) {
    case "go":
      return "Conditions are favorable for flight. All factors within acceptable limits.";
    case "marginal":
      return `Proceed with caution. ${amberCount} factor${amberCount > 1 ? "s" : ""} require attention. Consider mitigation strategies or delay.`;
    case "nogo":
      return `Flight not recommended. ${redCount} critical factor${redCount > 1 ? "s" : ""} exceed safe limits. ${amberCount > 0 ? `Additionally, ${amberCount} caution factor${amberCount > 1 ? "s" : ""} noted.` : ""}`.trim();
  }
}
