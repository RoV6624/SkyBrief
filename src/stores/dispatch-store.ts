/**
 * Zustand store tracking the current dispatch draft.
 *
 * Persisted via MMKV so the student can resume an in-progress
 * dispatch across app restarts.
 */

import { createPersistedStore } from "./middleware";
import type { ComplianceRecord, GoNoGoResult, FlightType } from "@/lib/briefing/types";
import type { FRATInputs, FRATResult } from "@/lib/frat/types";
import type { NormalizedMetar } from "@/lib/api/types";
import type {
  DispatchPacket,
  DispatchSteps,
  WBSnapshot,
} from "@/lib/dispatch/types";
import { emptySteps } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface DispatchStore {
  // State
  currentDispatch: DispatchPacket | null;

  // Actions
  startDispatch(params: {
    studentUid: string;
    studentName: string;
    instructorUid: string;
    instructorName: string;
    tenantId: string;
    station: string;
    stationName: string;
    flightType: FlightType;
  }): void;

  completeStep(step: keyof DispatchSteps): void;

  saveBriefing(
    record: ComplianceRecord,
    weatherSnapshot: NormalizedMetar,
    goNoGoResult: GoNoGoResult | null
  ): void;

  saveFrat(result: FRATResult, inputs: FRATInputs): void;

  saveWB(snapshot: WBSnapshot): void;

  saveChecklist(): void;

  submitDispatch(): DispatchPacket | null;

  resetDispatch(): void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useDispatchStore = createPersistedStore<DispatchStore>(
  "dispatch",
  (set, get) => ({
    currentDispatch: null,

    startDispatch(params) {
      const packet: DispatchPacket = {
        id: generateId(),
        studentUid: params.studentUid,
        studentName: params.studentName,
        instructorUid: params.instructorUid,
        instructorName: params.instructorName,
        tenantId: params.tenantId,
        station: params.station,
        stationName: params.stationName,
        flightType: params.flightType,
        status: "draft",
        briefingRecord: null,
        fratResult: null,
        fratInputs: null,
        wbSnapshot: null,
        goNoGoResult: null,
        weatherSnapshot: null,
        completedSteps: emptySteps(),
        createdAt: new Date(),
        submittedAt: null,
        reviewedAt: null,
        reviewerComment: null,
        preflightStartedAt: null,
        departedAt: null,
      };
      set({ currentDispatch: packet });
    },

    completeStep(step) {
      const dispatch = get().currentDispatch;
      if (!dispatch) return;
      set({
        currentDispatch: {
          ...dispatch,
          completedSteps: {
            ...dispatch.completedSteps,
            [step]: true,
          },
        },
      });
    },

    saveBriefing(record, weatherSnapshot, goNoGoResult) {
      const dispatch = get().currentDispatch;
      if (!dispatch) return;
      set({
        currentDispatch: {
          ...dispatch,
          briefingRecord: record,
          weatherSnapshot,
          goNoGoResult,
          completedSteps: {
            ...dispatch.completedSteps,
            briefing: true,
          },
        },
      });
    },

    saveFrat(result, inputs) {
      const dispatch = get().currentDispatch;
      if (!dispatch) return;
      set({
        currentDispatch: {
          ...dispatch,
          fratResult: result,
          fratInputs: inputs,
          completedSteps: {
            ...dispatch.completedSteps,
            frat: true,
          },
        },
      });
    },

    saveWB(snapshot) {
      const dispatch = get().currentDispatch;
      if (!dispatch) return;
      set({
        currentDispatch: {
          ...dispatch,
          wbSnapshot: snapshot,
          completedSteps: {
            ...dispatch.completedSteps,
            wb: true,
          },
        },
      });
    },

    saveChecklist() {
      const dispatch = get().currentDispatch;
      if (!dispatch) return;
      set({
        currentDispatch: {
          ...dispatch,
          completedSteps: {
            ...dispatch.completedSteps,
            checklist: true,
          },
        },
      });
    },

    submitDispatch() {
      const dispatch = get().currentDispatch;
      if (!dispatch) return null;

      const submitted: DispatchPacket = {
        ...dispatch,
        status: "submitted",
        submittedAt: new Date(),
      };

      set({ currentDispatch: submitted });
      return submitted;
    },

    resetDispatch() {
      set({ currentDispatch: null });
    },
  }),
  {
    partialize: (state) => ({
      currentDispatch: state.currentDispatch,
    }),
  }
);
