import type { NormalizedMetar, MetarCloud } from "@/lib/api/types";
import { getSunTimes } from "@/lib/solar/sun-position";

export interface CloudLayer {
  opacity: number;
  speed: number; // seconds for one drift cycle
  y: number; // percentage from top (0-100)
  size: number; // scale multiplier
}

export interface WeatherScene {
  gradient: [string, string, string]; // top, middle, bottom
  cloudLayers: CloudLayer[];
  precipitation: "none" | "rain" | "snow" | "mist";
  lightning: boolean;
  isVfr: boolean;
  isNight: boolean;
}

// Default scene when no station is selected
export const DEFAULT_SCENE: WeatherScene = {
  gradient: ["#1e90ff", "#87ceeb", "#e0efff"],
  cloudLayers: [
    { opacity: 0.15, speed: 45, y: 15, size: 1.2 },
    { opacity: 0.1, speed: 60, y: 35, size: 0.8 },
  ],
  precipitation: "none",
  lightning: false,
  isVfr: true,
  isNight: false,
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

function hasPrecipitation(wxString?: string | null): "none" | "rain" | "snow" | "mist" {
  if (!wxString) return "none";
  const wx = wxString.toUpperCase();

  if (wx.includes("SN") || wx.includes("SG") || wx.includes("IC") || wx.includes("PL")) {
    return "snow";
  }
  if (wx.includes("RA") || wx.includes("DZ") || wx.includes("SH") || wx.includes("TS")) {
    return "rain";
  }
  if (wx.includes("FG") || wx.includes("BR") || wx.includes("HZ")) {
    return "mist";
  }
  return "none";
}

function hasLightning(wxString?: string | null): boolean {
  if (!wxString) return false;
  return wxString.toUpperCase().includes("TS");
}

/**
 * Determine if it is currently nighttime at the station location.
 * Uses the NOAA solar calculator from sun-position.ts.
 */
function isNightTime(lat: number, lon: number): boolean {
  try {
    const now = new Date();
    const sunTimes = getSunTimes(lat, lon, now);
    // Night = before civil twilight start OR after civil twilight end
    return now < sunTimes.civilTwilightStart || now > sunTimes.civilTwilightEnd;
  } catch {
    // Default to daytime if calculation fails
    return false;
  }
}

export function mapMetarToScene(metar: NormalizedMetar): WeatherScene {
  const { maxCover, layers } = getCloudCoverage(metar.clouds);
  const precipitation = hasPrecipitation(metar.presentWeather);
  const lightning = hasLightning(metar.presentWeather);
  const isVfr = metar.flightCategory === "VFR";
  const night = isNightTime(metar.location.lat, metar.location.lon);

  // Determine gradient based on conditions + time of day
  let gradient: [string, string, string];

  if (night) {
    // NIGHT GRADIENTS — deep navy/dark blue tones
    if (lightning || (precipitation === "rain" && (maxCover === "BKN" || maxCover === "OVC"))) {
      // Night storm — very dark with deep blue-gray
      gradient = ["#0a0e1a", "#151c2e", "#1e2a42"];
    } else if (precipitation === "rain") {
      // Night rain — dark navy
      gradient = ["#0d1117", "#161b28", "#1e2838"];
    } else if (precipitation === "snow") {
      // Night snow — dark silver-blue
      gradient = ["#0f1520", "#1a2332", "#2a3444"];
    } else if (precipitation === "mist" || metar.flightCategory === "LIFR") {
      // Night fog — very dark murky gray
      gradient = ["#0e1015", "#1a1e25", "#252a32"];
    } else if (metar.flightCategory === "IFR") {
      // Night IFR — dark overcast
      gradient = ["#0d1118", "#182030", "#222e40"];
    } else if (maxCover === "OVC" || maxCover === "BKN") {
      // Night overcast/broken — dark blue-gray
      gradient = ["#0f172a", "#1e293b", "#2d3a4f"];
    } else {
      // Clear night — deep navy with stars feel
      gradient = ["#0a1628", "#111d35", "#1a2a48"];
    }
  } else {
    // DAY GRADIENTS (original logic)
    if (lightning || (precipitation === "rain" && (maxCover === "BKN" || maxCover === "OVC"))) {
      // Stormy — dark gray
      gradient = ["#374151", "#4b5563", "#6b7280"];
    } else if (precipitation === "mist" || metar.flightCategory === "LIFR") {
      // Fog/LIFR — white-gray
      gradient = ["#9ca3af", "#d1d5db", "#e5e7eb"];
    } else if (metar.flightCategory === "IFR") {
      // IFR — overcast gray
      gradient = ["#64748b", "#94a3b8", "#cbd5e1"];
    } else if (maxCover === "OVC") {
      // Full overcast — medium gray
      gradient = ["#78909c", "#b0bec5", "#cfd8dc"];
    } else if (maxCover === "BKN") {
      // Broken — gray-blue mix
      gradient = ["#5b86a7", "#94b8d0", "#c8dce8"];
    } else if (maxCover === "SCT") {
      // Scattered — slightly hazy blue
      gradient = ["#2196f3", "#7ec8e3", "#d4ecf7"];
    } else if (precipitation === "snow") {
      // Snow — cold gray-white
      gradient = ["#78909c", "#b0bec5", "#eceff1"];
    } else {
      // Clear/FEW — beautiful blue sky
      gradient = ["#1e90ff", "#87ceeb", "#e0efff"];
    }
  }

  // At night, reduce cloud opacity and darken cloud colors
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
    lightning,
    isVfr,
    isNight: night,
  };
}
