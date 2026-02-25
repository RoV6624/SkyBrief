/**
 * Tests for pivotal altitude calculations
 *
 * Pivotal altitude is critical for ground reference maneuvers,
 * so these calculations must be accurate.
 */

import {
  calculatePivotalAltitude,
  calculateGroundSpeedForPivotal,
  calculatePivotalAltitudeFromIAS,
  getAircraftAirspeedRange,
  generateAirspeedArray,
} from "../pivotal-altitude";

describe("calculatePivotalAltitude", () => {
  it("should calculate pivotal altitude for 60 kts ground speed", () => {
    // PA = GS² / 11.3 = 3600 / 11.3 ≈ 319 ft
    const pa = calculatePivotalAltitude(60);
    expect(pa).toBeGreaterThanOrEqual(318);
    expect(pa).toBeLessThanOrEqual(320);
  });

  it("should calculate pivotal altitude for 80 kts ground speed", () => {
    // PA = GS² / 11.3 = 6400 / 11.3 ≈ 566 ft
    const pa = calculatePivotalAltitude(80);
    expect(pa).toBeGreaterThanOrEqual(565);
    expect(pa).toBeLessThanOrEqual(567);
  });

  it("should calculate pivotal altitude for 100 kts ground speed", () => {
    // PA = GS² / 11.3 = 10000 / 11.3 ≈ 885 ft
    const pa = calculatePivotalAltitude(100);
    expect(pa).toBeGreaterThanOrEqual(884);
    expect(pa).toBeLessThanOrEqual(886);
  });

  it("should calculate pivotal altitude for 120 kts ground speed", () => {
    // PA = GS² / 11.3 = 14400 / 11.3 ≈ 1274 ft
    const pa = calculatePivotalAltitude(120);
    expect(pa).toBeGreaterThanOrEqual(1273);
    expect(pa).toBeLessThanOrEqual(1275);
  });

  it("should clamp zero ground speed to minimum safe value", () => {
    const pa = calculatePivotalAltitude(0);
    // Minimum ground speed clamped to 10 kts for safety: 10² / 11.3 ≈ 9
    expect(pa).toBe(Math.round((10 * 10) / 11.3));
  });

  it("should return integer values (rounded)", () => {
    const pa = calculatePivotalAltitude(75);
    expect(Number.isInteger(pa)).toBe(true);
  });
});

describe("calculateGroundSpeedForPivotal", () => {
  it("should return IAS when wind is calm", () => {
    const gs = calculateGroundSpeedForPivotal(100, 360, 0);
    expect(gs).toBe(100);
  });

  it("should return IAS for variable wind", () => {
    const gs = calculateGroundSpeedForPivotal(100, "VRB", 10);
    expect(gs).toBe(100);
  });

  it("should add headwind to IAS", () => {
    // 100 kts IAS, wind from north (360) at 10 kts, heading north (0)
    const gs = calculateGroundSpeedForPivotal(100, 360, 10, 0);
    expect(gs).toBeGreaterThan(100); // Should have tailwind component
  });

  it("should subtract tailwind from IAS", () => {
    // 100 kts IAS, wind from south (180) at 10 kts, heading north (0)
    const gs = calculateGroundSpeedForPivotal(100, 180, 10, 0);
    expect(gs).toBeLessThan(100); // Should have headwind component
  });

  it("should enforce minimum ground speed of 10 kts", () => {
    // Extreme headwind scenario
    const gs = calculateGroundSpeedForPivotal(20, 180, 50, 0);
    expect(gs).toBeGreaterThanOrEqual(10);
  });

  it("should return rounded values", () => {
    const gs = calculateGroundSpeedForPivotal(95, 340, 8, 0);
    expect(Number.isInteger(gs)).toBe(true);
  });
});

