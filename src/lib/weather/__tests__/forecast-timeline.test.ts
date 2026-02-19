import { generateForecastTimeline, analyzeWeatherTrends } from "../forecast-timeline";
import type { TafResponse, TafForecast, NormalizedMetar } from "@/lib/api/types";

function makeTaf(overrides: Partial<TafResponse> = {}): TafResponse {
  const now = Math.floor(Date.now() / 1000);
  return {
    icaoId: "KJFK",
    dbPopTime: "2026-02-18T12:00:00Z",
    bulletinTime: "2026-02-18T12:00:00Z",
    issueTime: "2026-02-18T12:00:00Z",
    validTimeFrom: now - 3600,
    validTimeTo: now + 24 * 3600,
    rawTAF: "TAF KJFK ...",
    mostRecent: 1,
    remarks: "",
    lat: 40.64,
    lon: -73.78,
    elev: 4,
    prior: 0,
    name: "John F Kennedy Intl",
    fcsts: [
      {
        timeFrom: now - 3600,
        timeTo: now + 8 * 3600,
        fcstChange: null,
        wdir: 270,
        wspd: 10,
        wgst: null,
        visib: "10",
        clouds: [{ cover: "FEW", base: 5000 }],
      },
    ],
    ...overrides,
  };
}

function makeMetar(overrides: Partial<NormalizedMetar> = {}): NormalizedMetar {
  return {
    station: "KJFK",
    stationName: "John F Kennedy Intl",
    rawText: "KJFK 181200Z 27010KT 10SM FEW050 20/10 A2992",
    flightCategory: "VFR",
    wind: { direction: 270, speed: 10, gust: null, isGusty: false },
    visibility: { sm: 10, isPlus: true },
    ceiling: null,
    clouds: [{ cover: "FEW", base: 5000 }],
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

describe("generateForecastTimeline", () => {
  it("generates 7 hourly points (0-6 hours)", () => {
    const timeline = generateForecastTimeline(makeTaf());
    expect(timeline.length).toBe(7);
  });

  it("each point has correct structure", () => {
    const timeline = generateForecastTimeline(makeTaf());
    for (const point of timeline) {
      expect(point.time).toBeInstanceOf(Date);
      expect(["VFR", "MVFR", "IFR", "LIFR"]).toContain(point.flightCategory);
      expect(point.wind).toHaveProperty("direction");
      expect(point.wind).toHaveProperty("speed");
      expect(Array.isArray(point.clouds)).toBe(true);
    }
  });

  it("computes VFR for good conditions", () => {
    const timeline = generateForecastTimeline(makeTaf());
    expect(timeline[0].flightCategory).toBe("VFR");
    expect(timeline[0].visibility).toBe(10);
  });

  it("computes IFR for low visibility", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 180,
          wspd: 5,
          wgst: null,
          visib: "2",
          clouds: [{ cover: "OVC", base: 800 }],
        },
      ],
    });
    const timeline = generateForecastTimeline(taf);
    expect(timeline[0].flightCategory).toBe("IFR");
    expect(timeline[0].ceiling).toBe(800);
  });

  it("computes LIFR for very low conditions", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 180,
          wspd: 5,
          wgst: null,
          visib: "0.5",
          clouds: [{ cover: "OVC", base: 200 }],
        },
      ],
    });
    const timeline = generateForecastTimeline(taf);
    expect(timeline[0].flightCategory).toBe("LIFR");
  });

  it("handles missing visibility as 10 SM", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 270,
          wspd: 10,
          wgst: null,
          visib: "" as any,
          clouds: [],
        },
      ],
    });
    const timeline = generateForecastTimeline(taf);
    expect(timeline[0].visibility).toBe(10);
  });

  it("returns empty when no forecasts available", () => {
    const taf = makeTaf({ fcsts: [] });
    const timeline = generateForecastTimeline(taf);
    expect(timeline.length).toBe(0);
  });

  it("correctly identifies ceiling from BKN", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 270,
          wspd: 10,
          wgst: null,
          visib: "6",
          clouds: [
            { cover: "SCT", base: 3000 },
            { cover: "BKN", base: 5000 },
          ],
        },
      ],
    });
    const timeline = generateForecastTimeline(taf);
    expect(timeline[0].ceiling).toBe(5000);
  });

  it("returns null ceiling for FEW/SCT only", () => {
    const timeline = generateForecastTimeline(makeTaf());
    expect(timeline[0].ceiling).toBeNull();
  });
});

describe("analyzeWeatherTrends", () => {
  it("returns empty for insufficient timeline", () => {
    const taf = makeTaf({ fcsts: [] });
    const trends = analyzeWeatherTrends(makeMetar(), taf);
    expect(trends.length).toBe(0);
  });

  it("detects stable conditions", () => {
    const trends = analyzeWeatherTrends(makeMetar(), makeTaf());
    const visTrend = trends.find((t) => t.metric === "Visibility");
    expect(visTrend?.direction).toBe("stable");
  });

  it("detects deteriorating ceiling (clear to cloudy)", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 270,
          wspd: 10,
          wgst: null,
          visib: "10",
          clouds: [{ cover: "BKN", base: 2000 }],
        },
      ],
    });

    const trends = analyzeWeatherTrends(makeMetar({ ceiling: null }), taf);
    const ceilingTrend = trends.find((t) => t.metric === "Ceiling");
    expect(ceilingTrend?.direction).toBe("deteriorating");
  });

  it("detects improving ceiling (cloudy to clear)", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 270,
          wspd: 10,
          wgst: null,
          visib: "10",
          clouds: [{ cover: "FEW", base: 10000 }],
        },
      ],
    });

    const trends = analyzeWeatherTrends(makeMetar({ ceiling: 3000 }), taf);
    const ceilingTrend = trends.find((t) => t.metric === "Ceiling");
    expect(ceilingTrend?.direction).toBe("improving");
  });

  it("detects wind increasing as deteriorating", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 270,
          wspd: 25,
          wgst: null,
          visib: "10",
          clouds: [],
        },
      ],
    });

    const trends = analyzeWeatherTrends(makeMetar({ wind: { direction: 270, speed: 10, gust: null, isGusty: false } }), taf);
    const windTrend = trends.find((t) => t.metric === "Wind");
    expect(windTrend?.direction).toBe("deteriorating");
  });

  it("detects flight category change", () => {
    const now = Math.floor(Date.now() / 1000);
    const taf = makeTaf({
      fcsts: [
        {
          timeFrom: now - 3600,
          timeTo: now + 8 * 3600,
          fcstChange: null,
          wdir: 270,
          wspd: 10,
          wgst: null,
          visib: "2",
          clouds: [{ cover: "OVC", base: 800 }],
        },
      ],
    });

    const trends = analyzeWeatherTrends(makeMetar(), taf);
    const catTrend = trends.find((t) => t.metric === "Flight Category");
    expect(catTrend).toBeDefined();
    expect(catTrend?.direction).toBe("deteriorating");
    expect(catTrend?.forecastValue).toBe("IFR");
  });
});
