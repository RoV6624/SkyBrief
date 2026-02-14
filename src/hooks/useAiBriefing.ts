import { useQuery } from "@tanstack/react-query";
import { generateLocalBriefing } from "@/lib/ai/local-briefing";
import { fetchPireps } from "@/services/api-client";
import type { MetarResponse, AiBriefing, PirepResponse } from "@/lib/api/types";

export function useAiBriefing(metar: MetarResponse | null | undefined) {
  return useQuery({
    queryKey: ["briefing", metar?.icaoId],
    queryFn: async (): Promise<AiBriefing | null> => {
      console.log(`[AI Briefing] Starting briefing generation for ${metar?.icaoId}`);

      if (!metar) {
        console.log(`[AI Briefing] No METAR data, returning null`);
        return null;
      }

      // Fetch PIREPs for context (within 100nm)
      let pireps: PirepResponse[] = [];
      try {
        console.log(`[AI Briefing] Fetching PIREPs for ${metar.icaoId}...`);
        pireps = await fetchPireps(metar.icaoId, 100);
        console.log(`[AI Briefing] Found ${pireps.length} PIREPs`);
      } catch (error) {
        console.warn(`[AI Briefing] Failed to fetch PIREPs for ${metar.icaoId}:`, error);
        // Continue without PIREPs if fetch fails
      }

      // Use local briefing engine with PIREP data
      console.log(`[AI Briefing] Generating briefing with METAR and ${pireps.length} PIREPs`);
      try {
        const briefing = generateLocalBriefing(metar, pireps);
        console.log(`[AI Briefing] Generated briefing:`, {
          recommendation: briefing.recommendation,
          hazardCount: briefing.hazards.length,
          summary: briefing.summary.substring(0, 100)
        });
        return briefing;
      } catch (error) {
        console.error(`[AI Briefing] Error generating briefing:`, error);
        throw error;
      }
    },
    enabled: !!metar,
    staleTime: 300_000,
  });
}