describe("calculatePivotalAltitudeFromIAS", () => {
  it("should calculate PA from IAS with no wind", () => {
    const pa = calculatePivotalAltitudeFromIAS(80, 360, 0);
    // IAS = GS when no wind, so PA = 80² / 11.3 ≈ 566 ft
    expect(pa).toBeGreaterThanOrEqual(565);
    expect(pa).toBeLessThanOrEqual(567);
  });

  it("should calculate PA from IAS with headwind", () => {
    // 80 kts IAS, wind from south (180) at 10 kts, heading north (0)
    // GS ≈ 70 kts, PA ≈ 433 ft
    const pa = calculatePivotalAltitudeFromIAS(80, 180, 10, 0);
    expect(pa).toBeLessThan(566); // Should be less than no-wind scenario
  });

  it("should calculate PA from IAS with tailwind", () => {
    // 80 kts IAS, wind from north (360) at 10 kts, heading north (0)
    // GS ≈ 90 kts, PA ≈ 716 ft
    const pa = calculatePivotalAltitudeFromIAS(80, 360, 10, 0);
    expect(pa).toBeGreaterThan(566); // Should be greater than no-wind scenario
  });

  it("should handle variable wind (use IAS as GS)", () => {
    const pa = calculatePivotalAltitudeFromIAS(80, "VRB", 10);
    // Should use IAS directly
    expect(pa).toBeGreaterThanOrEqual(565);
    expect(pa).toBeLessThanOrEqual(567);
  });
});

describe("getAircraftAirspeedRange", () => {
  it("should return C172S range", () => {
    const range = getAircraftAirspeedRange("c172s");
    expect(range.min).toBe(85);
    expect(range.max).toBe(110);
    expect(range.step).toBe(5);
  });

  it("should return PA-28 range", () => {
    const range = getAircraftAirspeedRange("pa28");
    expect(range.min).toBe(85);
    expect(range.max).toBe(120);
    expect(range.step).toBe(5);
  });

  it("should return default range for unknown aircraft", () => {
    const range = getAircraftAirspeedRange("unknown");
    expect(range.min).toBe(85);
    expect(range.max).toBe(110);
    expect(range.step).toBe(5);
  });

  it("should have valid ranges (min < max)", () => {
    const range = getAircraftAirspeedRange("c172s");
    expect(range.min).toBeLessThan(range.max);
  });

  it("should have positive step value", () => {
    const range = getAircraftAirspeedRange("c172s");
    expect(range.step).toBeGreaterThan(0);
  });
});

describe("generateAirspeedArray", () => {
  it("should generate array with correct values", () => {
    const speeds = generateAirspeedArray(70, 110, 10);
    expect(speeds).toEqual([70, 80, 90, 100, 110]);
  });

  it("should include both endpoints", () => {
    const speeds = generateAirspeedArray(80, 100, 10);
    expect(speeds[0]).toBe(80);
    expect(speeds[speeds.length - 1]).toBe(100);
  });

  it("should handle step of 5", () => {
    const speeds = generateAirspeedArray(70, 90, 5);
    expect(speeds).toEqual([70, 75, 80, 85, 90]);
  });

  it("should handle single value range", () => {
    const speeds = generateAirspeedArray(100, 100, 10);
    expect(speeds).toEqual([100]);
  });

  it("should have correct number of elements", () => {
    const speeds = generateAirspeedArray(70, 110, 10);
    const expectedCount = Math.floor((110 - 70) / 10) + 1;
    expect(speeds.length).toBe(expectedCount);
  });

  it("should generate values in ascending order", () => {
    const speeds = generateAirspeedArray(60, 100, 10);
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
    }
  });
});

describe("Practical scenarios", () => {
  it("should calculate for typical C172 pattern work (80 kts)", () => {
    // Pattern speed with 10 kt headwind
    const pa = calculatePivotalAltitudeFromIAS(80, 180, 10, 0);
    expect(pa).toBeGreaterThan(400);
    expect(pa).toBeLessThan(600);
  });

  it("should calculate for C172 cruise (100 kts)", () => {
    // Cruise speed with 15 kt tailwind
    const pa = calculatePivotalAltitudeFromIAS(100, 360, 15, 0);
    expect(pa).toBeGreaterThan(800);
    expect(pa).toBeLessThan(1200);
  });

  it("should show pivotal altitude increases with ground speed", () => {
    const pa60 = calculatePivotalAltitude(60);
    const pa80 = calculatePivotalAltitude(80);
    const pa100 = calculatePivotalAltitude(100);

    expect(pa80).toBeGreaterThan(pa60);
    expect(pa100).toBeGreaterThan(pa80);
  });

  it("should show wind effect on pivotal altitude", () => {
    const paNoWind = calculatePivotalAltitudeFromIAS(80, 360, 0);
    const paHeadwind = calculatePivotalAltitudeFromIAS(80, 180, 20, 0);
    const paTailwind = calculatePivotalAltitudeFromIAS(80, 360, 20, 0);

    expect(paHeadwind).toBeLessThan(paNoWind); // Lower PA with headwind
    expect(paTailwind).toBeGreaterThan(paNoWind); // Higher PA with tailwind
  });
});
