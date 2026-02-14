import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Wind,
  Thermometer,
  Eye,
  Gauge,
  Droplets,
} from "lucide-react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { FlightCategoryBadge } from "@/components/ui/Badge";
import { PulsingDot } from "@/components/ui/PulsingDot";
import type { NormalizedMetar } from "@/lib/api/types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface WeatherSummaryCardProps {
  metar: NormalizedMetar;
}

export function WeatherSummaryCard({ metar }: WeatherSummaryCardProps) {
  const { theme, isDark } = useTheme();
  const [showPA, setShowPA] = useState(false);
  const fieldElevFt = Math.round(metar.location.elevation * 3.28084);
  const pressureAlt = Math.round((29.92 - metar.altimeter) * 1000 + fieldElevFt);

  const windStr =
    metar.wind.direction === "VRB"
      ? `VRB ${metar.wind.speed} kts`
      : `${String(metar.wind.direction).padStart(3, "0")}° @ ${metar.wind.speed} kts`;
  const gustStr = metar.wind.gust ? ` G${metar.wind.gust}` : "";
  const fogRisk = metar.tempDewpointSpread <= 3;

  const categoryColor =
    metar.flightCategory === "VFR"
      ? colors.vfr
      : metar.flightCategory === "MVFR"
      ? colors.mvfr
      : metar.flightCategory === "IFR"
      ? colors.ifr
      : colors.lifr;

  // Dynamic styles that use theme colors
  const dynamicStyles = {
    stationId: {
      fontSize: 22,
      fontFamily: "Inter_700Bold" as const,
      color: theme.foreground,
    },
    stationName: {
      fontSize: 12,
      fontFamily: "Inter_400Regular" as const,
      color: isDark ? theme.mutedForeground : colors.stratus[300],
      marginTop: 2,
    },
    gridLabelText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold" as const,
      color: isDark ? theme.mutedForeground : colors.stratus[300],
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    gridValue: {
      fontSize: 14,
      fontFamily: "JetBrainsMono_600SemiBold" as const,
      color: theme.foreground,
    },
  };

  return (
    <Animated.View entering={FadeInDown.delay(100)}>
      <CloudCard>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={dynamicStyles.stationId}>{metar.station}</Text>
            <Text style={dynamicStyles.stationName}>{metar.stationName}</Text>
          </View>
          <View style={styles.headerRight}>
            {metar.isSpeci && (
              <View style={styles.speciDot}>
                <PulsingDot color={colors.alert.amber} size={6} />
                <Text style={styles.speciText}>SPECI</Text>
              </View>
            )}
            <FlightCategoryBadge category={metar.flightCategory} />
          </View>
        </View>

        {/* Weather Grid */}
        <View style={styles.grid}>
          {/* Wind */}
          <View style={styles.gridItem}>
            <View style={styles.gridLabel}>
              <Wind size={12} color={isDark ? theme.mutedForeground : colors.stratus[300]} />
              <Text style={dynamicStyles.gridLabelText}>Wind</Text>
            </View>
            <Text style={dynamicStyles.gridValue}>
              {windStr}
              {gustStr}
            </Text>
          </View>

          {/* Temperature */}
          <View style={styles.gridItem}>
            <View style={styles.gridLabel}>
              <Thermometer size={12} color={isDark ? theme.mutedForeground : colors.stratus[300]} />
              <Text style={dynamicStyles.gridLabelText}>Temp / Dewpt</Text>
            </View>
            <View style={styles.tempRow}>
              <Text style={dynamicStyles.gridValue}>
                {metar.temperature.celsius}°C / {metar.dewpoint.celsius}°C
              </Text>
              {fogRisk && (
                <View style={styles.fogBadge}>
                  <Droplets size={10} color={colors.alert.amber} />
                  <Text style={styles.fogText}>Fog Risk</Text>
                </View>
              )}
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.gridItem}>
            <View style={styles.gridLabel}>
              <Eye size={12} color={isDark ? theme.mutedForeground : colors.stratus[300]} />
              <Text style={dynamicStyles.gridLabelText}>Visibility</Text>
            </View>
            <Text style={dynamicStyles.gridValue}>
              {metar.visibility.sm}
              {metar.visibility.isPlus ? "+" : ""} SM
            </Text>
          </View>

          {/* Altimeter */}
          <View style={styles.gridItem}>
            <View style={styles.gridLabel}>
              <Gauge size={12} color={isDark ? theme.mutedForeground : colors.stratus[300]} />
              <Text style={dynamicStyles.gridLabelText}>Altimeter</Text>
            </View>
            <View style={styles.altRow}>
              <Text style={dynamicStyles.gridValue}>
                {metar.altimeter.toFixed(2)}"
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPA(!showPA);
                }}
                style={styles.paBtn}
              >
                <Text style={styles.paBtnText}>
                  {showPA ? `PA: ${pressureAlt.toLocaleString()} ft` : "Show PA"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Present Weather */}
        {metar.presentWeather && (
          <View
            style={[
              styles.wxBanner,
              {
                backgroundColor:
                  categoryColor + "18",
                borderColor: categoryColor + "40",
              },
            ]}
          >
            <Text style={[styles.wxText, { color: categoryColor }]}>
              {metar.presentWeather}
            </Text>
          </View>
        )}
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  speciDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  speciText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: colors.alert.amber,
    letterSpacing: 0.5,
  },
  grid: { gap: 12 },
  gridItem: {},
  gridLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  tempRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fogBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fogText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: colors.alert.amber,
  },
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paBtn: {
    backgroundColor: "rgba(12,140,233,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paBtnText: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[500],
  },
  wxBanner: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  wxText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
