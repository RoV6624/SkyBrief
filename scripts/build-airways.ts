/**
 * Build Airways Database from FAA CIFP (Coded Instrument Flight Procedures)
 *
 * This script documents the process of parsing the FAA's CIFP data in ARINC 424 format
 * to extract Victor airway (VOR airways) definitions and cross-reference them with our
 * navaid database to produce airways-database.json.
 *
 * === DATA SOURCE ===
 * FAA CIFP download: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/
 * The CIFP is published every 28 days and contains all coded instrument procedures
 * for the US National Airspace System in ARINC 424 format.
 *
 * Download the "CIFP" zip file. Inside you'll find a file named FAACIFP18 (or similar).
 * This is a fixed-width text file with records defined by ARINC 424 specification.
 *
 * === ARINC 424 FORMAT OVERVIEW ===
 * ARINC 424 is an industry standard for navigation database interchange.
 * Each record is a fixed 132-character line. The record type is determined by
 * the "Section Code" at column 5 (1-indexed) and "Subsection Code" at column 6.
 *
 * For enroute airways, we need:
 *   Section Code = 'E' (Enroute)
 *   Subsection Code = 'R' (Enroute Airways)
 *
 * === ER (ENROUTE AIRWAY) RECORD LAYOUT ===
 * Columns are 1-indexed per ARINC 424 spec:
 *
 * Col  1      : Record Type ('S' = Standard)
 * Col  2-4    : Customer/Area Code (e.g., 'USA')
 * Col  5      : Section Code ('E' for Enroute)
 * Col  6      : Subsection Code ('R' for Airways)
 * Col  7-11   : Route Identifier (e.g., 'V4   ', 'V23  ', 'J60  ')
 *               - 'V' prefix = Victor airway (VOR-based, below FL180)
 *               - 'J' prefix = Jet route (above FL180)
 *               - 'T' prefix = RNAV T-route
 *               - 'Q' prefix = RNAV Q-route
 * Col  14-17  : Sequence Number (ordering of fixes along the airway)
 * Col  18-21  : Fix Identifier (the navaid or waypoint ID, e.g., 'ATL ', 'BOS ')
 * Col  22-23  : Fix ICAO Region Code
 * Col  24     : Fix Section Code
 * Col  25     : Fix Subsection Code
 * Col  26     : Continuation Record Number
 * Col  27-29  : Waypoint Description Code
 * Col  30     : Boundary Code
 * Col  31     : Route Type ('V' = Victor, 'J' = Jet, etc.)
 * Col  32-33  : Level ('LO' = Low altitude, 'HI' = High altitude)
 * Col  34     : Direction Restriction ('F' = forward only, 'B' = backward only, blank = both)
 * Col  84-88  : Minimum Altitude (in hundreds of feet, e.g., '02000' = 2000 ft)
 * Col  89     : Minimum Altitude type (' ' = MSL, 'V' = at or above)
 * Col  90-94  : Maximum Altitude
 * Col  95-99  : Minimum Crossing Altitude
 * Col  101-104: Distance from previous fix (in tenths of NM)
 * Col  105-109: Outbound Magnetic Course (in tenths of degrees)
 * Col  110-114: Inbound Magnetic Course
 *
 * === EA (ENROUTE WAYPOINT) RECORD LAYOUT ===
 * These records define named intersection/fix coordinates (e.g., BOSCO, MERIT).
 * Section Code = 'E' (Enroute), Subsection Code = 'A' (Waypoints)
 *
 * Col  1      : Record Type ('S' = Standard)
 * Col  2-4    : Customer/Area Code
 * Col  5      : Section Code ('E')
 * Col  6      : Subsection Code ('A')
 * Col  7-11   : Waypoint Identifier (e.g., 'BOSCO')
 * Col  12-13  : ICAO Region Code
 * Col  33-41  : Latitude (ARINC 424 format: N/SddmmssHH)
 * Col  42-51  : Longitude (ARINC 424 format: E/WdddmmssHH)
 *
 * === USAGE ===
 * 1. Download CIFP from FAA website
 * 2. Extract the FAACIFP18 file
 * 3. Run: npx ts-node scripts/build-airways.ts path/to/FAACIFP18
 *
 * This will parse all Victor airways from the CIFP, cross-reference fixes with
 * the navaid database AND enroute waypoint records for coordinates, and output
 * src/data/airways-database.json.
 *
 * Note: This script serves primarily as documentation and a reference implementation.
 * The current airways-database.json was built using a combination of this parsing logic
 * and manual verification against FAA IFR Low Altitude Enroute Charts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Types ===

interface NavaidEntry {
  identifier: string;
  name: string;
  type: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft?: number;
  frequency_khz?: number;
  magnetic_variation?: number;
  associated_airport?: string;
}

interface AirwaySegment {
  airway_id: string;
  sequence: number;
  fix_identifier: string;
  latitude_deg: number;
  longitude_deg: number;
  minimum_altitude: number;
  maximum_altitude: number | null;
  direction: 'both' | 'forward' | 'backward';
}

interface Airway {
  id: string;
  type: 'VICTOR' | 'JET' | 'RNAV';
  description: string;
  segments: AirwaySegment[];
}

interface AirwaysDatabase {
  [airwayId: string]: Airway;
}

interface NavaidDatabase {
  [identifier: string]: NavaidEntry;
}

// === ARINC 424 Parser ===

/**
 * Parse a single ARINC 424 Enroute Airway (ER) record.
 *
 * Each record represents one fix along an airway. Records for the same
 * airway share the same Route Identifier and are ordered by Sequence Number.
 */
