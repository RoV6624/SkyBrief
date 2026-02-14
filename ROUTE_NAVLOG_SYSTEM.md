# Route Creation & AI NavLog Generator - Technical Documentation

## Overview

SkyBrief's Route Planning system automatically generates GPS waypoints and complete navigation logs (NavLogs) between any two airports. The system uses intelligent algorithms to create optimal flight paths with accurate time, fuel, and wind correction calculations.

---

## 🎯 How It Works

### 1. User Input
Users enter:
- **Departure Airport** (e.g., KJFK)
- **Destination Airport** (e.g., KLAX)

### 2. Auto-Generate Route
Click "Auto Generate Route" button to trigger AI waypoint generation.

### 3. NavLog Calculation
System automatically calculates complete navigation log with:
- True course for each leg
- Wind corrections (WCA - Wind Correction Angle)
- True heading
- Ground speed
- Time enroute (per leg and total)
- Fuel burn (per leg and total)

---

## 🧠 AI Waypoint Generator

### File: `src/lib/route/waypoint-generator.ts`

### Core Algorithm: Great Circle Route

```typescript
generateWaypoints(departureICAO, destinationICAO, options)
```

**How it works:**

1. **Fetch Airport Data**
   - Looks up departure and destination in local database (3,684 airports)
   - Gets precise latitude/longitude coordinates

2. **Calculate Total Distance**
   - Uses Haversine formula for great circle distance
   - Returns distance in nautical miles

3. **Determine Waypoint Spacing**
   - Default: Max 50nm between waypoints
   - Calculates number of intermediate waypoints needed
   - Formula: `numSegments = Math.ceil(totalDistance / maxSegmentNm)`

4. **Generate Intermediate Waypoints**
   - Uses spherical interpolation along great circle
   - Each waypoint gets unique identifier (WPT01, WPT02, etc.)
   - Calculates precise lat/lon for each point

### Mathematical Functions

#### Great Circle Distance (Haversine Formula)
```typescript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

**Why Haversine?**
- Accounts for Earth's spherical shape
- Accurate for any distance
- Used worldwide in aviation navigation

#### Great Circle Interpolation
```typescript
function interpolateGreatCircle(lat1, lon1, lat2, lon2, fraction) {
  // Converts fraction (0.0 to 1.0) into a point along the great circle
  // fraction = 0.5 gives the exact midpoint
  // Uses spherical geometry with slerp (spherical linear interpolation)
}
```

**Why Not Just Linear Interpolation?**
- Earth is a sphere, not flat
- Linear interpolation creates longer routes
- Great circle is the shortest distance

### Routing Strategies

#### 1. Direct Route (Default)
- **Algorithm:** Great circle with evenly spaced waypoints
- **Use Case:** Most VFR flights
- **Advantages:** Shortest distance, fuel efficient

#### 2. Airways Route (Future)
- **Algorithm:** Follows published Victor airways
- **Use Case:** IFR flights, ATC preferred routes
- **Advantages:** ATC acceptance, charted routes

#### 3. Terrain Avoidance (Future)
- **Algorithm:** Great circle with higher waypoint density
- **Use Case:** Mountainous regions
- **Advantages:** Safety, obstacle clearance

#### 4. Weather Avoidance (Future)
- **Algorithm:** Routes around weather cells
- **Use Case:** Active weather
- **Advantages:** Safety, comfort

---

## 📊 NavLog Calculation Engine

### File: `src/lib/navlog/calculate.ts`

### Complete Calculation Flow

```
For Each Leg:
  1. Get Wind Data → 2. Calculate WCA → 3. Calculate Heading →
  4. Calculate Ground Speed → 5. Calculate Time → 6. Calculate Fuel
