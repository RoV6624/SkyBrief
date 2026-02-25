import { createPersistedStore } from "./middleware";
import type { CustomAircraftProfile } from "@/lib/wb/aircraft-types";
import { resolveAirportIdentifier } from "@/services/airport-data";

type ExperienceLevel = "student" | "private" | "commercial" | "atp" | "instructor";

interface UserStore {
  pilotName: string;
  email: string;
  homeAirport: string;
  experienceLevel: ExperienceLevel;
  profileConfigured: boolean;
  defaultAircraft: string | null;
  assignedInstructorUid: string | null;
  assignedInstructorName: string | null;
  setProfile: (name: string, email: string) => void;
  setHomeAirport: (icao: string) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
  setDefaultAircraft: (aircraft: string | null) => void;
  setAssignedInstructor: (uid: string | null, name: string | null) => void;
  markConfigured: () => void;
  migrateHomeAirport: () => void;
  customAircraft: CustomAircraftProfile[];
  addCustomAircraft: (profile: CustomAircraftProfile) => void;
  removeCustomAircraft: (id: string) => void;
  updateCustomAircraft: (profile: CustomAircraftProfile) => void;
  scoutScore: number;
  incrementScoutScore: () => void;
}

export const useUserStore = createPersistedStore<UserStore>(
  "user",
  (set, get) => ({
      pilotName: "",
      email: "",
      homeAirport: "",
      experienceLevel: "private",
      profileConfigured: false,
      defaultAircraft: null,
      assignedInstructorUid: null,
      assignedInstructorName: null,
      setProfile: (pilotName, email) => set({ pilotName, email }),
      setHomeAirport: (icao) => {
        const resolved = resolveAirportIdentifier(icao) || icao.toUpperCase();
        set({ homeAirport: resolved });
      },
      setExperienceLevel: (level) => set({ experienceLevel: level }),
      setDefaultAircraft: (aircraft) => set({ defaultAircraft: aircraft }),
      setAssignedInstructor: (uid, name) =>
        set({ assignedInstructorUid: uid, assignedInstructorName: name }),
      markConfigured: () => set({ profileConfigured: true }),
      migrateHomeAirport: () => {
        const current = get().homeAirport;
        if (!current) return;

        const resolved = resolveAirportIdentifier(current);
        if (resolved && resolved !== current) {
          console.log(`[Migration] Updating home airport: ${current} → ${resolved}`);
          set({ homeAirport: resolved });
        }
      },
      customAircraft: [],
      addCustomAircraft: (profile) =>
        set((s) => ({ customAircraft: [...s.customAircraft, profile] })),
      removeCustomAircraft: (id) =>
        set((s) => ({ customAircraft: s.customAircraft.filter((p) => p.id !== id) })),
      updateCustomAircraft: (profile) =>
        set((s) => ({
          customAircraft: s.customAircraft.map((p) =>
            p.id === profile.id ? profile : p
          ),
        })),
      scoutScore: 0,
      incrementScoutScore: () => set((s) => ({ scoutScore: s.scoutScore + 1 })),
    }),
  {
    onRehydrate: (state) => {
      console.log(`[UserStore] Rehydrated - homeAirport: "${state?.homeAirport}"`);
    },
  }
);
