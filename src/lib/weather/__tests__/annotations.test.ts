import {
  flightCategoryAnnotations,
  cloudCoverAnnotations,
  weatherPhenomenaAnnotations,
  metarFieldAnnotations,
  getWeatherAnnotation,
  getAnnotationsForMetar,
} from "../annotations";

describe("flightCategoryAnnotations", () => {
  it("has annotations for all four categories", () => {
    expect(flightCategoryAnnotations.VFR).toBeDefined();
    expect(flightCategoryAnnotations.MVFR).toBeDefined();
    expect(flightCategoryAnnotations.IFR).toBeDefined();
    expect(flightCategoryAnnotations.LIFR).toBeDefined();
  });

  it("each annotation has required fields", () => {
    for (const cat of Object.values(flightCategoryAnnotations)) {
      expect(cat.code).toBeTruthy();
      expect(cat.shortName).toBeTruthy();
      expect(cat.explanation).toBeTruthy();
      expect(cat.pilotImplication).toBeTruthy();
    }
  });
});

describe("cloudCoverAnnotations", () => {
  it("has annotations for all cloud types", () => {
    expect(cloudCoverAnnotations.CLR).toBeDefined();
    expect(cloudCoverAnnotations.FEW).toBeDefined();
    expect(cloudCoverAnnotations.SCT).toBeDefined();
    expect(cloudCoverAnnotations.BKN).toBeDefined();
    expect(cloudCoverAnnotations.OVC).toBeDefined();
  });

  it("BKN and OVC mention ceiling", () => {
    expect(cloudCoverAnnotations.BKN.pilotImplication).toContain("ceiling");
    expect(cloudCoverAnnotations.OVC.pilotImplication).toContain("ceiling");
  });

  it("SCT explicitly says NOT a ceiling", () => {
    expect(cloudCoverAnnotations.SCT.explanation).toContain("NOT a ceiling");
  });
});

describe("weatherPhenomenaAnnotations", () => {
  it("has annotations for common weather types", () => {
    expect(weatherPhenomenaAnnotations.RA).toBeDefined();
    expect(weatherPhenomenaAnnotations.SN).toBeDefined();
    expect(weatherPhenomenaAnnotations.FG).toBeDefined();
    expect(weatherPhenomenaAnnotations.TS).toBeDefined();
    expect(weatherPhenomenaAnnotations.FZRA).toBeDefined();
  });

  it("TS annotation warns to avoid", () => {
    expect(weatherPhenomenaAnnotations.TS.pilotImplication).toContain("AVOID");
  });

  it("FZRA annotation recommends immediate landing", () => {
    expect(weatherPhenomenaAnnotations.FZRA.pilotImplication).toContain("IMMEDIATE");
  });
});

describe("metarFieldAnnotations", () => {
  it("has annotations for key METAR fields", () => {
    expect(metarFieldAnnotations.wind).toBeDefined();
    expect(metarFieldAnnotations.visibility).toBeDefined();
    expect(metarFieldAnnotations.altimeter).toBeDefined();
    expect(metarFieldAnnotations.tempDewpoint).toBeDefined();
    expect(metarFieldAnnotations.ceiling).toBeDefined();
  });
});

describe("getWeatherAnnotation", () => {
  it("returns annotation for direct match", () => {
    const result = getWeatherAnnotation("RA");
    expect(result).not.toBeNull();
    expect(result!.shortName).toBe("Rain");
  });

  it("strips intensity prefix", () => {
    const result = getWeatherAnnotation("+RA");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("RA");
  });

  it("strips light prefix", () => {
    const result = getWeatherAnnotation("-SN");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("SN");
  });

  it("handles compound codes (TSRA → TS)", () => {
    const result = getWeatherAnnotation("TSRA");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("TS");
  });

  it("handles unknown code", () => {
    expect(getWeatherAnnotation("XYZ")).toBeNull();
  });

  it("handles FZRA as direct match", () => {
    const result = getWeatherAnnotation("FZRA");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("FZRA");
  });
});

describe("getAnnotationsForMetar", () => {
  it("returns flight category annotation", () => {
    const annotations = getAnnotationsForMetar({
      flightCategory: "VFR",
      clouds: [],
    });

    expect(annotations.some((a) => a.code === "VFR")).toBe(true);
  });

  it("includes cloud cover annotations", () => {
    const annotations = getAnnotationsForMetar({
      flightCategory: "MVFR",
      clouds: [{ cover: "BKN" }, { cover: "OVC" }],
    });

    expect(annotations.some((a) => a.code === "BKN")).toBe(true);
    expect(annotations.some((a) => a.code === "OVC")).toBe(true);
  });

  it("deduplicates cloud cover annotations", () => {
    const annotations = getAnnotationsForMetar({
      flightCategory: "VFR",
      clouds: [{ cover: "FEW" }, { cover: "FEW" }],
    });

    const fewCount = annotations.filter((a) => a.code === "FEW").length;
    expect(fewCount).toBe(1);
  });

  it("includes present weather annotations", () => {
    const annotations = getAnnotationsForMetar({
      flightCategory: "IFR",
      clouds: [{ cover: "OVC" }],
      presentWeather: "RA BR",
    });

    expect(annotations.some((a) => a.code === "RA")).toBe(true);
    expect(annotations.some((a) => a.code === "BR")).toBe(true);
  });

  it("handles null present weather", () => {
    const annotations = getAnnotationsForMetar({
      flightCategory: "VFR",
      clouds: [],
      presentWeather: null,
    });

    expect(annotations.length).toBe(1); // Just flight category
  });
});
