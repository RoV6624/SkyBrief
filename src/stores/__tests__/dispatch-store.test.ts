jest.mock("../middleware", () => ({
  createPersistedStore: (_name: string, fn: any) =>
    require("zustand").create(fn),
}));

import { useDispatchStore } from "../dispatch-store";
import type { NormalizedMetar } from "@/lib/api/types";
import type { ComplianceRecord, GoNoGoResult } from "@/lib/briefing/types";
import type { FRATInputs, FRATResult } from "@/lib/frat/types";
import type { WBSnapshot } from "@/lib/dispatch/types";

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
  } as NormalizedMetar;
}

const START_PARAMS = {
  studentUid: "student123",
  studentName: "Jane Doe",
  instructorUid: "cfi456",
  instructorName: "John Smith CFI",
  tenantId: "school789",
  station: "KJFK",
  stationName: "John F Kennedy Intl",
  flightType: "local" as const,
};

function resetStore() {
  useDispatchStore.getState().resetDispatch();
}

describe("dispatch-store", () => {
  beforeEach(() => resetStore());

  describe("initial state", () => {
    it("starts with null currentDispatch", () => {
      expect(useDispatchStore.getState().currentDispatch).toBeNull();
    });
  });

  describe("startDispatch", () => {
    it("creates a draft dispatch packet", () => {
      useDispatchStore.getState().startDispatch(START_PARAMS);
      const d = useDispatchStore.getState().currentDispatch;
      expect(d).not.toBeNull();
      expect(d?.status).toBe("draft");
      expect(d?.studentUid).toBe("student123");
      expect(d?.station).toBe("KJFK");
    });

    it("initializes all artifacts as null", () => {
      useDispatchStore.getState().startDispatch(START_PARAMS);
      const d = useDispatchStore.getState().currentDispatch;
      expect(d?.briefingRecord).toBeNull();
      expect(d?.fratResult).toBeNull();
      expect(d?.wbSnapshot).toBeNull();
      expect(d?.weatherSnapshot).toBeNull();
    });

    it("initializes completedSteps as all false", () => {
      useDispatchStore.getState().startDispatch(START_PARAMS);
      const steps = useDispatchStore.getState().currentDispatch?.completedSteps;
      expect(steps).toEqual({ briefing: false, frat: false, wb: false, checklist: false });
    });

    it("generates an ID", () => {
      useDispatchStore.getState().startDispatch(START_PARAMS);
      expect(useDispatchStore.getState().currentDispatch?.id).toBeDefined();
    });
  });

  describe("completeStep", () => {
    beforeEach(() => useDispatchStore.getState().startDispatch(START_PARAMS));

    it("marks individual steps complete", () => {
      useDispatchStore.getState().completeStep("briefing");
      expect(useDispatchStore.getState().currentDispatch?.completedSteps.briefing).toBe(true);
      expect(useDispatchStore.getState().currentDispatch?.completedSteps.frat).toBe(false);
    });

    it("does nothing when no dispatch exists", () => {
      resetStore();
      useDispatchStore.getState().completeStep("briefing");
      expect(useDispatchStore.getState().currentDispatch).toBeNull();
    });
  });

  describe("saveBriefing", () => {
    beforeEach(() => useDispatchStore.getState().startDispatch(START_PARAMS));

    it("saves record and marks briefing step complete", () => {
      const record = {
        briefingId: "b1",
        pilotName: "Jane",
        station: "KJFK",
        stationName: "JFK",
        aircraftType: "C172",
        flightType: "local",
        briefedAt: new Date(),
        completedAt: new Date(),
        itemsSummary: { total: 10, checked: 10, flagged: 0 },
        weatherSnapshot: { flightCategory: "VFR", ceiling: null, visibility: 10, wind: "270@8", rawMetar: "..." },
        signature: "abc",
      } as ComplianceRecord;
      useDispatchStore.getState().saveBriefing(record, makeMetar(), null);
      const d = useDispatchStore.getState().currentDispatch;
      expect(d?.briefingRecord).toEqual(record);
      expect(d?.completedSteps.briefing).toBe(true);
    });
  });

  describe("saveFrat", () => {
    beforeEach(() => useDispatchStore.getState().startDispatch(START_PARAMS));

    it("saves FRAT result/inputs and marks step complete", () => {
      const result: FRATResult = { totalScore: 25, riskLevel: "low", weatherScore: 10, pilotScore: 15, recommendation: "Safe" };
      const inputs: FRATInputs = { weatherScore: 10, pilotFatigue: 3, airportFamiliarity: 2, tripUrgency: 5 };
      useDispatchStore.getState().saveFrat(result, inputs);
      const d = useDispatchStore.getState().currentDispatch;
      expect(d?.fratResult).toEqual(result);
      expect(d?.fratInputs).toEqual(inputs);
      expect(d?.completedSteps.frat).toBe(true);
    });
  });

  describe("saveWB", () => {
    beforeEach(() => useDispatchStore.getState().startDispatch(START_PARAMS));

    it("saves WB snapshot and marks step complete", () => {
      const wb: WBSnapshot = { aircraftType: "C172", totalWeight: 2200, cg: 42.5, withinLimits: true, timestamp: new Date() };
      useDispatchStore.getState().saveWB(wb);
      const d = useDispatchStore.getState().currentDispatch;
      expect(d?.wbSnapshot).toEqual(wb);
      expect(d?.completedSteps.wb).toBe(true);
    });
  });

  describe("saveChecklist", () => {
    beforeEach(() => useDispatchStore.getState().startDispatch(START_PARAMS));

    it("marks checklist step complete", () => {
      useDispatchStore.getState().saveChecklist();
      expect(useDispatchStore.getState().currentDispatch?.completedSteps.checklist).toBe(true);
    });
  });

  describe("submitDispatch", () => {
    beforeEach(() => useDispatchStore.getState().startDispatch(START_PARAMS));

    it("sets status to submitted", () => {
      const result = useDispatchStore.getState().submitDispatch();
      expect(result?.status).toBe("submitted");
      expect(result?.submittedAt).toBeInstanceOf(Date);
    });

    it("returns null when no dispatch exists", () => {
      resetStore();
      expect(useDispatchStore.getState().submitDispatch()).toBeNull();
    });
  });

  describe("resetDispatch", () => {
    it("clears current dispatch", () => {
      useDispatchStore.getState().startDispatch(START_PARAMS);
      expect(useDispatchStore.getState().currentDispatch).not.toBeNull();
      useDispatchStore.getState().resetDispatch();
      expect(useDispatchStore.getState().currentDispatch).toBeNull();
    });
  });

  describe("completedSteps tracking", () => {
    it("tracks all steps independently through full workflow", () => {
      useDispatchStore.getState().startDispatch(START_PARAMS);
      const s = useDispatchStore.getState();

      s.saveBriefing({} as ComplianceRecord, makeMetar(), null);
      expect(useDispatchStore.getState().currentDispatch?.completedSteps).toEqual({
        briefing: true, frat: false, wb: false, checklist: false,
      });

      useDispatchStore.getState().saveFrat({} as FRATResult, {} as FRATInputs);
      expect(useDispatchStore.getState().currentDispatch?.completedSteps).toEqual({
        briefing: true, frat: true, wb: false, checklist: false,
      });

      useDispatchStore.getState().saveWB({} as WBSnapshot);
      expect(useDispatchStore.getState().currentDispatch?.completedSteps).toEqual({
        briefing: true, frat: true, wb: true, checklist: false,
      });

      useDispatchStore.getState().saveChecklist();
      expect(useDispatchStore.getState().currentDispatch?.completedSteps).toEqual({
        briefing: true, frat: true, wb: true, checklist: true,
      });
    });
  });
});
