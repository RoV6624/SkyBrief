/**
 * Coordinate Projection Utility
 *
 * Projects lat/lon waypoints into pixel coordinates using
 * equirectangular projection with latitude cosine correction.
 * Used for positioning overlay elements on the route map.
 */

export interface ProjectedPoint {
  x: number;
  y: number;
  waypoint: { icao: string; lat: number; lon: number };
}

/**
 * Project an array of lat/lon waypoints into pixel coordinates.
 *
 * @param waypoints - Array of { icao, lat, lon }
 * @param width - Container width in pixels
 * @param height - Container height in pixels
 * @param padding - Padding in pixels from each edge
 * @returns Array of { x, y, waypoint } in pixel space
 */
export function projectRoute(
  waypoints: Array<{ icao: string; lat: number; lon: number }>,
  width: number,
  height: number,
  padding = 40
): ProjectedPoint[] {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) {
    return [
      {
        x: width / 2,
        y: height / 2,
        waypoint: waypoints[0],
      },
    ];
  }

  // Calculate bounding box
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const wp of waypoints) {
    if (wp.lat < minLat) minLat = wp.lat;
    if (wp.lat > maxLat) maxLat = wp.lat;
    if (wp.lon < minLon) minLon = wp.lon;
    if (wp.lon > maxLon) maxLon = wp.lon;
  }

  // Apply latitude cosine correction for equirectangular projection
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);

  // Effective bounding box in projected space
  const lonSpan = (maxLon - minLon) * cosLat;
  const latSpan = maxLat - minLat;

  // Prevent division by zero for straight N-S or E-W routes
  const effectiveLonSpan = Math.max(lonSpan, 0.001);
  const effectivLatSpan = Math.max(latSpan, 0.001);

  // Available drawing area
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Scale to fit
  const scaleX = drawWidth / effectiveLonSpan;
  const scaleY = drawHeight / effectivLatSpan;
  const scale = Math.min(scaleX, scaleY);

  // Center offset
  const projectedWidth = effectiveLonSpan * scale;
  const projectedHeight = effectivLatSpan * scale;
  const offsetX = padding + (drawWidth - projectedWidth) / 2;
  const offsetY = padding + (drawHeight - projectedHeight) / 2;

  return waypoints.map((wp) => ({
    x: offsetX + (wp.lon - minLon) * cosLat * scale,
    // Flip Y axis (lat increases northward, but pixels increase downward)
    y: offsetY + (maxLat - wp.lat) * scale,
    waypoint: wp,
  }));
}
