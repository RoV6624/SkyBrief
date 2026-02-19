import type { WeatherAnnotation } from "@/lib/briefing/types";
import type { FlightCategory } from "@/lib/api/types";

/**
 * Weather Learning Mode annotations.
 * Educational explanations for every weather element a student pilot encounters.
 */

// ===== Flight Category Annotations =====

export const flightCategoryAnnotations: Record<FlightCategory, WeatherAnnotation> = {
  VFR: {
    code: "VFR",
    shortName: "Visual Flight Rules",
    explanation:
      "Ceiling ≥3,000 ft AGL and visibility ≥5 SM. These are the standard conditions required for VFR flight without special VFR clearance.",
    pilotImplication:
      "Full VFR operations permitted. Good conditions for visual navigation and traffic avoidance.",
    acsReference: "PA.I.C.K1",
  },
  MVFR: {
    code: "MVFR",
    shortName: "Marginal VFR",
    explanation:
      "Ceiling 1,000–3,000 ft AGL and/or visibility 3–5 SM. Conditions are legal for VFR but require extra vigilance.",
    pilotImplication:
      "Increased situational awareness needed. Consider waiting for improvement. Avoid if you're a low-time pilot or unfamiliar with the area.",
    acsReference: "PA.I.C.K1",
  },
  IFR: {
    code: "IFR",
    shortName: "Instrument Flight Rules",
    explanation:
      "Ceiling 500–999 ft AGL and/or visibility 1–3 SM. VFR flight is not safe and may not be legal without Special VFR clearance.",
    pilotImplication:
      "Not suitable for VFR pilots. IFR rating and current instrument proficiency required. Special VFR possible at some airports but risky.",
    acsReference: "PA.I.C.K1",
  },
  LIFR: {
    code: "LIFR",
    shortName: "Low IFR",
    explanation:
      "Ceiling below 500 ft AGL and/or visibility below 1 SM. Even instrument-rated pilots should exercise extreme caution.",
    pilotImplication:
      "Dangerous for all operations. Category III ILS or equivalent precision approach capability needed. VFR flight impossible.",
    acsReference: "PA.I.C.K1",
  },
};

// ===== Cloud Cover Annotations =====

export const cloudCoverAnnotations: Record<string, WeatherAnnotation> = {
  CLR: {
    code: "CLR",
    shortName: "Clear",
    explanation:
      "No clouds detected below 12,000 ft AGL. Reported by automated stations (ASOS/AWOS) only.",
    pilotImplication: "Excellent visibility upward. No cloud layers to restrict VFR climb.",
    acsReference: "PA.I.C.K3b",
  },
  FEW: {
    code: "FEW",
    shortName: "Few (1/8–2/8)",
    explanation:
      "1–2 oktas (eighths) of sky coverage. Scattered cloud puffs — mostly clear.",
    pilotImplication: "No ceiling. Clouds present but not restricting VFR operations. Remains VFR.",
    acsReference: "PA.I.C.K3b",
  },
  SCT: {
    code: "SCT",
    shortName: "Scattered (3/8–4/8)",
    explanation:
      "3–4 oktas of sky coverage. About half the sky covered. NOT a ceiling — a ceiling requires BKN or OVC.",
    pilotImplication:
      "Not a ceiling, but watch for buildups. If combined with low base, maneuvering may be restricted.",
    acsReference: "PA.I.C.K3b",
  },
  BKN: {
    code: "BKN",
    shortName: "Broken (5/8–7/8)",
    explanation:
      "5–7 oktas coverage. This IS a ceiling. The lowest BKN or OVC layer defines the ceiling height.",
    pilotImplication:
      "This IS your ceiling. VFR flight must remain at least 500 ft below this layer (14 CFR 91.155). Plan altitude accordingly.",
    acsReference: "PA.I.C.K3b",
  },
  OVC: {
    code: "OVC",
    shortName: "Overcast (8/8)",
    explanation:
      "Complete sky coverage. Solid cloud deck. This IS a ceiling. Combined with BKN, defines the lowest ceiling.",
    pilotImplication:
      "Solid ceiling with no breaks. You cannot fly above this layer VFR. Ceiling height determines if VFR, MVFR, IFR, or LIFR.",
    acsReference: "PA.I.C.K3b",
  },
};

// ===== Present Weather Annotations =====

