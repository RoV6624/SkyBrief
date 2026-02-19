import { getFamiliarityInfo, getFamiliarityText } from "../familiarity";
import type { AirportVisit } from "@/stores/familiarity-store";

function makeVisit(overrides: Partial<AirportVisit> = {}): AirportVisit {
  return {
    icao: "KJFK",
    lastVisited: new Date().toISOString(),
    visitCount: 5,
    flightTypes: ["local"],
    ...overrides,
  };
}

describe("getFamiliarityInfo", () => {
  it("returns 'home' for score <= 2", () => {
    const result = getFamiliarityInfo(makeVisit({ visitCount: 25 }), 1);
    expect(result.label).toBe("home");
    expect(result.tips.length).toBe(0);
  });

  it("returns 'familiar' for score 3-5", () => {
    const result = getFamiliarityInfo(makeVisit({ visitCount: 10 }), 4);
    expect(result.label).toBe("familiar");
  });

  it("returns 'visited' for score 6-8", () => {
    const result = getFamiliarityInfo(makeVisit({ visitCount: 2 }), 7);
    expect(result.label).toBe("visited");
  });

  it("returns 'unfamiliar' for score >= 9", () => {
    const result = getFamiliarityInfo(null, 10);
    expect(result.label).toBe("unfamiliar");
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.tips).toContain("Review airport diagram before departure");
  });

  it("provides tips for unfamiliar airports", () => {
    const result = getFamiliarityInfo(null, 10);
    expect(result.tips).toContain("Check for noise abatement procedures");
    expect(result.tips).toContain("Verify pattern altitude and entry direction");
    expect(result.tips).toContain("Review local NOTAMs carefully");
    expect(result.tips.length).toBe(5);
  });

  it("provides tips for visited airports with stale recency (>180 days)", () => {
    const sixMonthsAgo = new Date(Date.now() - 200 * 86400000).toISOString();
    const result = getFamiliarityInfo(
      makeVisit({ lastVisited: sixMonthsAgo, visitCount: 3 }),
      7
    );
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.tips.some((t) => t.includes("been a while"))).toBe(true);
  });

  it("provides tips for familiar airports with stale recency (>90 days)", () => {
    const fourMonthsAgo = new Date(Date.now() - 120 * 86400000).toISOString();
    const result = getFamiliarityInfo(
      makeVisit({ lastVisited: fourMonthsAgo, visitCount: 8 }),
      4
    );
    expect(result.tips.some((t) => t.includes("Check NOTAMs"))).toBe(true);
  });

  it("calculates daysSinceLastVisit correctly", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const result = getFamiliarityInfo(makeVisit({ lastVisited: twoDaysAgo }), 3);
    expect(result.daysSinceLastVisit).toBe(2);
  });

  it("returns null daysSinceLastVisit for null visit", () => {
    const result = getFamiliarityInfo(null, 10);
    expect(result.daysSinceLastVisit).toBeNull();
    expect(result.visitCount).toBe(0);
  });

  it("returns visit count from visit record", () => {
    const result = getFamiliarityInfo(makeVisit({ visitCount: 15 }), 2);
    expect(result.visitCount).toBe(15);
  });
});

describe("getFamiliarityText", () => {
  it("returns home base text", () => {
    const info = getFamiliarityInfo(makeVisit({ visitCount: 25 }), 1);
    expect(getFamiliarityText(info)).toBe("Home base (25 visits)");
  });

  it("returns familiar text", () => {
    const info = getFamiliarityInfo(makeVisit({ visitCount: 10 }), 4);
    expect(getFamiliarityText(info)).toBe("Familiar (10 visits)");
  });

  it("returns visited text with days ago", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    const info = getFamiliarityInfo(makeVisit({ lastVisited: fiveDaysAgo, visitCount: 3 }), 7);
    const text = getFamiliarityText(info);
    expect(text).toContain("Visited 3x");
    expect(text).toContain("5d ago");
  });

  it("returns visited text with months ago", () => {
    const twoMonthsAgo = new Date(Date.now() - 65 * 86400000).toISOString();
    const info = getFamiliarityInfo(makeVisit({ lastVisited: twoMonthsAgo, visitCount: 2 }), 7);
    const text = getFamiliarityText(info);
    expect(text).toContain("2mo ago");
  });

  it("returns 'First visit' for unfamiliar", () => {
    const info = getFamiliarityInfo(null, 10);
    expect(getFamiliarityText(info)).toBe("First visit");
  });
});
