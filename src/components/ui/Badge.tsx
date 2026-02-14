import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { FlightCategory } from "@/lib/api/types";
import { colors } from "@/theme/tokens";

const categoryColors: Record<FlightCategory, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

interface FlightCategoryBadgeProps {
  category: FlightCategory;
  size?: "sm" | "md" | "lg";
}

export function FlightCategoryBadge({
  category,
  size = "md",
}: FlightCategoryBadgeProps) {
  const bgColor = categoryColors[category];
  const fontSize = size === "sm" ? 9 : size === "md" ? 11 : 14;
  const px = size === "sm" ? 6 : size === "md" ? 10 : 14;
  const py = size === "sm" ? 2 : size === "md" ? 3 : 5;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor, paddingHorizontal: px, paddingVertical: py },
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize, fontFamily: "Inter_700Bold" },
        ]}
      >
        {category}
      </Text>
    </View>
  );
}

interface SeverityBadgeProps {
  severity: "green" | "amber" | "red";
  label: string;
}

export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  const bgColor =
    severity === "red"
      ? colors.alert.red
      : severity === "amber"
      ? colors.alert.amber
      : colors.alert.green;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor, paddingHorizontal: 10, paddingVertical: 4 },
      ]}
    >
      <Text style={[styles.text, { fontSize: 10, fontFamily: "Inter_700Bold" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
