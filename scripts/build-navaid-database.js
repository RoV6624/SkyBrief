const fs = require('fs');
const path = require('path');
const https = require('https');

// Download navaids.csv from OurAirports if not already present
const navaidsCSVPath = path.join(__dirname, '..', 'src', 'data', 'navaids_raw.csv');
const NAVAIDS_URL = 'https://davidmegginson.github.io/ourairports-data/navaids.csv';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log('✓ Navaids CSV already downloaded');
      resolve();
      return;
    }

    console.log('Downloading navaids.csv from OurAirports...');
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✓ Download complete');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

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

function mapNavaidType(ourAirportsType) {
  // Map OurAirports types to our schema
  const type = ourAirportsType.toUpperCase();

  if (type.includes('VOR-DME') || type.includes('VORDME')) return 'VOR-DME';
  if (type.includes('VORTAC')) return 'VORTAC';
  if (type.includes('VOR')) return 'VOR';
  if (type.includes('NDB')) return 'NDB';
  if (type.includes('TACAN')) return 'VORTAC'; // TACAN similar to VORTAC
  if (type.includes('DME')) return 'VOR-DME'; // Standalone DME rare, group with VOR-DME

  // Default to GPS fix for unknowns
  return 'GPS';
}

async function buildNavaidDatabase() {
  // Download navaids.csv if needed
  await downloadFile(NAVAIDS_URL, navaidsCSVPath);

  // Read and parse navaids CSV
  console.log('Parsing navaids CSV...');
  const navaidsCSV = fs.readFileSync(navaidsCSVPath, 'utf-8');
  const navaids = parseCSV(navaidsCSV);

  const database = {};
  let skippedCount = 0;

  // Filter for US navaids with valid coordinates
  const usNavaids = navaids.filter(n => {
    const isUS = n.iso_country === 'US';
    const hasIdent = n.ident && n.ident.trim().length > 0;
    const hasCoords = n.latitude_deg && n.longitude_deg;

    if (!isUS || !hasIdent || !hasCoords) {
      if (isUS) skippedCount++;
      return false;
    }

    return true;
  });

  console.log(`Processing ${usNavaids.length} US navaids...`);

  for (const nav of usNavaids) {
    const identifier = nav.ident.toUpperCase();

    // Parse numeric fields
    const lat = parseFloat(nav.latitude_deg);
    const lon = parseFloat(nav.longitude_deg);
    const elevation = parseFloat(nav.elevation_ft);
    const frequency = parseFloat(nav.frequency_khz);
    const magVar = parseFloat(nav.magnetic_variation_deg);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      skippedCount++;
      continue;
    }

    // Build navaid entry
    const navaidEntry = {
      identifier,
      name: nav.name || identifier,
      type: mapNavaidType(nav.type),
      latitude_deg: lat,
      longitude_deg: lon,
    };

    // Add optional fields
    if (!isNaN(elevation) && elevation > 0) {
      navaidEntry.elevation_ft = Math.round(elevation);
    }

    if (!isNaN(frequency) && frequency > 0) {
      navaidEntry.frequency_khz = Math.round(frequency);
    }

    if (!isNaN(magVar)) {
      navaidEntry.magnetic_variation = Math.round(magVar * 10) / 10; // 1 decimal place
    }

    if (nav.usage_type && nav.usage_type.trim()) {
      navaidEntry.usage_type = nav.usage_type.toUpperCase();
    }

    if (nav.associated_airport && nav.associated_airport.trim()) {
      navaidEntry.associated_airport = nav.associated_airport.toUpperCase();
    }

    // Handle identifier conflicts - suffix with type if duplicate
    if (database[identifier]) {
      // Existing navaid found - keep the more important one (VOR > NDB > GPS)
      const existingType = database[identifier].type;
      const newType = navaidEntry.type;

      const typePriority = { 'VORTAC': 5, 'VOR-DME': 4, 'VOR': 3, 'NDB': 2, 'GPS': 1, 'FIX': 1 };
      const existingPriority = typePriority[existingType] || 0;
      const newPriority = typePriority[newType] || 0;

      if (newPriority > existingPriority) {
        // Replace with higher priority navaid
        console.log(`  Replacing ${identifier} (${existingType} → ${newType})`);
        database[identifier] = navaidEntry;
      } else {
        // Keep existing, skip this one
        console.log(`  Keeping ${identifier} (${existingType}, skipping ${newType})`);
      }
    } else {
      database[identifier] = navaidEntry;
    }
  }

  // Type distribution statistics
  const typeStats = {};
  for (const navaid of Object.values(database)) {
    typeStats[navaid.type] = (typeStats[navaid.type] || 0) + 1;
  }

  // Output database
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'navaid-database.json');
  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✓ Navaid database created successfully');
  console.log('='.repeat(60));
  console.log(`Total navaids: ${Object.keys(database).length}`);
  console.log(`Skipped (invalid/missing data): ${skippedCount}`);
  console.log('\nType distribution:');
  for (const [type, count] of Object.entries(typeStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(10)} ${count}`);
  }
  console.log('\nOutput: ' + outputPath);

  // File size
  const stats = fs.statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`File size: ${sizeKB} KB (${sizeMB} MB)`);
}

// Run the build
buildNavaidDatabase().catch(err => {
  console.error('Error building navaid database:', err);
  process.exit(1);
});
