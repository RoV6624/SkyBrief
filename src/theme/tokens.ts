// Stratus design system tokens — matches the web app's globals.css palette exactly
export const colors = {
  stratus: {
    50: "#f0f7ff",
    100: "#d4e9ff",
    200: "#b0d8ff",
    300: "#7cc4ff",
    400: "#3fa8ff",
    500: "#0c8ce9",
    600: "#0670c2",
    700: "#085696",
    800: "#083f6e",
    900: "#062847",
    950: "#062847",
  },
  vfr: "#22c55e",
  mvfr: "#3b82f6",
  ifr: "#ef4444",
  lifr: "#d946ef",
  alert: {
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#ef4444",
  },
  accent: "#D4A853",
} as const;

export interface ThemeColors {
  background: string;
  foreground: string;
  card: { bg: string; border: string };
  ghost: { bg: string; border: string };
  glass: { bg: string; border: string };
  muted: string;
  mutedForeground: string;
  tabBar: { bg: string; border: string; active: string; inactive: string };
}

export const lightTheme: ThemeColors = {
  background: "#ffffff",
  foreground: "#083f6e",
  card: {
    bg: "rgba(255,255,255,0.82)",
    border: "rgba(255,255,255,0.4)",
  },
  ghost: {
    bg: "rgba(255,255,255,0.35)",
    border: "rgba(148,163,184,0.5)",
  },
  glass: {
    bg: "rgba(255,255,255,0.5)",
    border: "rgba(255,255,255,0.3)",
  },
  muted: "#f0f7ff",
  mutedForeground: "#085696",
  tabBar: {
    bg: "rgba(255,255,255,0.85)",
    border: "rgba(12,140,233,0.1)",
    active: "#0c8ce9",
    inactive: "#6b90b8",
  },
};

// Dark theme — "Midnight Cockpit" — pure white text on deep dark background
// Optimized for cockpit readability with high contrast
export const darkTheme: ThemeColors = {
  background: "#121212",
  foreground: "#FFFFFF",
  card: {
    bg: "rgba(30,30,35,0.92)",
    border: "rgba(255,255,255,0.08)",
  },
  ghost: {
    bg: "rgba(25,25,30,0.6)",
    border: "rgba(255,255,255,0.12)",
  },
  glass: {
    bg: "rgba(28,28,33,0.7)",
    border: "rgba(255,255,255,0.06)",
  },
  muted: "#1e1e24",
  mutedForeground: "#a0a0b0",
  tabBar: {
    bg: "rgba(18,18,18,0.95)",
    border: "rgba(255,255,255,0.06)",
    active: "#FFFFFF",
    inactive: "#8888a0",
  },
};

// Sky gradient colors for DynamicSkyBackground
export const skyGradients = {
  day: {
    clear: ["#1e90ff", "#87ceeb", "#e0efff"],
    cloudy: ["#94a3b8", "#b0c4de", "#d1d5db"],
    rain: ["#475569", "#64748b", "#94a3b8"],
    snow: ["#cbd5e1", "#e2e8f0", "#f1f5f9"],
    fog: ["#d1d5db", "#e5e7eb", "#f3f4f6"],
    storm: ["#1e293b", "#334155", "#475569"],
  },
  night: {
    clear: ["#101638", "#182054", "#24326e", "#2d3f80"],
    cloudy: ["#131545", "#1e225a", "#2a3070"],
    rain: ["#101030", "#1a1c45", "#24285a"],
    storm: ["#0e0e28", "#161838", "#1e224a"],
  },
};

export const shadows = {
  cloud: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  glass: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
};

export const radii = {
  cloud: 24,
  control: 12,
  badge: 999,
};
