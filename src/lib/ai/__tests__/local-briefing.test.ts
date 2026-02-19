import { generateLocalBriefing } from "../local-briefing";
import type { MetarResponse } from "@/lib/api/types";

function makeMetar(overrides: Partial<MetarResponse> = {}): MetarResponse {
  return {
    icaoId: "KJFK",
    receiptTime: "2026-02-18T12:00:00Z",
    obsTime: Date.now() / 1000 - 300, // 5 min ago
    reportTime: "2026-02-18T12:00:00Z",
    temp: 20,
    dewp: 10,
    wdir: 270,
    wspd: 8,
    wgst: null,
    visib: "10+",
    altim: 29.92,
    slp: 1013,
    qcField: 0,
    presTend: null,
    metarType: "METAR",
    rawOb: "KJFK 181200Z 27008KT 10SM CLR 20/10 A2992",
    lat: 40.64,
    lon: -73.78,
    elev: 4,
    name: "John F Kennedy Intl",
    cover: "CLR",
    clouds: [],
    fltCat: "VFR",
    ...overrides,
  };
}

describe("generateLocalBriefing", () => {
  it("returns FAVORABLE for VFR clear skies", () => {
    const result = generateLocalBriefing(makeMetar());

    expect(result.recommendation).toBe("FAVORABLE");
    expect(result.summary).toContain("VFR");
    expect(result.hazards.length).toBe(0);
    expect(result.confidence).toBe("high");
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("returns CAUTION for MVFR conditions", () => {
    const result = generateLocalBriefing(
      makeMetar({
        fltCat: "MVFR",
        visib: "4",
        clouds: [{ cover: "BKN", base: 2500 }],
      })
    );

    expect(result.recommendation).toBe("CAUTION");
    expect(result.summary).toContain("Marginal VFR");
  });

  it("returns UNFAVORABLE for IFR conditions", () => {
    const result = generateLocalBriefing(
      makeMetar({
        fltCat: "IFR",
        visib: "1",
        clouds: [{ cover: "OVC", base: 800 }],
      })
    );

    expect(result.recommendation).toBe("UNFAVORABLE");
  });

  it("returns UNFAVORABLE for LIFR conditions", () => {
    const result = generateLocalBriefing(
      makeMetar({
        fltCat: "LIFR",
        visib: "0.5",
        clouds: [{ cover: "OVC", base: 200 }],
      })
    );

    expect(result.recommendation).toBe("UNFAVORABLE");
    expect(result.hazards.some((h) => h.includes("LOW"))).toBe(true);
  });

  it("flags thunderstorms as no-go", () => {
    const result = generateLocalBriefing(
      makeMetar({ wxString: "TS RA" })
    );

    expect(result.recommendation).toBe("UNFAVORABLE");
    expect(result.hazards.some((h) => h.includes("THUNDERSTORM"))).toBe(true);
  });

  it("flags freezing rain as no-go", () => {
    const result = generateLocalBriefing(
      makeMetar({ wxString: "FZRA" })
    );

    expect(result.recommendation).toBe("UNFAVORABLE");
    expect(result.hazards.some((h) => h.includes("FREEZING"))).toBe(true);
  });

  it("flags strong gusts", () => {
    const result = generateLocalBriefing(
      makeMetar({ wspd: 20, wgst: 40 })
    );

    expect(result.hazards.some((h) => h.includes("GUST") || h.includes("gust"))).toBe(true);
  });

  it("flags fog when temp/dewpoint spread <= 1", () => {
    const result = generateLocalBriefing(
      makeMetar({ temp: 15, dewp: 14.5 })
    );

    expect(result.hazards.some((h) => h.includes("FOG") || h.includes("fog"))).toBe(true);
  });

  it("does not throw with null/missing optional fields", () => {
    const metar = makeMetar({
      wxString: undefined,
      wgst: null,
      slp: null,
      presTend: null,
    });

    expect(() => generateLocalBriefing(metar)).not.toThrow();
    expect(generateLocalBriefing(metar).summary).toBeTruthy();
  });

  it("handles calm winds", () => {
    const result = generateLocalBriefing(makeMetar({ wspd: 0, wdir: 0 }));

    expect(result.summary).toContain("calm");
  });

  it("flags low visibility below 1 SM", () => {
    const result = generateLocalBriefing(
      makeMetar({ visib: "0.5", fltCat: "LIFR" })
    );

    expect(result.hazards.some((h) => h.includes("VERY LOW VISIBILITY"))).toBe(true);
  });
});
