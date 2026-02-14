import type { MetarResponse, AiBriefing, FlightCategory, PirepResponse } from "@/lib/api/types";

/**
 * Generates a local weather briefing without calling an external LLM.
 * Acts like a flight instructor providing go/no-go recommendations.
 */
export function generateLocalBriefing(metar: MetarResponse, pireps?: PirepResponse[]): AiBriefing {
  const hazards: string[] = [];
  const parts: string[] = [];
  let isNoGo = false;
  let isHighCaution = false;

  // CRITICAL WEATHER - Automatic no-go conditions
  if (metar.wxString) {
    const wx = metar.wxString.toUpperCase();

    // Thunderstorms = automatic no-go
    if (wx.includes("TS")) {
      hazards.unshift("⚠️ THUNDERSTORMS PRESENT OR IN VICINITY - DO NOT FLY");
      parts.push("THUNDERSTORMS are active in the area. This is a no-go situation.");
      isNoGo = true;
    }

    // Severe icing
    if (wx.includes("FZRA") || wx.includes("FZDZ")) {
      hazards.unshift("⚠️ FREEZING RAIN/DRIZZLE - Severe icing conditions");
      parts.push("Freezing precipitation is falling - extremely hazardous for non-FIKI aircraft.");
      isNoGo = true;
    }

    // Convective activity
    if (wx.includes("FC") || wx.includes("SQ")) {
      hazards.unshift("⚠️ FUNNEL CLOUD or SQUALLS reported");
      isNoGo = true;
    }
  }

  // PIREP Analysis (turbulence and icing reports)
  if (pireps && pireps.length > 0) {
    const recentPireps = pireps.filter((p) => {
      const age = Date.now() - p.obsTime * 1000;
      return age < 60 * 60 * 1000; // within 1 hour
    });

    for (const pirep of recentPireps) {
      const ageMinutes = Math.round((Date.now() - pirep.obsTime * 1000) / 60000);

      // Turbulence reports
      if (pirep.tbInt1) {
        const intensity = pirep.tbInt1.toUpperCase();
        const altStr = convertFlightLevelToAGL(pirep.fltLvl, metar.elev);

        if (intensity.includes("SEV") || intensity.includes("EXTREME")) {
          hazards.push(`⚠️ SEVERE TURBULENCE reported ${altStr} (PIREP ${ageMinutes}min ago) - AVOID THIS ALTITUDE`);
          isHighCaution = true;
        } else if (intensity.includes("MOD")) {
          hazards.push(`Moderate turbulence reported ${altStr} (PIREP ${ageMinutes}min ago)`);
        } else if (intensity.includes("LGT")) {
          hazards.push(`Light turbulence reported ${altStr} (PIREP ${ageMinutes}min ago)`);
        }
      }

      // Icing reports
      if (pirep.icgInt1) {
        const intensity = pirep.icgInt1.toUpperCase();
        const altStr = convertFlightLevelToAGL(pirep.fltLvl, metar.elev);

        if (intensity.includes("SEV") || intensity.includes("HVY")) {
          hazards.push(`⚠️ SEVERE ICING reported ${altStr} (PIREP ${ageMinutes}min ago) - Non-FIKI aircraft MUST avoid`);
          isNoGo = true;
        } else if (intensity.includes("MOD")) {
          hazards.push(`Moderate icing reported ${altStr} (PIREP ${ageMinutes}min ago) - Use caution`);
          isHighCaution = true;
        } else if (intensity.includes("LGT") || intensity.includes("TRACE")) {
          hazards.push(`Light icing reported ${altStr} (PIREP ${ageMinutes}min ago)`);
        }
      }
    }
  }

  // Flight category assessment
  if (!isNoGo) {
    const catDesc = flightInstructorAssessment(metar.fltCat, metar);
    parts.push(catDesc);
  }

  // Wind analysis
  const windDesc = describeWind(metar);
  if (windDesc.warning) {
    hazards.push(windDesc.warning);
    if (windDesc.noGo) isHighCaution = true;
  }
  if (windDesc.description) {
    parts.push(windDesc.description);
  }

  // Visibility
  const visStr = String(metar.visib ?? "10+");
  const visNum = parseFloat(visStr.replace("+", ""));
  if (visNum < 1) {
    hazards.push(`⚠️ VERY LOW VISIBILITY at ${visStr} SM - IFR conditions`);
    if (metar.fltCat === "LIFR") isNoGo = true;
  } else if (visNum < 3) {
    hazards.push(`Low visibility at ${visStr} SM - Reduced VFR margins`);
  }

  // Temp/Dewpoint spread (fog risk)
  const spread = metar.temp - metar.dewp;
  if (spread <= 1) {
    hazards.push(`⚠️ Temp/dewpoint spread ${spread.toFixed(1)}°C - FOG FORMING NOW or imminent`);
    isHighCaution = true;
  } else if (spread <= 2) {
    hazards.push(`Temp/dewpoint spread ${spread.toFixed(1)}°C - Monitor closely for fog development`);
  }

  // Ceiling analysis
  const ceilingLayers = metar.clouds.filter(
    (c) => c.cover === "BKN" || c.cover === "OVC"
  );
  if (ceilingLayers.length > 0) {
    const ceiling = Math.min(...ceilingLayers.map((c) => c.base));
    if (ceiling < 500) {
      hazards.push(`⚠️ EXTREMELY LOW CEILING at ${ceiling} ft AGL - LIFR conditions`);
      isNoGo = true;
    } else if (ceiling < 1000) {
      hazards.push(`Low ceiling at ${ceiling} ft AGL - Requires high proficiency`);
      isHighCaution = true;
    } else if (ceiling < 3000) {
      parts.push(`Ceiling ${ceiling.toLocaleString()} ft ${ceilingLayers[0].cover === "OVC" ? "overcast" : "broken"}.`);
    } else {
      parts.push(`Good ceiling at ${ceiling.toLocaleString()} ft.`);
    }
  } else {
    parts.push("Skies are clear to scattered.");
  }

  // Present weather (non-critical)
  if (metar.wxString && !isNoGo) {
    const wxDesc = describeWeather(metar.wxString);
    if (wxDesc) {
      parts.push(wxDesc);
      // Add to hazards if it's active precipitation
      if (metar.wxString.includes("RA") || metar.wxString.includes("SN")) {
        hazards.push(`Active precipitation: ${metar.wxString}`);
      }
    }
  }

  // Final recommendation (flight instructor style)
  let recommendation: AiBriefing["recommendation"];
  if (isNoGo) {
    recommendation = "UNFAVORABLE";
    parts.push("MY RECOMMENDATION: DO NOT FLY. These conditions are too hazardous.");
  } else if (isHighCaution || metar.fltCat === "IFR" || metar.fltCat === "LIFR") {
    recommendation = "UNFAVORABLE";
    parts.push("MY RECOMMENDATION: Stay on the ground unless you're highly proficient and current.");
  } else if (metar.fltCat === "MVFR" || hazards.length >= 2) {
    recommendation = "CAUTION";
    parts.push("MY RECOMMENDATION: Proceed with caution. Monitor conditions closely.");
  } else if (hazards.length === 1) {
    recommendation = "CAUTION";
    parts.push("MY RECOMMENDATION: Acceptable for flight, but stay alert.");
  } else {
    recommendation = "FAVORABLE";
    parts.push("MY RECOMMENDATION: Good conditions for VFR flight.");
  }

  return {
    summary: parts.join(" "),
    hazards,
    recommendation,
    confidence: "high",
    generatedAt: new Date(),
  };
}

