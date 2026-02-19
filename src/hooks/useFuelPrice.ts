import { useQuery } from "@tanstack/react-query";
import { fetchAirNavFuelPrices } from "@/services/airnav-fuel";
import { sortReportsByRelevance } from "@/lib/fuel/freshness";
import type { FuelPriceReport, CombinedFuelPrice } from "@/lib/api/types";

/**
 * Primary fuel price hook — fetches free fuel prices from AirNav.
 *
 * Data flow:
 *  1. Check MMKV cache (via airnav-fuel service)
 *  2. If stale, scrape AirNav airport page for 100LL prices
 *  3. Return sorted reports (cheapest/freshest first)
 */
export function useFuelPrice(icao: string | null) {
  return useQuery({
    queryKey: ["fuel-price", icao],
    queryFn: async (): Promise<(CombinedFuelPrice & { reports: FuelPriceReport[] }) | null> => {
      if (!icao) return null;

      const reports = await fetchAirNavFuelPrices(icao);

      if (reports.length === 0) return null;

      const sortedReports = sortReportsByRelevance(reports);
      const primary = sortedReports[0];

      return {
        price_100ll: primary.price_100ll,
        fbo_name: primary.fbo_name,
        updated_at: primary.reported_at,
        source: "api" as const,
        confidence: "high" as const,
        reports: sortedReports,
      };
    },
    enabled: !!icao,
    // Fuel prices change slowly — no need to refetch every 5 min
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour cache
    refetchInterval: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook to get all fuel price reports for an airport
 */
export function useFuelPriceReports(icao: string | null) {
  return useQuery({
    queryKey: ["fuel-price-reports", icao],
    queryFn: async (): Promise<FuelPriceReport[]> => {
      if (!icao) return [];
      const reports = await fetchAirNavFuelPrices(icao);
      return sortReportsByRelevance(reports);
    },
    enabled: !!icao,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  });
}
