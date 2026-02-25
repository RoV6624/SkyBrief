import { useQuery } from "@tanstack/react-query";
import { resolveAndFetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import { cacheMetar, getCachedMetar, getCacheAgeText } from "@/services/weather-cache";
import type { MetarResponse, NormalizedMetar } from "@/lib/api/types";

export interface NearbyStationInfo {
  station: string;
  distance?: number; // nautical miles
}

export interface MetarResult {
  raw: MetarResponse;
  normalized: NormalizedMetar;
  resolvedStation: string;
  nearbyInfo?: NearbyStationInfo;
  cached?: boolean;
  cacheAge?: string;
}

export function useMetar(icao: string | null) {
  return useQuery({
    queryKey: ["metar", icao],
    queryFn: async (): Promise<MetarResult | null> => {
      if (!icao) return null;

      try {
        const result = await resolveAndFetchMetar(icao);
        if (!result) throw new Error("No METAR data");

        const raw = result.data[0];
        const normalized = normalizeMetar(raw);

        // Cache using the resolved station ID
        cacheMetar(result.resolvedId, raw);

        return {
          raw,
          normalized,
          resolvedStation: result.resolvedId,
          nearbyInfo: result.isNearby
            ? { station: result.resolvedId, distance: result.distance }
            : undefined,
        };
      } catch {
        // Offline fallback: serve cached data
        const cached = getCachedMetar(icao);
        if (cached) {
          const normalized = normalizeMetar(cached.data);
          return {
            raw: cached.data,
            normalized,
            resolvedStation: cached.data.icaoId,
            cached: true,
            cacheAge: getCacheAgeText(cached.cachedAt),
          };
        }
        return null;
      }
    },
    enabled: !!icao,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}
