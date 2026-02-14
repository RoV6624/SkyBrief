import { createPersistedStore } from "./middleware";

interface WeatherStore {
  selectedStation: string | null;
  setStation: (icao: string) => void;
  recentStations: string[];
  addRecentStation: (icao: string) => void;
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
  }),
  {
    onRehydrate: (state) => {
      console.log(`[WeatherStore] Rehydrated - selectedStation: "${state?.selectedStation}"`);
    },
  }
);
