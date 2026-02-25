import React from "react";
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme/ThemeProvider";
import { shadows, radii } from "@/theme/tokens";

interface CloudCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CloudCard({ children, style }: CloudCardProps) {
  const { theme, isDark } = useTheme();

  if (Platform.OS === "ios") {
    return (
      <View
        style={[
          styles.container,
          shadows.cloud,
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
          ...shadows.cloud,
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
    overflow: "hidden",
  },
  blur: {
    padding: 20,
  },
  content: {
    padding: 20,
  },
});
