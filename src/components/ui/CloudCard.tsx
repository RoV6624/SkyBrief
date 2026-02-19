import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme/ThemeProvider";
import { shadows, radii } from "@/theme/tokens";

interface CloudCardProps {
  children: React.ReactNode;
  className?: string;
  style?: object;
}

export function CloudCard({ children, style }: CloudCardProps) {
  const { theme, isDark } = useTheme();

  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          styles.container,
          {
            borderColor: theme.card.border,
            ...shadows.cloud,
            zIndex: 1,
          },
          style,
        ]}
      >
        <BlurView
          intensity={90}
          tint={isDark ? "dark" : "light"}
          style={[styles.blur, { backgroundColor: theme.card.bg }]}
        >
          {children}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "rgba(30,30,35,0.92)" : "rgba(255,255,255,0.88)",
          borderColor: theme.card.border,
          ...shadows.cloud,
          zIndex: 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.cloud,
    borderWidth: 1,
    overflow: "hidden",
  },
  blur: {
    padding: 20,
  },
  content: {
    padding: 20,
  },
});
