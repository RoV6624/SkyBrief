import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { shadows, radii } from "@/theme/tokens";

interface GhostCardProps {
  children: React.ReactNode;
  style?: object;
}

export function GhostCard({ children, style }: GhostCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.ghost.bg,
          borderColor: theme.ghost.border,
          ...shadows.glass,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.cloud,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 20,
  },
});
