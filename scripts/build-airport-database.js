const fs = require('fs');
const path = require('path');

const airportsCSV = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'airports_raw.csv'), 'utf-8');
const runwaysCSV = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'runways_raw.csv'), 'utf-8');

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim().replace(/"/g, ''));
    
    const row = {};
    headers.forEach((h, idx) => row[h] = fields[idx] || '');
    rows.push(row);
  }
  
  return rows;
}

const airports = parseCSV(airportsCSV);
const runways = parseCSV(runwaysCSV);

const database = {};

// Include ALL US airports: K-prefix (towered), 3-letter (private strips), and non-K 4-letter
const usAirports = airports.filter(a =>
  a.ident && a.iso_country === 'US' && a.ident.length >= 3 && a.ident.length <= 4
);

for (const apt of usAirports) {
  const icao = apt.ident;
  const aptRunways = runways.filter(r => r.airport_ident === icao);

  // Include airports even without runways (heliports, seaplane bases, etc.)
  // But prioritize those with runway data
  if (aptRunways.length > 0 || ['heliport', 'seaplane_base', 'small_airport'].includes(apt.type)) {
    // Collect all unique identifiers
    const aliases = [];
    const candidates = [
      apt.icao_code,
      apt.iata_code,
      apt.gps_code,
      apt.local_code
    ];

    // Add only identifiers that differ from primary
    for (const candidate of candidates) {
      if (candidate &&
          candidate.trim() !== '' &&
          candidate !== icao &&
          !aliases.includes(candidate)) {
        aliases.push(candidate);
      }
    }

    database[icao] = {
      icao,
      name: apt.name,
      type: apt.type,
      latitude_deg: parseFloat(apt.latitude_deg) || 0,
      longitude_deg: parseFloat(apt.longitude_deg) || 0,
      elevation_ft: parseFloat(apt.elevation_ft) || 0,
      municipality: apt.municipality || '',
      aliases,
      runways: aptRunways.map(r => {
        const leHeading = parseFloat(r.le_heading_degT);
        const heHeading = parseFloat(r.he_heading_degT);

        return {
          runway_id: r.le_ident + '/' + r.he_ident,
          le_ident: r.le_ident,
          he_ident: r.he_ident,
          le_heading_degT: !isNaN(leHeading) ? leHeading : parseInt(r.le_ident.replace(/[LCR]/g, '')) * 10,
          he_heading_degT: !isNaN(heHeading) ? heHeading : parseInt(r.he_ident.replace(/[LCR]/g, '')) * 10,
          length_ft: parseFloat(r.length_ft) || 0,
          width_ft: parseFloat(r.width_ft) || 0,
          surface: r.surface,
          lighted: r.lighted === '1',
        };
      }),
    };
  }
}

// Validate identifier uniqueness
const identifierMap = new Map();
let conflictCount = 0;
let aliasCount = 0;

for (const [primary, airport] of Object.entries(database)) {
  identifierMap.set(primary, primary);

  for (const alias of airport.aliases) {
    aliasCount++;
    if (identifierMap.has(alias)) {
      console.warn(`⚠️  Conflict: "${alias}" maps to both "${identifierMap.get(alias)}" and "${primary}"`);
      conflictCount++;
    } else {
      identifierMap.set(alias, primary);
    }
  }
}

const outputPath = path.join(__dirname, '..', 'src', 'data', 'airport-database.json');
fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

console.log('Airport database created with ' + Object.keys(database).length + ' airports');
console.log('Airports with aliases: ' + Object.values(database).filter(a => a.aliases.length > 0).length);
console.log('Total alias count: ' + aliasCount);
if (conflictCount > 0) {
  console.warn('⚠️  WARNING: ' + conflictCount + ' identifier conflicts detected!');
}
console.log('Output: ' + outputPath);
