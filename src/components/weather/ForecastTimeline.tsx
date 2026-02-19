import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Clock, Cloud, Wind, Eye } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { generateForecastTimeline, analyzeWeatherTrends } from "@/lib/weather/forecast-timeline";
import { TrendIndicator } from "./TrendIndicator";
import type { TafResponse, NormalizedMetar, FlightCategory } from "@/lib/api/types";
import type { ForecastPoint, WeatherTrend } from "@/lib/briefing/types";

interface Props {
  taf: TafResponse;
  currentMetar?: NormalizedMetar | null;
}

const CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

export function ForecastTimeline({ taf, currentMetar }: Props) {
  const { isDark } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const timeline = useMemo(() => generateForecastTimeline(taf, currentMetar), [taf, currentMetar]);

  const trends = useMemo(
    () => (currentMetar ? analyzeWeatherTrends(currentMetar, taf) : []),
    [currentMetar, taf]
  );

  if (timeline.length === 0) return null;

  const selectedPoint = selectedIndex !== null ? timeline[selectedIndex] : null;

  return (
    <Animated.View entering={FadeInDown.delay(200)}>
      <CloudCard>
        <View style={styles.header}>
          <Clock size={16} color={colors.accent} />
          <Text
            style={[
              styles.title,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            6-Hour Forecast
          </Text>
        </View>

        {/* Timeline Bar */}
        <View style={styles.timelineContainer}>
          <View
            style={[
              styles.timelineTrack,
              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
            ]}
          >
            {timeline.map((point, index) => {
              const catColor = CATEGORY_COLORS[point.flightCategory];
              const isSelected = selectedIndex === index;

              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedIndex(isSelected ? null : index);
                  }}
                  style={[
                    styles.timelinePoint,
                    { flex: 1 },
                  ]}
                >
                  {/* Color bar */}
                  <View
                    style={[
                      styles.colorBar,
                      {
                        backgroundColor: catColor,
                        opacity: isSelected ? 1 : 0.7,
                      },
                    ]}
                  />

                  {/* Category badge */}
                  <View
                    style={[
                      styles.catBadge,
                      {
                        backgroundColor: catColor,
                        transform: [{ scale: isSelected ? 1.15 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.catBadgeText}>
                      {point.flightCategory}
                    </Text>
                  </View>

                  {/* Time label */}
                  <Text
                    style={[
                      styles.timeLabel,
                      {
                        color: isSelected
                          ? isDark ? "#FFFFFF" : colors.stratus[800]
                          : isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500],
                        fontFamily: isSelected ? "JetBrainsMono_600SemiBold" : "JetBrainsMono_400Regular",
                      },
                    ]}
                  >
                    {index === 0
                      ? "Now"
                      : `+${index}h`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Point Detail */}
        {selectedPoint && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={[
              styles.detailPanel,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Text
              style={[
                styles.detailTime,
                { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
              ]}
            >
              {selectedPoint.time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              local
            </Text>

            <View style={styles.detailGrid}>
              <DetailItem
                icon={Cloud}
                label="Ceiling"
                value={
                  selectedPoint.ceiling
                    ? `${selectedPoint.ceiling.toLocaleString()} ft`
                    : "Clear"
                }
                color={CATEGORY_COLORS[selectedPoint.flightCategory]}
                isDark={isDark}
              />
              <DetailItem
                icon={Eye}
                label="Visibility"
                value={`${selectedPoint.visibility} SM`}
                isDark={isDark}
              />
              <DetailItem
                icon={Wind}
                label="Wind"
                value={`${selectedPoint.wind.direction}° @ ${selectedPoint.wind.speed}${selectedPoint.wind.gust ? `G${selectedPoint.wind.gust}` : ""} kts`}
                isDark={isDark}
              />
            </View>

            {selectedPoint.wxString && (
              <Text
                style={[
                  styles.wxString,
                  { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                ]}
              >
                Weather: {selectedPoint.wxString}
              </Text>
            )}
          </Animated.View>
        )}

        {/* Trend Indicators */}
        {trends.length > 0 && (
          <View style={styles.trendsContainer}>
            <Text
              style={[
                styles.trendsTitle,
                { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
              ]}
            >
              TRENDS (NEXT 2–3 HRS)
            </Text>
            <View style={styles.trendsList}>
              {trends.map((trend) => (
                <TrendIndicator key={trend.metric} trend={trend} />
              ))}
            </View>
          </View>
        )}
      </CloudCard>
    </Animated.View>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: typeof Cloud;
  label: string;
  value: string;
  color?: string;
  isDark: boolean;
}) {
  return (
    <View style={styles.detailItem}>
      <Icon size={13} color={color || (isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500])} />
      <Text
        style={[
          styles.detailLabel,
          { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          { color: color || (isDark ? "#FFFFFF" : colors.stratus[800]) },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  title: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  timelineContainer: { marginBottom: 4 },
  timelineTrack: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    padding: 6,
    gap: 4,
  },
  timelinePoint: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  colorBar: {
    height: 4,
    width: "100%",
    borderRadius: 2,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 8,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  timeLabel: { fontSize: 10 },
  detailPanel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailTime: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  detailGrid: { gap: 6 },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: { fontSize: 11, fontFamily: "Inter_400Regular", width: 60 },
  detailValue: { fontSize: 12, fontFamily: "JetBrainsMono_500Medium", flex: 1 },
  wxString: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    marginTop: 6,
  },
  trendsContainer: { marginTop: 14 },
  trendsTitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  trendsList: { gap: 6 },
});
