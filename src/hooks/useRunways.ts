import { useQuery } from "@tanstack/react-query";
import { getAirportData } from "@/services/airport-data";
import type { AirportData, RunwayWindAnalysis } from "@/lib/airport/types";
import { calculateWindComponents } from "@/lib/aviation/wind-calculations";

/**
 * Hook to fetch runway data for an airport
 */
export function useRunways(icao: string | null) {
  return useQuery({
    queryKey: ["runways", icao],
    queryFn: () => {
      if (!icao) return null;
      return getAirportData(icao);
    },
    enabled: !!icao,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - runway data doesn't change often
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  });
}

/**
 * Calculate wind components for all runways
 */
export function analyzeRunwaysForWind(
  airport: AirportData | null,
  windDirection: number | null,
  windSpeed: number
): RunwayWindAnalysis[] {
  if (!airport || !windDirection) return [];

  const analyses: RunwayWindAnalysis[] = [];

  for (const runway of airport.runways) {
    // Analyze both ends of the runway
    // Low end
    const le_analysis = calculateWindComponents(
      runway.le_heading_degT,
      windDirection,
      windSpeed
    );

    analyses.push({
      runway,
      runway_end: "le",
      heading: runway.le_heading_degT,
      headwind: le_analysis.headwind,
      crosswind: le_analysis.crosswind,
      is_favorable: le_analysis.headwind > 0,
    });

    // High end
    const he_analysis = calculateWindComponents(
      runway.he_heading_degT,
      windDirection,
      windSpeed
    );

    analyses.push({
      runway,
      runway_end: "he",
      heading: runway.he_heading_degT,
      headwind: he_analysis.headwind,
      crosswind: he_analysis.crosswind,
      is_favorable: he_analysis.headwind > 0,
    });
  }

  // Sort by most favorable (highest headwind component)
  analyses.sort((a, b) => b.headwind - a.headwind);

  return analyses;
}

/**
 * Get the best runway based on wind
 * Returns the runway with the highest headwind component
 */
export function getBestRunway(analyses: RunwayWindAnalysis[]): RunwayWindAnalysis | null {
  if (analyses.length === 0) return null;
  // Already sorted by headwind in analyzeRunwaysForWind
  return analyses[0];
}
