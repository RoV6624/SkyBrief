import { useQuery } from "@tanstack/react-query";
import { fetchNotams } from "@/services/api-client";
import { normalizeNotam } from "@/lib/parsers/notam";
import type { NotamResponse } from "@/lib/api/types";
import type { Notam } from "@/components/notam/NotamCard";

export function useNotams(icao: string | null) {
  return useQuery({
    queryKey: ["notams", icao],
    queryFn: async (): Promise<Notam[]> => {
      if (!icao) return [];
      const data = await fetchNotams(icao);
      if (!data.length) return [];

      // Normalize and filter active NOTAMs
      const now = Date.now();
      return data
        .map((raw) => normalizeNotam(raw))
        .filter((notam) => {
          // Only include NOTAMs that are currently active
          return notam.effectiveStart.getTime() <= now && notam.effectiveEnd.getTime() > now;
        })
        .sort((a, b) => {
          // Sort by priority (high first), then by start time (newest first)
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.effectiveStart.getTime() - a.effectiveStart.getTime();
        });
    },
    enabled: !!icao,
    refetchInterval: 5 * 60_000, // Refresh every 5 minutes (NOTAMs change less frequently)
    staleTime: 3 * 60_000, // Consider stale after 3 minutes
  });
}
