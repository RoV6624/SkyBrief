import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage";
import { saveUserProfile, getUserProfile } from "@/services/firebase";
import { useUserStore } from "./user-store";
import { useMonitorStore } from "./monitor-store";
import type { UserRole } from "@/lib/auth/roles";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  role: UserRole | null;
  onboardingComplete: boolean;
  completedOnboardingUsers: string[]; // Track UIDs of users who completed onboarding
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  completeOnboarding: () => void;
  loadUserProfile: (uid: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,
      role: null,
      onboardingComplete: false,
      completedOnboardingUsers: [],
      setUser: async (user) => {
        // Keep loading state true while we check profile
        set({
          user,
          isAuthenticated: !!user,
          isLoading: true, // Keep loading until profile check completes
          role: null,      // Reset to prevent stale MMKV role from leaking
          isAdmin: false,  // Reset admin flag for new user context
        });

        // If user is logging in, try to load their profile from Firestore
        if (user) {
          await get().loadUserProfile(user.uid);
        } else {
          // User logging out
          set({ onboardingComplete: false, isLoading: false });
        }

        // Profile load complete, now safe to navigate
        set({ isLoading: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      completeOnboarding: async () => {
        const user = get().user;
        if (user) {
          // Update local state
          set((state) => ({
            onboardingComplete: true,
            completedOnboardingUsers: state.completedOnboardingUsers.includes(user.uid)
              ? state.completedOnboardingUsers
              : [...state.completedOnboardingUsers, user.uid],
          }));

          // Save to Firestore
          try {
            const userStoreState = useUserStore.getState();
            const monitorState = useMonitorStore.getState();

            // Derive role from experience level
            const derivedRole: UserRole =
              userStoreState.experienceLevel === "instructor"
                ? "instructor"
                : userStoreState.experienceLevel === "student"
                  ? "student"
                  : "pilot";

            set({ role: derivedRole });

            await saveUserProfile({
              uid: user.uid,
              name: userStoreState.pilotName || user.displayName || "",
              email: user.email || "",
              homeAirport: userStoreState.homeAirport,
              experienceLevel: userStoreState.experienceLevel,
              defaultAircraft: userStoreState.defaultAircraft ?? "",
              onboardingComplete: true,
              minimumsEnabled: monitorState.minimumsEnabled,
              personalMinimums: monitorState.personalMinimums,
              assignedInstructorUid: userStoreState.assignedInstructorUid ?? undefined,
              assignedInstructorName: userStoreState.assignedInstructorName ?? undefined,
              role: derivedRole,
            });
            console.log("[Auth] User profile saved to Firestore");
          } catch (error) {
            console.error("[Auth] Failed to save profile to Firestore:", error);
            // Don't block onboarding if Firestore save fails
          }
        }
      },
      loadUserProfile: async (uid: string) => {
        try {
          console.log("[Auth] Loading user profile from Firestore for:", uid);
          const profile = await getUserProfile(uid);

          if (profile && profile.onboardingComplete) {
            console.log("[Auth] Found existing profile with completed onboarding");

            // Load profile data into user store
            const userStore = useUserStore.getState();
            userStore.setProfile(profile.name, profile.email);
            userStore.setHomeAirport(profile.homeAirport);
            userStore.setExperienceLevel(profile.experienceLevel);
            userStore.setDefaultAircraft(profile.defaultAircraft);
            if (profile.assignedInstructorUid) {
              userStore.setAssignedInstructor(
                profile.assignedInstructorUid,
                profile.assignedInstructorName ?? null
              );
            }
            userStore.markConfigured();

            // Restore minimums into monitor store
            if (profile.minimumsEnabled !== undefined) {
              const monitorStore = useMonitorStore.getState();
              monitorStore.setMinimumsEnabled(profile.minimumsEnabled);
              if (profile.personalMinimums) {
                for (const [key, value] of Object.entries(profile.personalMinimums)) {
                  monitorStore.setPersonalMinimum(
                    key as keyof typeof profile.personalMinimums,
                    value
                  );
                }
              }
            }

            // Update auth state
            set((state) => ({
              onboardingComplete: true,
              isAdmin: profile?.role === "admin",
              role: (profile?.role as UserRole) ?? null,
              completedOnboardingUsers: state.completedOnboardingUsers.includes(uid)
                ? state.completedOnboardingUsers
                : [...state.completedOnboardingUsers, uid],
            }));
          } else {
            console.log("[Auth] No existing profile found or onboarding not complete");
            set({ onboardingComplete: false, isAdmin: false, role: null });
          }
        } catch (error) {
          console.error("[Auth] Failed to load user profile:", error);
          // If Firestore is unavailable, fall back to local state
          const state = get();
          const hasCompletedOnboarding = state.completedOnboardingUsers.includes(uid);
          set({ onboardingComplete: hasCompletedOnboarding, role: null, isAdmin: false });
        }
      },
      signOut: () => {
        // Clear user-specific stores to prevent data leakage between accounts
        try {
          useUserStore.getState().setProfile("", "");
          useUserStore.getState().setHomeAirport("");
          useMonitorStore.getState().setMinimumsEnabled(false);
        } catch (e) {
          // Swallow - stores may not be initialized
        }
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          role: null,
          onboardingComplete: false,
          // Keep completedOnboardingUsers so users don't have to onboard again
        });
      },
    }),
    {
      name: "skybrief-auth",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        user: state.user ? { uid: state.user.uid, email: null, displayName: null, photoURL: null } : null,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
        completedOnboardingUsers: state.completedOnboardingUsers,
      }),
      // Control how persisted state is merged
      merge: (persistedState, currentState) => {
        // Check for force reset flag - ignore persisted state if set
        if (__DEV__ && (global as any).__FORCE_RESET__) {
          console.log("[DEV] Force reset flag detected - ignoring persisted auth state");
          return currentState; // Use default state, ignore persisted
        }

        // Normal merge - use persisted state
        return { ...currentState, ...(persistedState as any) };
      },
      // Fix corrupted state on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If isAuthenticated but no user, fix the inconsistency
          if (state.isAuthenticated && !state.user) {
            state.isAuthenticated = false;
            state.onboardingComplete = false;
          }
        }
      },
    }
  )
);
