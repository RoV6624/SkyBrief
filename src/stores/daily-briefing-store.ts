import { createPersistedStore } from "./middleware";

interface DailyBriefingStore {
  lastShownDate: string | null;
  enabled: boolean;
  isVisible: boolean;
  shouldAutoShow: () => boolean;
  markShownToday: () => void;
  dismiss: () => void;
  openManually: () => void;
  setEnabled: (enabled: boolean) => void;
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const useDailyBriefingStore = createPersistedStore<DailyBriefingStore>(
  "daily-briefing",
  (set, get) => ({
    lastShownDate: null,
    enabled: true,
    isVisible: false,

    shouldAutoShow: () => {
      const { enabled, lastShownDate } = get();
      return enabled && lastShownDate !== getLocalDateString();
    },

    markShownToday: () => set({ lastShownDate: getLocalDateString() }),

    dismiss: () => set({ isVisible: false }),

    openManually: () => set({ isVisible: true }),

    setEnabled: (enabled) => set({ enabled }),
  }),
  {
    partialize: (state) => ({
      lastShownDate: state.lastShownDate,
      enabled: state.enabled,
    }),
  }
);
