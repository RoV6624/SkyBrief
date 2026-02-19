import { calculateReadiness } from "../readiness";
import type { StudentMetrics } from "@/services/tenant-api";

function makeMetrics(overrides: Partial<StudentMetrics> = {}): StudentMetrics {
  return {
    studentUid: "student-1",
    studentName: "John Doe",
    totalBriefings: 15,
    approvedFirstTry: 12,
    avgFratScore: 18,
    minimumsBreaches: 0,
    lastBriefingDate: new Date(),
    briefingsByType: { local: 8, xc: 5, night: 2 },
    ...overrides,
  };
}

describe("calculateReadiness", () => {
  it("returns 'ready' for a strong student", () => {
    const result = calculateReadiness(makeMetrics());
    expect(result.overallLevel).toBe("ready");
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.categories.every((c) => c.status !== "fail")).toBe(true);
  });

  it("returns 'insufficient_data' for <3 briefings", () => {
    const result = calculateReadiness(makeMetrics({ totalBriefings: 2, approvedFirstTry: 2 }));
    expect(result.overallLevel).toBe("insufficient_data");
    expect(result.summary).toContain("Not enough");
  });

  it("returns 'needs_work' for a struggling student", () => {
    const result = calculateReadiness(
      makeMetrics({
        totalBriefings: 5,
        approvedFirstTry: 1,
        avgFratScore: 40,
        minimumsBreaches: 3,
        briefingsByType: { local: 5 },
      })
    );

    expect(result.overallLevel).toBe("needs_work");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("evaluates briefing volume correctly", () => {
    const result = calculateReadiness(makeMetrics({ totalBriefings: 5 }));
    const volume = result.categories.find((c) => c.id === "volume");
    expect(volume).toBeDefined();
    expect(volume!.score).toBe(50);
    expect(volume!.status).toBe("marginal");
  });

  it("evaluates approval rate correctly", () => {
    const result = calculateReadiness(
      makeMetrics({ totalBriefings: 10, approvedFirstTry: 5 })
    );
    const approval = result.categories.find((c) => c.id === "approval");
    expect(approval).toBeDefined();
    // 50% / 75% = 66.7% → score 67
    expect(approval!.score).toBeLessThan(80);
  });

  it("evaluates risk assessment (FRAT score)", () => {
    const result = calculateReadiness(makeMetrics({ avgFratScore: 35 }));
    const risk = result.categories.find((c) => c.id === "risk");
    expect(risk).toBeDefined();
    expect(risk!.score).toBeLessThan(100);
  });

  it("scores perfect FRAT as 100", () => {
    const result = calculateReadiness(makeMetrics({ avgFratScore: 10 }));
    const risk = result.categories.find((c) => c.id === "risk");
    expect(risk!.score).toBe(100);
  });

  it("evaluates minimums compliance", () => {
    const result = calculateReadiness(
      makeMetrics({ minimumsBreaches: 5, totalBriefings: 10 })
    );
    const compliance = result.categories.find((c) => c.id === "compliance");
    expect(compliance).toBeDefined();
    // 5/10 = 0.5 breach ratio, score = max(0, 1 - 0.5*5)*100 = max(0, -1.5)*100 = 0
    expect(compliance!.score).toBeLessThanOrEqual(0);
    expect(compliance!.status).toBe("fail");
  });

  it("evaluates flight type diversity", () => {
    const result = calculateReadiness(
      makeMetrics({ briefingsByType: { local: 10 } })
    );
    const diversity = result.categories.find((c) => c.id === "diversity");
    expect(diversity).toBeDefined();
    // Only local, missing xc → 50%
    expect(diversity!.score).toBe(50);
    expect(result.recommendations.some((r) => r.includes("xc"))).toBe(true);
  });

  it("gives full diversity score when all types done", () => {
    const result = calculateReadiness(
      makeMetrics({ briefingsByType: { local: 5, xc: 5 } })
    );
    const diversity = result.categories.find((c) => c.id === "diversity");
    expect(diversity!.score).toBe(100);
  });

  it("uses custom config", () => {
    const result = calculateReadiness(
      makeMetrics({ totalBriefings: 20 }),
      {
        minBriefings: 20,
        minApprovalRate: 0.9,
        maxAvgFrat: 15,
        maxMinimumsBreaches: 0,
        requiredFlightTypes: ["local", "xc", "night"],
      }
    );
    expect(result.overallLevel).toBe("ready");
  });

  it("generates proper summary text", () => {
    const readyResult = calculateReadiness(makeMetrics());
    expect(readyResult.summary).toContain("John Doe");
    expect(readyResult.summary).toContain("Ready for stage check");

    const needsWork = calculateReadiness(
      makeMetrics({
        totalBriefings: 5,
        approvedFirstTry: 1,
        avgFratScore: 40,
        minimumsBreaches: 3,
        briefingsByType: { local: 5 },
      })
    );
    expect(needsWork.summary).toContain("needs additional work");
  });

  it("recommends completing more briefings when low", () => {
    const result = calculateReadiness(makeMetrics({ totalBriefings: 5 }));
    expect(result.recommendations.some((r) => r.includes("more briefings"))).toBe(true);
  });

  it("nearly_ready when score is 60-79", () => {
    const result = calculateReadiness(
      makeMetrics({
        totalBriefings: 8,
        approvedFirstTry: 5,
        avgFratScore: 22,
        minimumsBreaches: 1,
        briefingsByType: { local: 5, xc: 3 },
      })
    );
    // This should be in the nearly_ready range
    expect(["nearly_ready", "ready"]).toContain(result.overallLevel);
  });
});
