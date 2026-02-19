import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CloudCard } from "@/components/ui/CloudCard";
import { FlightCategoryBadge } from "@/components/ui/Badge";
import { PulsingDot } from "@/components/ui/PulsingDot";
import { WindCompass } from "./WindCompass";
import { DataCard } from "./DataCard";

import type { NormalizedMetar } from "@/lib/api/types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface WeatherCardsProps {
  metar: NormalizedMetar;
  hideHeader?: boolean;
  hideSideBySide?: boolean;
}

export function StationHeader({ metar }: { metar: NormalizedMetar }) {
  const categoryColor = useMemo(() => {
    switch (metar.flightCategory) {
      case "VFR":
        return colors.vfr;
      case "MVFR":
        return colors.mvfr;
      case "IFR":
        return colors.ifr;
      case "LIFR":
        return colors.lifr;
    }
  }, [metar.flightCategory]);

  const zuluTime = useMemo(() => {
    const d = metar.observationTime;
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}Z`;
  }, [metar.observationTime]);

  const metarAge = useMemo(() => {
    const diffMs = Date.now() - metar.observationTime.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} min ago`;
  }, [metar.observationTime]);

  return (
    <Animated.View entering={FadeInDown.delay(50)} style={styles.stationHeader}>
      <Text style={styles.stationIcao}>{metar.station}</Text>
      <Text
        style={[
          styles.stationName,
          { color: "rgba(255,255,255,0.7)" },
        ]}
      >
        {metar.stationName}
      </Text>
      <View style={styles.headerMeta}>
        <Text style={styles.zuluTime}>{zuluTime}</Text>
        <Text style={styles.dot}>{" \u00B7 "}</Text>
        <Text style={styles.metarAge}>{metarAge}</Text>
        {metar.isSpeci && (
          <View style={styles.speciRow}>
            <PulsingDot color={colors.alert.amber} size={6} />
            <Text style={styles.speciText}>SPECI</Text>
          </View>
        )}
        <View style={{ marginLeft: 8 }}>
          <FlightCategoryBadge category={metar.flightCategory} size="lg" />
        </View>
      </View>
    </Animated.View>
  );
}