function parseEnrouteRecord(line: string) {
  // Validate minimum line length
  if (line.length < 132) return null;

  // Check section/subsection codes (0-indexed: index 4 = 'E', index 5 = 'R')
  const sectionCode = line[4];       // 'E' for Enroute
  const subsectionCode = line[5];    // 'R' for Airways

  if (sectionCode !== 'E' || subsectionCode !== 'R') return null;

  // Extract fields — actual FAA CIFP column positions (0-indexed)
  const routeIdentifier = line.substring(13, 18).trim();  // Route ID: index 13-17
  const sequenceNumber = parseInt(line.substring(25, 29).trim(), 10); // Seq: index 25-28
  const fixIdentifier = line.substring(29, 34).trim();    // Fix ID: index 29-33 (5 chars)
  const fixIcaoRegion = line.substring(34, 36).trim();    // ICAO region: index 34-35

  // Minimum Enroute Altitude (index 83-87, in feet)
  const meaStr = line.substring(83, 88).trim();
  const minimumAltitude = meaStr ? parseInt(meaStr, 10) : 0;

  // Maximum Altitude (index 93-97)
  const maxAltStr = line.substring(93, 98).trim();
  const maximumAltitude = maxAltStr ? parseInt(maxAltStr, 10) : null;

  // Distance from previous fix (various positions, not critical for database)
  const distanceNm: number | null = null;

  // Determine airway type from route identifier prefix
  let airwayType: 'VICTOR' | 'JET' | 'RNAV' = 'VICTOR';
  if (routeIdentifier.startsWith('J')) airwayType = 'JET';
  else if (routeIdentifier.startsWith('T') || routeIdentifier.startsWith('Q')) airwayType = 'RNAV';

  // Victor airways are bidirectional
  const direction: 'both' | 'forward' | 'backward' = 'both';

  return {
    routeIdentifier,
    sequenceNumber,
    fixIdentifier,
    fixIcaoRegion,
    airwayType,
    minimumAltitude,
    maximumAltitude,
    distanceNm,
    direction,
  };
}

/**
 * Parse ARINC 424 latitude string (cols 33-41 in EA records).
 * Format: N/SddmmssHH where dd=degrees, mm=minutes, ss=seconds, HH=hundredths of seconds
 * Example: "N38443200" → 38 + 44/60 + 32.00/3600
 */
function parseArinc424Lat(raw: string): number | null {
  const s = raw.trim();
  if (s.length < 9) return null;
  const hemisphere = s[0]; // 'N' or 'S'
  const deg = parseInt(s.substring(1, 3), 10);
  const min = parseInt(s.substring(3, 5), 10);
  const sec = parseInt(s.substring(5, 7), 10);
  const hundredths = parseInt(s.substring(7, 9), 10);
  if (isNaN(deg) || isNaN(min) || isNaN(sec)) return null;
  const decimal = deg + min / 60 + (sec + hundredths / 100) / 3600;
  return hemisphere === 'S' ? -decimal : decimal;
}

/**
 * Parse ARINC 424 longitude string (cols 42-51 in EA records).
 * Format: E/WdddmmssHH where ddd=degrees, mm=minutes, ss=seconds, HH=hundredths
 * Example: "W090123456" → -(90 + 12/60 + 34.56/3600)
 */
function parseArinc424Lon(raw: string): number | null {
  const s = raw.trim();
  if (s.length < 10) return null;
  const hemisphere = s[0]; // 'E' or 'W'
  const deg = parseInt(s.substring(1, 4), 10);
  const min = parseInt(s.substring(4, 6), 10);
  const sec = parseInt(s.substring(6, 8), 10);
  const hundredths = parseInt(s.substring(8, 10), 10);
  if (isNaN(deg) || isNaN(min) || isNaN(sec)) return null;
  const decimal = deg + min / 60 + (sec + hundredths / 100) / 3600;
  return hemisphere === 'W' ? -decimal : decimal;
}

