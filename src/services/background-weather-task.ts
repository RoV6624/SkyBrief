/**
 * Background Weather Fetch Task
 *
 * Registers an Expo background fetch task that periodically checks for
 * weather changes at the active preflight station. iOS throttles background
 * fetch to approximately every 15 minutes at best, so this serves as a
 * supplement to the foreground polling (every 2 min) provided by
 * usePreflightMonitor.
 *
 * When the app is in the background and a significant change is detected,
 * a local notification is fired to alert the pilot.
 *
 * NOTE: expo-background-fetch and expo-task-manager require native modules.
 * When running in Expo Go or a build without these modules linked, the
 * background task is safely skipped.
 */

import { fetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import { detectWeatherChanges } from "@/lib/weather/change-detector";
import { sendPreflightNotification } from "@/services/preflight-notifications";
import { usePreflightStore } from "@/stores/preflight-store";

export const PREFLIGHT_WEATHER_TASK = "PREFLIGHT_WEATHER_CHECK";

const PREFLIGHT_TIMEOUT_MS = 90 * 60 * 1000; // 90 minutes

// Lazy-loaded references to native modules (may not be available)
let _BackgroundFetch: typeof import("expo-background-fetch") | null = null;
let _TaskManager: typeof import("expo-task-manager") | null = null;
let _nativeModulesChecked = false;

function getNativeModules() {
  if (!_nativeModulesChecked) {
    _nativeModulesChecked = true;
    try {
      _TaskManager = require("expo-task-manager");
      _BackgroundFetch = require("expo-background-fetch");
    } catch {
      console.warn(
        "[BackgroundWeather] Native modules not available — background fetch disabled."
      );
    }
  }
  return { BackgroundFetch: _BackgroundFetch, TaskManager: _TaskManager };
}

// ── Define the background task ──────────────────────────────────────────

// Defer defineTask to avoid crashing at import time
try {
  const { TaskManager, BackgroundFetch } = getNativeModules();

  if (TaskManager && BackgroundFetch) {
    TaskManager.defineTask(PREFLIGHT_WEATHER_TASK, async () => {
      try {
        const state = usePreflightStore.getState();

        // Bail out if preflight is not active
        if (!state.isPreflightActive || !state.station || !state.snapshotMetar) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Check for auto-timeout (90 min)
        if (state.startedAt) {
          const started =
            state.startedAt instanceof Date
              ? state.startedAt
              : new Date(state.startedAt as unknown as string);
          if (Date.now() - started.getTime() > PREFLIGHT_TIMEOUT_MS) {
            state.stopPreflight();
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
        }

        // Fetch latest METAR
        const data = await fetchMetar(state.station);
        if (!data.length) {
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        const currentMetar = normalizeMetar(data[0]);
        const changes = detectWeatherChanges(state.snapshotMetar, currentMetar);

        if (changes.length > 0) {
          // Persist changes to store
          state.addChanges(changes);
          state.updateLastChecked();

          // Fire local notification
          const redChanges = changes.filter((c) => c.severity === "red");
          if (redChanges.length > 0) {
            const titles = redChanges.map((c) => c.title).join(", ");
            await sendPreflightNotification(
              `Weather Alert — ${state.station}`,
              `${titles}. Review conditions before departure.`
            );
          } else {
            const amberChanges = changes.filter((c) => c.severity === "amber");
            if (amberChanges.length > 0) {
              await sendPreflightNotification(
                `Weather Update — ${state.station}`,
                `${amberChanges.length} change${amberChanges.length > 1 ? "s" : ""} detected since your briefing.`
              );
            }
          }

          return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        state.updateLastChecked();
        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error("[BackgroundWeather] Task failed:", error);
        return BackgroundFetch!.BackgroundFetchResult.Failed;
      }
    });
  }
} catch {
  // Silently ignore — native modules not available
}

// ── Registration ────────────────────────────────────────────────────────

/**
 * Register the background fetch task. Call this when a preflight session
 * starts. iOS throttles background fetch to ~15 min minimum.
 */
export async function registerBackgroundWeatherTask(): Promise<void> {
  const { TaskManager, BackgroundFetch } = getNativeModules();
  if (!TaskManager || !BackgroundFetch) return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      PREFLIGHT_WEATHER_TASK
    );
    if (isRegistered) {
      console.log("[BackgroundWeather] Task already registered");
      return;
    }

    await BackgroundFetch.registerTaskAsync(PREFLIGHT_WEATHER_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
      stopOnTerminate: false,
      startOnBoot: false,
    });

    console.log("[BackgroundWeather] Task registered successfully");
  } catch (error) {
    console.warn("[BackgroundWeather] Failed to register task:", error);
  }
}

/**
 * Unregister the background fetch task. Call this when a preflight
 * session ends.
 */
export async function unregisterBackgroundWeatherTask(): Promise<void> {
  const { TaskManager, BackgroundFetch } = getNativeModules();
  if (!TaskManager || !BackgroundFetch) return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      PREFLIGHT_WEATHER_TASK
    );
    if (!isRegistered) return;

    await BackgroundFetch.unregisterTaskAsync(PREFLIGHT_WEATHER_TASK);
    console.log("[BackgroundWeather] Task unregistered");
  } catch (error) {
    console.warn("[BackgroundWeather] Failed to unregister task:", error);
  }
}

/**
 * Check current background fetch status (useful for debugging).
 */
export async function getBackgroundFetchStatus(): Promise<string> {
  const { BackgroundFetch } = getNativeModules();
  if (!BackgroundFetch) return "unavailable";

  const status = await BackgroundFetch.getStatusAsync();

  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return "restricted";
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return "denied";
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return "available";
    default:
      return "unknown";
  }
}
