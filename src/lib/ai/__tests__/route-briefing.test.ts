import { generateLocalRouteBriefing } from "../route-briefing";
import type { RouteWeatherPoint, ArrivalForecast } from "@/lib/route/types";
import type { NavLogLeg } from "@/lib/navlog/types";
import type { NormalizedMetar, FlightCategory } from "@/lib/api/types";

const makeWaypoint = (icao: string, lat = 35, lon = -90) => ({
  icao,
  lat,
  lon,
  name: icao,
});

function makeNormalizedMetar(
  station: string,
  cat: FlightCategory,
  overrides: Partial<NormalizedMetar> = {}
): NormalizedMetar {
  return {
    station,
    stationName: `${station} Airport`,
    observationTime: new Date(),
    isSpeci: false,
    temperature: { celsius: 20, fahrenheit: 68 },
    dewpoint: { celsius: 10, fahrenheit: 50 },
    tempDewpointSpread: 10,
    wind: { direction: 270, speed: 8, gust: null, isGusty: false },
    visibility: { sm: 10, isPlus: true },
    altimeter: 29.92,
    clouds: [],
    ceiling: null,
    flightCategory: cat,
    presentWeather: null,
    rawText: `${station} 181200Z 27008KT 10SM CLR 20/10 A2992`,
    location: { lat: 35, lon: -90, elevation: 100 },
    ...overrides,
  };
}

function makeWeatherPoint(
  icao: string,
  cat: FlightCategory,
  metarOverrides: Partial<NormalizedMetar> = {}
): RouteWeatherPoint {
  return {
    waypoint: makeWaypoint(icao),
    distanceFromStart: 0,
    metar: makeNormalizedMetar(icao, cat, metarOverrides),
    taf: null,
    flightCategory: cat,
    isInterpolated: false,
  };
}

function makeLegs(from: string, to: string): NavLogLeg[] {
  return [
    {
      from: makeWaypoint(from),
      to: makeWaypoint(to),
      trueCourse: 90,
      distanceNm: 100,
      windDirection: 270,
      windSpeed: 10,
      trueAirspeed: 120,
      windCorrectionAngle: 0,
      trueHeading: 90,
      groundSpeed: 110,
      timeEnroute: 55,
      fuelBurn: 7.7,
    },
  ];
}

describe("generateLocalRouteBriefing", () => {
  it("returns FAVORABLE when all stations are VFR", () => {
    const weatherPoints = [
      makeWeatherPoint("KABC", "VFR"),
      makeWeatherPoint("KDEF", "VFR"),
    ];
    const legs = makeLegs("KABC", "KDEF");

    const result = generateLocalRouteBriefing(weatherPoints, legs, [null]);

    expect(result.recommendation).toBe("FAVORABLE");
    expect(result.summary).toContain("VFR");
    expect(result.legHazards).toHaveLength(0);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("returns CAUTION when mixed VFR/MVFR", () => {
    const weatherPoints = [
      makeWeatherPoint("KABC", "VFR"),
      makeWeatherPoint("KDEF", "MVFR"),
    ];
    const legs = makeLegs("KABC", "KDEF");

    const result = generateLocalRouteBriefing(weatherPoints, legs, [null]);

    expect(result.recommendation).toBe("CAUTION");
    expect(result.summary).toContain("Marginal VFR");
  });

  it("returns UNFAVORABLE when IFR conditions exist", () => {
    const weatherPoints = [
      makeWeatherPoint("KABC", "VFR"),
      makeWeatherPoint("KDEF", "IFR"),
    ];
    const legs = makeLegs("KABC", "KDEF");

    const result = generateLocalRouteBriefing(weatherPoints, legs, [null]);

    expect(result.recommendation).toBe("UNFAVORABLE");
    expect(result.summary).toContain("IFR");
  });

  it("returns UNFAVORABLE with thunderstorms at departure", () => {
    const weatherPoints = [
      makeWeatherPoint("KABC", "VFR", { presentWeather: "TS RA" }),
      makeWeatherPoint("KDEF", "VFR"),
    ];
    const legs = makeLegs("KABC", "KDEF");

    const result = generateLocalRouteBriefing(weatherPoints, legs, [null]);

    expect(result.recommendation).toBe("UNFAVORABLE");
    expect(result.summary).toContain("THUNDERSTORM");
    expect(result.legHazards.some((h) => h.includes("Thunderstorm"))).toBe(true);
  });

  it("flags strong gusts in leg hazards", () => {
    const weatherPoints = [
      makeWeatherPoint("KABC", "VFR", {
        wind: { direction: 270, speed: 20, gust: 35, isGusty: true },
      }),
      makeWeatherPoint("KDEF", "VFR"),
    ];
    const legs = makeLegs("KABC", "KDEF");

    const result = generateLocalRouteBriefing(weatherPoints, legs, [null]);

    expect(result.legHazards.some((h) => h.includes("gust"))).toBe(true);
  });

  it("handles empty weather points without crashing", () => {
    const legs = makeLegs("KABC", "KDEF");

    expect(() => {
      const result = generateLocalRouteBriefing([], legs, [null]);
      expect(result.recommendation).toBe("FAVORABLE");
    }).not.toThrow();
  });

  it("handles empty legs without crashing", () => {
    const weatherPoints = [makeWeatherPoint("KABC", "VFR")];

    expect(() => {
      const result = generateLocalRouteBriefing(weatherPoints, [], []);
      expect(result.recommendation).toBe("FAVORABLE");
    }).not.toThrow();
  });

  it("detects deteriorating conditions from arrival forecast", () => {
    const weatherPoints = [
      makeWeatherPoint("KABC", "VFR"),
      makeWeatherPoint("KDEF", "VFR"),
    ];
    const legs = makeLegs("KABC", "KDEF");
    const forecasts: (ArrivalForecast | null)[] = [
      {
        station: "KDEF",
        arrivalTime: Date.now() / 1000 + 3600,
        visibility: "2",
        wind: "27015G25KT",
        ceiling: 800,
        flightCategory: "IFR",
      },
    ];

    const result = generateLocalRouteBriefing(weatherPoints, legs, forecasts);

    expect(result.recommendation).toBe("UNFAVORABLE");
    expect(result.legHazards.some((h) => h.includes("deteriorate"))).toBe(true);
  });
});
