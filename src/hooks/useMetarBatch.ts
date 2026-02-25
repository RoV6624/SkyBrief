import { useQuery } from "@tanstack/react-query";
import { fetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import type { NormalizedMetar } from "@/lib/api/types";

/**
 * Batch-fetch METARs for multiple stations in a single request.
 * Returns a map of ICAO -> NormalizedMetar (or null if not found).
 */
export function useMetarBatch(icaos: (string | null)[]) {
  const validIcaos = icaos.filter((id): id is string => !!id);
  const key = validIcaos.sort().join(",");

  return useQuery({
    queryKey: ["metar-batch", key],
    queryFn: async (): Promise<Record<string, NormalizedMetar>> => {
      if (validIcaos.length === 0) return {};

      const data = await fetchMetar(validIcaos.join(","));
      const result: Record<string, NormalizedMetar> = {};
      for (const raw of data) {
        const normalized = normalizeMetar(raw);
        result[raw.icaoId] = normalized;
      }
      return result;
    },
    enabled: validIcaos.length > 0,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}
