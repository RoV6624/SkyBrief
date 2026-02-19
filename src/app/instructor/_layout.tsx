import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function InstructorLayout() {
  const { isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? "#121212" : "#ffffff",
        },
      }}
    />
  );
}
