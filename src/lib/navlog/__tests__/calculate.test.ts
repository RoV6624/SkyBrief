import {
  calculateGroundSpeed,
  calculateWindCorrectionAngle,
  calculateNavLog,
} from "../calculate";
import type { RouteLeg, RouteWeatherPoint } from "@/lib/route/types";

describe("calculateGroundSpeed", () => {
  it("returns TAS when wind is zero", () => {
    const gs = calculateGroundSpeed(120, 90, 0, 0);
    expect(gs).toBe(120);
  });

  it("reduces GS with pure headwind", () => {
    // Course 360, wind FROM 360 (headwind) at 20kts
    const gs = calculateGroundSpeed(120, 360, 360, 20);
    expect(gs).toBeLessThan(120);
    expect(gs).toBeCloseTo(100, 0);
  });

  it("increases GS with pure tailwind", () => {
    // Course 360, wind FROM 180 (tailwind) at 20kts
    const gs = calculateGroundSpeed(120, 360, 180, 20);
    expect(gs).toBeGreaterThan(120);
    expect(gs).toBeCloseTo(140, 0);
  });

  it("GS stays close to TAS with strong crosswind", () => {
    // Course 360, wind FROM 090 (pure crosswind) at 20kts
    const gs = calculateGroundSpeed(120, 360, 90, 20);
    // E6B wind triangle: GS = sqrt(TAS² + WS² - 2*TAS*WS*cos(angle))
    // With 90° crosswind, cos(90-0)=cos(90)=0, so GS = sqrt(120²+20²) ≈ 122
    expect(gs).toBeGreaterThan(100);
    expect(gs).toBeLessThan(130);
  });

  it("enforces minimum floor of 30kts", () => {
    // Massive headwind that would reduce GS below 30
    const gs = calculateGroundSpeed(50, 360, 360, 50);
    expect(gs).toBeGreaterThanOrEqual(30);
  });

  it("handles zero TAS gracefully", () => {
    const gs = calculateGroundSpeed(0, 90, 180, 10);
    expect(gs).toBeGreaterThanOrEqual(30); // Floor enforced
  });
});

describe("calculateWindCorrectionAngle", () => {
  it("returns 0 with zero wind", () => {
    const wca = calculateWindCorrectionAngle(120, 90, 0, 0);
    expect(wca).toBe(0);
  });

  it("returns 0 with pure headwind", () => {
    const wca = calculateWindCorrectionAngle(120, 360, 360, 20);
    expect(wca).toBe(0);
  });

  it("returns 0 with pure tailwind", () => {
    const wca = calculateWindCorrectionAngle(120, 360, 180, 20);
    expect(wca).toBe(0);
  });

  it("returns nonzero with crosswind", () => {
    const wca = calculateWindCorrectionAngle(120, 360, 90, 20);
    expect(wca).not.toBe(0);
  });

  it("returns 0 when TAS is zero (no division by zero)", () => {
    const wca = calculateWindCorrectionAngle(0, 90, 270, 30);
    expect(wca).toBe(0);
  });
});

describe("calculateNavLog", () => {
  const makeWaypoint = (icao: string, lat: number, lon: number) => ({
    icao,
    lat,
    lon,
    name: icao,
  });

  const mockLegs: RouteLeg[] = [
    {
      from: makeWaypoint("KABC", 35.0, -90.0),
      to: makeWaypoint("KDEF", 36.0, -89.0),
      distanceNm: 80,
      bearing: 45,
    },
    {
      from: makeWaypoint("KDEF", 36.0, -89.0),
      to: makeWaypoint("KGHI", 37.0, -88.0),
      distanceNm: 60,
      bearing: 30,
    },
  ];

  const mockWeather: RouteWeatherPoint[] = [
    {
      waypoint: makeWaypoint("KABC", 35.0, -90.0),
      distanceFromStart: 0,
      metar: {
        station: "KABC",
        stationName: "ABC Airport",
        observationTime: new Date(),
        isSpeci: false,
        temperature: { celsius: 20, fahrenheit: 68 },
        dewpoint: { celsius: 10, fahrenheit: 50 },
        tempDewpointSpread: 10,
        wind: { direction: 270, speed: 10, gust: null, isGusty: false },
        visibility: { sm: 10, isPlus: true },
        altimeter: 29.92,
        clouds: [],
        ceiling: null,
        flightCategory: "VFR",
        presentWeather: null,
        rawText: "KABC 201800Z 27010KT 10SM CLR",
        location: { lat: 35, lon: -90, elevation: 100 },
      },
      taf: null,
      flightCategory: "VFR",
      isInterpolated: false,
    },
  ];

  it("returns valid totals with mock legs and weather", () => {
    const result = calculateNavLog(mockLegs, mockWeather, 120, 8.4);

    expect(result.legs).toHaveLength(2);
    expect(result.totalDistance).toBe(140); // 80 + 60
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.totalFuel).toBeGreaterThan(0);
  });

  it("uses default TAS/fuel when given NaN inputs", () => {
    const result = calculateNavLog(mockLegs, mockWeather, NaN, NaN);

    expect(result.legs).toHaveLength(2);
    expect(result.totalTime).toBeGreaterThan(0);
    expect(result.totalFuel).toBeGreaterThan(0);
  });

  it("uses default TAS/fuel when given zero inputs", () => {
    const result = calculateNavLog(mockLegs, mockWeather, 0, 0);

    expect(result.legs).toHaveLength(2);
    expect(result.totalTime).toBeGreaterThan(0);
  });

  it("handles empty legs", () => {
    const result = calculateNavLog([], mockWeather, 120, 8.4);

    expect(result.legs).toHaveLength(0);
    expect(result.totalDistance).toBe(0);
    expect(result.totalTime).toBe(0);
    expect(result.totalFuel).toBe(0);
  });

  it("handles empty weather points (calm wind fallback)", () => {
    const result = calculateNavLog(mockLegs, [], 120, 8.4);

    expect(result.legs).toHaveLength(2);
    expect(result.totalDistance).toBe(140);
    // With zero wind, GS should equal TAS
    expect(result.legs[0].groundSpeed).toBe(120);
  });

  it("each leg has valid calculated fields", () => {
    const result = calculateNavLog(mockLegs, mockWeather, 120, 8.4);

    for (const leg of result.legs) {
      expect(leg.groundSpeed).toBeGreaterThanOrEqual(30);
      expect(leg.trueHeading).toBeGreaterThanOrEqual(0);
      expect(leg.trueHeading).toBeLessThan(360);
      expect(leg.timeEnroute).toBeGreaterThanOrEqual(0);
      expect(leg.fuelBurn).toBeGreaterThanOrEqual(0);
    }
  });
});
