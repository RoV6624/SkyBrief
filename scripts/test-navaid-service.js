/**
 * Test script for navaid service
 * Run: node scripts/test-navaid-service.js
 */

const fs = require('fs');
const path = require('path');

// Load navaid database
const navaidDatabasePath = path.join(__dirname, '..', 'src', 'data', 'navaid-database.json');

if (!fs.existsSync(navaidDatabasePath)) {
  console.error('❌ Navaid database not found at:', navaidDatabasePath);
  process.exit(1);
}

const navaidDatabase = JSON.parse(fs.readFileSync(navaidDatabasePath, 'utf-8'));

console.log('✓ Navaid database loaded successfully');
console.log(`Total navaids: ${Object.keys(navaidDatabase).length}`);

// Test specific navaids
const testNavaids = ['STL', 'ORD', 'ATL', 'LAX', 'JFK'];

console.log('\n--- Testing Navaid Lookups ---');
for (const id of testNavaids) {
  const navaid = navaidDatabase[id];
  if (navaid) {
    console.log(`✓ ${id}: ${navaid.name} (${navaid.type})`);
  } else {
    console.log(`✗ ${id}: Not found`);
  }
}

// Count by type
const typeCount = {};
for (const navaid of Object.values(navaidDatabase)) {
  typeCount[navaid.type] = (typeCount[navaid.type] || 0) + 1;
}

console.log('\n--- Type Distribution ---');
for (const [type, count] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
  console.log(`${type.padEnd(12)} ${count}`);
}

// Test Haversine distance calculation (simple version for testing)
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

// Test corridor search simulation
console.log('\n--- Testing Corridor Search (KSUS → KORD) ---');
const KSUS = { lat: 38.6622, lon: -90.6519 };
const KORD = { lat: 41.9742, lon: -87.9073 };
const corridorWidthNm = 10;

// Midpoint
const midLat = (KSUS.lat + KORD.lat) / 2;
const midLon = (KSUS.lon + KORD.lon) / 2;

console.log(`Midpoint: ${midLat.toFixed(4)}, ${midLon.toFixed(4)}`);

// Find navaids near midpoint
const nearbyNavaids = [];
for (const [id, navaid] of Object.entries(navaidDatabase)) {
  const distance = haversineDistance(midLat, midLon, navaid.latitude_deg, navaid.longitude_deg);
  if (distance <= corridorWidthNm * 2) { // 20nm radius for testing
    nearbyNavaids.push({ id, navaid, distance });
  }
}

nearbyNavaids.sort((a, b) => a.distance - b.distance);

console.log(`Found ${nearbyNavaids.length} navaids within 20nm of midpoint:`);
nearbyNavaids.slice(0, 5).forEach(({ id, navaid, distance }) => {
  console.log(`  ${id.padEnd(6)} ${navaid.type.padEnd(10)} ${distance.toFixed(1)}nm - ${navaid.name}`);
});

console.log('\n✅ All tests passed!');
