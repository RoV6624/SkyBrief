import type { NormalizedMetar, MetarCloud } from "@/lib/api/types";
import { getSunTimes } from "@/lib/solar/sun-position";

export interface CloudLayer {
  opacity: number;
  speed: number; // seconds for one drift cycle
  y: number; // percentage from top (0-100)
  size: number; // scale multiplier
}

export interface WeatherScene {
  gradient: [string, string, ...string[]]; // top → bottom color stops (3-5 stops)
  cloudLayers: CloudLayer[];
  precipitation: "none" | "rain" | "snow" | "mist" | "hail";
  precipIntensity: "light" | "moderate" | "heavy";
  isFog: boolean;
  lightning: boolean;
  isVfr: boolean;
  isNight: boolean;
  isTwilight: boolean;
  twilightPhase: "none" | "sunrise" | "sunset";
}

// Default scene when no station is selected
export const DEFAULT_SCENE: WeatherScene = {
  gradient: ["#1e90ff", "#87ceeb", "#e0efff"],
  cloudLayers: [
    { opacity: 0.15, speed: 45, y: 15, size: 1.2 },
    { opacity: 0.1, speed: 60, y: 35, size: 0.8 },
  ],
  precipitation: "none",
  precipIntensity: "moderate",
  isFog: false,
  lightning: false,
  isVfr: true,
  isNight: false,
  isTwilight: false,
  twilightPhase: "none",
};

function getCloudCoverage(clouds: MetarCloud[]): {
  maxCover: string;
  layers: CloudLayer[];
} {
  if (clouds.length === 0) {
    return { maxCover: "CLR", layers: [] };
  }

  const coverRank: Record<string, number> = {
    CLR: 0,
    FEW: 1,
    SCT: 2,
    BKN: 3,
    OVC: 4,
  };

  let maxCover = "CLR";
  let primaryCloudBase = 0;

  // Find highest coverage and representative cloud base
  for (const cloud of clouds) {
    if ((coverRank[cloud.cover] ?? 0) > (coverRank[maxCover] ?? 0)) {
      maxCover = cloud.cover;
      primaryCloudBase = cloud.base;
    }
  }

  // Dynamic cloud quantity based on coverage type
  const cloudCountMap: Record<string, number> = {
    CLR: 0,
    FEW: 2,      // 1-2 clouds (few)
    SCT: 4,      // 3-4 clouds (scattered)
    BKN: 6,      // 5-7 clouds (broken)
    OVC: 10,     // 8-10 clouds (overcast - dense coverage)
  };

  const opacityMap: Record<string, number> = {
    FEW: 0.2,    // Very light, sparse clouds
    SCT: 0.35,   // Medium transparency
    BKN: 0.55,   // More opaque
    OVC: 0.75,   // Dense, high opacity
  };

  const cloudCount = cloudCountMap[maxCover] ?? 0;
  const baseOpacity = opacityMap[maxCover] ?? 0.2;
  const layers: CloudLayer[] = [];

  // Generate multiple cloud layers with variation
  for (let i = 0; i < cloudCount; i++) {
    // Map cloud base altitude to vertical position (higher base = higher on screen)
    const baseYPos = Math.max(5, Math.min(70, 70 - (primaryCloudBase / 20000) * 65));

    // Add vertical variation based on coverage (overcast = tighter clustering)
    const verticalSpread = maxCover === "OVC" ? 15 : maxCover === "BKN" ? 25 : 35;
    const yPos = Math.max(5, Math.min(70, baseYPos + (Math.random() - 0.5) * verticalSpread));

    // Vary opacity slightly for visual depth
    const opacity = baseOpacity * (0.8 + Math.random() * 0.4);

    layers.push({
      opacity,
      speed: 30 + Math.random() * 30, // 30-60s drift
      y: yPos,
      size: 0.8 + Math.random() * 0.6,
    });
  }

  return { maxCover, layers };
}

function parsePrecipitation(wxString?: string | null): {
  type: "none" | "rain" | "snow" | "mist" | "hail";
  intensity: "light" | "moderate" | "heavy";
  isFog: boolean;
} {
  if (!wxString) return { type: "none", intensity: "moderate", isFog: false };
  const wx = wxString.toUpperCase();

  // Determine intensity from prefix: +RA = heavy, -SN = light, RA = moderate
  let intensity: "light" | "moderate" | "heavy" = "moderate";
  if (wx.includes("+")) intensity = "heavy";
  else if (wx.includes("-")) intensity = "light";

  // Fog flag: only true for FG, not BR or HZ
  const isFog = wx.includes("FG");

  // Priority: hail > snow > rain > mist (most severe wins)
  let type: "none" | "rain" | "snow" | "mist" | "hail" = "none";
  if (wx.includes("GR") || wx.includes("GS")) {
    type = "hail";
  } else if (wx.includes("SN") || wx.includes("SG") || wx.includes("IC") || wx.includes("PL")) {
    type = "snow";
  } else if (wx.includes("RA") || wx.includes("DZ") || wx.includes("SH") || wx.includes("TS")) {
    type = "rain";
  } else if (isFog || wx.includes("BR") || wx.includes("HZ")) {
    type = "mist";
  }

  return { type, intensity, isFog };
}

function hasLightning(wxString?: string | null): boolean {
  if (!wxString) return false;
  return wxString.toUpperCase().includes("TS");
}

interface TimeOfDay {
  isNight: boolean;
  isTwilight: boolean;
  twilightPhase: "none" | "sunrise" | "sunset";
}

