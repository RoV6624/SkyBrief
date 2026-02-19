import {
  emptySteps,
  allStepsComplete,
  DISPATCH_STEP_LABELS,
  DISPATCH_STEP_ORDER,
} from "../types";
import type { DispatchSteps } from "../types";

describe("emptySteps", () => {
  it("returns all steps as false", () => {
    const steps = emptySteps();
    expect(steps.briefing).toBe(false);
    expect(steps.frat).toBe(false);
    expect(steps.wb).toBe(false);
    expect(steps.checklist).toBe(false);
  });

  it("returns a new object each time", () => {
    const a = emptySteps();
    const b = emptySteps();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("allStepsComplete", () => {
  it("returns true when all steps are complete", () => {
    expect(allStepsComplete({ briefing: true, frat: true, wb: true, checklist: true })).toBe(true);
  });

  it("returns false when briefing is incomplete", () => {
    expect(allStepsComplete({ briefing: false, frat: true, wb: true, checklist: true })).toBe(false);
  });

  it("returns false when frat is incomplete", () => {
    expect(allStepsComplete({ briefing: true, frat: false, wb: true, checklist: true })).toBe(false);
  });

  it("returns false when wb is incomplete", () => {
    expect(allStepsComplete({ briefing: true, frat: true, wb: false, checklist: true })).toBe(false);
  });

  it("returns false when checklist is incomplete", () => {
    expect(allStepsComplete({ briefing: true, frat: true, wb: true, checklist: false })).toBe(false);
  });

  it("returns false when all incomplete", () => {
    expect(allStepsComplete(emptySteps())).toBe(false);
  });
});

describe("DISPATCH_STEP_LABELS", () => {
  it("has labels for all steps", () => {
    expect(DISPATCH_STEP_LABELS.briefing).toBe("Weather Briefing");
    expect(DISPATCH_STEP_LABELS.frat).toBe("FRAT Assessment");
    expect(DISPATCH_STEP_LABELS.wb).toBe("Weight & Balance");
    expect(DISPATCH_STEP_LABELS.checklist).toBe("Preflight Checklist");
  });

  it("has exactly 4 labels", () => {
    expect(Object.keys(DISPATCH_STEP_LABELS).length).toBe(4);
  });
});

describe("DISPATCH_STEP_ORDER", () => {
  it("defines correct step order", () => {
    expect(DISPATCH_STEP_ORDER).toEqual(["briefing", "frat", "wb", "checklist"]);
  });

  it("all steps have corresponding labels", () => {
    DISPATCH_STEP_ORDER.forEach((step) => {
      expect(DISPATCH_STEP_LABELS[step]).toBeDefined();
    });
  });
});
