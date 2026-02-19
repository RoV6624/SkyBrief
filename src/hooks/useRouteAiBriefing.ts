import { useQuery } from "@tanstack/react-query";
import {
  generateLocalRouteBriefing,
  type RouteBriefingResult,
} from "@/lib/ai/route-briefing";
import { getArrivalForecast } from "@/lib/route/arrival-forecast";
import type { RouteWeatherPoint } from "@/lib/route/types";
import type { NavLog } from "@/lib/navlog/types";

export function useRouteAiBriefing(
  weatherPoints: RouteWeatherPoint[] | undefined,
  navLog: NavLog | null
) {
  return useQuery({
    queryKey: [
      "route-ai-briefing",
      weatherPoints?.map((w) => w.waypoint.icao).join(","),
      navLog?.totalDistance,
    ],
    queryFn: async (): Promise<RouteBriefingResult | null> => {
      if (!weatherPoints || !navLog || navLog.legs.length === 0) return null;

      // Compute arrival forecasts for each leg
      const depEpoch = Math.floor(Date.now() / 1000);
      let cumulativeMin = 0;
      const arrivalForecasts = navLog.legs.map((leg) => {
        cumulativeMin += leg.timeEnroute;
        const arrivalEpoch = depEpoch + cumulativeMin * 60;
        const destWp = weatherPoints.find(
          (w) => w.waypoint.icao === leg.to.icao
        );
        return destWp?.taf
          ? getArrivalForecast(destWp.taf, arrivalEpoch)
          : null;
      });

      return generateLocalRouteBriefing(
        weatherPoints,
        navLog.legs,
        arrivalForecasts
      );
    },
    enabled: !!weatherPoints && weatherPoints.length >= 2 && !!navLog,
    staleTime: 300_000,
  });
}
