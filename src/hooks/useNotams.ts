import { useQuery } from "@tanstack/react-query";
import { fetchNotams } from "@/services/api-client";
import { normalizeNotam } from "@/lib/parsers/notam";
import type { Notam } from "@/components/notam/NotamCard";

export function useNotams(icao: string | null) {
  return useQuery({
    queryKey: ["notams", icao],
    queryFn: async (): Promise<Notam[]> => {
      if (!icao) return [];
      const data = await fetchNotams(icao);
      if (!data.length) return [];

      const now = Date.now();
      return data
        .map((raw) => normalizeNotam(raw))
        .filter((notam) => {
          // Only include NOTAMs that are currently active
          const start = notam.effectiveStart.getTime();
          const end = notam.effectiveEnd.getTime();
          // Guard against invalid dates
          if (isNaN(start) || isNaN(end)) return false;
          return start <= now && end > now;
        })
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.effectiveStart.getTime() - a.effectiveStart.getTime();
        });
    },
    enabled: !!icao,
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
    retry: 1,
  });
}
