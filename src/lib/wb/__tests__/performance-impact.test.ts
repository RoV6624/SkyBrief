import {
  calcTakeoffRollImpact,
  calcClimbRateImpact,
  calcServiceCeilingImpact,
  evaluateRunwayAdequacy,
  getPerformanceReport,
} from "../performance-impact";

describe("calcTakeoffRollImpact", () => {
  it("calculates zero impact at sea level density altitude", () => {
    const result = calcTakeoffRollImpact(0, 1760);
    expect(result.standard).toBe(1760);
    expect(result.actual).toBe(1760);
    expect(result.increase).toBe(0);
    expect(result.increasePercent).toBe(0);
  });

  it("increases takeoff roll by 10% per 1000ft DA", () => {
    const result = calcTakeoffRollImpact(5000, 1760);
    expect(result.increasePercent).toBe(50);
    expect(result.actual).toBe(2640); // 1760 * 1.5
  });

  it("handles high density altitude", () => {
    const result = calcTakeoffRollImpact(8000, 1760);
    expect(result.increasePercent).toBe(80);
    expect(result.actual).toBe(3168); // 1760 * 1.8
  });

  it("handles 1000ft DA", () => {
    const result = calcTakeoffRollImpact(1000, 1760);
    expect(result.increasePercent).toBe(10);
    expect(result.increase).toBe(176);
  });
});

describe("calcClimbRateImpact", () => {
  it("returns standard rate at sea level", () => {
    const result = calcClimbRateImpact(0, 730);
    expect(result.actual).toBe(730);
    expect(result.standard).toBe(730);
  });

  it("reduces climb rate by 80 fpm per 1000ft DA", () => {
    const result = calcClimbRateImpact(5000, 730);
    expect(result.actual).toBe(330); // 730 - 400
  });

  it("can produce very low climb rates", () => {
    const result = calcClimbRateImpact(8000, 730);
    expect(result.actual).toBe(90); // 730 - 640
    expect(result.actual).toBeLessThan(300);
  });

  it("increase is negative (reduction)", () => {
    const result = calcClimbRateImpact(5000, 730);
    expect(result.increase).toBeLessThan(0);
    expect(result.increasePercent).toBeLessThan(0);
  });
});

describe("calcServiceCeilingImpact", () => {
  it("reduces service ceiling by density altitude", () => {
    const result = calcServiceCeilingImpact(5000, 14000);
    expect(result.effectiveCeiling).toBe(9000);
    expect(result.ceilingReduction).toBe(5000);
  });

  it("handles zero density altitude", () => {
    const result = calcServiceCeilingImpact(0, 14000);
    expect(result.effectiveCeiling).toBe(14000);
  });
});

describe("evaluateRunwayAdequacy", () => {
  it("returns SUFFICIENT for large margin", () => {
    const result = evaluateRunwayAdequacy(2000, 10000);
    expect(result.isAdequate).toBe(true);
    expect(result.label).toBe("SUFFICIENT");
    expect(result.margin).toBe(8000);
    expect(result.marginPercent).toBe(80);
  });

  it("returns MARGINAL for moderate margin (20-50%)", () => {
    const result = evaluateRunwayAdequacy(3000, 4000);
    expect(result.isAdequate).toBe(true);
    expect(result.label).toBe("MARGINAL");
    expect(result.marginPercent).toBe(25);
  });

  it("returns INSUFFICIENT when roll exceeds runway", () => {
    const result = evaluateRunwayAdequacy(4000, 3000);
    expect(result.isAdequate).toBe(false);
    expect(result.label).toBe("INSUFFICIENT");
    expect(result.margin).toBe(-1000);
  });

  it("returns INSUFFICIENT for very tight margin (<20%)", () => {
    const result = evaluateRunwayAdequacy(3500, 4000);
    expect(result.label).toBe("INSUFFICIENT");
    expect(result.marginPercent).toBe(12.5);
  });
});

describe("getPerformanceReport", () => {
  it("returns normal report at sea level", () => {
    const report = getPerformanceReport({
      densityAlt: 0,
      fieldElevation: 0,
      temperature: 15,
      aircraftName: "C172S",
    });

    expect(report.severity).toBe("normal");
    expect(report.warnings.length).toBe(0);
    expect(report.advisory).toContain("normal operating range");
  });

  it("returns caution report at 5000ft DA", () => {
    const report = getPerformanceReport({
      densityAlt: 5000,
      fieldElevation: 5000,
      temperature: 20,
      aircraftName: "C172S",
    });

    expect(report.severity).toBe("caution");
    expect(report.advisory).toContain("Elevated density altitude");
    expect(report.takeoffRoll.increasePercent).toBe(50);
  });

  it("returns warning report at 8000ft DA", () => {
    const report = getPerformanceReport({
      densityAlt: 8000,
      fieldElevation: 7000,
      temperature: 25,
      aircraftName: "C172S",
    });

    expect(report.severity).toBe("warning");
    expect(report.advisory).toContain("High density altitude");
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it("includes runway adequacy when runway provided", () => {
    const report = getPerformanceReport({
      densityAlt: 5000,
      fieldElevation: 5000,
      temperature: 20,
      aircraftName: "C172S",
      availableRunway: 10000,
    });

    expect(report.runway).not.toBeNull();
    expect(report.runway?.label).toBe("SUFFICIENT");
  });

  it("omits runway when not provided", () => {
    const report = getPerformanceReport({
      densityAlt: 0,
      fieldElevation: 0,
      temperature: 15,
      aircraftName: "C172S",
    });

    expect(report.runway).toBeNull();
  });

  it("warns about insufficient runway", () => {
    // At 8000ft DA: takeoff roll = 1760 * (1 + 80/100) = 3168 ft
    // Available 2500 → margin = -668 → INSUFFICIENT
    const report = getPerformanceReport({
      densityAlt: 8000,
      fieldElevation: 7000,
      temperature: 25,
      aircraftName: "C172S",
      stdTakeoffRoll: 1760,
      availableRunway: 2500,
    });

    expect(report.runway?.label).toBe("INSUFFICIENT");
    expect(report.warnings.some((w) => w.includes("Insufficient runway"))).toBe(true);
  });

  it("warns about critically low climb rate", () => {
    const report = getPerformanceReport({
      densityAlt: 8000,
      fieldElevation: 7000,
      temperature: 25,
      aircraftName: "C172S",
    });

    expect(report.climbRate.actual).toBeLessThan(300);
    expect(report.warnings.some((w) => w.includes("critically"))).toBe(true);
  });

  it("uses default POH values when not provided", () => {
    const report = getPerformanceReport({
      densityAlt: 0,
      fieldElevation: 0,
      temperature: 15,
      aircraftName: "C172S",
    });

    expect(report.takeoffRoll.standard).toBe(1760);
    expect(report.climbRate.standard).toBe(730);
    expect(report.serviceCeiling.effectiveCeiling).toBe(14000);
  });

  it("uses custom POH values when provided", () => {
    const report = getPerformanceReport({
      densityAlt: 0,
      fieldElevation: 0,
      temperature: 15,
      aircraftName: "PA28",
      stdTakeoffRoll: 1625,
      stdClimbRate: 710,
      stdServiceCeiling: 12300,
    });

    expect(report.takeoffRoll.standard).toBe(1625);
    expect(report.climbRate.standard).toBe(710);
  });
});
