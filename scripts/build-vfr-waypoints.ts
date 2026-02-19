/**
 * Build VFR Waypoints Database from FAA NASR (National Airspace System Resources)
 *
 * This script parses the FAA NASR 28-day subscription CSV data to extract
 * named fixes/waypoints used for VFR navigation and sectional chart checkpoints.
 *
 * === DATA SOURCE ===
 * FAA NASR download: https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/
 * Download the CSV format. Inside you'll find FIX_BASE.csv with all named fixes.
 *
 * === FIX_BASE.csv FORMAT ===
 * CSV with headers. Key columns:
 *   FIX_ID          - Fix identifier (e.g., "BOSCO", "MERIT", "VPNOR")
 *   FIX_STATE_CODE  - State code
 *   FIX_LATITUDE    - Latitude in various formats
 *   FIX_LONGITUDE   - Longitude in various formats
 *   FIX_USE         - Usage type (e.g., "RNAV", "VFR", "CNF")
 *   FIX_TYPE        - Type of fix
 *
 * VFR waypoints are identified by FIX_USE containing "VFR" or identifiers
 * starting with "VP" (VFR Point).
 *
 * === USAGE ===
 * 1. Download NASR CSV subscription from FAA website
 * 2. Extract FIX_BASE.csv
 * 3. Run: npx ts-node scripts/build-vfr-waypoints.ts path/to/FIX_BASE.csv
 *
 * This will parse all fixes (with VFR emphasis) and output
 * src/data/vfr-waypoints-database.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VfrWaypoint {
  identifier: string;
  name: string;
  type: 'FIX';
  latitude_deg: number;
  longitude_deg: number;
}

interface VfrWaypointsDatabase {
  [identifier: string]: VfrWaypoint;
}

/**
 * Parse latitude from NASR format.
 * Common formats:
 *   "40-11-23.4560N" (DMS)
 *   "40.189849" (decimal, less common in FIX_BASE)
 */
function parseNasrLatitude(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();

  // Try DMS format: dd-mm-ss.ssssH
  const dmsMatch = s.match(/^(\d{2,3})-(\d{2})-(\d{2}\.?\d*)([NS])$/);
  if (dmsMatch) {
    const deg = parseInt(dmsMatch[1], 10);
    const min = parseInt(dmsMatch[2], 10);
    const sec = parseFloat(dmsMatch[3]);
    const decimal = deg + min / 60 + sec / 3600;
    return dmsMatch[4] === 'S' ? -decimal : decimal;
  }

  // Try decimal format
  const num = parseFloat(s);
  if (!isNaN(num) && Math.abs(num) <= 90) return num;

  return null;
}

/**
 * Parse longitude from NASR format.
 * Common formats:
 *   "090-12-34.5670W" (DMS)
 *   "-90.209602" (decimal)
 */
function parseNasrLongitude(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();

  // Try DMS format: ddd-mm-ss.ssssH
  const dmsMatch = s.match(/^(\d{2,3})-(\d{2})-(\d{2}\.?\d*)([EW])$/);
  if (dmsMatch) {
    const deg = parseInt(dmsMatch[1], 10);
    const min = parseInt(dmsMatch[2], 10);
    const sec = parseFloat(dmsMatch[3]);
    const decimal = deg + min / 60 + sec / 3600;
    return dmsMatch[4] === 'W' ? -decimal : decimal;
  }

  // Try decimal format
  const num = parseFloat(s);
  if (!isNaN(num) && Math.abs(num) <= 180) return num;

  return null;
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.log('Usage: npx ts-node scripts/build-vfr-waypoints.ts <path-to-FIX_BASE.csv>');
    console.log('');
    console.log('This script parses FAA NASR FIX_BASE.csv to extract named fixes/waypoints.');
    console.log('');
    console.log('Download NASR CSV from:');
    console.log('  https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/');
    console.log('');
    console.log('Extract FIX_BASE.csv from the download and provide the path.');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node scripts/build-vfr-waypoints.ts ~/Downloads/FIX_BASE.csv');
    process.exit(0);
  }

  console.log(`Reading: ${csvPath}`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 2) {
    console.error('CSV file appears empty or has no data rows');
    process.exit(1);
  }

  // Parse header to find column indices
  const header = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  const colIdx = {
    fixId: header.findIndex(h => h.toUpperCase() === 'FIX_ID'),
    lat: header.findIndex(h => h.toUpperCase() === 'LAT_DECIMAL'),
    lon: header.findIndex(h => h.toUpperCase() === 'LONG_DECIMAL'),
    use: header.findIndex(h => h.toUpperCase() === 'FIX_USE_CODE'),
  };

  // Fallback: try broader matching if exact column names not found
  if (colIdx.lat === -1) colIdx.lat = header.findIndex(h => h.toUpperCase().includes('LAT'));
  if (colIdx.lon === -1) colIdx.lon = header.findIndex(h => h.toUpperCase().includes('LONG'));
  if (colIdx.fixId === -1) colIdx.fixId = header.findIndex(h => h.toUpperCase().includes('FIX_ID'));

  console.log(`Header columns found: ID=${colIdx.fixId}, Lat=${colIdx.lat}, Lon=${colIdx.lon}, Use=${colIdx.use}`);

  if (colIdx.fixId === -1 || colIdx.lat === -1 || colIdx.lon === -1) {
    console.error('Required columns not found in CSV header. Expected FIX_ID, LATITUDE, LONGITUDE columns.');
    console.error(`Header: ${header.join(', ')}`);
    process.exit(1);
  }

  const database: VfrWaypointsDatabase = {};
  let totalParsed = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line).map(f => f.replace(/^"|"$/g, ''));
    const identifier = fields[colIdx.fixId]?.trim().toUpperCase();
    if (!identifier || identifier.length < 2 || identifier.length > 5) {
      skipped++;
      continue;
    }

    const lat = parseNasrLatitude(fields[colIdx.lat]);
    const lon = parseNasrLongitude(fields[colIdx.lon]);

    if (lat === null || lon === null) {
      skipped++;
      continue;
    }

    // Filter to CONUS (rough bounds)
    if (lat < 24 || lat > 50 || lon < -130 || lon > -65) {
      continue;
    }

    totalParsed++;
    database[identifier] = {
      identifier,
      name: identifier, // Named fixes use their identifier as name
      type: 'FIX',
      latitude_deg: Math.round(lat * 1000000) / 1000000,
      longitude_deg: Math.round(lon * 1000000) / 1000000,
    };
  }

  // Write output
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'vfr-waypoints-database.json');
  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('VFR Waypoints Database Build Summary');
  console.log('='.repeat(60));
  console.log(`Total fixes parsed: ${totalParsed}`);
  console.log(`Skipped (invalid): ${skipped}`);
  console.log(`Output entries: ${Object.keys(database).length}`);
  console.log(`Output written to: ${outputPath}`);

  const stats = fs.statSync(outputPath);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
}

main();
