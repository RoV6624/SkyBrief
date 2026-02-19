import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";

interface DataCardProps {
  label: string;
  value: string;
  unit: string;
  supplementary?: string;
  supplementaryColor?: string;
  accentColor?: string;
  style?: ViewStyle;
}

export function DataCard({
  label,
  value,
  unit,
  supplementary,
  supplementaryColor,
  accentColor,
  style,
}: DataCardProps) {
  const { theme, isDark } = useTheme();

  return (
    <CloudCard style={style}>
      <Text
        style={[
          styles.label,
          { color: isDark ? theme.mutedForeground : theme.mutedForeground },
        ]}
      >
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            { color: accentColor ?? theme.foreground },
          ]}
        >
          {value}
        </Text>
        {unit !== "" && (
          <Text
            style={[
              styles.unit,
              { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" },
            ]}
          >
            {unit}
          </Text>
        )}
      </View>
      {supplementary && (
        <Text
          style={[
            styles.supplementary,
            {
              color:
                supplementaryColor ??
                (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"),
            },
          ]}
        >
          {supplementary}
        </Text>
      )}
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontFamily: "JetBrainsMono_700Bold",
  },
  unit: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_400Regular",
  },
  supplementary: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
});
