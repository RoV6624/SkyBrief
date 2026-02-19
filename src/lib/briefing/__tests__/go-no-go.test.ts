import { evaluateGoNoGo } from "../go-no-go";
import type { NormalizedMetar } from "@/lib/api/types";
import type { PersonalMinimums, MinimumsResult } from "@/lib/minimums/types";
import type { FRATResult } from "@/lib/frat/types";
import type { GoNoGoResult } from "../types";

function makeMetar(overrides: Partial<NormalizedMetar> = {}): NormalizedMetar {
  return {
    station: "KJFK",
    stationName: "John F Kennedy Intl",
    rawText: "KJFK 181200Z 27008KT 10SM CLR 20/10 A2992",
    flightCategory: "VFR",
    wind: { direction: 270, speed: 8, gust: null, isGusty: false },
    visibility: { sm: 10, isPlus: true },
    ceiling: null,
    clouds: [],
    temperature: { celsius: 20, fahrenheit: 68 },
    dewpoint: { celsius: 10, fahrenheit: 50 },
    tempDewpointSpread: 10,
    altimeter: 29.92,
    presentWeather: null,
    observationTime: new Date(),
    isSpeci: false,
    location: { lat: 40.64, lon: -73.78, elevation: 13 },
    ...overrides,
  };
}

const defaultMinimums: PersonalMinimums = {
  ceiling: 3000,
  visibility: 5,
  crosswind: 15,
  maxGust: 25,
  maxWind: 25,
};

const passingMinimumsResult: MinimumsResult = {
  breached: false,
  violations: [],
};

const failingMinimumsResult: MinimumsResult = {
  breached: true,
  violations: [
    { field: "ceiling", label: "Ceiling", current: 800, limit: 3000, unit: "ft" },
  ],
};

