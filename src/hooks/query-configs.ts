/**
 * React Query configuration presets
 *
 * Standardized query configurations for consistent data fetching
 * behavior across all hooks using @tanstack/react-query.
 */

import { DEFAULT_REFETCH_INTERVALS, DEFAULT_STALE_TIME } from "@/config/defaults";

/**
 * Query configuration for METAR weather data
 * - Refetches every 1 minute (weather changes frequently)
 * - Stale after 30 seconds (show loading indicator after this time)
 */
export const METAR_QUERY_CONFIG = {
  refetchInterval: DEFAULT_REFETCH_INTERVALS.metar,
  staleTime: DEFAULT_STALE_TIME.metar,
  gcTime: 300_000, // Cache for 5 minutes (renamed from cacheTime in v5)
} as const;

/**
 * Query configuration for TAF (Terminal Aerodrome Forecast) data
 * - Refetches every 5 minutes (forecasts change less frequently)
 * - Stale after 2 minutes
 */
export const TAF_QUERY_CONFIG = {
  refetchInterval: DEFAULT_REFETCH_INTERVALS.taf,
  staleTime: DEFAULT_STALE_TIME.taf,
  gcTime: 600_000, // Cache for 10 minutes
} as const;

/**
 * Query configuration for fuel price data
 * - Refetches every 5 minutes
 * - Stale after 2 minutes
 */
export const FUEL_QUERY_CONFIG = {
  refetchInterval: DEFAULT_REFETCH_INTERVALS.fuel,
  staleTime: DEFAULT_STALE_TIME.fuel,
  gcTime: 600_000, // Cache for 10 minutes
} as const;

/**
 * Query configuration for AI briefing data
 * - Refetches every 10 minutes (expensive operation)
 * - Stale after 5 minutes
 * - No retry on failure (briefing generation can fail due to API limits)
 */
export const BRIEFING_QUERY_CONFIG = {
  refetchInterval: DEFAULT_REFETCH_INTERVALS.briefing,
  staleTime: DEFAULT_STALE_TIME.briefing,
  gcTime: 900_000, // Cache for 15 minutes
  retry: false, // Don't retry failed briefing requests
} as const;

/**
 * Query configuration for route planning data
 * - Refetches every 5 minutes
 * - Stale after 2 minutes
 */
export const ROUTE_QUERY_CONFIG = {
  refetchInterval: DEFAULT_REFETCH_INTERVALS.route,
  staleTime: DEFAULT_STALE_TIME.route,
  gcTime: 600_000, // Cache for 10 minutes
} as const;

/**
 * Query configuration for static/slow-changing data
 * (e.g., airport database, runway info)
 * - No automatic refetch
 * - Stale after 1 hour
 * - Cache for 24 hours
 */
export const STATIC_QUERY_CONFIG = {
  refetchInterval: false,
  staleTime: 3_600_000, // 1 hour
  gcTime: 86_400_000, // 24 hours
} as const;

/**
 * Combined query configurations object
 * Use this for accessing all configs in one place
 */
export const QUERY_CONFIGS = {
  metar: METAR_QUERY_CONFIG,
  taf: TAF_QUERY_CONFIG,
  fuel: FUEL_QUERY_CONFIG,
  briefing: BRIEFING_QUERY_CONFIG,
  route: ROUTE_QUERY_CONFIG,
  static: STATIC_QUERY_CONFIG,
} as const;