/**
 * Parse a single ARINC 424 Enroute Waypoint (EA) record.
 * These define coordinates for named intersections/fixes used in airways.
 */
function parseEnrouteWaypointRecord(line: string): { identifier: string; latitude_deg: number; longitude_deg: number } | null {
  if (line.length < 51) return null;

  const sectionCode = line[4];       // 'E' for Enroute
  const subsectionCode = line[5];    // 'A' for Waypoints

  if (sectionCode !== 'E' || subsectionCode !== 'A') return null;

  // Continuation records (index 21) — skip continuations
  const continuation = line[21];
  if (continuation !== '0' && continuation !== '1' && continuation !== ' ') return null;

  // Waypoint identifier at index 13-17 (5 chars)
  const identifier = line.substring(13, 18).trim();
  if (!identifier) return null;

  // Latitude at index 32-40 (9 chars): N/SddmmssHH
  const latRaw = line.substring(32, 41);
  // Longitude at index 41-51 (10 chars): E/WdddmmssHH
  const lonRaw = line.substring(41, 51);

  const latitude_deg = parseArinc424Lat(latRaw);
  const longitude_deg = parseArinc424Lon(lonRaw);

  if (latitude_deg === null || longitude_deg === null) return null;

  return { identifier, latitude_deg, longitude_deg };
}

/**
 * Parse the entire CIFP file and extract all Victor airway definitions.
 *
 * The CIFP file contains many record types (airports, procedures, navaids, etc).
 * We filter for only ER records (Section='E', Subsection='R') and further
 * filter for Victor airways (route identifier starting with 'V').
 */
interface CifpParseResult {
  airwayRecords: Map<string, Array<ReturnType<typeof parseEnrouteRecord>>>;
  waypointCoords: Map<string, { latitude_deg: number; longitude_deg: number }>;
}

function parseCifpFile(filePath: string): CifpParseResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const airwayRecords = new Map<string, Array<ReturnType<typeof parseEnrouteRecord>>>();
  const waypointCoords = new Map<string, { latitude_deg: number; longitude_deg: number }>();

  // Single pass: collect both EA waypoints and ER airway records
  for (const line of lines) {
    // Try EA (Enroute Waypoint) record first
    const waypoint = parseEnrouteWaypointRecord(line);
    if (waypoint) {
      waypointCoords.set(waypoint.identifier, {
        latitude_deg: waypoint.latitude_deg,
        longitude_deg: waypoint.longitude_deg,
      });
      continue;
    }

    // Try ER (Enroute Airway) record
    const record = parseEnrouteRecord(line);
    if (!record) continue;

    // Only process Victor airways for low-altitude IFR routing
    if (!record.routeIdentifier.startsWith('V')) continue;

    if (!airwayRecords.has(record.routeIdentifier)) {
      airwayRecords.set(record.routeIdentifier, []);
    }
    airwayRecords.get(record.routeIdentifier)!.push(record);
  }

  // Sort each airway's records by sequence number
  for (const [, records] of airwayRecords) {
    records.sort((a, b) => (a?.sequenceNumber ?? 0) - (b?.sequenceNumber ?? 0));
  }

  console.log(`Parsed ${waypointCoords.size} enroute waypoint coordinates (EA records)`);

  return { airwayRecords, waypointCoords };
}

/**
 * Cross-reference parsed airway records with BOTH the navaid database AND
 * enroute waypoint coordinates (from CIFP EA records) to get coordinates.
 *
 * This combined lookup means every fix along an airway — VOR, NDB,
 * intersection, GPS fix — gets coordinates, producing complete airways.
 */
