/**
 * AirNav fuel price scraper — free fuel prices for any US airport.
 *
 * Fetches the public AirNav airport page and parses 100LL prices from the
 * FBO listings. Results are cached locally in MMKV for 6 hours since fuel
 * prices rarely change more often than that.
 */

import { storage } from "@/services/storage";
import type { FuelPriceReport } from "@/lib/api/types";

const CACHE_PREFIX = "airnav_fuel_";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedFuelData {
  reports: SerializedReport[];
  fetchedAt: number;
}

interface SerializedReport {
  id: string;
  airport_id: string;
  price_100ll: number;
  fbo_name: string | null;
  reported_at: string; // ISO string for serialization
  reported_by_uid: string;
  upvotes: number;
  flags: number;
  verified_by_uids: string[];
  flagged_by_uids: string[];
}

/**
 * Fetch 100LL fuel prices for an airport from AirNav (free, no API key).
 * Returns cached results if fresh enough, otherwise scrapes the page.
 */
export async function fetchAirNavFuelPrices(
  icao: string
): Promise<FuelPriceReport[]> {
  const normalized = icao.toUpperCase();
  const cacheKey = `${CACHE_PREFIX}${normalized}`;

  // Check MMKV cache first
  const cached = storage.getString(cacheKey);
  if (cached) {
    try {
      const parsed: CachedFuelData = JSON.parse(cached);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
        return parsed.reports.map(deserializeReport);
      }
    } catch {
      // Corrupted cache — ignore and re-fetch
    }
  }

  // Fetch from AirNav
  try {
    const reports = await scrapeAirNavFuel(normalized);

    // Cache result (even if empty — avoids hammering AirNav)
    const toCache: CachedFuelData = {
      reports: reports.map(serializeReport),
      fetchedAt: Date.now(),
    };
    storage.set(cacheKey, JSON.stringify(toCache));

    return reports;
  } catch (error) {
    console.warn(`[AirNav] Fetch failed for ${normalized}:`, error);
    return [];
  }
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeAirNavFuel(icao: string): Promise<FuelPriceReport[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  const response = await fetch(`https://www.airnav.com/airport/${icao}`, {
    headers: {
      Accept: "text/html",
      "User-Agent": "SkyBrief/1.0 (Aviation Weather App)",
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    console.warn(`[AirNav] HTTP ${response.status} for ${icao}`);
    return [];
  }

  const html = await response.text();
  return parseFuelPrices(icao, html);
}

/**
 * Parse 100LL fuel prices from AirNav airport page HTML.
 *
 * Strategy:
 *  1. Locate the "FBO, Fuel Providers" section
 *  2. Split into FBO blocks (each FBO listing)
 *  3. Within each block, extract the FBO name and 100LL price(s)
 */
function parseFuelPrices(icao: string, html: string): FuelPriceReport[] {
  const reports: FuelPriceReport[] = [];

  // Find the fuel section — it starts after "FBO" heading
  const fboSectionMatch = html.match(
    /FBO[,\s]+Fuel\s+Providers[^<]*/i
  );
  if (!fboSectionMatch) {
    // Try alternative section markers
    const altMatch = html.match(/Fuel\s+Prices/i);
    if (!altMatch) {
      console.log(`[AirNav] No fuel section found for ${icao}`);
      return [];
    }
  }

  // Extract all FBO + price blocks.
  // AirNav lists each FBO with its fuel prices nearby. We look for
  // patterns of: some business name text … 100LL … $X.XX
  //
  // We use a multi-pass approach:
  // Pass 1: Find all dollar amounts near "100LL"
  // Pass 2: Attempt to associate with FBO names

  // Find all 100LL price occurrences with surrounding context
  const pricePattern = /100LL[\s\S]{0,300}?\$(\d{1,2}\.\d{2})/gi;
  const altPricePattern = /\$(\d{1,2}\.\d{2})[\s\S]{0,100}?100LL/gi;

  // Also try finding patterns where price comes in a table cell near 100LL
  const tablePricePattern =
    /100LL[\s\S]{0,500}?(?:SS|Self[- ]?[Ss]erv(?:ice|e)?)[\s\S]{0,100}?\$(\d{1,2}\.\d{2})/gi;
  const fsPricePattern =
    /100LL[\s\S]{0,500}?(?:FS|Full[- ]?[Ss]erv(?:ice|e)?)[\s\S]{0,100}?\$(\d{1,2}\.\d{2})/gi;

  // Collect all unique prices found
  const foundPrices: Array<{
    price: number;
    index: number;
    type: "ss" | "fs" | "unknown";
  }> = [];

  // Self-serve prices (preferred — usually cheaper)
  let match: RegExpExecArray | null;
  while ((match = tablePricePattern.exec(html)) !== null) {
    const price = parseFloat(match[1]);
    if (isReasonablePrice(price)) {
      foundPrices.push({ price, index: match.index, type: "ss" });
    }
  }

  // Full-serve prices
  while ((match = fsPricePattern.exec(html)) !== null) {
    const price = parseFloat(match[1]);
    if (isReasonablePrice(price)) {
      foundPrices.push({ price, index: match.index, type: "fs" });
    }
  }

  // Generic 100LL → $price pattern
  while ((match = pricePattern.exec(html)) !== null) {
    const price = parseFloat(match[1]);
    if (isReasonablePrice(price)) {
      // Avoid duplicates within 50 chars
      const isDuplicate = foundPrices.some(
        (p) => Math.abs(p.price - price) < 0.01 && Math.abs(p.index - match!.index) < 200
      );
      if (!isDuplicate) {
        foundPrices.push({ price, index: match.index, type: "unknown" });
      }
    }
  }

  // Reverse pattern: $price … 100LL
  while ((match = altPricePattern.exec(html)) !== null) {
    const price = parseFloat(match[1]);
    if (isReasonablePrice(price)) {
      const isDuplicate = foundPrices.some(
        (p) => Math.abs(p.price - price) < 0.01 && Math.abs(p.index - match!.index) < 200
      );
      if (!isDuplicate) {
        foundPrices.push({ price, index: match.index, type: "unknown" });
      }
    }
  }

  if (foundPrices.length === 0) {
    console.log(`[AirNav] No 100LL prices found for ${icao}`);
    return [];
  }

  // Extract FBO names — look for bold business names near each price
  // AirNav uses patterns like: <b>FBO Name</b> or <a ...>FBO Name</a>
  // near the fuel listings
  const fboPattern =
    /<(?:b|strong|a\b[^>]*)>([A-Z][A-Za-z0-9\s&'.,-]{2,50}(?:Aviation|FBO|Flight|Air|Fuel|Jet|Aero|Services?|Center|Support)?[A-Za-z0-9\s&'.,-]*?)<\/(?:b|strong|a)>/gi;

  const fboNames: Array<{ name: string; index: number }> = [];
  while ((match = fboPattern.exec(html)) !== null) {
    const name = match[1].trim();
    // Filter out navigation/header text
    if (
      name.length > 3 &&
      name.length < 60 &&
      !name.match(
        /^(Home|About|Contact|Search|Airport|Weather|Fuel|Login|Sign|Back|Click|Update|View|More|Select)/i
      )
    ) {
      fboNames.push({ name, index: match.index });
    }
  }

  // Associate prices with nearest FBO name
  for (const priceEntry of foundPrices) {
    // Find the closest preceding FBO name
    let bestFbo: string | null = null;
    let bestDistance = Infinity;

    for (const fbo of fboNames) {
      const distance = priceEntry.index - fbo.index;
      if (distance > 0 && distance < bestDistance && distance < 3000) {
        bestDistance = distance;
        bestFbo = fbo.name;
      }
    }

    // Avoid duplicate reports for same FBO + similar price
    const isDuplicate = reports.some(
      (r) =>
        r.fbo_name === bestFbo &&
        Math.abs(r.price_100ll - priceEntry.price) < 0.05
    );
    if (isDuplicate) continue;

    const suffix =
      priceEntry.type === "ss"
        ? " (Self-Serve)"
        : priceEntry.type === "fs"
          ? " (Full-Serve)"
          : "";

    reports.push({
      id: `airnav-${icao}-${reports.length}`,
      airport_id: icao,
      price_100ll: priceEntry.price,
      fbo_name: bestFbo ? `${bestFbo}${suffix}` : `${icao} FBO${suffix}`,
      reported_at: new Date(), // AirNav prices are regularly updated
      reported_by_uid: "airnav",
      upvotes: 0,
      flags: 0,
      verified_by_uids: [],
      flagged_by_uids: [],
    });
  }

  // If we found prices but couldn't associate FBOs well, simplify
  if (reports.length === 0 && foundPrices.length > 0) {
    // Fallback: just use the prices we found
    const seen = new Set<number>();
    for (const entry of foundPrices) {
      // Round to 2 decimals to dedupe
      const rounded = Math.round(entry.price * 100) / 100;
      if (seen.has(rounded)) continue;
      seen.add(rounded);

      const suffix =
        entry.type === "ss"
          ? " (Self-Serve)"
          : entry.type === "fs"
            ? " (Full-Serve)"
            : "";

      reports.push({
        id: `airnav-${icao}-${reports.length}`,
        airport_id: icao,
        price_100ll: rounded,
        fbo_name: `${icao} FBO${suffix}`,
        reported_at: new Date(),
        reported_by_uid: "airnav",
        upvotes: 0,
        flags: 0,
        verified_by_uids: [],
        flagged_by_uids: [],
      });
    }
  }

  // Sort by price ascending (cheapest first)
  reports.sort((a, b) => a.price_100ll - b.price_100ll);

  console.log(
    `[AirNav] Found ${reports.length} fuel price(s) for ${icao}:`,
    reports.map((r) => `$${r.price_100ll} @ ${r.fbo_name}`).join(", ")
  );

  return reports;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isReasonablePrice(price: number): boolean {
  return price >= 2.0 && price <= 15.0;
}

function serializeReport(r: FuelPriceReport): SerializedReport {
  return {
    ...r,
    reported_at: r.reported_at.toISOString(),
  };
}

function deserializeReport(r: SerializedReport): FuelPriceReport {
  return {
    ...r,
    reported_at: new Date(r.reported_at),
  };
}