export const weatherPhenomenaAnnotations: Record<string, WeatherAnnotation> = {
  RA: {
    code: "RA",
    shortName: "Rain",
    explanation: "Liquid precipitation. When preceded by +, -, or no modifier: heavy, light, or moderate.",
    pilotImplication: "Reduced visibility. Wet runway — increased landing distance. Check for embedded thunderstorms.",
    acsReference: "PA.I.C.K3d",
  },
  SN: {
    code: "SN",
    shortName: "Snow",
    explanation: "Frozen precipitation in crystal form. Significantly reduces visibility.",
    pilotImplication: "Rapidly deteriorating visibility. Icing risk. Runway contamination. Consider delay.",
    acsReference: "PA.I.C.K3d",
  },
  FG: {
    code: "FG",
    shortName: "Fog",
    explanation: "Visibility reduced to less than 5/8 SM by water droplets. Most dangerous low-visibility weather.",
    pilotImplication: "IFR conditions. VFR flight not possible in fog. Can form rapidly — monitor temp/dewpoint spread.",
    acsReference: "PA.I.C.K3d",
  },
  BR: {
    code: "BR",
    shortName: "Mist",
    explanation: "Visibility 5/8 SM to 6 SM due to water droplets. Like fog but less dense.",
    pilotImplication: "Marginal visibility. May worsen to fog. Watch temp/dewpoint convergence.",
    acsReference: "PA.I.C.K3d",
  },
  HZ: {
    code: "HZ",
    shortName: "Haze",
    explanation: "Reduced visibility due to fine particles (dust, smoke, pollution). Visibility < 7 SM.",
    pilotImplication: "Reduced forward visibility and ground contact. May be worse looking into sun.",
    acsReference: "PA.I.C.K3d",
  },
  TS: {
    code: "TS",
    shortName: "Thunderstorm",
    explanation: "Thunder heard or lightning observed. Indicates CB (cumulonimbus) activity.",
    pilotImplication: "AVOID. Severe turbulence, windshear, hail, lightning, microbursts. Stay 20+ NM from a thunderstorm.",
    acsReference: "PA.I.C.K3d",
  },
  FZRA: {
    code: "FZRA",
    shortName: "Freezing Rain",
    explanation: "Supercooled rain that freezes on contact with surfaces at or below 0°C.",
    pilotImplication: "IMMEDIATE LANDING RECOMMENDED. Rapid ice accumulation on aircraft. Extremely dangerous.",
    acsReference: "PA.I.C.K3d",
  },
  FZDZ: {
    code: "FZDZ",
    shortName: "Freezing Drizzle",
    explanation: "Supercooled drizzle that freezes on contact. Less intense than FZRA but still dangerous.",
    pilotImplication: "Icing hazard. Ice accumulation on airframe. Avoid flight in freezing drizzle.",
    acsReference: "PA.I.C.K3d",
  },
  SH: {
    code: "SH",
    shortName: "Showers",
    explanation: "Precipitation of varying intensity from convective clouds. Starts/stops suddenly.",
    pilotImplication: "Variable visibility. Often associated with unstable air and turbulence.",
    acsReference: "PA.I.C.K3d",
  },
  GR: {
    code: "GR",
    shortName: "Hail",
    explanation: "Ice pellets ≥5mm diameter. Associated with thunderstorms.",
    pilotImplication: "AVOID. Can cause structural damage to aircraft. Always indicates severe convection.",
    acsReference: "PA.I.C.K3d",
  },
  DZ: {
    code: "DZ",
    shortName: "Drizzle",
    explanation: "Very small water droplets (<0.5mm) falling close together. Usually from stratus clouds.",
    pilotImplication: "Low ceilings likely. Reduced visibility. Check for freezing level — risk of icing if OAT near 0°C.",
    acsReference: "PA.I.C.K3d",
  },
  FU: {
    code: "FU",
    shortName: "Smoke",
    explanation: "Reduced visibility from combustion products (wildfires, industrial).",
    pilotImplication: "Significantly reduced visibility, especially at lower altitudes. May cause eye/respiratory irritation.",
    acsReference: "PA.I.C.K3d",
  },
};

// ===== METAR Field Annotations =====

