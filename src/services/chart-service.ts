import { CHART_CONFIGS } from '@/lib/charts/configs';
import { determineChartRegion, getChartsForRegion } from '@/lib/charts/region-mapper';
import type { ChartData, ChartRegion } from '@/lib/charts/types';

/**
 * Get all available charts for a given location
 *
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees (negative for west)
 * @returns Array of chart data with URLs and metadata
 */
export async function fetchChartsForLocation(
  lat: number,
  lon: number
): Promise<ChartData[]> {
  const region = determineChartRegion(lat, lon);
  const chartIds = getChartsForRegion(region);

  const charts: ChartData[] = chartIds.map((id) => {
    const config = CHART_CONFIGS[id];
    if (!config) {
      throw new Error(`Chart config not found: ${id}`);
    }

    const now = new Date();
    const imageUrl = config.urlBuilder(region);

    return {
      id: `${id}_${region}`,
      metadata: config.metadata,
      region,
      imageUrl,
      issuedAt: now, // Placeholder - real implementation would parse from chart
      validFrom: now,
      validTo: new Date(now.getTime() + config.metadata.validHours * 60 * 60 * 1000),
    };
  });

  return charts;
}

/**
 * Get single chart by type and region
 *
 * @param type Chart type ID
 * @param region Chart region
 * @returns Chart data or null if not found
 */
export async function fetchChart(
  type: string,
  region: ChartRegion
): Promise<ChartData | null> {
  const config = CHART_CONFIGS[type];
  if (!config) return null;

  const now = new Date();
  const imageUrl = config.urlBuilder(region);

  return {
    id: `${type}_${region}`,
    metadata: config.metadata,
    region,
    imageUrl,
    issuedAt: now,
    validFrom: now,
    validTo: new Date(now.getTime() + config.metadata.validHours * 60 * 60 * 1000),
  };
}
