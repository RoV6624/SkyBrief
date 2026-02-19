import { logger } from "firebase-functions/v2";

const AVIATION_WEATHER_BASE = "https://aviationweather.gov/api/data";

// ===== Server-side Weather Types =====

export interface ServerMetar {
  station: string;
  flightCategory: string;
  rawText: string;
  temperature: number;
  dewpoint: number;
  windDirection: number | string;
  windSpeed: number;
  windGust: number | null;
  visibility: number;
  ceiling: number | null;
  altimeter: number;
  presentWeather: string | null;
  observationTime: string;
  clouds: Array<{ cover: string; base: number }>;
}

export interface ServerTaf {
  rawText: string;
  forecasts: Array<{
    timeFrom: string;
    timeTo: string;
    windSpeed: number;
    windGust: number | null;
    visibility: number;
    ceiling: number | null;
    flightCategory: string;
    wxString: string | null;
  }>;
}

// ===== Raw API Response Shapes =====

interface RawMetarCloud {
  cover: string;
  base: number;
}

interface RawMetarResponse {
  icaoId: string;
  name?: string;
  reportTime: string;
  temp: number;
  dewp: number;
  wdir: number | string;
  wspd: number;
  wgst: number | null;
  visib: string | number;
  altim: number;
  fltCat: string;
  wxString?: string;
  rawOb: string;
  clouds: RawMetarCloud[];
}

interface RawTafForecast {
  timeFrom: number;
  timeTo: number;
  wdir: number;
  wspd: number;
  wgst: number | null;
  visib: string | number;
  clouds: RawMetarCloud[];
  wxString?: string;
}

interface RawTafResponse {
  icaoId: string;
  rawTAF: string;
  fcsts: RawTafForecast[];
}

// ===== Fetch Functions =====

/**
 * Fetch METAR and TAF data for a given ICAO station identifier.
 * Returns normalized server-side weather types, or null on failure.
 */
export async function fetchWeatherData(
  icao: string
): Promise<{ metar: ServerMetar; taf: ServerTaf | null } | null> {
  const station = icao.toUpperCase().trim();

  if (!station || station.length < 3 || station.length > 4) {
    logger.warn(`Invalid ICAO identifier: "${icao}"`);
    return null;
  }

  try {
    // Fetch METAR and TAF in parallel
    const [metarResult, tafResult] = await Promise.allSettled([
      fetchMetarFromApi(station),
      fetchTafFromApi(station),
    ]);

    // METAR is required; TAF is optional
    if (metarResult.status === "rejected" || !metarResult.value) {
      logger.error(`METAR fetch failed for ${station}: ${metarResult.status === "rejected" ? metarResult.reason : "no data"}`);
      return null;
    }

    const metar = metarResult.value;
    const taf = tafResult.status === "fulfilled" ? tafResult.value : null;

    return { metar, taf };
  } catch (error) {
    logger.error(`Weather fetch failed for ${station}: ${error}`);
    return null;
  }
}

/**
 * Fetch and normalize METAR data from aviationweather.gov
 */
async function fetchMetarFromApi(station: string): Promise<ServerMetar | null> {
  const url = `${AVIATION_WEATHER_BASE}/metar?ids=${encodeURIComponent(station)}&format=json`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`METAR API returned ${response.status}: ${response.statusText}`);
  }

  const data: RawMetarResponse[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const raw = data[0];
  return normalizeMetar(raw);
}

/**
 * Fetch and normalize TAF data from aviationweather.gov
 */
async function fetchTafFromApi(station: string): Promise<ServerTaf | null> {
  const url = `${AVIATION_WEATHER_BASE}/taf?ids=${encodeURIComponent(station)}&format=json`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`TAF API returned ${response.status}: ${response.statusText}`);
  }

  const data: RawTafResponse[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const raw = data[0];
  return normalizeTaf(raw);
}

// ===== Normalization Helpers =====

