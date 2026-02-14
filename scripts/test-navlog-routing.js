/**
 * Comprehensive test script for navlog routing
 * Tests both VFR corridor routing and IFR airways routing
 *
 * Run: node scripts/test-navlog-routing.js
 */

const fs = require('fs');
const path = require('path');

// Load databases
const navaidDatabasePath = path.join(__dirname, '..', 'src', 'data', 'navaid-database.json');
const airwaysDatabasePath = path.join(__dirname, '..', 'src', 'data', 'airways-database.json');
const airportDatabasePath = path.join(__dirname, '..', 'src', 'data', 'airport-database.json');

if (!fs.existsSync(navaidDatabasePath)) {
  console.error('❌ Navaid database not found');
  process.exit(1);
}

if (!fs.existsSync(airwaysDatabasePath)) {
  console.error('❌ Airways database not found');
  process.exit(1);
}

if (!fs.existsSync(airportDatabasePath)) {
  console.error('❌ Airport database not found');
  process.exit(1);
}

const navaidDatabase = JSON.parse(fs.readFileSync(navaidDatabasePath, 'utf-8'));
const airwaysDatabase = JSON.parse(fs.readFileSync(airwaysDatabasePath, 'utf-8'));
const airportDatabase = JSON.parse(fs.readFileSync(airportDatabasePath, 'utf-8'));

console.log('✓ All databases loaded successfully\n');

// ──────────────────────────────────────────────────────────────────
// Helper Functions (replicate from services)
// ──────────────────────────────────────────────────────────────────

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function findNavaidsNear(lat, lon, radiusNm) {
  const results = [];
  for (const [id, navaid] of Object.entries(navaidDatabase)) {
    const distance = haversineDistance(lat, lon, navaid.latitude_deg, navaid.longitude_deg);
    if (distance <= radiusNm) {
      results.push({ id, navaid, distance });
    }
  }
  return results.sort((a, b) => a.distance - b.distance);
}