export function WeatherCards({ metar, hideHeader, hideSideBySide }: WeatherCardsProps) {
  const { theme, isDark } = useTheme();

  const fieldElevFt = Math.round(metar.location.elevation * 3.28084);
  const pressureAlt = Math.round((29.92 - metar.altimeter) * 1000 + fieldElevFt);
  const fogRisk = metar.tempDewpointSpread <= 3;

  const categoryColor = useMemo(() => {
    switch (metar.flightCategory) {
      case "VFR":
        return colors.vfr;
      case "MVFR":
        return colors.mvfr;
      case "IFR":
        return colors.ifr;
      case "LIFR":
        return colors.lifr;
    }
  }, [metar.flightCategory]);

  // Zulu time from observation
  const zuluTime = useMemo(() => {
    const d = metar.observationTime;
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}Z`;
  }, [metar.observationTime]);

  // METAR age
  const metarAge = useMemo(() => {
    const diffMs = Date.now() - metar.observationTime.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} min ago`;
  }, [metar.observationTime]);

  const labelColor = isDark ? theme.mutedForeground : theme.mutedForeground;

  // Ceiling accent color for IFR/LIFR
  const ceilingAccent =
    metar.flightCategory === "IFR" || metar.flightCategory === "LIFR"
      ? categoryColor
      : undefined;

  return (
    <View style={styles.root}>
      {/* A. Station Header */}
      {!hideHeader && <StationHeader metar={metar} />}

      {/* B. Flight Category Card */}
      <Animated.View entering={FadeInDown.delay(100)}>
        <CloudCard
          style={{ borderLeftWidth: 4, borderLeftColor: categoryColor }}
        >
          <Text style={[styles.cardLabel, { color: labelColor }]}>
            FLIGHT RULES
          </Text>
          <Text
            style={[styles.categoryName, { color: categoryColor }]}
          >
            {metar.flightCategory}
          </Text>
          {metar.presentWeather && (
            <Text
              style={[
                styles.presentWeather,
                { color: isDark ? "rgba(255,255,255,0.7)" : theme.foreground },
              ]}
            >
              {metar.presentWeather}
            </Text>
          )}
        </CloudCard>
      </Animated.View>

      {/* C. Wind Card */}
      <Animated.View entering={FadeInDown.delay(125)}>
        <CloudCard>
          <Text style={[styles.cardLabel, { color: labelColor }]}>WIND</Text>
          <View style={styles.windContent}>
            <WindCompass
              direction={metar.wind.direction}
              speed={metar.wind.speed}
              size={120}
            />
            <View style={styles.windData}>
              <View style={styles.windSpeedRow}>
                <Text style={[styles.windSpeed, { color: theme.foreground }]}>
                  {metar.wind.speed}
                </Text>
                <Text
                  style={[
                    styles.windUnit,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.45)"
                        : "rgba(0,0,0,0.4)",
                    },
                  ]}
                >
                  KTS
                </Text>
              </View>
              {metar.wind.gust && (
                <Text style={styles.gustText}>G{metar.wind.gust}</Text>
              )}
              <Text
                style={[
                  styles.windDirectionText,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.45)",
                  },
                ]}
              >
                {metar.wind.direction === "VRB"
                  ? "Variable"
                  : `FROM ${String(metar.wind.direction).padStart(3, "0")}\u00B0`}
              </Text>
            </View>
          </View>
        </CloudCard>
      </Animated.View>

      {/* D. Side-by-side: VIS + CEILING */}
      {!hideSideBySide && (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.sideBySide}>
          <DataCard
            label="VISIBILITY"
            value={`${metar.visibility.sm}${metar.visibility.isPlus ? "+" : ""}`}
            unit="SM"
            style={{ flex: 1 }}
          />
          <DataCard
            label="CEILING"
            value={metar.ceiling ? metar.ceiling.toLocaleString() : "CLR"}
            unit={metar.ceiling ? "FT" : ""}
            accentColor={ceilingAccent}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}

      {/* E. Side-by-side: TEMP + ALT */}
      {!hideSideBySide && (
        <Animated.View entering={FadeInDown.delay(175)} style={styles.sideBySide}>
          <DataCard
            label="TEMP / DEWPT"
            value={`${metar.temperature.celsius}/${metar.dewpoint.celsius}`}
            unit={"\u00B0C"}
            supplementary={fogRisk ? "Fog risk — spread \u2264 3\u00B0C" : undefined}
            supplementaryColor={fogRisk ? colors.alert.amber : undefined}
            style={{ flex: 1 }}
          />
          <DataCard
            label="ALTIMETER"
            value={metar.altimeter.toFixed(2)}
            unit={'"Hg'}
            supplementary={`PA: ${pressureAlt.toLocaleString()} ft`}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },

  // Station Header
  stationHeader: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  stationIcao: {
    fontSize: 34,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  stationName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
  zuluTime: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  dot: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  metarAge: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  speciRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  speciText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.alert.amber,
    letterSpacing: 0.5,
  },

  // Card label
  cardLabel: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },

  // Flight Category
  categoryName: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  presentWeather: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },

  // Wind Card
  windContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  windData: {
    flex: 1,
  },
  windSpeedRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  windSpeed: {
    fontSize: 32,
    fontFamily: "JetBrainsMono_700Bold",
  },
  windUnit: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_400Regular",
  },
  gustText: {
    fontSize: 22,
    fontFamily: "JetBrainsMono_700Bold",
    color: colors.alert.amber,
    marginTop: 2,
  },
  windDirectionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },

  // Side-by-side layout
  sideBySide: {
    flexDirection: "row",
    gap: 12,
  },
});
