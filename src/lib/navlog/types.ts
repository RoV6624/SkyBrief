import type { RouteWaypoint } from "@/lib/route/types";

export interface NavLogLeg {
  from: RouteWaypoint;
  to: RouteWaypoint;
  trueCourse: number; // degrees (0-360)
  distanceNm: number;
  windDirection: number; // from METAR
  windSpeed: number; // knots
  trueAirspeed: number; // from aircraft profile
  windCorrectionAngle: number; // calculated WCA
  trueHeading: number; // TC + WCA
  groundSpeed: number; // calculated GS
  timeEnroute: number; // minutes
  fuelBurn: number; // gallons
}

export interface NavLog {
  legs: NavLogLeg[];
  totalDistance: number;
  totalTime: number; // minutes
  totalFuel: number; // gallons
}
