import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ArrowUpDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { CloudCard } from "@/components/ui/CloudCard";
import { calculateWindComponents, getCrosswindDirection } from "@/lib/aviation/wind-calculations";
import type { RunwayData } from "@/lib/airport/types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface RunwayWindCardProps {
  runway: RunwayData;
  windDirection: number | "VRB";
  windSpeed: number;
}

const SURFACE_LABELS: Record<string, string> = {
  ASP: "Asphalt",
  CON: "Concrete",
  TURF: "Turf",
  GRS: "Grass",
  GVL: "Gravel",
  DIRT: "Dirt",
  WAT: "Water",
  COR: "Coral",
  BIT: "Bituminous",
  SAND: "Sand",
  MAC: "Macadam",
};

function decodeSurface(code: string): string {
  return SURFACE_LABELS[code.toUpperCase()] ?? code;
}

export function RunwayWindCard({ runway, windDirection, windSpeed }: RunwayWindCardProps) {
  const { isDark, theme } = useTheme();
  const [activeEnd, setActiveEnd] = useState<"le" | "he">("le");

  // Auto-select the favorable end (higher headwind)
  useEffect(() => {
    if (windDirection === "VRB") return;
    const leWind = calculateWindComponents(runway.le_heading_degT, windDirection, windSpeed);
    const heWind = calculateWindComponents(runway.he_heading_degT, windDirection, windSpeed);
    setActiveEnd(leWind.headwind >= heWind.headwind ? "le" : "he");
  }, [runway.runway_id, windDirection, windSpeed]);

  const isVRB = windDirection === "VRB";

  const heading = activeEnd === "le" ? runway.le_heading_degT : runway.he_heading_degT;
  const ident = activeEnd === "le" ? runway.le_ident : runway.he_ident;

  const wind = !isVRB ? calculateWindComponents(heading, windDirection, windSpeed) : null;
  const xDir = !isVRB ? getCrosswindDirection(heading, windDirection) : "none";

  // Colors
  const headColor = wind
    ? wind.headwind >= 0
      ? colors.alert.green
      : colors.alert.red
    : colors.mvfr;

  const crossColor = wind
    ? wind.crosswind > 15
      ? colors.alert.red
      : wind.crosswind >= 10
        ? colors.alert.amber
        : colors.alert.green
    : colors.mvfr;

  const headTextColor = wind
    ? wind.headwind >= 0
      ? "#065f46"
      : "#991b1b"
    : "#1e40af";

  const crossTextColor = wind
    ? wind.crosswind > 15
      ? "#991b1b"
      : wind.crosswind >= 10
        ? "#92400e"
        : "#065f46"
    : "#1e40af";

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveEnd((prev) => (prev === "le" ? "he" : "le"));
  };

  const surfaceLabel = decodeSurface(runway.surface);
  const infoLine = [
    runway.length_ft > 0 && runway.width_ft > 0
      ? `${runway.length_ft.toLocaleString()} \u00D7 ${runway.width_ft} ft`
      : runway.length_ft > 0
        ? `${runway.length_ft.toLocaleString()} ft`
        : null,
    surfaceLabel,
    runway.lighted ? "Lighted" : "Unlighted",
  ]
    .filter(Boolean)
    .join(" \u00B7 ");

  return (
    <CloudCard>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.title,
            { color: isDark ? "#FFFFFF" : colors.stratus[800] },
          ]}
        >
          RWY {runway.le_ident} / {runway.he_ident}
        </Text>
        <Pressable onPress={handleFlip} style={styles.flipButton} hitSlop={8}>
          <ArrowUpDown size={14} color={isDark ? "rgba(255,255,255,0.6)" : colors.stratus[500]} />
          <Text
            style={[
              styles.flipText,
              { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[500] },
            ]}
          >
            Flip
          </Text>
        </Pressable>
      </View>

      {/* Active end info */}
      <Text
        style={[
          styles.activeLabel,
          { color: isDark ? "rgba(255,255,255,0.55)" : colors.stratus[600] },
        ]}
      >
        Using Runway {ident} {"\u00B7"} {heading.toString().padStart(3, "0")}\u00B0
      </Text>

      {/* Wind component badges */}
      {isVRB ? (
        <View style={[styles.vrbBadge, { backgroundColor: `${colors.mvfr}20`, borderColor: `${colors.mvfr}40` }]}>
          <Text style={[styles.vrbText, { color: isDark ? colors.mvfr : "#1e40af" }]}>
            Variable Winds
          </Text>
        </View>
      ) : wind ? (
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: `${headColor}20`, borderColor: `${headColor}40` },
            ]}
          >
            <Text
              style={[
                styles.badgeLabel,
                { color: isDark ? "rgba(255,255,255,0.65)" : colors.stratus[600] },
              ]}
            >
              {wind.headwind >= 0 ? "HEADWIND" : "TAILWIND"}
            </Text>
            <Text style={[styles.badgeValue, { color: headTextColor }]}>
              {wind.headwind >= 0 ? "+" : ""}
              {wind.headwind} kt
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              { backgroundColor: `${crossColor}20`, borderColor: `${crossColor}40` },
            ]}
          >
            <Text
              style={[
                styles.badgeLabel,
                { color: isDark ? "rgba(255,255,255,0.65)" : colors.stratus[600] },
              ]}
            >
              CROSSWIND
            </Text>
            <Text style={[styles.badgeValue, { color: crossTextColor }]}>
              {wind.crosswind} kt{xDir !== "none" ? ` ${xDir === "right" ? "R" : "L"}` : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Runway info */}
      {infoLine.length > 0 && (
        <Text
          style={[
            styles.infoLine,
            { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
          ]}
        >
          {infoLine}
        </Text>
      )}
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_700Bold",
    letterSpacing: 0.3,
  },
  flipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  flipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  activeLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  badgeLabel: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.3,
  },
  badgeValue: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_700Bold",
  },
  vrbBadge: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  vrbText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  infoLine: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },
});
