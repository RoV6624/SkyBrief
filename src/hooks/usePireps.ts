import { useQuery } from "@tanstack/react-query";
import { fetchPireps } from "@/services/api-client";
import type { PirepResponse } from "@/lib/api/types";

/**
 * Hook to fetch PIREPs (Pilot Reports) for a station within a radius
 */
export function usePireps(icao: string | null, distanceNm: number = 100) {
  return useQuery({
    queryKey: ["pireps", icao, distanceNm],
    queryFn: async (): Promise<PirepResponse[]> => {
      if (!icao) return [];
      try {
        return await fetchPireps(icao, distanceNm);
      } catch (error) {
        console.warn(`[PIREPs] Failed to fetch for ${icao}:`, error);
        return [];
      }
    },
    enabled: !!icao,
    staleTime: 300_000, // 5 minutes
    gcTime: 600_000, // 10 minutes
  });
}
