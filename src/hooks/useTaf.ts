import { useQuery } from "@tanstack/react-query";
import { fetchTaf } from "@/services/api-client";
import type { TafResponse } from "@/lib/api/types";

export function useTaf(icao: string | null) {
  return useQuery({
    queryKey: ["taf", icao],
    queryFn: async (): Promise<TafResponse | null> => {
      if (!icao) return null;
      const data = await fetchTaf(icao);
      return data.length ? data[0] : null;
    },
    enabled: !!icao,
    refetchInterval: 300_000, // Refresh every 5 min
    staleTime: 120_000,
  });
}
