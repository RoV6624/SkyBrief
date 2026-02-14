import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage";

export interface DaylightSettings {
  nightMinimumsEnabled: boolean;
  nightCeiling: number; // ft
  nightVisibility: number; // SM
  currencyAlertsEnabled: boolean;
  showCurrencyMarker: boolean;
  showSunsetMarker: boolean;
}

interface DaylightStore {
  settings: DaylightSettings;
  setNightMinimumsEnabled: (enabled: boolean) => void;
  setNightCeiling: (value: number) => void;
  setNightVisibility: (value: number) => void;
  setCurrencyAlertsEnabled: (enabled: boolean) => void;
  setShowCurrencyMarker: (show: boolean) => void;
  setShowSunsetMarker: (show: boolean) => void;
}

const DEFAULT_SETTINGS: DaylightSettings = {
  nightMinimumsEnabled: false,
  nightCeiling: 1500,
  nightVisibility: 5,
  currencyAlertsEnabled: false,
  showCurrencyMarker: true,
  showSunsetMarker: true,
};

export const useDaylightStore = create<DaylightStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      setNightMinimumsEnabled: (enabled) =>
        set({ settings: { ...get().settings, nightMinimumsEnabled: enabled } }),
      setNightCeiling: (value) =>
        set({ settings: { ...get().settings, nightCeiling: value } }),
      setNightVisibility: (value) =>
        set({ settings: { ...get().settings, nightVisibility: value } }),
      setCurrencyAlertsEnabled: (enabled) =>
        set({ settings: { ...get().settings, currencyAlertsEnabled: enabled } }),
      setShowCurrencyMarker: (show) =>
        set({ settings: { ...get().settings, showCurrencyMarker: show } }),
      setShowSunsetMarker: (show) =>
        set({ settings: { ...get().settings, showSunsetMarker: show } }),
    }),
    {
      name: "daylight-settings",
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
