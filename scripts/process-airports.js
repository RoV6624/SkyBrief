const fs = require('fs');
const path = require('path');

// Read the raw CSV file
const csvPath = path.join(__dirname, '..', 'src', 'data', 'airports_raw.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV manually
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

// Find indices for required fields
const identIdx = headers.indexOf('ident');
const typeIdx = headers.indexOf('type');
const nameIdx = headers.indexOf('name');
const latIdx = headers.indexOf('latitude_deg');
const lonIdx = headers.indexOf('longitude_deg');
const isoCountryIdx = headers.indexOf('iso_country');
const isoRegionIdx = headers.indexOf('iso_region');
const municipalityIdx = headers.indexOf('municipality');

const airports = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  // Simple CSV parsing (handles quoted fields)
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  const ident = fields[identIdx];
  const type = fields[typeIdx];
  const name = fields[nameIdx];
  const lat = parseFloat(fields[latIdx]);
  const lon = parseFloat(fields[lonIdx]);
  const isoCountry = fields[isoCountryIdx];
  const isoRegion = fields[isoRegionIdx];
  const municipality = fields[municipalityIdx];

  // Filter: US airports only, must have K-prefix ICAO code, valid coordinates
  if (
    isoCountry === 'US' &&
    ident.startsWith('K') &&
    ident.length === 4 &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    (type === 'small_airport' || type === 'medium_airport' || type === 'large_airport')
  ) {
    // Extract state from iso_region (format: US-NY -> NY)
    const state = isoRegion ? isoRegion.split('-')[1] : '';

    airports.push({
      icao: ident,
      lat: lat,
      lon: lon,
      name: name || '',
      city: municipality || '',
      state: state || ''
    });
  }
}

// Sort by ICAO code
airports.sort((a, b) => a.icao.localeCompare(b.icao));

// Write JSON output
const outputPath = path.join(__dirname, '..', 'src', 'data', 'airport-database.json');
fs.writeFileSync(outputPath, JSON.stringify(airports, null, 2));

console.log(`Processed ${airports.length} US airports with K-prefix ICAO codes`);
console.log(`Output written to: ${outputPath}`);
console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

// Show first few airports as sample
console.log('\nSample airports:');
airports.slice(0, 5).forEach(apt => {
  console.log(`  ${apt.icao} - ${apt.name}, ${apt.city}, ${apt.state}`);
});