```

### 1. Wind Component Calculation

```typescript
function calculateWindComponents(trueCourse, windDirection, windSpeed) {
  const angle = ((windDirection - trueCourse) * Math.PI) / 180;
  return {
    headwind: windSpeed * Math.cos(angle),  // + = headwind, - = tailwind
    crosswind: windSpeed * Math.sin(angle), // + = right, - = left
  };
}
```

**Physics:**
- Decomposes wind vector into headwind and crosswind
- Uses trigonometry (dot product and cross product)
- Headwind directly affects ground speed
- Crosswind requires correction angle

### 2. Wind Correction Angle (WCA)

```typescript
function calculateWindCorrectionAngle(TAS, trueCourse, windDir, windSpeed) {
  const { crosswind } = calculateWindComponents(trueCourse, windDir, windSpeed);
  const sinValue = crosswind / TAS;
  const wca = (Math.asin(clampedSin) * 180) / Math.PI;
  return Math.round(wca);
}
```

**Purpose:**
- Compensates for crosswind
- Keeps aircraft on desired track
- Calculated using inverse sine (arcsin)

**Example:**
- True Course: 090° (due east)
- Wind: 360° at 20 kts (from north)
- TAS: 100 kts
- Crosswind: +20 kts (right crosswind)
- WCA: +12° (crab right)
- True Heading: 102°

### 3. Ground Speed Calculation

```typescript
function calculateGroundSpeed(TAS, trueCourse, windDir, windSpeed) {
  // Full E6B wind triangle using law of cosines
  const courseRad = (trueCourse * Math.PI) / 180;
  const windRad = (windDirection * Math.PI) / 180;

  const gs = Math.sqrt(
    TAS ** 2 +
    windSpeed ** 2 -
    2 * TAS * windSpeed * Math.cos(windRad - courseRad)
  );

  return Math.max(Math.round(gs), 30); // Min 30 kts sanity check
}
```

**Law of Cosines:**
- GS² = TAS² + WS² − 2·TAS·WS·cos(θ)
- θ = angle between course and wind direction
- Exact solution (not approximation)
- Same math as E6B flight computer

### 4. Time Enroute

```typescript
const timeEnroute = (distanceNm / groundSpeed) * 60; // Convert to minutes
```

**Formula:**
- Time = Distance / Speed
- Distance in nautical miles
- Ground speed in knots
- Result in minutes

### 5. Fuel Burn

```typescript
const fuelBurn = (timeEnroute / 60) * fuelBurnRate; // Gallons
```

**Formula:**
- Fuel = Time × Burn Rate
- Time in hours
- Burn rate in GPH (gallons per hour)
- Result in gallons

### 6. Wind Data Strategy

The system intelligently finds wind data for each leg:

```typescript
function getWindForLeg(leg, weatherPoints) {
  // Priority 1: Exact ICAO match on endpoints
  if (fromWP && toWP have valid wind) {
    return averageWind(fromWP, toWP);
  }

  // Priority 2: Use single endpoint if available
  if (fromWP has valid wind) return fromWP.wind;
  if (toWP has valid wind) return toWP.wind;

  // Priority 3: Nearest weather station to leg midpoint
  const midpoint = calculateMidpoint(leg);
  return findNearestStation(midpoint, weatherPoints);

  // Priority 4: Calm winds fallback
  return { windDirection: 0, windSpeed: 0 };
}
```

**Why This Approach?**
- Handles cases where departure/destination have no METAR
- Uses interpolation for better accuracy
- Always produces valid calculations
- Gracefully degrades to calm winds

---

## 🎨 User Interface

### Route Screen (`src/app/(tabs)/route.tsx`)

#### Waypoint Input
- Visual indicators (dots) show departure (green), waypoints (gray), destination (red)
- Auto-uppercase for ICAO codes
- Max 4 characters
- Supports up to 6 waypoints

#### Auto Generate Button
- Appears when user enters departure + destination
- Shows "Generating..." during calculation
- Haptic feedback on success/failure

#### NavLog Display
Shows for each leg:
- FROM → TO waypoints
- True Course (TC)
- Distance (NM)
- Wind (direction @ speed)
- True Airspeed (TAS)
- Wind Correction Angle (WCA)
- True Heading (TH)
- Ground Speed (GS)
- Time Enroute
- Fuel Burn

---

## 📐 Example Calculation

### Route: KJFK → KLAX

**Step 1: Waypoint Generation**
```
Input: KJFK (40.6413°N, 73.7781°W) → KLAX (33.9425°N, 118.4081°W)
Distance: 2,145 nm
Max Segment: 50 nm
Number of Waypoints: 43

Generated Route:
KJFK → WPT01 → WPT02 → ... → WPT41 → KLAX
```

**Step 2: NavLog Calculation (First Leg Example)**
```
Leg: KJFK → WPT01
Distance: 50 nm
True Course: 280°

Wind Data (from KJFK METAR):
  Direction: 360° (from north)
  Speed: 25 kts

Aircraft:
  TAS: 120 kts
  Fuel Burn: 8.5 GPH

