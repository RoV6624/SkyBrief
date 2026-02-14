import { useQuery } from "@tanstack/react-query";
import { fetchMetar } from "@/services/api-client";
import { STATION_DATABASE, findStationCoords } from "@/lib/route/station-coords";
import { haversineDistance } from "@/lib/interpolation/haversine";
import { interpolateMetar } from "@/lib/interpolation/idw";
import type { NormalizedMetar } from "@/lib/api/types";

interface GhostResult {
  interpolated: NormalizedMetar;
  sources: { station: string; distance: number }[];
  confidence: number;
}

export function useGhostStation(
  icao: string | null,
  primaryFailed: boolean
) {
  return useQuery({
    queryKey: ["ghost", icao],
    queryFn: async (): Promise<GhostResult | null> => {
      if (!icao) return null;
      const targetCoords = findStationCoords(icao);
      if (!targetCoords) return null;

      // Find 5 nearest stations with known coordinates
      const nearby = STATION_DATABASE
        .filter((s) => s.icao !== icao.toUpperCase())
        .map((s) => ({
          id: s.icao,
          distance: haversineDistance(
            targetCoords.lat,
            targetCoords.lon,
            s.lat,
            s.lon
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      const ids = nearby.map((s) => s.id).join(",");
      const metars = await fetchMetar(ids);
      if (metars.length < 2) return null;

      const interpolated = interpolateMetar(
        targetCoords.lat,
        targetCoords.lon,
        icao.toUpperCase(),
        metars
      );
      if (!interpolated) return null;

      const maxDist = Math.max(...nearby.map((s) => s.distance));
      const confidence = Math.max(0, Math.min(1, 1 - maxDist / 200));

      return {
        interpolated,
        sources: nearby
          .filter((s) => metars.some((m) => m.icaoId === s.id))
          .map((s) => ({ station: s.id, distance: Math.round(s.distance) })),
        confidence,
      };
    },
    enabled: !!icao && primaryFailed,
    staleTime: 120_000,
  });
}
