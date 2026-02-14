# Civil Twilight Visualizer - Testing Quick Start Guide

## Overview

Comprehensive test suite for the Civil Twilight Visualizer feature has been implemented with 60+ test cases covering:
- Sun position calculations
- Night VFR logic
- Component rendering
- FAA regulatory compliance

---

## Running Tests

### 1. Run All Tests

```bash
npm test
```

**Expected output:**
```
PASS  src/lib/solar/__tests__/sun-position.test.ts
PASS  src/lib/minimums/__tests__/night-vfr.test.ts
PASS  src/components/weather/__tests__/DaylightTimeline.test.tsx

Test Suites: 3 passed, 3 total
Tests:       60+ passed, 60+ total
Time:        ~5-10s
```

### 2. Run Tests with Coverage Report

```bash
npm test:coverage
```

This will generate a coverage report showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

**Coverage targets:** >90% for critical modules (`src/lib/solar/` and `src/lib/minimums/night-vfr.ts`)

### 3. Run Tests in Watch Mode (Development)

```bash
npm test:watch
```

Tests will automatically re-run when you modify source files.

---

## What's Being Tested?

### Critical Test 1: Currency Night = Sunset + Exactly 60 Minutes
**Why it matters:** FAA 14 CFR 61.57(b) requires night landings for passenger currency

**What we test:**
- Currency night is EXACTLY 60 minutes (3,600,000ms) after sunset
- This offset is constant across all seasons and locations
- KJFK and KMIA both maintain exact 60-minute offset

**Test files:** `src/lib/minimums/__tests__/night-vfr.test.ts`

### Critical Test 2: Logbook Night = Civil Twilight End
**Why it matters:** FAA 14 CFR 61.51(b) defines when to log night time

**What we test:**
- Logbook night equals civil twilight end (sun 6° below horizon)
- Civil twilight always occurs after sunset
- Formatted time strings match

**Test files:** `src/lib/minimums/__tests__/night-vfr.test.ts`

### Critical Test 3: Twilight Duration Varies by Latitude
**Why it matters:** Solar calculations must be accurate for all US locations

**What we test:**
- NYC (40.6°N): 24-28 minute twilight
- Miami (25.8°N): 21-24 minute twilight
- Higher latitudes = longer twilight
- Seasonal variation (summer > winter)

**Test files:** `src/lib/minimums/__tests__/night-vfr.test.ts`, `src/lib/solar/__tests__/sun-position.test.ts`

### Solar Position Accuracy
**What we test:**
- Sunrise always before sunset
- Civil twilight correctly positioned
- Seasonal variations (solstices)
- Edge cases (polar regions, equator, southern hemisphere)
- Accuracy within ±5 minutes of NOAA calculator

**Test files:** `src/lib/solar/__tests__/sun-position.test.ts`

### Component Rendering
**What we test:**
- DaylightTimeline renders without errors
- All UI elements present (header, legend, time chips)
- Proper time formatting (HHmmZ)
- Props handling
- Accessibility

**Test files:** `src/components/weather/__tests__/DaylightTimeline.test.tsx`

---

## Troubleshooting

### Issue: Tests won't run

**Solution:**
```bash
# Ensure dependencies are installed
npm install

# Try clearing Jest cache
npx jest --clearCache

# Run tests again
npm test
```

### Issue: Coverage below 90%

**Check:**
1. Are all test files in `__tests__` directories?
2. Run `npm test:coverage` to see detailed coverage report
3. Review uncovered lines in the coverage report

### Issue: Component tests failing

**Common causes:**
- Theme provider not mocked correctly
- Missing module mocks in `jest.setup.js`
- React Native version mismatch

**Solution:**
```bash
# Verify mocks in jest.setup.js
# Ensure react-test-renderer version matches react version
```

---

## Test Files Structure

```
src/
├── lib/
│   ├── solar/
│   │   ├── sun-position.ts               (Source code)
│   │   └── __tests__/
│   │       └── sun-position.test.ts      (25+ tests)
│   └── minimums/
│       ├── night-vfr.ts                  (Source code)
│       └── __tests__/
│           └── night-vfr.test.ts         (20+ tests)
└── components/
    └── weather/
        ├── DaylightTimeline.tsx          (Source code)
        └── __tests__/
            └── DaylightTimeline.test.tsx (15+ tests)
```

---

## Next Steps

### 1. Run Tests
```bash
npm test
```

### 2. Review Coverage
```bash
npm test:coverage
```

### 3. Manual Visual Testing
- Run app: `npm run ios`
- Navigate to screen with DaylightTimeline
- Verify visual appearance matches design
- Test with different dates and locations

### 4. NOAA Verification (Optional)
- Visit: https://gml.noaa.gov/grad/solcalc/
- Enter KJFK coordinates: 40.6413°N, 73.7781°W
- Date: March 15, 2024
- Compare sunrise/sunset times with app (should be within ±5 minutes)

---

## Additional Resources

- **Full Test Report:** `TEST_VERIFICATION_REPORT.md`
- **Jest Config:** `jest.config.js`
- **Jest Setup:** `jest.setup.js`
- **NOAA Solar Calculator:** https://gml.noaa.gov/grad/solcalc/

---

## Success Criteria

✅ All tests pass (60+ tests)
✅ Coverage >90% for critical modules
✅ No console errors during test runs
✅ Component renders correctly in simulator
✅ Times match NOAA calculator within ±5 minutes

---

**Questions?** Review the detailed `TEST_VERIFICATION_REPORT.md` for comprehensive documentation.
