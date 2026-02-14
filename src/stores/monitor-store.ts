import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/alerts/thresholds";
import {
  DEFAULT_PERSONAL_MINIMUMS,
  type PersonalMinimums,
} from "@/lib/minimums/types";

interface MonitorStore {
  isActive: boolean;
  setActive: (active: boolean) => void;
  thresholds: Thresholds;
  setThreshold: <K extends keyof Thresholds>(
    key: K,
    value: Thresholds[K]
  ) => void;
  runwayHeading: number | null;
  setRunwayHeading: (hdg: number | null) => void;
  // Personal Minimums
  personalMinimums: PersonalMinimums;
  setPersonalMinimum: <K extends keyof PersonalMinimums>(
    key: K,
    value: PersonalMinimums[K]
  ) => void;
  minimumsEnabled: boolean;
  setMinimumsEnabled: (enabled: boolean) => void;
}

export const useMonitorStore = create<MonitorStore>()(
  persist(
    (set, get) => ({
      isActive: true,
      setActive: (active) => set({ isActive: active }),
      thresholds: DEFAULT_THRESHOLDS,
      setThreshold: (key, value) =>
        set({ thresholds: { ...get().thresholds, [key]: value } }),
      runwayHeading: null,
      setRunwayHeading: (hdg) => set({ runwayHeading: hdg }),
      personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
      setPersonalMinimum: (key, value) =>
        set({
          personalMinimums: { ...get().personalMinimums, [key]: value },
        }),
      minimumsEnabled: false,
      setMinimumsEnabled: (enabled) => set({ minimumsEnabled: enabled }),
    }),
    {
      name: "skybrief-monitor",
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
