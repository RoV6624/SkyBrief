export interface RunwayVisualizerData {
  runwayHeading: number; // 0-360 degrees
  windDirection: number; // 0-360 degrees
  windSpeed: number; // knots
  crosswindComponent: number; // knots (signed: + = right, - = left)
  headwindComponent: number; // knots (signed: + = headwind, - = tailwind)
  crosswindAngle: number; // degrees off runway heading
}

/**
 * Calculate runway wind components for visualization
 * @param runwayHeading - Runway heading in degrees (0-360)
 * @param windDirection - Wind direction FROM in degrees (0-360)
 * @param windSpeed - Wind speed in knots
 * @returns Runway wind data with components
 */
export function calculateRunwayWind(
  runwayHeading: number,
  windDirection: number | "VRB",
  windSpeed: number
): RunwayVisualizerData {
  // Handle variable winds
  if (windDirection === "VRB") {
    return {
      runwayHeading,
      windDirection: 0,
      windSpeed,
      headwindComponent: 0,
      crosswindComponent: 0,
      crosswindAngle: 0,
    };
  }

  const angle = windDirection - runwayHeading;
  const angleRad = (angle * Math.PI) / 180;

  return {
    runwayHeading,
    windDirection,
    windSpeed,
    headwindComponent: Math.round(windSpeed * Math.cos(angleRad)),
    crosswindComponent: Math.round(windSpeed * Math.sin(angleRad)),
    crosswindAngle: angle,
  };
}