Calculations:
  1. Wind Components:
     Headwind = 25 * cos(360° - 280°) = 25 * cos(80°) = +4.3 kts
     Crosswind = 25 * sin(80°) = +24.6 kts (right)

  2. WCA = arcsin(24.6 / 120) = arcsin(0.205) = +12°

  3. True Heading = 280° + 12° = 292°

  4. Ground Speed:
     GS = √(120² + 25² - 2·120·25·cos(80°))
     GS = √(14400 + 625 - 1043)
     GS = √13982 = 118 kts

  5. Time Enroute = (50 / 118) * 60 = 25 minutes

  6. Fuel Burn = (25 / 60) * 8.5 = 3.5 gallons
```

---

## 🔧 Technical Implementation Details

### Data Structures

#### GeneratedWaypoint
```typescript
interface GeneratedWaypoint {
  identifier: string;      // "KJFK", "WPT01"
  latitude_deg: number;    // Decimal degrees
  longitude_deg: number;   // Decimal degrees
  type: "gps" | "airport" | "vor" | "ndb" | "fix";
  name?: string;           // "John F Kennedy International"
}
```

#### NavLogLeg
```typescript
interface NavLogLeg {
  from: Waypoint;
  to: Waypoint;
  trueCourse: number;      // 0-359°
  distanceNm: number;
  windDirection: number;   // FROM, 0-359°
  windSpeed: number;       // knots
  trueAirspeed: number;    // knots
  windCorrectionAngle: number; // ±degrees
  trueHeading: number;     // 0-359°
  groundSpeed: number;     // knots
  timeEnroute: number;     // minutes
  fuelBurn: number;        // gallons
}
```

### Performance Optimizations

1. **Airport Database Caching**
   - Local JSON file (3,684 airports)
   - In-memory Map cache
   - Instant lookups

2. **Calculation Efficiency**
   - Pre-compute constants
   - Avoid repeated trig calculations
   - Batch wind data fetches

3. **UI Responsiveness**
   - Async/await for route generation
   - Loading states
   - Haptic feedback

---

## 🚀 Future Enhancements

### Planned Features

1. **Victor Airways Integration**
   - Database of published airways
   - Auto-route via airways
   - ATC-preferred routes

2. **Terrain Database**
   - SRTM elevation data
   - Automatic MEA (Minimum Enroute Altitude)
   - Visual terrain warnings

3. **Weather Radar Integration**
   - NEXRAD data
   - Route around cells
   - Real-time weather avoidance

4. **SID/STAR Procedures**
   - Departure procedures
   - Arrival procedures
   - Transition integration

5. **Export Formats**
   - Garmin flight plan (.fpl)
   - ForeFlight (.fms)
   - GPX tracks
   - KML for Google Earth

---

## 📚 References

### Aviation Formulas
- **E6B Flight Computer:** Wind triangle calculations
- **Great Circle Navigation:** Spherical trigonometry
- **FAA Handbook:** Navigation chapter

### Algorithms
- **Haversine Formula:** Great circle distance
- **Slerp:** Spherical linear interpolation
- **Law of Cosines:** Wind triangle solution

### Standards
- **ICAO Annex 4:** Aeronautical charts
- **FAA Order 7400.2:** Procedures for airways
- **ARINC 424:** Navigation database format

---

## 🎓 For Developers

### Adding New Routing Strategies

```typescript
// 1. Add to RouteGenerationOptions
export interface RouteGenerationOptions {
  strategy: "direct" | "airways" | "terrain" | "weather" | "YOUR_NEW_STRATEGY";
  // ...
}

// 2. Implement algorithm
function generateYourNewStrategy(
  departure: AirportData,
  destination: AirportData,
  options: RouteGenerationOptions
): GeneratedWaypoint[] {
  // Your algorithm here
  return waypoints;
}

// 3. Add to switch statement in generateWaypoints()
case "YOUR_NEW_STRATEGY":
  return generateYourNewStrategy(departure, destination, options);
```

### Testing Routes

```typescript
// Generate test route
const waypoints = await generateWaypoints("KJFK", "KLAX", {
  strategy: "direct",
  maxSegmentNm: 50,
});

console.log(`Generated ${waypoints.length} waypoints`);
waypoints.forEach(wp => {
  console.log(`${wp.identifier}: ${wp.latitude_deg}, ${wp.longitude_deg}`);
});
```

---

## ✅ Summary

SkyBrief's route system provides:
- ✈️ **Automatic waypoint generation** using great circle navigation
- 🧭 **Complete navigation logs** with accurate wind corrections
- ⏱️ **Precise time estimates** using E6B calculations
- ⛽ **Fuel burn predictions** for flight planning
- 🗺️ **3,684 airport database** for comprehensive coverage
- 🚀 **Instant calculations** with local processing

All calculations use real aviation mathematics and follow FAA/ICAO standards for navigation accuracy.
