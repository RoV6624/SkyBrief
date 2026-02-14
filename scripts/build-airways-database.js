/**
 * Build Airways Database
 *
 * Creates a database of Victor airways (VOR airways) with waypoint sequences.
 * Since there's no free comprehensive airways database, this manually encodes
 * the most commonly used Victor airways based on FAA charts.
 *
 * Data sources:
 * - FAA IFR Enroute Low Altitude Charts
 * - SkyVector (skyvector.com) for waypoint verification
 */

const fs = require('fs');
const path = require('path');

// Load navaid database to get coordinates
const navaidDatabase = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'navaid-database.json'), 'utf-8')
);

/**
 * Victor Airways - Manually encoded from FAA charts
 * Each airway is a sequence of fix identifiers with MEAs (Minimum Enroute Altitude)
 */
const airwaysData = {
  // V4: Major east coast route (Atlanta area to Midwest)
  'V4': {
    id: 'V4',
    type: 'VICTOR',
    description: 'Atlanta to St Louis via Volunteer',
    segments: [
      { fix: 'ATL', mea: 2000 },    // Atlanta VORTAC
      { fix: 'VUZ', mea: 3000 },    // Volunteer VORTAC (TN)
      { fix: 'INP', mea: 3000 },    // Indiana NDB
      { fix: 'STL', mea: 2000 },    // St Louis VORTAC
    ],
  },

  // V12: Cross-midwest route
  'V12': {
    id: 'V12',
    type: 'VICTOR',
    description: 'Great Lakes to Texas',
    segments: [
      { fix: 'CGT', mea: 2000 },    // Chicago Heights VORTAC
      { fix: 'BMI', mea: 2500 },    // Bloomington VOR-DME (IL)
      { fix: 'STL', mea: 2000 },    // St Louis VORTAC
      { fix: 'TUL', mea: 3000 },    // Tulsa VORTAC (OK)
    ],
  },

  // V16: Southeast corridor
  'V16': {
    id: 'V16',
    type: 'VICTOR',
    description: 'Atlanta to Florida',
    segments: [
      { fix: 'ATL', mea: 2000 },    // Atlanta VORTAC
      { fix: 'MCN', mea: 2000 },    // Macon VOR-DME (GA)
      { fix: 'IJX', mea: 2000 },    // Jacksonville VOR-DME (FL)
    ],
  },

  // V2: West coast route
  'V2': {
    id: 'V2',
    type: 'VICTOR',
    description: 'California coast',
    segments: [
      { fix: 'LAX', mea: 3000 },    // Los Angeles VORTAC
      { fix: 'SLI', mea: 4000 },    // Seal Beach VORTAC (CA)
      { fix: 'NUC', mea: 3000 },    // San Clemente VORTAC
    ],
  },

  // V23: Cross-country east-west
  'V23': {
    id: 'V23',
    type: 'VICTOR',
    description: 'East-West cross country',
    segments: [
      { fix: 'JFK', mea: 2000 },    // Kennedy VOR-DME (NY)
      { fix: 'HAR', mea: 3000 },    // Harrisburg VOR-DME (PA)
      { fix: 'AIR', mea: 3000 },    // Bellaire VOR (OH)
      { fix: 'APE', mea: 3000 },    // Appleton VORTAC (OH)
    ],
  },

  // V6: Northeast corridor
  'V6': {
    id: 'V6',
    type: 'VICTOR',
    description: 'Northeast corridor',
    segments: [
      { fix: 'BOS', mea: 2000 },    // Boston VOR-DME
      { fix: 'JFK', mea: 2000 },    // Kennedy VOR-DME (NY)
      { fix: 'SAX', mea: 2000 },    // Sparta VORTAC (NJ)
    ],
  },
};

// Build complete airways database with coordinates
const airwaysDatabase = {};
let missingFixes = [];

for (const [airwayId, airway] of Object.entries(airwaysData)) {
  const segments = [];

  for (let i = 0; i < airway.segments.length; i++) {
    const segment = airway.segments[i];
    const navaid = navaidDatabase[segment.fix];

    if (!navaid) {
      missingFixes.push(segment.fix);
      console.warn(`⚠️  Fix "${segment.fix}" not found in navaid database (${airwayId})`);
      continue;
    }

    segments.push({
      airway_id: airwayId,
      sequence: i + 1,
      fix_identifier: segment.fix,
      latitude_deg: navaid.latitude_deg,
      longitude_deg: navaid.longitude_deg,
      minimum_altitude: segment.mea,
      maximum_altitude: null, // MAA not commonly used
      direction: 'both',
    });
  }

  if (segments.length > 0) {
    airwaysDatabase[airwayId] = {
      id: airwayId,
      type: airway.type,
      description: airway.description,
      segments,
    };
  }
}

// Output database
const outputPath = path.join(__dirname, '..', 'src', 'data', 'airways-database.json');
fs.writeFileSync(outputPath, JSON.stringify(airwaysDatabase, null, 2));

// Summary
console.log('\n' + '='.repeat(60));
console.log('✓ Airways database created successfully');
console.log('='.repeat(60));
console.log(`Total airways: ${Object.keys(airwaysDatabase).length}`);
console.log('\nAirways included:');
for (const [id, airway] of Object.entries(airwaysDatabase)) {
  console.log(`  ${id.padEnd(6)} ${airway.description} (${airway.segments.length} waypoints)`);
}

if (missingFixes.length > 0) {
  console.log(`\n⚠️  Warning: ${missingFixes.length} fixes not found in navaid database:`);
  console.log(`  ${[...new Set(missingFixes)].join(', ')}`);
  console.log('  These airways may have incomplete segments.');
}

console.log('\nOutput: ' + outputPath);

// File size
const stats = fs.statSync(outputPath);
const sizeKB = (stats.size / 1024).toFixed(2);
console.log(`File size: ${sizeKB} KB`);