export const metarFieldAnnotations: Record<string, WeatherAnnotation> = {
  wind: {
    code: "WIND",
    shortName: "Surface Wind",
    explanation:
      "Reported as direction (degrees true) and speed (knots). Format: dddff(Gff)KT. E.g., 27015G25KT = from 270° at 15 kts gusting 25 kts.",
    pilotImplication:
      "Calculate crosswind and headwind components for your runway. Maximum demonstrated crosswind is in your POH.",
    acsReference: "PA.I.C.K3a",
  },
  visibility: {
    code: "VIS",
    shortName: "Prevailing Visibility",
    explanation:
      "The greatest visibility in statute miles that can be seen throughout at least half the horizon. 10+ means ≥10 SM (unlimited).",
    pilotImplication:
      "VFR requires 3 SM in controlled airspace, 1 SM in Class G. Your personal minimums should be higher than legal minimums.",
    acsReference: "PA.I.C.K3c",
  },
  altimeter: {
    code: "ALTIM",
    shortName: "Altimeter Setting",
    explanation:
      'Barometric pressure adjusted to sea level in inches of mercury (inHg). Standard = 29.92"Hg. Each 0.01" = ~10 ft error.',
    pilotImplication:
      'Set in your altimeter for accurate altitude readings. Low pressure (below 29.92") means true altitude is LOWER than indicated — "High to low, look out below."',
    acsReference: "PA.I.C.K3e",
  },
  tempDewpoint: {
    code: "T/Td",
    shortName: "Temperature/Dewpoint",
    explanation:
      "Temperature and dewpoint in Celsius. When spread ≤3°C, fog formation is likely. When equal, fog is present or imminent.",
    pilotImplication:
      "Monitor the spread. Closing spread = increasing moisture = fog risk. Also used for density altitude calculation.",
    acsReference: "PA.I.C.K3f",
  },
  ceiling: {
    code: "CEIL",
    shortName: "Ceiling Height",
    explanation:
      "The height AGL of the lowest BKN (broken) or OVC (overcast) layer. FEW and SCT are NOT ceilings. Reported in feet AGL.",
    pilotImplication:
      "Determines flight category (VFR/MVFR/IFR/LIFR). Must maintain cloud clearance requirements: 500 ft below, 1000 ft above, 2000 ft horizontal in Class C/D/E.",
    acsReference: "PA.I.C.K3b",
  },
  speci: {
    code: "SPECI",
    shortName: "Special Report",
    explanation:
      "An unscheduled METAR issued when conditions change significantly (flight category change, thunderstorm, wind shift ≥45°).",
    pilotImplication:
      "Conditions are changing rapidly. A SPECI means something important happened since the last routine report. Pay attention.",
    acsReference: "PA.I.C.K3",
  },
};

/**
 * Get annotation for a weather phenomenon code.
 * Handles compound codes like +TSRA by looking up TS and RA separately.
 */
export function getWeatherAnnotation(code: string): WeatherAnnotation | null {
  // Direct match first
  const cleaned = code.replace(/^[+-]/, "");
  if (weatherPhenomenaAnnotations[cleaned]) {
    return weatherPhenomenaAnnotations[cleaned];
  }

  // Try compound (e.g., TSRA → TS + RA)
  if (cleaned.length > 2) {
    const first = cleaned.substring(0, 2);
    if (weatherPhenomenaAnnotations[first]) {
      return weatherPhenomenaAnnotations[first];
    }
  }

  return null;
}

/**
 * Get all annotations applicable to a METAR display.
 * Returns annotations for flight category, clouds, weather, and fields.
 */
export function getAnnotationsForMetar(params: {
  flightCategory: FlightCategory;
  clouds: Array<{ cover: string }>;
  presentWeather?: string | null;
}): WeatherAnnotation[] {
  const annotations: WeatherAnnotation[] = [];

  // Flight category
  annotations.push(flightCategoryAnnotations[params.flightCategory]);

  // Cloud cover types
  const seen = new Set<string>();
  for (const cloud of params.clouds) {
    if (!seen.has(cloud.cover) && cloudCoverAnnotations[cloud.cover]) {
      annotations.push(cloudCoverAnnotations[cloud.cover]);
      seen.add(cloud.cover);
    }
  }

  // Present weather
  if (params.presentWeather) {
    const codes = params.presentWeather.split(/\s+/);
    for (const code of codes) {
      const annotation = getWeatherAnnotation(code);
      if (annotation) {
        annotations.push(annotation);
      }
    }
  }

  return annotations;
}
