// Mock firebase before importing pirep-submit
jest.mock("../firebase", () => ({
  FIRESTORE_API_URL: "https://mock-firestore.example.com",
  jsToFirestoreValue: (val: any) => ({ stringValue: String(val) }),
}));

import {
  formatPirepText,
  TURBULENCE_OPTIONS,
  ICING_OPTIONS,
} from "../pirep-submit";
import type { PirepSubmission } from "../pirep-submit";

function makePirep(overrides: Partial<PirepSubmission> = {}): PirepSubmission {
  return {
    nearestStation: "KJFK",
    altitude: 5500,
    aircraftType: "C172",
    ...overrides,
  };
}

describe("formatPirepText", () => {
  it("formats basic PIREP with required fields only", () => {
    const text = formatPirepText(makePirep());
    expect(text).toContain("UA");
    expect(text).toContain("/OV KJFK");
    expect(text).toContain("/FL055");
    expect(text).toContain("/TP C172");
    expect(text).toMatch(/\/TM \d{4}/);
  });

  it("formats altitude correctly (MSL → flight level)", () => {
    expect(formatPirepText(makePirep({ altitude: 10000 }))).toContain("/FL100");
    expect(formatPirepText(makePirep({ altitude: 500 }))).toContain("/FL005");
    expect(formatPirepText(makePirep({ altitude: 17500 }))).toContain("/FL175");
  });

  it("includes sky condition", () => {
    const text = formatPirepText(
      makePirep({ skyCondition: "BKN", cloudBase: 5000 })
    );
    expect(text).toContain("/SK BKN 050");
  });

  it("includes cloud top in sky condition", () => {
    const text = formatPirepText(
      makePirep({ skyCondition: "OVC", cloudBase: 3000, cloudTop: 8000 })
    );
    expect(text).toContain("/SK OVC 030-TOP 080");
  });

  it("includes flight visibility", () => {
    const text = formatPirepText(makePirep({ flightVisibility: 5 }));
    expect(text).toContain("/WX FV05SM");
  });

  it("includes temperature with sign", () => {
    expect(formatPirepText(makePirep({ temperature: 15 }))).toContain("/TA 15");
    expect(formatPirepText(makePirep({ temperature: -8 }))).toContain("/TA M8");
    expect(formatPirepText(makePirep({ temperature: 0 }))).toContain("/TA 0");
  });

  it("includes wind", () => {
    const text = formatPirepText(
      makePirep({ windDirection: 270, windSpeed: 15 })
    );
    expect(text).toContain("/WV 27015KT");
  });

  it("pads wind direction to 3 digits", () => {
    const text = formatPirepText(
      makePirep({ windDirection: 90, windSpeed: 5 })
    );
    expect(text).toContain("/WV 09005KT");
  });

  it("includes turbulence when not NEG", () => {
    const text = formatPirepText(makePirep({ turbulence: "MOD" }));
    expect(text).toContain("/TB MOD");
  });

  it("excludes turbulence when NEG", () => {
    const text = formatPirepText(makePirep({ turbulence: "NEG" }));
    expect(text).not.toContain("/TB");
  });

  it("includes icing when not NEG", () => {
    const text = formatPirepText(makePirep({ icing: "LGT" }));
    expect(text).toContain("/IC LGT");
  });

  it("excludes icing when NEG", () => {
    const text = formatPirepText(makePirep({ icing: "NEG" }));
    expect(text).not.toContain("/IC");
  });

  it("includes remarks", () => {
    const text = formatPirepText(
      makePirep({ remarks: "Bumpy ride through the pass" })
    );
    expect(text).toContain("/RM Bumpy ride through the pass");
  });

  it("formats a complete PIREP with all fields", () => {
    const text = formatPirepText({
      nearestStation: "KVNY",
      altitude: 6500,
      aircraftType: "PA28",
      skyCondition: "BKN",
      cloudBase: 4000,
      cloudTop: 7000,
      flightVisibility: 3,
      temperature: -5,
      windDirection: 180,
      windSpeed: 20,
      turbulence: "MOD-SEV",
      icing: "LGT",
      remarks: "Mountain wave activity",
    });

    expect(text).toContain("UA");
    expect(text).toContain("/OV KVNY");
    expect(text).toContain("/FL065");
    expect(text).toContain("/TP PA28");
    expect(text).toContain("/SK BKN 040-TOP 070");
    expect(text).toContain("/WX FV03SM");
    expect(text).toContain("/TA M5");
    expect(text).toContain("/WV 18020KT");
    expect(text).toContain("/TB MOD-SEV");
    expect(text).toContain("/IC LGT");
    expect(text).toContain("/RM Mountain wave activity");
  });
});

describe("TURBULENCE_OPTIONS", () => {
  it("has correct number of options", () => {
    expect(TURBULENCE_OPTIONS.length).toBe(7);
  });

  it("starts with NEG and ends with EXTRM", () => {
    expect(TURBULENCE_OPTIONS[0].value).toBe("NEG");
    expect(TURBULENCE_OPTIONS[TURBULENCE_OPTIONS.length - 1].value).toBe("EXTRM");
  });

  it("each option has required fields", () => {
    for (const opt of TURBULENCE_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.description).toBeTruthy();
    }
  });
});

describe("ICING_OPTIONS", () => {
  it("has correct number of options", () => {
    expect(ICING_OPTIONS.length).toBe(5);
  });

  it("starts with NEG and ends with SEV", () => {
    expect(ICING_OPTIONS[0].value).toBe("NEG");
    expect(ICING_OPTIONS[ICING_OPTIONS.length - 1].value).toBe("SEV");
  });
});
