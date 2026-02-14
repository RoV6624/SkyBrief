import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, type ThemeColors } from "./tokens";
import { useThemeStore } from "@/stores/theme-store";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  mode: "system",
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { mode, setMode } = useThemeStore();

  const isDark = useMemo(() => {
    if (mode === "system") return systemScheme === "dark";
    return mode === "dark";
  }, [mode, systemScheme]);

  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ theme, mode, isDark, setMode }),
    [theme, mode, isDark, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
