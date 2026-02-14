/**
 * Centralized default configuration values
 *
 * All default values for the application in one place,
 * including alert thresholds, personal minimums, and timing constants.
 */

import type { Thresholds } from "@/lib/alerts/thresholds";
import type { PersonalMinimums } from "@/lib/minimums/types";

// ─── Alert Thresholds ───────────────────────────────────────────────────────

export const DEFAULT_THRESHOLDS: Thresholds = {
  crosswind: { amber: 10, red: 15 },
  tempDewpointSpread: { amber: 3, red: 2 },
  ceiling: { amber: 2000, red: 1000 },
  visibility: { amber: 5, red: 3 },
  gustFactor: 10,
};

// ─── Personal Minimums ──────────────────────────────────────────────────────

export const DEFAULT_PERSONAL_MINIMUMS: PersonalMinimums = {
  ceiling: 3000,
  visibility: 5,
  crosswind: 15,
  maxGust: 25,
  maxWind: 25,
};

// ─── Night Operations ───────────────────────────────────────────────────────

export const DEFAULT_NIGHT_MINIMUMS = {
  enabled: false,
  ceilingOverride: 1500, // ft AGL
  visibilityOverride: 5, // SM
};

// ─── Data Refresh Intervals ─────────────────────────────────────────────────

/**
 * How often to refetch data from the server (background refresh)
 * in milliseconds
 */
export const DEFAULT_REFETCH_INTERVALS = {
  metar: 60_000, // 1 minute
  taf: 300_000, // 5 minutes
  fuel: 300_000, // 5 minutes
  briefing: 600_000, // 10 minutes
  route: 300_000, // 5 minutes
} as const;

/**
 * How long cached data is considered fresh (stale time)
 * in milliseconds
 */
export const DEFAULT_STALE_TIME = {
  metar: 30_000, // 30 seconds
  taf: 120_000, // 2 minutes
  fuel: 120_000, // 2 minutes
  briefing: 300_000, // 5 minutes
  route: 120_000, // 2 minutes
} as const;

// ─── Flight Category Thresholds ─────────────────────────────────────────────

/**
 * FAA flight category ceiling and visibility thresholds
 */
export const FLIGHT_CATEGORY_THRESHOLDS = {
  VFR: {
    ceiling: 3000, // ft AGL
    visibility: 5, // SM
  },
  MVFR: {
    ceiling: 1000, // ft AGL
    visibility: 3, // SM
  },
  IFR: {
    ceiling: 500, // ft AGL
    visibility: 1, // SM
  },
  LIFR: {
    ceiling: 0, // ft AGL (below IFR)
    visibility: 0, // SM (below IFR)
  },
} as const;

// ─── Fuel Price Constants ───────────────────────────────────────────────────

export const FUEL_PRICE_DEFAULTS = {
  staleThresholdDays: 30,
  rateLimitMs: 60_000, // 1 minute between submissions
  minPrice: 0.01,
  maxPrice: 20.0,
} as const;

// ─── Re-exports for Backward Compatibility ──────────────────────────────────

// Re-export individual defaults for convenience and backward compatibility
export { DEFAULT_THRESHOLDS as ALERT_THRESHOLDS };
export { DEFAULT_PERSONAL_MINIMUMS as PERSONAL_MINIMUMS };
export { DEFAULT_NIGHT_MINIMUMS as NIGHT_MINIMUMS };

/**
 * Combined app defaults object
 * Use this for accessing all defaults in one place
 */
export const APP_DEFAULTS = {
  alerts: DEFAULT_THRESHOLDS,
  minimums: DEFAULT_PERSONAL_MINIMUMS,
  night: DEFAULT_NIGHT_MINIMUMS,
  refetch: DEFAULT_REFETCH_INTERVALS,
  stale: DEFAULT_STALE_TIME,
  flightCategories: FLIGHT_CATEGORY_THRESHOLDS,
  fuelPrice: FUEL_PRICE_DEFAULTS,
} as const;
