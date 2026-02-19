import { useQuery } from "@tanstack/react-query";
import { fetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import { cacheMetar, getCachedMetar, isCacheStale, getCacheAgeText } from "@/services/weather-cache";
import type { MetarResponse, NormalizedMetar } from "@/lib/api/types";

export function useMetar(icao: string | null) {
  return useQuery({
    queryKey: ["metar", icao],
    queryFn: async (): Promise<{
      raw: MetarResponse;
      normalized: NormalizedMetar;
      cached?: boolean;
      cacheAge?: string;
    } | null> => {
      if (!icao) return null;

      try {
        const data = await fetchMetar(icao);
        if (!data.length) throw new Error("No METAR data");
        const raw = data[0];
        const normalized = normalizeMetar(raw);
        // Cache the fresh response
        cacheMetar(icao, raw);
        return { raw, normalized };
      } catch {
        // Offline fallback: serve cached data
        const cached = getCachedMetar(icao);
        if (cached) {
          const normalized = normalizeMetar(cached.data);
          return {
            raw: cached.data,
            normalized,
            cached: true,
            cacheAge: getCacheAgeText(cached.cachedAt),
          };
        }
        return null;
      }
    },
    enabled: !!icao,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
