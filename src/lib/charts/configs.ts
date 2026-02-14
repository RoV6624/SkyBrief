import type { ChartConfig, ChartMetadata, ChartRegion } from './types';

/**
 * Chart metadata definitions
 */
export const CHART_METADATA: Record<string, ChartMetadata> = {
  surface_analysis: {
    id: 'surface_analysis',
    type: 'surface_analysis',
    title: 'Surface Analysis',
    description: 'Current surface pressure systems and fronts',
    regions: ['CONUS'],
    updateIntervalMinutes: 180, // Every 3 hours
    validHours: 0, // Current conditions
  },
  prog_12hr: {
    id: 'prog_12hr',
    type: 'prog_12hr',
    title: '12-Hour Prog',
    description: 'Forecast weather systems and hazards',
    regions: ['CONUS'],
    updateIntervalMinutes: 360, // Every 6 hours
    validHours: 12,
    altitude: 'SFC-240',
  },
  prog_24hr: {
    id: 'prog_24hr',
    type: 'prog_24hr',
    title: '24-Hour Prog',
    description: 'Extended forecast conditions',
    regions: ['CONUS'],
    updateIntervalMinutes: 360, // Every 6 hours
    validHours: 24,
    altitude: 'SFC-240',
  },
  sigwx_mid: {
    id: 'sigwx_mid',
    type: 'sigwx_mid',
    title: 'Mid-Level SIGWX',
    description: 'Turbulence, icing, jet streams',
    regions: ['CONUS'],
    updateIntervalMinutes: 360, // Every 6 hours
    validHours: 12,
    altitude: 'FL100-450',
  },
};

/**
 * URL builders for each chart type
 * Links to AWC web pages for MVP (Phase 1)
 */
export const CHART_CONFIGS: Record<string, ChartConfig> = {
  surface_analysis: {
    metadata: CHART_METADATA.surface_analysis,
    urlBuilder: (_region: ChartRegion) =>
      'https://www.wpc.ncep.noaa.gov/html/sfc2.shtml',
  },
  prog_12hr: {
    metadata: CHART_METADATA.prog_12hr,
    urlBuilder: (_region: ChartRegion) =>
      'https://aviationweather.gov/gfa/?tab=progchart',
  },
  prog_24hr: {
    metadata: CHART_METADATA.prog_24hr,
    urlBuilder: (_region: ChartRegion) =>
      'https://aviationweather.gov/gfa/?tab=progchart',
  },
  sigwx_mid: {
    metadata: CHART_METADATA.sigwx_mid,
    urlBuilder: (_region: ChartRegion) =>
      'https://aviationweather.gov/sigwx/',
  },
};