describe("evaluateGoNoGo", () => {
  it("returns GO verdict for clear VFR conditions", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.verdict).toBe("go");
    expect(result.summary).toContain("favorable");
    expect(result.factors.some((f) => f.id === "flight_category")).toBe(true);
    expect(result.factors.find((f) => f.id === "flight_category")?.severity).toBe("green");
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it("returns NOGO verdict for IFR flight category", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ flightCategory: "IFR" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.verdict).toBe("nogo");
    expect(result.factors.find((f) => f.id === "flight_category")?.severity).toBe("red");
  });

  it("returns NOGO verdict for LIFR flight category", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ flightCategory: "LIFR" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.verdict).toBe("nogo");
  });

  it("returns MARGINAL for MVFR conditions", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ flightCategory: "MVFR" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.verdict).toBe("marginal");
    expect(result.factors.find((f) => f.id === "flight_category")?.severity).toBe("amber");
  });

  it("returns NOGO when personal minimums are breached", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ flightCategory: "IFR", ceiling: 800 }),
      minimums: defaultMinimums,
      minimumsResult: failingMinimumsResult,
    });

    expect(result.verdict).toBe("nogo");
    expect(result.factors.some((f) => f.id === "minimums_ceiling")).toBe(true);
    expect(result.factors.find((f) => f.id === "minimums_ceiling")?.severity).toBe("red");
  });

  it("adds green minimums factor when all pass", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "minimums_pass")).toBe(true);
    expect(result.factors.find((f) => f.id === "minimums_pass")?.severity).toBe("green");
  });

  // Wind assessment
  it("flags high gust spread (>=15 kts) as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ wind: { direction: 270, speed: 10, gust: 30, isGusty: true } }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wind_gust_spread" && f.severity === "red")).toBe(true);
  });

  it("flags moderate gust spread (10-14 kts) as amber", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ wind: { direction: 270, speed: 10, gust: 22, isGusty: true } }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wind_gust_spread" && f.severity === "amber")).toBe(true);
  });

  it("does not flag low gust spread", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ wind: { direction: 270, speed: 10, gust: 15, isGusty: false } }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wind_gust_spread")).toBe(false);
  });

  // Visibility assessment
  it("flags low visibility (<3 SM) as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ visibility: { sm: 2, isPlus: false } }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "visibility_low" && f.severity === "red")).toBe(true);
  });

  it("flags marginal visibility (3-5 SM) as amber", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ visibility: { sm: 4, isPlus: false } }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "visibility_marginal" && f.severity === "amber")).toBe(true);
  });

  // Ceiling assessment
  it("flags low ceiling (<1000 ft) as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ ceiling: 500 }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "ceiling_low" && f.severity === "red")).toBe(true);
  });

  it("flags marginal ceiling (1000-2000 ft) as amber", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ ceiling: 1500 }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "ceiling_marginal" && f.severity === "amber")).toBe(true);
  });

  it("does not flag clear skies (null ceiling)", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ ceiling: null }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "ceiling_low")).toBe(false);
    expect(result.factors.some((f) => f.id === "ceiling_marginal")).toBe(false);
  });

  // Present weather
  it("flags thunderstorms as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ presentWeather: "+TSRA" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wx_thunderstorm" && f.severity === "red")).toBe(true);
  });

  it("flags freezing precipitation as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ presentWeather: "FZRA" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wx_freezing" && f.severity === "red")).toBe(true);
  });

  it("flags fog as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ presentWeather: "FG" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wx_fog" && f.severity === "red")).toBe(true);
  });

  it("flags snow/heavy rain as amber", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ presentWeather: "SN" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wx_precip" && f.severity === "amber")).toBe(true);
  });

  it("does not flag mist (BR) alone as fog", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ presentWeather: "BR" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.factors.some((f) => f.id === "wx_fog")).toBe(false);
  });

  // FRAT
  it("evaluates FRAT score correctly", () => {
    const fratResult: FRATResult = {
      totalScore: 35,
      riskLevel: "caution",
      weatherScore: 15,
      pilotScore: 20,
      recommendation: "Proceed with caution",
    };

    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
      fratResult,
    });

    const fratFactor = result.factors.find((f) => f.id === "frat_score");
    expect(fratFactor).toBeDefined();
    expect(fratFactor?.severity).toBe("amber");
  });

  it("flags high FRAT as red", () => {
    const fratResult: FRATResult = {
      totalScore: 55,
      riskLevel: "high",
      weatherScore: 20,
      pilotScore: 35,
      recommendation: "Flight not recommended",
    };

    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
      fratResult,
    });

    expect(result.factors.find((f) => f.id === "frat_score")?.severity).toBe("red");
  });

  // Daylight
  it("flags insufficient daylight (<30 min) as red", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
      daylightRemaining: 20,
    });

    expect(result.factors.some((f) => f.id === "daylight_critical" && f.severity === "red")).toBe(true);
  });

  it("flags limited daylight (30-60 min) as amber", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
      daylightRemaining: 45,
    });

    expect(result.factors.some((f) => f.id === "daylight_marginal" && f.severity === "amber")).toBe(true);
  });

  it("does not flag ample daylight", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
      daylightRemaining: 120,
    });

    expect(result.factors.some((f) => f.id.startsWith("daylight_"))).toBe(false);
  });

  // Alert conditions
  it("flags red alerts", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
      alerts: [
        { title: "Convective SIGMET", severity: "red" } as any,
      ],
    });

    expect(result.factors.some((f) => f.id === "alerts_red")).toBe(true);
  });

  // Summary text
  it("generates correct summary for nogo", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ flightCategory: "IFR" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.summary).toContain("not recommended");
    expect(result.summary).toContain("critical");
  });

  it("generates correct summary for marginal", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar({ flightCategory: "MVFR" }),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.summary).toContain("caution");
  });

  it("generates correct summary for go", () => {
    const result = evaluateGoNoGo({
      metar: makeMetar(),
      minimums: defaultMinimums,
      minimumsResult: passingMinimumsResult,
    });

    expect(result.summary).toContain("favorable");
  });
});
