/**
 * Airport Familiarity Store
 *
 * Tracks which airports a pilot has visited and calculates familiarity scores.
 * Integrates with FRAT to automatically adjust the airport familiarity factor.
 */

import { createPersistedStore } from "./middleware";

export interface AirportVisit {
  icao: string;
  lastVisited: string; // ISO date
  visitCount: number;
  flightTypes: string[]; // local, xc, night, instrument
}

interface FamiliarityStore {
  visits: Record<string, AirportVisit>;

  // Actions
  recordVisit: (icao: string, flightType?: string) => void;
  removeAirport: (icao: string) => void;
  getVisit: (icao: string) => AirportVisit | null;
  getFamiliarityScore: (icao: string) => number;
  getFamiliarityLabel: (icao: string) => "home" | "familiar" | "visited" | "unfamiliar";
  getVisitedAirports: () => AirportVisit[];
}

export const useFamiliarityStore = createPersistedStore<FamiliarityStore>(
  "familiarity",
  (set, get) => ({
    visits: {},

    recordVisit: (icao: string, flightType?: string) => {
      const upper = icao.toUpperCase();
      const existing = get().visits[upper];
      const types = new Set(existing?.flightTypes ?? []);
      if (flightType) types.add(flightType);

      set({
        visits: {
          ...get().visits,
          [upper]: {
            icao: upper,
            lastVisited: new Date().toISOString(),
            visitCount: (existing?.visitCount ?? 0) + 1,
            flightTypes: Array.from(types),
          },
        },
      });
    },

    removeAirport: (icao: string) => {
      const upper = icao.toUpperCase();
      const { [upper]: _, ...rest } = get().visits;
      set({ visits: rest });
    },

    getVisit: (icao: string) => {
      return get().visits[icao.toUpperCase()] ?? null;
    },

    /**
     * Returns FRAT-compatible familiarity score (1-10).
     * 1 = home base, 10 = never visited.
     */
    getFamiliarityScore: (icao: string) => {
      const visit = get().visits[icao.toUpperCase()];
      if (!visit) return 10; // Never visited

      const daysSince = Math.floor(
        (Date.now() - new Date(visit.lastVisited).getTime()) / 86400000
      );

      // Score based on recency and frequency
      if (visit.visitCount >= 20 && daysSince < 90) return 1; // Home base
      if (visit.visitCount >= 10 && daysSince < 180) return 2;
      if (visit.visitCount >= 5 && daysSince < 90) return 3;
      if (visit.visitCount >= 3 && daysSince < 180) return 4;
      if (visit.visitCount >= 2 && daysSince < 365) return 5;
      if (visit.visitCount >= 1 && daysSince < 90) return 6;
      if (visit.visitCount >= 1 && daysSince < 365) return 7;
      return 8; // Visited but long ago
    },

    getFamiliarityLabel: (icao: string) => {
      const score = get().getFamiliarityScore(icao);
      if (score <= 2) return "home";
      if (score <= 5) return "familiar";
      if (score <= 8) return "visited";
      return "unfamiliar";
    },

    getVisitedAirports: () => {
      return Object.values(get().visits).sort(
        (a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
      );
    },
  })
);
