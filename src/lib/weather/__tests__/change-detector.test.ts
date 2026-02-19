import { detectWeatherChanges } from "../change-detector";
import type { NormalizedMetar } from "@/lib/api/types";

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
  } as NormalizedMetar;
}

describe("detectWeatherChanges", () => {
  describe("no changes", () => {
    it("returns empty array when METARs are identical", () => {
      const snapshot = makeMetar();
      const current = makeMetar();
      expect(detectWeatherChanges(snapshot, current)).toEqual([]);
    });
  });

  describe("flight category changes", () => {
    it("detects VFR to IFR as red", () => {
      const snapshot = makeMetar({ flightCategory: "VFR" });
      const current = makeMetar({ flightCategory: "IFR" });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.length).toBeGreaterThanOrEqual(1);
      const cat = changes.find((c) => c.type === "category");
      expect(cat).toBeDefined();
      expect(cat?.severity).toBe("red");
      expect(cat?.description).toContain("degraded");
    });

    it("detects VFR to MVFR as amber", () => {
      const snapshot = makeMetar({ flightCategory: "VFR" });
      const current = makeMetar({ flightCategory: "MVFR" });
      const changes = detectWeatherChanges(snapshot, current);
      const cat = changes.find((c) => c.type === "category");
      expect(cat?.severity).toBe("amber");
    });

    it("detects improvement from IFR to VFR as amber", () => {
      const snapshot = makeMetar({ flightCategory: "IFR" });
      const current = makeMetar({ flightCategory: "VFR" });
      const changes = detectWeatherChanges(snapshot, current);
      const cat = changes.find((c) => c.type === "category");
      expect(cat?.severity).toBe("amber");
      expect(cat?.description).toContain("improved");
    });
  });

  describe("wind changes", () => {
    it("flags wind increase >15 kts as red", () => {
      const snapshot = makeMetar({ wind: { direction: 270, speed: 10, gust: null, isGusty: false } });
      const current = makeMetar({ wind: { direction: 270, speed: 28, gust: null, isGusty: false } });
      const changes = detectWeatherChanges(snapshot, current);
      const w = changes.find((c) => c.type === "wind");
      expect(w).toBeDefined();
      expect(w?.severity).toBe("red");
    });

    it("flags wind increase 6-15 kts as amber", () => {
      const snapshot = makeMetar({ wind: { direction: 270, speed: 10, gust: null, isGusty: false } });
      const current = makeMetar({ wind: { direction: 270, speed: 18, gust: null, isGusty: false } });
      const changes = detectWeatherChanges(snapshot, current);
      const w = changes.find((c) => c.type === "wind");
      expect(w?.severity).toBe("amber");
    });

    it("does not flag small wind changes (<6 kts)", () => {
      const snapshot = makeMetar({ wind: { direction: 270, speed: 10, gust: null, isGusty: false } });
      const current = makeMetar({ wind: { direction: 270, speed: 14, gust: null, isGusty: false } });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.some((c) => c.type === "wind")).toBe(false);
    });
  });

  describe("gust changes", () => {
    it("flags new gust onset as alert", () => {
      const snapshot = makeMetar({ wind: { direction: 270, speed: 10, gust: null, isGusty: false } });
      const current = makeMetar({ wind: { direction: 270, speed: 10, gust: 25, isGusty: true } });
      const changes = detectWeatherChanges(snapshot, current);
      const g = changes.find((c) => c.type === "gust");
      expect(g).toBeDefined();
      expect(g?.severity).toBe("red");
    });

    it("flags gust increase >=10 kts as red", () => {
      const snapshot = makeMetar({ wind: { direction: 270, speed: 10, gust: 20, isGusty: true } });
      const current = makeMetar({ wind: { direction: 270, speed: 10, gust: 32, isGusty: true } });
      const changes = detectWeatherChanges(snapshot, current);
      const g = changes.find((c) => c.type === "gust");
      expect(g?.severity).toBe("red");
    });
  });

  describe("visibility changes", () => {
    it("flags visibility drop to <3 SM as red", () => {
      const snapshot = makeMetar({ visibility: { sm: 6, isPlus: false } });
      const current = makeMetar({ visibility: { sm: 2, isPlus: false } });
      const changes = detectWeatherChanges(snapshot, current);
      const v = changes.find((c) => c.type === "visibility");
      expect(v).toBeDefined();
      expect(v?.severity).toBe("red");
    });

    it("flags visibility drop >2 SM (but still >3 SM) as amber", () => {
      const snapshot = makeMetar({ visibility: { sm: 10, isPlus: true } });
      const current = makeMetar({ visibility: { sm: 5, isPlus: false } });
      const changes = detectWeatherChanges(snapshot, current);
      const v = changes.find((c) => c.type === "visibility");
      expect(v?.severity).toBe("amber");
    });

    it("does not flag small visibility decrease", () => {
      const snapshot = makeMetar({ visibility: { sm: 10, isPlus: true } });
      const current = makeMetar({ visibility: { sm: 9, isPlus: false } });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.some((c) => c.type === "visibility")).toBe(false);
    });
  });

  describe("ceiling changes", () => {
    it("flags low ceiling developing (<1000 ft) as red", () => {
      const snapshot = makeMetar({ ceiling: null });
      const current = makeMetar({ ceiling: 800 });
      const changes = detectWeatherChanges(snapshot, current);
      const c = changes.find((ch) => ch.type === "ceiling");
      expect(c).toBeDefined();
      expect(c?.severity).toBe("red");
    });

    it("flags ceiling developing (>1000 ft) as amber", () => {
      const snapshot = makeMetar({ ceiling: null });
      const current = makeMetar({ ceiling: 2500 });
      const changes = detectWeatherChanges(snapshot, current);
      const c = changes.find((ch) => ch.type === "ceiling");
      expect(c?.severity).toBe("amber");
    });

    it("flags ceiling drop >500 ft as alert", () => {
      const snapshot = makeMetar({ ceiling: 3000 });
      const current = makeMetar({ ceiling: 2000 });
      const changes = detectWeatherChanges(snapshot, current);
      const c = changes.find((ch) => ch.type === "ceiling");
      expect(c).toBeDefined();
    });

    it("does not flag small ceiling drop", () => {
      const snapshot = makeMetar({ ceiling: 3000 });
      const current = makeMetar({ ceiling: 2700 });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.some((ch) => ch.type === "ceiling")).toBe(false);
    });
  });

  describe("hazardous weather", () => {
    it("flags new thunderstorms as red", () => {
      const snapshot = makeMetar({ presentWeather: null });
      const current = makeMetar({ presentWeather: "+TSRA" });
      const changes = detectWeatherChanges(snapshot, current);
      const wx = changes.find((c) => c.type === "weather");
      expect(wx).toBeDefined();
      expect(wx?.severity).toBe("red");
    });

    it("flags new freezing precipitation as red", () => {
      const snapshot = makeMetar({ presentWeather: null });
      const current = makeMetar({ presentWeather: "FZRA" });
      const changes = detectWeatherChanges(snapshot, current);
      const wx = changes.find((c) => c.type === "weather");
      expect(wx?.severity).toBe("red");
    });

    it("flags new non-hazardous weather as amber", () => {
      const snapshot = makeMetar({ presentWeather: null });
      const current = makeMetar({ presentWeather: "-RA" });
      const changes = detectWeatherChanges(snapshot, current);
      const wx = changes.find((c) => c.type === "weather");
      expect(wx?.severity).toBe("amber");
    });

    it("does not flag when weather is unchanged", () => {
      const snapshot = makeMetar({ presentWeather: "-RA" });
      const current = makeMetar({ presentWeather: "-RA" });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.some((c) => c.type === "weather")).toBe(false);
    });
  });

  describe("SPECI observations", () => {
    it("flags new SPECI as amber", () => {
      const snapshot = makeMetar({ isSpeci: false });
      const current = makeMetar({ isSpeci: true });
      const changes = detectWeatherChanges(snapshot, current);
      const s = changes.find((c) => c.type === "speci");
      expect(s).toBeDefined();
      expect(s?.severity).toBe("amber");
    });

    it("does not flag when both are SPECI", () => {
      const snapshot = makeMetar({ isSpeci: true });
      const current = makeMetar({ isSpeci: true });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.some((c) => c.type === "speci")).toBe(false);
    });
  });

  describe("multiple changes", () => {
    it("detects multiple simultaneous changes", () => {
      const snapshot = makeMetar({
        flightCategory: "VFR",
        wind: { direction: 270, speed: 10, gust: null, isGusty: false },
        visibility: { sm: 10, isPlus: true },
        ceiling: null,
      });
      const current = makeMetar({
        flightCategory: "IFR",
        wind: { direction: 270, speed: 30, gust: null, isGusty: false },
        visibility: { sm: 2, isPlus: false },
        ceiling: 500,
      });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes.length).toBeGreaterThan(2);
      expect(changes.some((c) => c.type === "category")).toBe(true);
      expect(changes.some((c) => c.type === "wind")).toBe(true);
    });

    it("sorts red before amber", () => {
      const snapshot = makeMetar({ flightCategory: "VFR", isSpeci: false });
      const current = makeMetar({ flightCategory: "IFR", isSpeci: true });
      const changes = detectWeatherChanges(snapshot, current);
      const firstRed = changes.findIndex((c) => c.severity === "red");
      const firstAmber = changes.findIndex((c) => c.severity === "amber");
      if (firstAmber !== -1 && firstRed !== -1) {
        expect(firstRed).toBeLessThan(firstAmber);
      }
    });
  });

  describe("edge cases", () => {
    it("handles variable wind direction", () => {
      const snapshot = makeMetar({ wind: { direction: "VRB", speed: 5, gust: null, isGusty: false } });
      const current = makeMetar({ wind: { direction: "VRB", speed: 8, gust: null, isGusty: false } });
      const changes = detectWeatherChanges(snapshot, current);
      expect(Array.isArray(changes)).toBe(true);
    });

    it("generates unique IDs", () => {
      const snapshot = makeMetar({ flightCategory: "VFR", visibility: { sm: 10, isPlus: true } });
      const current = makeMetar({ flightCategory: "IFR", visibility: { sm: 2, isPlus: false } });
      const changes = detectWeatherChanges(snapshot, current);
      const ids = changes.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("sets detectedAt timestamp", () => {
      const snapshot = makeMetar({ flightCategory: "VFR" });
      const current = makeMetar({ flightCategory: "IFR" });
      const changes = detectWeatherChanges(snapshot, current);
      expect(changes[0].detectedAt).toBeInstanceOf(Date);
    });
  });
});
