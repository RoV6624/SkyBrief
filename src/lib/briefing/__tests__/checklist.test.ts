import {
  getDefaultChecklistItems,
  createBriefingChecklist,
  toggleChecklistItem,
  flagChecklistItem,
  generateComplianceRecord,
  formatComplianceText,
} from "../checklist";
import type { NormalizedMetar } from "@/lib/api/types";
import type { BriefingChecklist } from "../types";

function makeMetar(): NormalizedMetar {
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
  };
}

describe("getDefaultChecklistItems", () => {
  it("returns 9 base items for local flights", () => {
    const items = getDefaultChecklistItems("local");
    expect(items.length).toBe(9);
    expect(items.every((i) => i.status === "pending")).toBe(true);
  });

  it("includes extra items for XC flights", () => {
    const items = getDefaultChecklistItems("xc");
    expect(items.length).toBeGreaterThan(9);
    expect(items.some((i) => i.id === "alternate")).toBe(true);
    expect(items.some((i) => i.id === "performance")).toBe(true);
  });

  it("includes extra items for instrument flights", () => {
    const items = getDefaultChecklistItems("instrument");
    expect(items.some((i) => i.id === "alternate")).toBe(true);
    expect(items.some((i) => i.id === "departure_procedures")).toBe(true);
  });

  it("includes performance for checkride flights", () => {
    const items = getDefaultChecklistItems("checkride");
    expect(items.some((i) => i.id === "performance")).toBe(true);
  });

  it("does not include XC items for night flights", () => {
    const items = getDefaultChecklistItems("night");
    expect(items.some((i) => i.id === "alternate")).toBe(false);
  });

  it("marks all items as required or not correctly", () => {
    const items = getDefaultChecklistItems("xc");
    const required = items.filter((i) => i.required);
    expect(required.length).toBeGreaterThan(0);
    expect(items.some((i) => i.id === "departure_procedures" && !i.required)).toBe(true);
  });
});

describe("createBriefingChecklist", () => {
  it("creates a checklist with correct metadata", () => {
    const checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
    });

    expect(checklist.id).toMatch(/^BRF-/);
    expect(checklist.station).toBe("KJFK");
    expect(checklist.pilotName).toBe("Test Pilot");
    expect(checklist.aircraftType).toBe("C172S");
    expect(checklist.flightType).toBe("local");
    expect(checklist.isComplete).toBe(false);
    expect(checklist.items.length).toBe(9);
  });

  it("filters items by customItems when provided", () => {
    const checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "xc",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
      customItems: ["weather_current", "fuel_plan"],
    });

    expect(checklist.items.length).toBe(2);
    expect(checklist.items[0].id).toBe("weather_current");
    expect(checklist.items[1].id).toBe("fuel_plan");
  });

  it("includes route when provided", () => {
    const checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "xc",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
      route: "KJFK → KBOS",
    });

    expect(checklist.route).toBe("KJFK → KBOS");
  });
});

describe("toggleChecklistItem", () => {
  let checklist: BriefingChecklist;

  beforeEach(() => {
    checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
    });
  });

  it("toggles an item from pending to checked", () => {
    const updated = toggleChecklistItem(checklist, "weather_current");
    const item = updated.items.find((i) => i.id === "weather_current");
    expect(item?.status).toBe("checked");
    expect(item?.checkedAt).toBeInstanceOf(Date);
  });

  it("toggles an item from checked back to pending", () => {
    const checked = toggleChecklistItem(checklist, "weather_current");
    const unchecked = toggleChecklistItem(checked, "weather_current");
    const item = unchecked.items.find((i) => i.id === "weather_current");
    expect(item?.status).toBe("pending");
  });

  it("marks checklist complete when all required items checked", () => {
    let current = checklist;
    const requiredIds = current.items
      .filter((i) => i.required)
      .map((i) => i.id);

    for (const id of requiredIds) {
      current = toggleChecklistItem(current, id);
    }

    expect(current.isComplete).toBe(true);
    expect(current.completedAt).toBeInstanceOf(Date);
  });

  it("does not mark complete if a required item is unchecked", () => {
    let current = checklist;
    const requiredIds = current.items
      .filter((i) => i.required)
      .map((i) => i.id);

    // Check all required
    for (const id of requiredIds) {
      current = toggleChecklistItem(current, id);
    }
    expect(current.isComplete).toBe(true);

    // Uncheck one
    current = toggleChecklistItem(current, requiredIds[0]);
    expect(current.isComplete).toBe(false);
  });

  it("preserves notes when provided", () => {
    const updated = toggleChecklistItem(checklist, "weather_current", "Checked at 12:00Z");
    const item = updated.items.find((i) => i.id === "weather_current");
    expect(item?.notes).toBe("Checked at 12:00Z");
  });
});

describe("flagChecklistItem", () => {
  it("flags an item and adds notes", () => {
    const checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
    });

    const flagged = flagChecklistItem(checklist, "weight_balance", "Overweight by 50 lbs");
    const item = flagged.items.find((i) => i.id === "weight_balance");
    expect(item?.status).toBe("flagged");
    expect(item?.notes).toBe("Overweight by 50 lbs");
    expect(flagged.isComplete).toBe(false);
  });
});

describe("generateComplianceRecord", () => {
  it("returns null for incomplete checklist", () => {
    const checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
    });

    expect(generateComplianceRecord(checklist, makeMetar())).toBeNull();
  });

  it("returns null when metar is null", () => {
    const checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
    });
    // Manually make it complete
    const complete = {
      ...checklist,
      completedAt: new Date(),
      isComplete: true,
    };

    expect(generateComplianceRecord(complete, null)).toBeNull();
  });

  it("generates a valid compliance record", () => {
    let checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
    });

    // Check all required items
    for (const item of checklist.items.filter((i) => i.required)) {
      checklist = toggleChecklistItem(checklist, item.id);
    }

    const record = generateComplianceRecord(checklist, makeMetar());
    expect(record).not.toBeNull();
    expect(record!.briefingId).toMatch(/^BRF-/);
    expect(record!.pilotName).toBe("Test Pilot");
    expect(record!.weatherSnapshot.flightCategory).toBe("VFR");
    expect(record!.signature).toMatch(/^SB-[A-F0-9]{8}$/);
    expect(record!.itemsSummary.checked).toBeGreaterThan(0);
  });
});

describe("formatComplianceText", () => {
  it("formats a compliance record as text", () => {
    let checklist = createBriefingChecklist({
      station: "KJFK",
      stationName: "John F Kennedy Intl",
      flightType: "local",
      pilotName: "Test Pilot",
      aircraftType: "C172S",
      route: "KJFK → KBOS",
    });

    for (const item of checklist.items.filter((i) => i.required)) {
      checklist = toggleChecklistItem(checklist, item.id);
    }

    const record = generateComplianceRecord(checklist, makeMetar())!;
    const text = formatComplianceText(record);

    expect(text).toContain("SKYBRIEF PREFLIGHT BRIEFING RECORD");
    expect(text).toContain("Test Pilot");
    expect(text).toContain("KJFK");
    expect(text).toContain("C172S");
    expect(text).toContain("VFR");
    expect(text).toContain("KJFK → KBOS");
    expect(text).toContain("SB-");
  });
});