function buildAirwaysDatabase(
  airwayRecords: Map<string, Array<ReturnType<typeof parseEnrouteRecord>>>,
  navaidDb: NavaidDatabase,
  waypointCoords: Map<string, { latitude_deg: number; longitude_deg: number }>
): AirwaysDatabase {
  const airways: AirwaysDatabase = {};
  const missingFixes: string[] = [];
  let resolvedFromNavaids = 0;
  let resolvedFromWaypoints = 0;

  for (const [airwayId, records] of airwayRecords) {
    const segments: AirwaySegment[] = [];

    for (const record of records) {
      if (!record) continue;

      // Try navaid database first (VOR, VORTAC, NDB, etc.)
      const navaid = navaidDb[record.fixIdentifier];
      if (navaid) {
        resolvedFromNavaids++;
        segments.push({
          airway_id: airwayId,
          sequence: segments.length + 1,
          fix_identifier: record.fixIdentifier,
          latitude_deg: navaid.latitude_deg,
          longitude_deg: navaid.longitude_deg,
          minimum_altitude: record.minimumAltitude,
          maximum_altitude: record.maximumAltitude,
          direction: record.direction,
        });
        continue;
      }

      // Try enroute waypoint coordinates (named intersections from EA records)
      const wpCoords = waypointCoords.get(record.fixIdentifier);
      if (wpCoords) {
        resolvedFromWaypoints++;
        segments.push({
          airway_id: airwayId,
          sequence: segments.length + 1,
          fix_identifier: record.fixIdentifier,
          latitude_deg: wpCoords.latitude_deg,
          longitude_deg: wpCoords.longitude_deg,
          minimum_altitude: record.minimumAltitude,
          maximum_altitude: record.maximumAltitude,
          direction: record.direction,
        });
        continue;
      }

      // Fix not found in either database
      missingFixes.push(record.fixIdentifier);
    }

    if (segments.length >= 2) {
      // Generate a description from the first and last fixes
      const firstName = navaidDb[segments[0].fix_identifier]?.name ?? segments[0].fix_identifier;
      const lastName = navaidDb[segments[segments.length - 1].fix_identifier]?.name ?? segments[segments.length - 1].fix_identifier;
      const description = `${firstName} to ${lastName}`;

      airways[airwayId] = {
        id: airwayId,
        type: 'VICTOR',
        description,
        segments,
      };
    }
  }

  // Report statistics
  console.log('\n' + '='.repeat(60));
  console.log('Airways Database Build Summary');
  console.log('='.repeat(60));
  console.log(`Total Victor airways: ${Object.keys(airways).length}`);
  console.log(`Total segments: ${Object.values(airways).reduce((sum, a) => sum + a.segments.length, 0)}`);
  console.log(`  Resolved from navaids: ${resolvedFromNavaids}`);
  console.log(`  Resolved from EA waypoints: ${resolvedFromWaypoints}`);

  if (missingFixes.length > 0) {
    const unique = [...new Set(missingFixes)];
    console.log(`\nStill missing fixes (${unique.length} unique): ${unique.slice(0, 20).join(', ')}${unique.length > 20 ? '...' : ''}`);
  }

  return airways;
}

// === Main Entry Point ===

function main() {
  const cifpPath = process.argv[2];

  if (!cifpPath) {
    console.log('Usage: npx ts-node scripts/build-airways.ts <path-to-FAACIFP18>');
    console.log('');
    console.log('This script parses FAA CIFP (Coded Instrument Flight Procedures) data');
    console.log('in ARINC 424 format to extract Victor airway definitions.');
    console.log('');
    console.log('Download CIFP from:');
    console.log('  https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/');
    console.log('');
    console.log('The CIFP zip contains a FAACIFP18 file (fixed-width ARINC 424 records).');
    console.log('Extract it and provide the path as an argument.');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node scripts/build-airways.ts ~/Downloads/FAACIFP18');
    console.log('');
    console.log('ARINC 424 ER (Enroute) Record Format:');
    console.log('  Col 5-6:    Section/Subsection = "ER" (Enroute Airways)');
    console.log('  Col 7-11:   Route ID (e.g., "V4", "V23", "J60")');
    console.log('  Col 14-17:  Sequence Number');
    console.log('  Col 18-21:  Fix Identifier (navaid or waypoint)');
    console.log('  Col 31:     Route Type (V=Victor, J=Jet)');
    console.log('  Col 32-33:  Level (LO=Low, HI=High)');
    console.log('  Col 84-88:  Minimum Enroute Altitude (feet)');
    console.log('  Col 90-94:  Maximum Altitude');
    console.log('  Col 101-104: Distance (tenths NM)');
    process.exit(0);
  }

  // Load navaid database
  const navaidPath = path.join(__dirname, '..', 'src', 'data', 'navaid-database.json');
  console.log(`Loading navaid database from: ${navaidPath}`);
  const navaidDb: NavaidDatabase = JSON.parse(fs.readFileSync(navaidPath, 'utf-8'));
  console.log(`Loaded ${Object.keys(navaidDb).length} navaids`);

  // Parse CIFP file (collects both EA waypoint coords and ER airway records)
  console.log(`\nParsing CIFP file: ${cifpPath}`);
  const { airwayRecords, waypointCoords } = parseCifpFile(cifpPath);
  console.log(`Found ${airwayRecords.size} Victor airways in CIFP data`);

  // Build airways database with combined navaid + waypoint coordinate lookup
  const airways = buildAirwaysDatabase(airwayRecords, navaidDb, waypointCoords);

  // Write output
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'airways-database.json');
  fs.writeFileSync(outputPath, JSON.stringify(airways, null, 2));
  console.log(`\nOutput written to: ${outputPath}`);

  const stats = fs.statSync(outputPath);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
}

main();
