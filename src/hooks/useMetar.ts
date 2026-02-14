import { useQuery } from "@tanstack/react-query";
import { fetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import type { MetarResponse, NormalizedMetar } from "@/lib/api/types";

export function useMetar(icao: string | null) {
  return useQuery({
    queryKey: ["metar", icao],
    queryFn: async (): Promise<{
      raw: MetarResponse;
      normalized: NormalizedMetar;
    } | null> => {
      if (!icao) return null;
      const data = await fetchMetar(icao);
      if (!data.length) return null;
      const raw = data[0];
      const normalized = normalizeMetar(raw);
      return { raw, normalized };
    },
    enabled: !!icao,
    refetchInterval: 60_000, // Refresh every 60s
    staleTime: 30_000,
  });
}
