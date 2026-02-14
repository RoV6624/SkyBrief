import { useQuery } from "@tanstack/react-query";
import { fetchRouteWeather } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import {
  findStationsAlongPath,
  type PathResult,
} from "@/lib/route/path-stations";
import { findStationCoords } from "@/lib/route/station-coords";
import { haversineDistance, calculateBearing } from "@/lib/interpolation/haversine";
import type {
  RouteWaypoint,
  RouteBriefing,
  RouteWeatherPoint,
  RouteLeg,
  GapSegment,
} from "@/lib/route/types";
import type { FlightCategory } from "@/lib/api/types";

const CATEGORY_ORDER: Record<FlightCategory, number> = {
  VFR: 0,
  MVFR: 1,
  IFR: 2,
  LIFR: 3,
};

function worstCategory(cats: FlightCategory[]): FlightCategory {
  return cats.reduce(
    (worst, cat) =>
      CATEGORY_ORDER[cat] > CATEGORY_ORDER[worst] ? cat : worst,
    "VFR" as FlightCategory
  );
}

export function useRouteBriefing(waypointIcaos: string[]) {
  return useQuery({
    queryKey: ["route-briefing", ...waypointIcaos],
    queryFn: async (): Promise<RouteBriefing | null> => {
      if (waypointIcaos.length < 2) return null;

      // Resolve waypoint coordinates
      const waypoints: RouteWaypoint[] = waypointIcaos
        .map((icao) => {
          const coords = findStationCoords(icao.toUpperCase());
          return coords
            ? { icao: coords.icao, lat: coords.lat, lon: coords.lon, name: coords.name }
            : null;
        })
        .filter((w): w is RouteWaypoint => w !== null);

      if (waypoints.length < 2) return null;

      // Find stations along path
      const pathResult: PathResult = findStationsAlongPath(waypoints);

      // Fetch weather for all stations
      const allIds = pathResult.stations.map((s: { icao: string }) => s.icao).join(",");
      const { metars, tafs } = await fetchRouteWeather(allIds);

      // Build weather points
      const weatherPoints: RouteWeatherPoint[] = pathResult.stations
        .map((station: { icao: string; lat: number; lon: number; name: string }) => {
          const raw = metars.find((m) => m.icaoId === station.icao);
          const normalized = raw ? normalizeMetar(raw) : null;
          const taf = tafs.find((t) => t.icaoId === station.icao) ?? null;
          const distFromStart = haversineDistance(
            waypoints[0].lat, waypoints[0].lon,
            station.lat, station.lon
          );

          return {
            waypoint: { icao: station.icao, lat: station.lat, lon: station.lon, name: station.name },
            distanceFromStart: distFromStart,
            metar: normalized,
            taf,
            flightCategory: normalized?.flightCategory ?? null,
            isInterpolated: false,
          } satisfies RouteWeatherPoint;
        })
        .filter((p: RouteWeatherPoint): p is RouteWeatherPoint => p.metar !== null);

      // Build legs between waypoints
      const legs: RouteLeg[] = [];
      for (let i = 0; i < waypoints.length - 1; i++) {
        const from = waypoints[i];
        const to = waypoints[i + 1];
        const dist = haversineDistance(from.lat, from.lon, to.lat, to.lon);

        // Compute bearing
        const bearing = calculateBearing(from.lat, from.lon, to.lat, to.lon);

        legs.push({
          from,
          to,
          distanceNm: Math.round(dist),
          bearing: Math.round(bearing),
        });
      }

      // Gap segments are already correctly shaped from findStationsAlongPath
      const gaps: GapSegment[] = pathResult.gaps;

      // Compute worst category from all weather points with data
      const allCategories = weatherPoints
        .map((w: RouteWeatherPoint) => w.metar?.flightCategory)
        .filter((c): c is FlightCategory => c != null);

      return {
        legs,
        weatherPoints,
        gaps,
        totalDistanceNm: Math.round(
          haversineDistance(
            waypoints[0].lat,
            waypoints[0].lon,
            waypoints[waypoints.length - 1].lat,
            waypoints[waypoints.length - 1].lon
          )
        ),
        worstCategory: allCategories.length > 0 ? worstCategory(allCategories) : null,
      };
    },
    enabled: waypointIcaos.length >= 2,
    staleTime: 120_000,
  });
}