/**
 * Convert raw aviationweather.gov METAR response to our ServerMetar shape.
 */
function normalizeMetar(raw: RawMetarResponse): ServerMetar {
  const clouds = (raw.clouds ?? []).map((c) => ({
    cover: c.cover,
    base: c.base,
  }));

  const ceiling = findCeiling(clouds);
  const visibility = parseVisibility(String(raw.visib ?? "10+"));

  // Convert altimeter from hPa to inHg if needed (API returns hPa)
  const altimeter = raw.altim > 100 ? hpaToInHg(raw.altim) : raw.altim;

  return {
    station: raw.icaoId,
    flightCategory: raw.fltCat ?? deriveFlightCategory(visibility, ceiling),
    rawText: raw.rawOb ?? "",
    temperature: raw.temp ?? 0,
    dewpoint: raw.dewp ?? 0,
    windDirection: raw.wdir ?? "VRB",
    windSpeed: raw.wspd ?? 0,
    windGust: raw.wgst ?? null,
    visibility,
    ceiling,
    altimeter: Math.round(altimeter * 100) / 100,
    presentWeather: raw.wxString ?? null,
    observationTime: raw.reportTime ?? new Date().toISOString(),
    clouds,
  };
}

/**
 * Convert raw aviationweather.gov TAF response to our ServerTaf shape.
 */
function normalizeTaf(raw: RawTafResponse): ServerTaf {
  const forecasts = (raw.fcsts ?? []).map((fcst) => {
    const clouds = (fcst.clouds ?? []).map((c) => ({
      cover: c.cover,
      base: c.base,
    }));
    const ceiling = findCeiling(clouds);
    const visibility = parseVisibility(String(fcst.visib ?? "6+"));

    return {
      timeFrom: epochToIso(fcst.timeFrom),
      timeTo: epochToIso(fcst.timeTo),
      windSpeed: fcst.wspd ?? 0,
      windGust: fcst.wgst ?? null,
      visibility,
      ceiling,
      flightCategory: deriveFlightCategory(visibility, ceiling),
      wxString: fcst.wxString ?? null,
    };
  });

  return {
    rawText: raw.rawTAF ?? "",
    forecasts,
  };
}

/**
 * Find the lowest BKN or OVC cloud layer base (the ceiling).
 */
function findCeiling(clouds: Array<{ cover: string; base: number }>): number | null {
  const ceilingLayers = clouds.filter(
    (c) => c.cover === "BKN" || c.cover === "OVC"
  );
  if (ceilingLayers.length === 0) return null;
  return Math.min(...ceilingLayers.map((c) => c.base));
}

/**
 * Parse visibility string to numeric statute miles.
 */
function parseVisibility(visib: string): number {
  if (!visib) return 10;
  const cleaned = visib.replace("+", "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 10 : num;
}

/**
 * Derive flight category from visibility and ceiling per FAA standards.
 */
function deriveFlightCategory(
  visibility: number,
  ceiling: number | null
): string {
  // LIFR: ceiling below 500 ft and/or visibility below 1 SM
  if ((ceiling !== null && ceiling < 500) || visibility < 1) return "LIFR";
  // IFR: ceiling 500-999 ft and/or visibility 1-2 SM
  if ((ceiling !== null && ceiling < 1000) || visibility < 3) return "IFR";
  // MVFR: ceiling 1000-2999 ft and/or visibility 3-5 SM
  if ((ceiling !== null && ceiling < 3000) || visibility <= 5) return "MVFR";
  // VFR: ceiling 3000+ ft and visibility greater than 5 SM
  return "VFR";
}

/**
 * Convert hPa to inches of mercury.
 */
function hpaToInHg(hpa: number): number {
  return hpa * 0.02953;
}

/**
 * Convert UNIX epoch (seconds) to ISO 8601 string.
 */
function epochToIso(epoch: number): string {
  return new Date(epoch * 1000).toISOString();
}
