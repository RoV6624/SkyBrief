import { useQuery } from "@tanstack/react-query";
import { resolveAndFetchTaf } from "@/services/api-client";
import { cacheTaf, getCachedTaf } from "@/services/weather-cache";
import type { TafResponse } from "@/lib/api/types";

export interface TafResult {
  taf: TafResponse;
  resolvedStation: string;
  isNearby: boolean;
  distance?: number;
}

export function useTaf(icao: string | null) {
  return useQuery({
    queryKey: ["taf", icao],
    queryFn: async (): Promise<TafResult | null> => {
      if (!icao) return null;

      try {
        const result = await resolveAndFetchTaf(icao);
        if (!result) throw new Error("No TAF data");

        const taf = result.data[0];
        cacheTaf(result.resolvedId, taf);

        return {
          taf,
          resolvedStation: result.resolvedId,
          isNearby: result.isNearby,
          distance: result.distance,
        };
      } catch {
        // Offline fallback - only serve if less than 6 hours old
        const cached = getCachedTaf(icao);
        if (cached && Date.now() - cached.cachedAt < 6 * 60 * 60 * 1000) {
          return {
            taf: cached.data,
            resolvedStation: cached.data.icaoId,
            isNearby: false,
          };
        }
        return null;
      }
    },
    enabled: !!icao,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}
