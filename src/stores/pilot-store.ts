import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage";

interface PilotStore {
  lastFlightDate: number | null; // UNIX timestamp
  medicalExpirationDate: number | null; // Future extension
  flightReviewDate: number | null; // Future extension
  setLastFlightDate: (timestamp: number) => void;
  getDaysSinceLastFlight: () => number | null;
}

export const usePilotStore = create<PilotStore>()(
  persist(
    (set, get) => ({
      lastFlightDate: null,
      medicalExpirationDate: null,
      flightReviewDate: null,
      setLastFlightDate: (timestamp) => set({ lastFlightDate: timestamp }),
      getDaysSinceLastFlight: () => {
        const { lastFlightDate } = get();
        if (!lastFlightDate) return null;
        const now = Date.now();
        const diffMs = now - lastFlightDate;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      },
    }),
    {
      name: "skybrief-pilot",
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