function findConnectingAirways(fromIdentifier, toIdentifier) {
  const results = [];
  const fromId = fromIdentifier.toUpperCase();
  const toId = toIdentifier.toUpperCase();

  for (const [airwayId, airway] of Object.entries(airwaysDatabase)) {
    const fromIndex = airway.segments.findIndex((s) => s.fix_identifier === fromId);
    const toIndex = airway.segments.findIndex((s) => s.fix_identifier === toId);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
      // Calculate distance
      let distance = 0;
      for (let i = fromIndex; i < toIndex; i++) {
        const seg1 = airway.segments[i];
        const seg2 = airway.segments[i + 1];
        distance += haversineDistance(
          seg1.latitude_deg,
          seg1.longitude_deg,
          seg2.latitude_deg,
          seg2.longitude_deg
        );
      }

      results.push({ airway, fromIndex, toIndex, distance });
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

// ──────────────────────────────────────────────────────────────────
// Test Cases
// ──────────────────────────────────────────────────────────────────

console.log('='.repeat(70));
console.log('TEST 1: Navaid Database Verification');
console.log('='.repeat(70));

const totalNavaids = Object.keys(navaidDatabase).length;
console.log(`Total navaids: ${totalNavaids}`);

// Type distribution
const typeCount = {};
for (const navaid of Object.values(navaidDatabase)) {
  typeCount[navaid.type] = (typeCount[navaid.type] || 0) + 1;
}

console.log('\nNavaid Type Distribution:');
for (const [type, count] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(12)} ${count}`);
}

// Test specific navaids used in airways
const testNavaids = ['ATL', 'STL', 'VUZ', 'INP', 'LAX', 'JFK', 'BOS'];
console.log('\nTesting Airways Waypoints:');
for (const id of testNavaids) {
  const navaid = navaidDatabase[id];
  if (navaid) {
    console.log(`  ✓ ${id.padEnd(6)} ${navaid.name.padEnd(25)} (${navaid.type})`);
  } else {
    console.log(`  ✗ ${id.padEnd(6)} NOT FOUND`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('TEST 2: Airways Database Verification');
console.log('='.repeat(70));

const totalAirways = Object.keys(airwaysDatabase).length;
console.log(`Total airways: ${totalAirways}\n`);

console.log('Airways Summary:');
for (const [id, airway] of Object.entries(airwaysDatabase)) {
  console.log(`  ${id.padEnd(6)} ${airway.description.padEnd(35)} (${airway.segments.length} waypoints)`);

  // Show waypoint sequence
  const waypoints = airway.segments.map(s => s.fix_identifier).join(' → ');
  console.log(`         ${waypoints}`);
}

console.log('\n' + '='.repeat(70));
console.log('TEST 3: VFR Corridor Routing (KJFK → KBOS)');
console.log('='.repeat(70));

const KJFK = airportDatabase['KJFK'];
const KBOS = airportDatabase['KBOS'];

if (KJFK && KBOS) {
  console.log(`Departure: ${KJFK.name} (${KJFK.icao})`);
  console.log(`           ${KJFK.latitude_deg.toFixed(4)}, ${KJFK.longitude_deg.toFixed(4)}`);
  console.log(`Destination: ${KBOS.name} (${KBOS.icao})`);
  console.log(`             ${KBOS.latitude_deg.toFixed(4)}, ${KBOS.longitude_deg.toFixed(4)}`);

  const distance = haversineDistance(
    KJFK.latitude_deg,
    KJFK.longitude_deg,
    KBOS.latitude_deg,
    KBOS.longitude_deg
  );
  console.log(`\nDistance: ${distance.toFixed(1)} nm`);

  // Generate synthetic waypoints (50nm segments)
  const numSegments = Math.ceil(distance / 50);
  console.log(`Segments: ${numSegments} (${(distance / numSegments).toFixed(1)}nm each)`);

  // Find navaids in 10nm corridor
  const corridorWidthNm = 10;
  console.log(`\nSearching for navaids within ${corridorWidthNm}nm corridor...`);

  // Midpoint search (simplified)
  const midLat = (KJFK.latitude_deg + KBOS.latitude_deg) / 2;
  const midLon = (KJFK.longitude_deg + KBOS.longitude_deg) / 2;

  const nearbyNavaids = findNavaidsNear(midLat, midLon, 20);

  console.log(`\nFound ${nearbyNavaids.length} navaids near route midpoint:`);
  nearbyNavaids.slice(0, 5).forEach(({ id, navaid, distance }) => {
    console.log(`  ${id.padEnd(6)} ${navaid.type.padEnd(10)} ${distance.toFixed(1).padStart(5)}nm - ${navaid.name}`);
  });

  if (nearbyNavaids.length > 0) {
    console.log('\n✓ VFR corridor routing would find real navaids');
  } else {
    console.log('\n⚠️  No navaids found - would use synthetic waypoints');
  }
} else {
  console.log('❌ Airport data not found');
}

console.log('\n' + '='.repeat(70));
console.log('TEST 4: IFR Airways Routing (ATL → STL)');
console.log('='.repeat(70));

const KATL = airportDatabase['KATL'];
const KSTL = airportDatabase['KSTL'];

if (KATL && KSTL) {
  console.log(`Departure: ${KATL.name} (${KATL.icao})`);
  console.log(`           ${KATL.latitude_deg.toFixed(4)}, ${KATL.longitude_deg.toFixed(4)}`);
  console.log(`Destination: ${KSTL.name} (${KSTL.icao})`);
  console.log(`             ${KSTL.latitude_deg.toFixed(4)}, ${KSTL.longitude_deg.toFixed(4)}`);

  const distance = haversineDistance(
    KATL.latitude_deg,
    KATL.longitude_deg,
    KSTL.latitude_deg,
    KSTL.longitude_deg
  );
  console.log(`\nDirect distance: ${distance.toFixed(1)} nm`);

  // Find nearby navaids
  const searchRadiusNm = 30;
  console.log(`\nSearching for navaids within ${searchRadiusNm}nm of airports...`);

  const departureNavaids = findNavaidsNear(KATL.latitude_deg, KATL.longitude_deg, searchRadiusNm);
  const destinationNavaids = findNavaidsNear(KSTL.latitude_deg, KSTL.longitude_deg, searchRadiusNm);

  console.log(`\nNear departure (${departureNavaids.length} found):`);
  departureNavaids.slice(0, 3).forEach(({ id, navaid, distance }) => {
    console.log(`  ${id.padEnd(6)} ${navaid.type.padEnd(10)} ${distance.toFixed(1).padStart(5)}nm - ${navaid.name}`);
  });

  console.log(`\nNear destination (${destinationNavaids.length} found):`);
  destinationNavaids.slice(0, 3).forEach(({ id, navaid, distance }) => {
    console.log(`  ${id.padEnd(6)} ${navaid.type.padEnd(10)} ${distance.toFixed(1).padStart(5)}nm - ${navaid.name}`);
  });

  // Try to find airway connections
  console.log('\nSearching for airway connections...');
  let foundConnection = false;

  for (const depNavaid of departureNavaids.slice(0, 5)) {
    for (const destNavaid of destinationNavaids.slice(0, 5)) {
      const connections = findConnectingAirways(depNavaid.id, destNavaid.id);

      if (connections.length > 0) {
        const conn = connections[0];
        console.log(`\n✓ Found airway: ${conn.airway.id}`);
        console.log(`  Route: ${depNavaid.id} → ${destNavaid.id}`);
        console.log(`  Airway distance: ${conn.distance.toFixed(1)} nm`);
        console.log(`  Waypoints:`);

        const segments = conn.airway.segments.slice(conn.fromIndex, conn.toIndex + 1);
        segments.forEach((seg, i) => {
          console.log(`    ${(i + 1).toString().padStart(2)}. ${seg.fix_identifier.padEnd(6)} MEA: ${seg.minimum_altitude || 'N/A'}ft`);
        });

        foundConnection = true;
        break;
      }
    }
    if (foundConnection) break;
  }

  if (!foundConnection) {
    console.log('\n⚠️  No direct airway connection found');
    console.log('   IFR routing would fall back to VFR corridor search');
  }
} else {
  console.log('❌ Airport data not found');
}

console.log('\n' + '='.repeat(70));
console.log('TEST 5: All Airways Connectivity');
console.log('='.repeat(70));

console.log('Testing all airways for valid waypoints:\n');

let totalSegments = 0;
let validSegments = 0;

for (const [id, airway] of Object.entries(airwaysDatabase)) {
  console.log(`${id}: ${airway.description}`);

  let airwayValid = true;
  for (const segment of airway.segments) {
    totalSegments++;
    const navaid = navaidDatabase[segment.fix_identifier];

    if (navaid) {
      validSegments++;
      console.log(`  ✓ ${segment.fix_identifier.padEnd(6)} ${navaid.type.padEnd(10)} ${navaid.name}`);
    } else {
      airwayValid = false;
      console.log(`  ✗ ${segment.fix_identifier.padEnd(6)} NOT FOUND IN NAVAID DATABASE`);
    }
  }

  console.log('');
}

console.log(`Summary: ${validSegments}/${totalSegments} waypoints valid (${((validSegments / totalSegments) * 100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(70));
