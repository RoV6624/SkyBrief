import { createPersistedStore } from "./middleware";
import type {
  BriefingChecklist,
  ComplianceRecord,
  FlightType,
  BriefingSubmission,
  BriefingSubmissionStatus,
} from "@/lib/briefing/types";

interface BriefingStore {
  // State
  activeChecklist: BriefingChecklist | null;
  completedBriefings: ComplianceRecord[];
  learningMode: boolean;

  // Briefing Checklist Actions
  setActiveChecklist: (checklist: BriefingChecklist) => void;
  updateActiveChecklist: (checklist: BriefingChecklist) => void;
  clearActiveChecklist: () => void;
  addCompletedBriefing: (record: ComplianceRecord) => void;

  // Learning Mode
  setLearningMode: (enabled: boolean) => void;
}

export const useBriefingStore = createPersistedStore<BriefingStore>(
  "briefing",
  (set, get) => ({
    activeChecklist: null,
    completedBriefings: [],
    learningMode: false,

    setActiveChecklist: (checklist) =>
      set({ activeChecklist: checklist }),

    updateActiveChecklist: (checklist) =>
      set({ activeChecklist: checklist }),

    clearActiveChecklist: () =>
      set({ activeChecklist: null }),

    addCompletedBriefing: (record) =>
      set((state) => ({
        completedBriefings: [record, ...state.completedBriefings].slice(0, 50),
      })),

    setLearningMode: (enabled) =>
      set({ learningMode: enabled }),
  }),
  {
    partialize: (state) => ({
      completedBriefings: state.completedBriefings,
      learningMode: state.learningMode,
    }),
  }
);