/**
 * Convert flight level to AGL description
 */
function convertFlightLevelToAGL(fltLvl: string | number, fieldElev: number): string {
  // Convert to string and parse flight level (e.g., "055" or 55 = 5,500 ft MSL)
  const fltLvlStr = String(fltLvl || "000");
  const match = fltLvlStr.match(/\d+/);
  if (!match) return `at ${fltLvlStr}`;

  const altMSL = parseInt(match[0]) * 100;
  const altAGL = altMSL - fieldElev;

  if (altAGL < 0) return `at surface level`;
  if (altAGL < 1000) return `at ${Math.round(altAGL / 100) * 100} ft AGL`;
  return `at ${(altAGL / 1000).toFixed(1)}k ft AGL (${(altMSL / 1000).toFixed(1)}k MSL)`;
}

/**
 * Flight instructor-style assessment of flight category
 */
function flightInstructorAssessment(cat: FlightCategory, metar: MetarResponse): string {
  switch (cat) {
    case "VFR":
      return "Conditions are VFR - good visibility and ceilings for visual flight.";
    case "MVFR":
      return "Conditions are Marginal VFR - ceiling and/or visibility are borderline. This requires extra vigilance.";
    case "IFR":
      return "Conditions are IFR - you need an instrument rating and IFR clearance. VFR flight is NOT authorized.";
    case "LIFR":
      return "Conditions are Low IFR - extremely restricted visibility and/or ceiling. Even for IFR ops, this is challenging.";
  }
}

/**
 * Wind analysis with hazard detection
 */
function describeWind(metar: MetarResponse): {
  description: string | null;
  warning: string | null;
  noGo: boolean;
} {
  if (metar.wspd === 0) {
    return { description: "Winds are calm.", warning: null, noGo: false };
  }

  const dir =
    metar.wdir === "VRB"
      ? "variable"
      : `from ${String(metar.wdir).padStart(3, "0")}°`;

  let desc = `Winds ${dir} at ${metar.wspd} kts`;
  let warning: string | null = null;
  let noGo = false;

  // Gust analysis
  if (metar.wgst) {
    const gustSpread = metar.wgst - metar.wspd;
    desc += `, gusting ${metar.wgst} kts`;

    if (metar.wgst > 35) {
      warning = `⚠️ STRONG GUSTS to ${metar.wgst} kts - Approach and landing will be challenging`;
      noGo = true;
    } else if (metar.wgst > 25 || gustSpread > 15) {
      warning = `Gusty winds (${gustSpread} kt gust spread) - Expect bumpy approach, use caution`;
    } else if (gustSpread > 10) {
      warning = `Moderate gusts (${gustSpread} kt spread) - Stay alert on approach`;
    }
  } else if (metar.wspd > 25) {
    warning = `Strong sustained winds at ${metar.wspd} kts - Crosswind component may be significant`;
  }

  desc += ".";
  return { description: desc, warning, noGo };
}

function describeWeather(wx: string): string | null {
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
