import { createPersistedStore } from "./middleware";

interface WeatherStore {
  selectedStation: string | null;
  setStation: (icao: string) => void;
  recentStations: string[];
  addRecentStation: (icao: string) => void;
  pinnedStations: string[];
  togglePinnedStation: (icao: string) => void;
  isPinned: (icao: string) => boolean;
}

export const useWeatherStore = createPersistedStore<WeatherStore>(
  "weather",
  (set, get) => ({
    selectedStation: null,
    setStation: (icao) => set({ selectedStation: icao.toUpperCase() }),
    recentStations: [],
    addRecentStation: (icao) => {
      const upper = icao.toUpperCase();
      const recent = get().recentStations.filter((s) => s !== upper);
      set({ recentStations: [upper, ...recent].slice(0, 10) });
    },
    pinnedStations: [],
    togglePinnedStation: (icao) => {
      const upper = icao.toUpperCase();
      const pinned = get().pinnedStations;
      if (pinned.includes(upper)) {
        set({ pinnedStations: pinned.filter((s) => s !== upper) });
      } else {
        set({ pinnedStations: [...pinned, upper].slice(0, 4) });
      }
    },
    isPinned: (icao) => get().pinnedStations.includes(icao.toUpperCase()),
  }),
  {
    onRehydrate: (state) => {
      console.log(`[WeatherStore] Rehydrated - selectedStation: "${state?.selectedStation}"`);
    },
  }
);
