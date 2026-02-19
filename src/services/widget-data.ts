/**
 * Widget Data Service
 *
 * Prepares weather data for iOS home screen widget consumption.
 * Uses shared MMKV storage accessible by the widget extension.
 */

import { fetchMetar } from "./api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import { storage } from "./storage";

export interface WidgetData {
  station: string;
  stationName: string;
  flightCategory: string;
  wind: string;
  ceiling: string;
  visibility: string;
  temperature: string;
  altimeter: string;
  rawMetar: string;
  updatedAt: string; // ISO
}

const WIDGET_STORAGE_KEY = "skybrief-widget-data";

/**
 * Fetch latest weather and save to shared storage for widget
 */
export async function updateWidgetData(homeStation: string): Promise<WidgetData | null> {
  if (!homeStation) return null;

  try {
    const data = await fetchMetar(homeStation);
    if (!data.length) return null;

    const metar = normalizeMetar(data[0]);

    const widgetData: WidgetData = {
      station: metar.station,
      stationName: metar.stationName,
      flightCategory: metar.flightCategory,
      wind:
        metar.wind.speed === 0
          ? "Calm"
          : `${metar.wind.direction}° ${metar.wind.speed}${metar.wind.gust ? `G${metar.wind.gust}` : ""} kt`,
      ceiling: metar.ceiling ? `${metar.ceiling.toLocaleString()} ft` : "CLR",
      visibility: `${metar.visibility.sm}${metar.visibility.isPlus ? "+" : ""} SM`,
      temperature: `${metar.temperature.celsius}°C / ${metar.temperature.fahrenheit}°F`,
      altimeter: metar.altimeter.toFixed(2),
      rawMetar: metar.rawText,
      updatedAt: new Date().toISOString(),
    };

    // Save to MMKV for widget extension access
    storage.set(WIDGET_STORAGE_KEY, JSON.stringify(widgetData));

    return widgetData;
  } catch (error) {
    console.error("[Widget] Failed to update widget data:", error);
    return null;
  }
}

/**
 * Get cached widget data from MMKV
 */
export function getCachedWidgetData(): WidgetData | null {
  try {
    const raw = storage.getString(WIDGET_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if widget data is stale (older than 30 minutes)
 */
export function isWidgetDataStale(): boolean {
  const data = getCachedWidgetData();
  if (!data) return true;
  const age = Date.now() - new Date(data.updatedAt).getTime();
  return age > 30 * 60 * 1000; // 30 minutes
}
