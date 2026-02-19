import { createPersistedStore } from "./middleware";

export interface FlightLogEntry {
  id: string;
  date: string; // ISO date string
  aircraft: string; // tail number or aircraft name
  departure: string; // ICAO
  arrival: string; // ICAO
  route: string; // route string
  durationMinutes: number;
  flightType: "local" | "xc" | "night" | "instrument" | "checkride";
  weatherConditions: string; // VFR/MVFR/IFR/LIFR
  station: string; // briefing station ICAO
  remarks: string;
  briefingId?: string; // link to a briefing checklist
  fratScore?: number;
  createdAt: string; // ISO
}

interface LogbookStore {
  entries: FlightLogEntry[];
  addEntry: (entry: Omit<FlightLogEntry, "id" | "createdAt">) => void;
  updateEntry: (id: string, updates: Partial<FlightLogEntry>) => void;
  deleteEntry: (id: string) => void;
  getTotalHours: () => number;
  getEntriesByAircraft: (aircraft: string) => FlightLogEntry[];
  getEntriesByStation: (station: string) => FlightLogEntry[];
}

export const useLogbookStore = createPersistedStore<LogbookStore>(
  "logbook",
  (set, get) => ({
    entries: [],
    addEntry: (entry) => {
      const newEntry: FlightLogEntry = {
        ...entry,
        id: `log-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const current = get().entries;
      set({ entries: [newEntry, ...current].slice(0, 500) });
    },
    updateEntry: (id, updates) => {
      const entries = get().entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
      set({ entries });
    },
    deleteEntry: (id) => {
      const entries = get().entries.filter((entry) => entry.id !== id);
      set({ entries });
    },
    getTotalHours: () => {
      const total = get().entries.reduce(
        (sum, entry) => sum + entry.durationMinutes,
        0
      );
      return Math.round((total / 60) * 10) / 10;
    },
    getEntriesByAircraft: (aircraft) => {
      return get().entries.filter((entry) => entry.aircraft === aircraft);
    },
    getEntriesByStation: (station) => {
      return get().entries.filter(
        (entry) => entry.station.toUpperCase() === station.toUpperCase()
      );
    },
  }),
  {
    onRehydrate: (state) => {
      console.log(
        `[LogbookStore] Rehydrated - ${state?.entries?.length ?? 0} entries`
      );
    },
  }
);