function getTimeOfDay(lat: number, lon: number): TimeOfDay {
  try {
    const now = new Date();
    const sunTimes = getSunTimes(lat, lon, now);

    // Morning twilight: between civilTwilightStart and sunrise
    if (now >= sunTimes.civilTwilightStart && now < sunTimes.sunrise) {
      return { isNight: false, isTwilight: true, twilightPhase: "sunrise" };
    }
    // Evening twilight: between sunset and civilTwilightEnd
    if (now > sunTimes.sunset && now <= sunTimes.civilTwilightEnd) {
      return { isNight: false, isTwilight: true, twilightPhase: "sunset" };
    }
    // Night: before civil twilight start or after civil twilight end
    if (now < sunTimes.civilTwilightStart || now > sunTimes.civilTwilightEnd) {
      return { isNight: true, isTwilight: false, twilightPhase: "none" };
    }
    // Daytime
    return { isNight: false, isTwilight: false, twilightPhase: "none" };
  } catch {
    return { isNight: false, isTwilight: false, twilightPhase: "none" };
  }
}

// Twilight gradients
const SUNRISE_GRADIENT: [string, string, ...string[]] = ["#1a1a3e", "#e8856a", "#ffd194"];
const SUNSET_GRADIENT: [string, string, ...string[]] = ["#2d1b4e", "#c2544f", "#f4a261"];
const SUNRISE_BKN_GRADIENT: [string, string, ...string[]] = ["#1a1a3e", "#b86b5a", "#d4a97a"];
const SUNSET_BKN_GRADIENT: [string, string, ...string[]] = ["#2d1b4e", "#9c4440", "#c88550"];

export function mapMetarToScene(metar: NormalizedMetar): WeatherScene {
  const { maxCover, layers } = getCloudCoverage(metar.clouds);
  const { type: precipitation, intensity: precipIntensity, isFog } = parsePrecipitation(metar.presentWeather);
  const lightning = hasLightning(metar.presentWeather);
  const isVfr = metar.flightCategory === "VFR";
  const timeOfDay = getTimeOfDay(metar.location.lat, metar.location.lon);

  // Determine gradient based on conditions + time of day
  let gradient: [string, string, ...string[]];

  if (timeOfDay.isTwilight && !lightning && precipitation === "none" && maxCover !== "OVC") {
    // TWILIGHT GRADIENTS — warm orange/amber tones
    if (maxCover === "BKN") {
      gradient = timeOfDay.twilightPhase === "sunrise" ? SUNRISE_BKN_GRADIENT : SUNSET_BKN_GRADIENT;
    } else {
      gradient = timeOfDay.twilightPhase === "sunrise" ? SUNRISE_GRADIENT : SUNSET_GRADIENT;
    }
  } else if (timeOfDay.isNight) {
    // NIGHT GRADIENTS — rich luminous indigo (iOS Weather-inspired)
    // Key: high blue channel saturation, never pure black, wide lightness range
    if (lightning || precipitation === "hail" || (precipitation === "rain" && (maxCover === "BKN" || maxCover === "OVC"))) {
      gradient = ["#0e0e28", "#161838", "#1e224a"];
    } else if (precipitation === "rain") {
      gradient = ["#101030", "#1a1c45", "#24285a"];
    } else if (precipitation === "snow") {
      gradient = ["#141642", "#1e2358", "#2c336e"];
    } else if (precipitation === "mist" || metar.flightCategory === "LIFR") {
      gradient = ["#0f1020", "#1a1b30", "#252840"];
    } else if (metar.flightCategory === "IFR") {
      gradient = ["#111438", "#1c2050", "#282e62"];
    } else if (maxCover === "OVC" || maxCover === "BKN") {
      gradient = ["#131545", "#1e225a", "#2a3070"];
    } else {
      // Clear night — 4-stop rich indigo with horizon glow
      gradient = ["#101638", "#182054", "#24326e", "#2d3f80"];
    }
  } else {
    // DAY GRADIENTS (original logic)
    if (lightning || precipitation === "hail" || (precipitation === "rain" && (maxCover === "BKN" || maxCover === "OVC"))) {
      gradient = ["#374151", "#4b5563", "#6b7280"];
    } else if (precipitation === "mist" || metar.flightCategory === "LIFR") {
      gradient = ["#9ca3af", "#d1d5db", "#e5e7eb"];
    } else if (metar.flightCategory === "IFR") {
      gradient = ["#64748b", "#94a3b8", "#cbd5e1"];
    } else if (maxCover === "OVC") {
      gradient = ["#78909c", "#b0bec5", "#cfd8dc"];
    } else if (maxCover === "BKN") {
      gradient = ["#5b86a7", "#94b8d0", "#c8dce8"];
    } else if (maxCover === "SCT") {
      gradient = ["#2196f3", "#7ec8e3", "#d4ecf7"];
    } else if (precipitation === "snow") {
      gradient = ["#78909c", "#b0bec5", "#eceff1"];
    } else {
      gradient = ["#1e90ff", "#87ceeb", "#e0efff"];
    }
  }

  // At night, reduce cloud opacity and darken cloud colors
  const night = timeOfDay.isNight;
  const cloudLayers =
    layers.length > 0
      ? layers.map((l) => ({
          ...l,
          opacity: night ? l.opacity * 0.5 : l.opacity,
        }))
      : maxCover !== "CLR"
        ? [{ opacity: night ? 0.05 : 0.1, speed: 50, y: 30, size: 1 }]
        : [];

  return {
    gradient,
    cloudLayers,
    precipitation,
    precipIntensity,
    isFog,
    lightning,
    isVfr,
    isNight: night,
    isTwilight: timeOfDay.isTwilight,
    twilightPhase: timeOfDay.twilightPhase,
  };
}
