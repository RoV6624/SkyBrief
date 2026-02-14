/**
 * Tests for wind component calculations
 *
 * Wind calculations are safety-critical for aviation, so comprehensive
 * testing is essential to ensure accuracy.
 */

import { calculateWindComponents } from "../wind-calculations";

describe("calculateWindComponents", () => {
  describe("Direct headwind scenarios", () => {
    it("should calculate pure headwind (wind from same direction as heading)", () => {
      // Wind from 360° (north) at 20 kts, heading 360° (north)
      const result = calculateWindComponents(360, 360, 20);
      expect(result.headwind).toBe(20);
      expect(result.crosswind).toBe(0);
    });

    it("should calculate pure headwind with different angles", () => {
      // Wind from 180° (south) at 15 kts, heading 180° (south)
      const result = calculateWindComponents(180, 180, 15);
      expect(result.headwind).toBe(15);
      expect(result.crosswind).toBe(0);
    });
  });

  describe("Direct crosswind scenarios", () => {
    it("should calculate pure right crosswind (wind from 90° right)", () => {
      // Wind from 270° (west) at 20 kts, heading 360° (north)
      const result = calculateWindComponents(360, 270, 20);
      expect(result.headwind).toBe(0);
      expect(result.crosswind).toBe(20);
    });

    it("should calculate pure left crosswind (wind from 90° left)", () => {
      // Wind from 90° (east) at 20 kts, heading 360° (north)
      const result = calculateWindComponents(360, 90, 20);
      expect(result.headwind).toBe(0);
      expect(result.crosswind).toBe(20);
    });
  });

  describe("Direct tailwind scenarios", () => {
    it("should calculate pure tailwind (wind from opposite direction)", () => {
      // Wind from 180° (south) at 10 kts, heading 360° (north)
      const result = calculateWindComponents(360, 180, 10);
      expect(result.headwind).toBe(-10); // Negative = tailwind
      expect(result.crosswind).toBe(0);
    });
  });

  describe("Mixed wind scenarios", () => {
    it("should calculate 45° quartering headwind", () => {
      // Wind from 315° at 20 kts, heading 360° (45° angle)
      const result = calculateWindComponents(360, 315, 20);

      // At 45°: headwind ≈ 14 kts, crosswind ≈ 14 kts
      expect(result.headwind).toBeGreaterThan(10);
      expect(result.headwind).toBeLessThan(18);
      expect(result.crosswind).toBeGreaterThan(10);
      expect(result.crosswind).toBeLessThan(18);
    });

    it("should calculate 30° crosswind component", () => {
      // Wind from 030° at 20 kts, heading 360°
      const result = calculateWindComponents(360, 30, 20);

      // At 30°: headwind ≈ 17 kts, crosswind ≈ 10 kts
      expect(result.headwind).toBeGreaterThan(15);
      expect(result.crosswind).toBeGreaterThan(8);
      expect(result.crosswind).toBeLessThan(12);
    });
  });

  describe("Runway examples (practical scenarios)", () => {
    it("should calculate for runway 27 with west wind", () => {
      // Runway 27 = 270° heading, wind from 270° at 15 kts
      const result = calculateWindComponents(270, 270, 15);
      expect(result.headwind).toBe(15);
      expect(result.crosswind).toBe(0);
    });

    it("should calculate for runway 09 with northwest wind", () => {
      // Runway 09 = 90° heading, wind from 315° at 12 kts
      const result = calculateWindComponents(90, 315, 12);

      // Wind from 315° to runway 09 creates tailwind and crosswind
      expect(result.headwind).toBeLessThan(0); // Tailwind (negative)
      expect(result.crosswind).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero wind speed", () => {
      const result = calculateWindComponents(360, 180, 0);
      expect(Math.abs(result.headwind)).toBe(0); // Handle -0 vs 0
      expect(result.crosswind).toBe(0);
    });

    it("should always return positive crosswind (absolute value)", () => {
      // Left crosswind
      const result1 = calculateWindComponents(360, 90, 20);
      expect(result1.crosswind).toBeGreaterThan(0);

      // Right crosswind
      const result2 = calculateWindComponents(360, 270, 20);
      expect(result2.crosswind).toBeGreaterThan(0);
    });

    it("should handle angle wraparound correctly", () => {
      // Wind from 010° at 10 kts, heading 350°
      const result = calculateWindComponents(350, 10, 10);

      // Should treat as 20° difference, not 340°
      expect(result.headwind).toBeGreaterThan(5);
      expect(result.crosswind).toBeLessThan(5);
    });
  });
});
