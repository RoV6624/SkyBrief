/**
 * Preflight Monitoring Store
 *
 * Tracks active preflight sessions: the station being monitored,
 * the snapshot METAR captured at briefing time, and any significant
 * weather changes detected during the preflight period.
 *
 * Includes a 90-minute auto-timeout — after 90 minutes the session
 * is considered expired and selectors will treat it as inactive.
 */

import { createPersistedStore } from "./middleware";
import type { NormalizedMetar } from "@/lib/api/types";
import type { WeatherChange } from "@/lib/weather/change-detector";

const PREFLIGHT_TIMEOUT_MS = 90 * 60 * 1000; // 90 minutes

interface PreflightStore {
  // State
  isPreflightActive: boolean;
  startedAt: Date | null;
  station: string | null;
  snapshotMetar: NormalizedMetar | null;
  significantChanges: WeatherChange[];
  lastChecked: Date | null;

  // Actions
  startPreflight: (station: string, metar: NormalizedMetar) => void;
  stopPreflight: () => void;
  addChanges: (changes: WeatherChange[]) => void;
  updateLastChecked: () => void;
  clearChanges: () => void;

  // Selectors
  isExpired: () => boolean;
  elapsedMinutes: () => number;
  hasRedChanges: () => boolean;
}

export const usePreflightStore = createPersistedStore<PreflightStore>(
  "preflight",
  (set, get) => ({
    // Initial state
    isPreflightActive: false,
    startedAt: null,
    station: null,
    snapshotMetar: null,
    significantChanges: [],
    lastChecked: null,

    // ── Actions ──────────────────────────────────────────────────────────

    startPreflight: (station, metar) =>
      set({
        isPreflightActive: true,
        startedAt: new Date(),
        station: station.toUpperCase(),
        snapshotMetar: metar,
        significantChanges: [],
        lastChecked: new Date(),
      }),

    stopPreflight: () =>
      set({
        isPreflightActive: false,
        startedAt: null,
        station: null,
        snapshotMetar: null,
        significantChanges: [],
        lastChecked: null,
      }),

    addChanges: (changes) => {
      if (changes.length === 0) return;

      const existing = get().significantChanges;

      // De-duplicate by type — keep latest change for each type
      const byType = new Map<string, WeatherChange>();

      // First add existing changes
      for (const change of existing) {
        byType.set(change.type, change);
      }

      // Then overwrite with newer changes of the same type
      for (const change of changes) {
        byType.set(change.type, change);
      }

      const merged = Array.from(byType.values());

      // Sort: red first, then by detection time (newest first)
      merged.sort((a, b) => {
        if (a.severity === "red" && b.severity !== "red") return -1;
        if (a.severity !== "red" && b.severity === "red") return 1;
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      });

      set({ significantChanges: merged });
    },

    updateLastChecked: () => set({ lastChecked: new Date() }),

    clearChanges: () => set({ significantChanges: [] }),

    // ── Selectors ────────────────────────────────────────────────────────

    isExpired: () => {
      const { startedAt, isPreflightActive } = get();
      if (!isPreflightActive || !startedAt) return false;

      const started =
        startedAt instanceof Date ? startedAt : new Date(startedAt);
      return Date.now() - started.getTime() > PREFLIGHT_TIMEOUT_MS;
    },

    elapsedMinutes: () => {
      const { startedAt, isPreflightActive } = get();
      if (!isPreflightActive || !startedAt) return 0;

      const started =
        startedAt instanceof Date ? startedAt : new Date(startedAt);
      return Math.floor((Date.now() - started.getTime()) / 60_000);
    },

    hasRedChanges: () => {
      return get().significantChanges.some((c) => c.severity === "red");
    },
  }),
  {
    partialize: (state) => ({
      isPreflightActive: state.isPreflightActive,
      startedAt: state.startedAt,
      station: state.station,
      snapshotMetar: state.snapshotMetar,
      significantChanges: state.significantChanges,
      lastChecked: state.lastChecked,
    }),
    onRehydrate: (state) => {
      // On rehydration, check if the session has expired
      if (state?.isPreflightActive && state.startedAt) {
        const started =
          state.startedAt instanceof Date
            ? state.startedAt
            : new Date(state.startedAt as unknown as string);
        if (Date.now() - started.getTime() > PREFLIGHT_TIMEOUT_MS) {
          console.log(
            "[PreflightStore] Session expired during app sleep — clearing"
          );
        }
      }
    },
  }
);
