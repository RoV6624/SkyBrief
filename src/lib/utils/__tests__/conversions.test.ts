/**
 * Tests for aviation unit conversions
 *
 * Ensures accurate conversions for temperature, speed, distance, and pressure.
 */

import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  knotsToMph,
  knotsToKph,
  mphToKnots,
  kphToKnots,
  feetToMeters,
  metersToFeet,
  nauticalMilesToStatuteMiles,
  statuteMilesToNauticalMiles,
  nauticalMilesToKilometers,
  kilometersToNauticalMiles,
  inHgToHpa,
  hpaToInHg,
} from "../conversions";

describe("Temperature conversions", () => {
  it("should convert freezing point correctly", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(fahrenheitToCelsius(32)).toBe(0);
  });

  it("should convert boiling point correctly", () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  it("should convert negative temperatures", () => {
    expect(celsiusToFahrenheit(-40)).toBe(-40); // -40°C = -40°F
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });

  it("should round to nearest integer", () => {
    expect(celsiusToFahrenheit(25)).toBe(77); // 25°C = 77°F
    expect(fahrenheitToCelsius(75)).toBe(24); // 75°F ≈ 23.89°C → 24°C
  });
});

describe("Speed conversions", () => {
  it("should convert knots to mph", () => {
    expect(knotsToMph(100)).toBe(115); // 100 kts ≈ 115 mph
  });

  it("should convert knots to kph", () => {
    expect(knotsToKph(100)).toBe(185); // 100 kts ≈ 185 kph
  });

  it("should convert mph to knots", () => {
    const knots = mphToKnots(115);
    expect(knots).toBeGreaterThanOrEqual(99);
    expect(knots).toBeLessThanOrEqual(101);
  });

  it("should convert kph to knots", () => {
    const knots = kphToKnots(185);
    expect(knots).toBeGreaterThanOrEqual(99);
    expect(knots).toBeLessThanOrEqual(101);
  });

  it("should handle zero speed", () => {
    expect(knotsToMph(0)).toBe(0);
    expect(mphToKnots(0)).toBe(0);
  });
});

describe("Distance conversions", () => {
  it("should convert feet to meters", () => {
    expect(feetToMeters(1000)).toBe(305); // 1000 ft ≈ 305 m
  });

  it("should convert meters to feet", () => {
    expect(metersToFeet(305)).toBe(1001); // 305 m ≈ 1001 ft
  });

  it("should convert nautical miles to statute miles", () => {
    expect(nauticalMilesToStatuteMiles(100)).toBe(115); // 100 nm ≈ 115 sm
  });

  it("should convert statute miles to nautical miles", () => {
    const nm = statuteMilesToNauticalMiles(115);
    expect(nm).toBeGreaterThanOrEqual(99);
    expect(nm).toBeLessThanOrEqual(101);
  });

  it("should convert nautical miles to kilometers", () => {
    expect(nauticalMilesToKilometers(100)).toBe(185); // 100 nm ≈ 185 km
  });

  it("should convert kilometers to nautical miles", () => {
    const nm = kilometersToNauticalMiles(185);
    expect(nm).toBeGreaterThanOrEqual(99);
    expect(nm).toBeLessThanOrEqual(101);
  });

  it("should handle zero distance", () => {
    expect(feetToMeters(0)).toBe(0);
    expect(nauticalMilesToStatuteMiles(0)).toBe(0);
  });
});

describe("Pressure conversions", () => {
  it("should convert standard pressure", () => {
    // Standard pressure: 29.92 inHg = 1013.25 hPa
    const hpa = inHgToHpa(29.92);
    expect(hpa).toBeGreaterThanOrEqual(1012);
    expect(hpa).toBeLessThanOrEqual(1014);
  });

  it("should convert hPa to inHg", () => {
    const inHg = hpaToInHg(1013);
    expect(inHg).toBeGreaterThan(29.9);
    expect(inHg).toBeLessThan(30.0);
  });

  it("should handle low pressure", () => {
    const hpa = inHgToHpa(28.0);
    expect(hpa).toBeGreaterThan(940);
    expect(hpa).toBeLessThan(950);
  });

  it("should handle high pressure", () => {
    const hpa = inHgToHpa(31.0);
    expect(hpa).toBeGreaterThan(1040);
    expect(hpa).toBeLessThan(1055);
  });

  it("should maintain precision for inHg (2 decimal places)", () => {
    const inHg = hpaToInHg(1013);
    const str = inHg.toString();
    const decimalPlaces = str.split(".")[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});

describe("Round-trip conversions", () => {
  it("should have minimal rounding error for temperature", () => {
    const original = 20;
    const converted = fahrenheitToCelsius(celsiusToFahrenheit(original));
    expect(Math.abs(converted - original)).toBeLessThanOrEqual(1); // Within 1° due to rounding
  });

  it("should have minimal rounding error for speed", () => {
    const original = 150;
    const converted = mphToKnots(knotsToMph(original));
    expect(Math.abs(converted - original)).toBeLessThanOrEqual(2); // Within 2 kts due to rounding
  });

  it("should have minimal rounding error for distance", () => {
    const original = 1000;
    const converted = metersToFeet(feetToMeters(original));
    expect(Math.abs(converted - original)).toBeLessThanOrEqual(5); // Within 5 ft due to rounding
  });
});
