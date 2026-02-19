import { useQuery } from "@tanstack/react-query";
import { fetchTaf } from "@/services/api-client";
import { cacheTaf, getCachedTaf, getCacheAgeText } from "@/services/weather-cache";
import type { TafResponse } from "@/lib/api/types";

export function useTaf(icao: string | null) {
  return useQuery({
    queryKey: ["taf", icao],
    queryFn: async (): Promise<TafResponse | null> => {
      if (!icao) return null;

      try {
        const data = await fetchTaf(icao);
        if (!data.length) throw new Error("No TAF data");
        const taf = data[0];
        cacheTaf(icao, taf);
        return taf;
      } catch {
        // Offline fallback
        const cached = getCachedTaf(icao);
        if (cached) return cached.data;
        return null;
      }
    },
    enabled: !!icao,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}
