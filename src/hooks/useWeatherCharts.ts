import { useQuery } from '@tanstack/react-query';
import { fetchChartsForLocation } from '@/services/chart-service';
import type { ChartData } from '@/lib/charts/types';

/**
 * Hook to fetch weather charts for a location
 *
 * Refresh strategy:
 * - Most charts update every 3-6 hours
 * - Use longest interval (6 hours) for background refresh
 * - Allow manual refresh via pull-to-refresh
 *
 * @param lat Latitude (null if not available)
 * @param lon Longitude (null if not available)
 * @returns React Query result with chart data
 */
export function useWeatherCharts(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: ['weather-charts', lat, lon],
    queryFn: async (): Promise<ChartData[]> => {
      if (lat === null || lon === null) return [];
      return fetchChartsForLocation(lat, lon);
    },
    enabled: lat !== null && lon !== null,
    staleTime: 3_600_000, // 1 hour - show as stale after this
    refetchInterval: 21_600_000, // 6 hours - auto refresh
    gcTime: 86_400_000, // 24 hours - cache for 1 day
  });
}
