import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage";
import { CESSNA_172S, type AircraftType } from "@/lib/wb/aircraft-types";

interface SavedAircraftProfile {
  baseAircraftId: string;
  customName: string;
  emptyWeight: number;
  emptyArm: number;
  savedAt: number; // timestamp
}

interface WBStore {
  aircraft: AircraftType;
  setAircraft: (aircraft: AircraftType) => void;
  stationWeights: number[];
  setStationWeight: (index: number, weight: number) => void;
  fuelGallons: number;
  setFuelGallons: (gal: number) => void;
  fuelUnit: "gal" | "lbs";
  toggleFuelUnit: () => void;
  estimatedFuelBurn: number;
  setEstimatedFuelBurn: (gal: number) => void;
  fieldElevation: number;
  setFieldElevation: (ft: number) => void;
  altimeterSetting: number;
  setAltimeterSetting: (inHg: number) => void;
  oat: number;
  setOat: (celsius: number) => void;
  showLanding: boolean;
  setShowLanding: (show: boolean) => void;
  // Custom empty weight/arm overrides
  customEmptyWeight: number | null;
  customEmptyArm: number | null;
  setCustomEmptyWeight: (w: number | null) => void;
  setCustomEmptyArm: (a: number | null) => void;
  // Saved aircraft profiles
  savedProfiles: SavedAircraftProfile[];
  saveCurrentAircraft: (name: string) => void;
  loadSavedProfile: (index: number) => void;
  deleteSavedProfile: (index: number) => void;
}

export const useWBStore = create<WBStore>()(
  persist(
    (set, get) => ({
      aircraft: CESSNA_172S,
      setAircraft: (aircraft) =>
        set({
          aircraft,
          stationWeights: aircraft.stations.map(() => 0),
          customEmptyWeight: null,
          customEmptyArm: null,
        }),
      stationWeights: CESSNA_172S.stations.map(() => 0),
      setStationWeight: (index, weight) => {
        const weights = [...get().stationWeights];
        weights[index] = weight;
        set({ stationWeights: weights });
      },
      fuelGallons: 0,
      setFuelGallons: (gal) => set({ fuelGallons: gal }),
      fuelUnit: "gal",
      toggleFuelUnit: () => {
        const current = get();
        if (current.fuelUnit === "gal") {
          set({
            fuelUnit: "lbs",
            fuelGallons: Math.round(
              current.fuelGallons * current.aircraft.fuelWeightPerGal
            ),
          });
        } else {
          set({
            fuelUnit: "gal",
            fuelGallons: Math.round(
              current.fuelGallons / current.aircraft.fuelWeightPerGal
            ),
          });
        }
      },
      estimatedFuelBurn: 0,
      setEstimatedFuelBurn: (gal) => set({ estimatedFuelBurn: gal }),
      fieldElevation: 0,
      setFieldElevation: (ft) => set({ fieldElevation: ft }),
      altimeterSetting: 29.92,
      setAltimeterSetting: (inHg) => set({ altimeterSetting: inHg }),
      oat: 15,
      setOat: (celsius) => set({ oat: celsius }),
      showLanding: false,
      setShowLanding: (show) => set({ showLanding: show }),
      // Custom overrides
      customEmptyWeight: null,
      customEmptyArm: null,
      setCustomEmptyWeight: (w) => set({ customEmptyWeight: w }),
      setCustomEmptyArm: (a) => set({ customEmptyArm: a }),
      // Saved profiles
      savedProfiles: [],
      saveCurrentAircraft: (name) => {
        const { aircraft, customEmptyWeight, customEmptyArm, savedProfiles } =
          get();
        const profile: SavedAircraftProfile = {
          baseAircraftId: aircraft.id,
          customName: name,
          emptyWeight: customEmptyWeight ?? aircraft.emptyWeight,
          emptyArm: customEmptyArm ?? aircraft.emptyArm,
          savedAt: Date.now(),
        };
        set({ savedProfiles: [...savedProfiles, profile] });
      },
      loadSavedProfile: (index) => {
        const { savedProfiles } = get();
        const profile = savedProfiles[index];
        if (!profile) return;
        set({
          customEmptyWeight: profile.emptyWeight,
          customEmptyArm: profile.emptyArm,
        });
      },
      deleteSavedProfile: (index) => {
        const profiles = [...get().savedProfiles];
        profiles.splice(index, 1);
        set({ savedProfiles: profiles });
      },
    }),
    {
      name: "skybrief-wb",
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
