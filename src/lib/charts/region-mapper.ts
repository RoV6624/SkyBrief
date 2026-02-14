import type { ChartRegion } from './types';

// Simplified US regional boundaries
// Based on longitudinal divisions
const REGION_BOUNDARIES = {
  // Alaska
  ALASKA: { latMin: 50, latMax: 72, lonMin: -180, lonMax: -130 },

  // Hawaii/Pacific
  HAWAII: { latMin: 18, latMax: 23, lonMin: -161, lonMax: -154 },

  // Continental US divisions
  EAST: { latMin: 24, latMax: 50, lonMin: -90, lonMax: -66 },
  CENTRAL: { latMin: 24, latMax: 50, lonMin: -105, lonMax: -90 },
  WEST: { latMin: 24, latMax: 50, lonMin: -125, lonMax: -105 },
};

/**
 * Determine chart region based on airport coordinates
 *
 * For CONUS charts (most prog charts), region doesn't affect URL
 * For regional charts, this determines which variant to fetch
 *
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees (negative for west)
 * @returns Chart region
 */
export function determineChartRegion(
  lat: number,
  lon: number
): ChartRegion {
  // Check Alaska
  if (
    lat >= REGION_BOUNDARIES.ALASKA.latMin &&
    lat <= REGION_BOUNDARIES.ALASKA.latMax &&
    lon >= REGION_BOUNDARIES.ALASKA.lonMin &&
    lon <= REGION_BOUNDARIES.ALASKA.lonMax
  ) {
    return 'ALASKA';
  }

  // Check Hawaii
  if (
    lat >= REGION_BOUNDARIES.HAWAII.latMin &&
    lat <= REGION_BOUNDARIES.HAWAII.latMax &&
    lon >= REGION_BOUNDARIES.HAWAII.lonMin &&
    lon <= REGION_BOUNDARIES.HAWAII.lonMax
  ) {
    return 'HAWAII';
  }

  // Continental US - determine east/central/west
  if (lon > REGION_BOUNDARIES.EAST.lonMin) {
    return 'EAST';
  } else if (lon > REGION_BOUNDARIES.CENTRAL.lonMin) {
    return 'CENTRAL';
  } else if (lon >= REGION_BOUNDARIES.WEST.lonMin) {
    return 'WEST';
  }

  // Default to CONUS for nationwide charts
  return 'CONUS';
}

/**
 * Get all applicable chart IDs for a given region
 *
 * @param region Chart region
 * @returns Array of chart IDs to display
 */
export function getChartsForRegion(region: ChartRegion): string[] {
  // Most charts are CONUS-wide and applicable to all regions
  const allCharts = ['surface_analysis', 'prog_12hr', 'prog_24hr', 'sigwx_mid'];

  if (region === 'ALASKA' || region === 'HAWAII') {
    // These regions may have different chart availability in the future
    // For initial implementation, show CONUS charts
    return allCharts;
  }

  return allCharts;
}
