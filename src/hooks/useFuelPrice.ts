import { useQuery } from "@tanstack/react-query";
import { fetchApiFuelPrice } from "@/services/fuel-api";
import { getFuelPrice, mergeFuelPrices, getFuelPriceReports } from "@/services/firebase";
import { FUEL_QUERY_CONFIG } from "@/hooks/query-configs";
import { sortReportsByRelevance } from "@/lib/fuel/freshness";
import type { FuelPriceReport } from "@/lib/api/types";

export function useFuelPrice(icao: string | null) {
  return useQuery({
    queryKey: ["fuel-price", icao],
    queryFn: async () => {
      if (!icao) return null;

      // Fetch community reports (multiple per airport)
      const reports = await getFuelPriceReports(icao);

      // Try to fetch API data as well
      const apiPrice = await fetchApiFuelPrice(icao).catch(() => null);

      if (reports.length === 0 && !apiPrice) {
        return null; // No data available
      }

      // Sort reports by relevance (freshness + community verification)
      const sortedReports = sortReportsByRelevance(reports);

      // Use legacy merge for backwards compatibility with UI
      // but include reports array for enhanced UI
      const legacyUserPrice = reports.length > 0 ? {
        airport_id: icao.toUpperCase(),
        price_100ll: sortedReports[0].price_100ll,
        fbo_name: sortedReports[0].fbo_name,
        updated_at: sortedReports[0].reported_at,
        updated_by_uid: sortedReports[0].reported_by_uid,
      } : null;

      const merged = mergeFuelPrices(icao, apiPrice, legacyUserPrice);

      // Enhance with multiple reports
      return merged ? {
        ...merged,
        reports: sortedReports,
      } : null;
    },
    enabled: !!icao,
    ...FUEL_QUERY_CONFIG,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook to get all fuel price reports for an airport (enhanced view)
 */
export function useFuelPriceReports(icao: string | null) {
  return useQuery({
    queryKey: ["fuel-price-reports", icao],
    queryFn: async (): Promise<FuelPriceReport[]> => {
      if (!icao) return [];
      const reports = await getFuelPriceReports(icao);
      return sortReportsByRelevance(reports);
    },
    enabled: !!icao,
    ...FUEL_QUERY_CONFIG,
    retry: 2,
    retryDelay: 1000,
  });
}
