/**
 * XC Wizard persisted state
 *
 * Saves waypoints and current step so the wizard survives
 * backgrounding / accidental dismissal.
 */

import { createPersistedStore } from "./middleware";

export interface XCWizardState {
  waypoints: string[];
  currentStep: number; // 1-4
  setWaypoints: (waypoints: string[]) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
}

export const useXCWizardStore = createPersistedStore<XCWizardState>(
  "xc-wizard",
  (set) => ({
    waypoints: ["", ""],
    currentStep: 1,
    setWaypoints: (waypoints) => set({ waypoints }),
    setCurrentStep: (step) => set({ currentStep: step }),
    reset: () => set({ waypoints: ["", ""], currentStep: 1 }),
  }),
  {
    partialize: (state) => ({
      waypoints: state.waypoints,
      currentStep: state.currentStep,
    }),
  }
);
