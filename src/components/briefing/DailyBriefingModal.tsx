import React, { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { X, AlertTriangle, ArrowRight } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { CloudCard } from "@/components/ui/CloudCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { evaluateGoNoGo } from "@/lib/briefing/go-no-go";
import { evaluateMinimums } from "@/lib/minimums/evaluate";
import { useMonitorStore } from "@/stores/monitor-store";
import { generateForecastTimeline } from "@/lib/weather/forecast-timeline";
import type { NormalizedMetar, TafResponse, AiBriefing } from "@/lib/api/types";
import type { GoNoGoVerdict } from "@/lib/briefing/types";

interface DailyBriefingModalProps {
  visible: boolean;
  onDismiss: () => void;
  homeAirport: string | null;
  pilotName: string;
  metarData: { raw: any; normalized: NormalizedMetar } | null | undefined;
  metarLoading: boolean;
  metarError: Error | null;
  tafData: TafResponse | null | undefined;
  tafLoading: boolean;
  briefingData: AiBriefing | null | undefined;
  briefingLoading: boolean;
  onRetry: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const FLIGHT_CATEGORY_COLORS: Record<string, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

const VERDICT_CONFIG: Record<GoNoGoVerdict, { label: string; color: string; bg: string }> = {
  go: {
    label: "GO",
    color: "#FFFFFF",
    bg: colors.alert.green,
  },
  marginal: {
    label: "MARGINAL",
    color: "#000000",
    bg: colors.alert.amber,
  },
  nogo: {
    label: "NO-GO",
    color: "#FFFFFF",
    bg: colors.alert.red,
  },
};

export function DailyBriefingModal({
  visible,
  onDismiss,
  homeAirport,
  pilotName,
  metarData,
  metarLoading,
  metarError,
  tafData,
  tafLoading,
  briefingData,
  briefingLoading,
  onRetry,
}: DailyBriefingModalProps) {
  const { isDark, theme } = useTheme();
  const { personalMinimums, minimumsEnabled } = useMonitorStore();

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const bgColor = isDark ? colors.stratus[900] : "#FFFFFF";
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  const metar = metarData?.normalized ?? null;
  const firstName = pilotName ? pilotName.split(" ")[0] : "Pilot";

  // Go/No-Go evaluation
  const goNoGoResult = useMemo(() => {
    if (!metar || !minimumsEnabled) return null;
    const minimumsResult = evaluateMinimums(metar, personalMinimums);
    return evaluateGoNoGo({
      metar,
      minimums: personalMinimums,
      minimumsResult,
      briefing: briefingData ?? undefined,
      taf: tafData ?? null,
    });
  }, [metar, minimumsEnabled, personalMinimums, briefingData, tafData]);

  // Hazards from briefing
  const hazards = briefingData?.hazards ?? [];

  // TAF forecast points (next 6 hours)
  const forecastPoints = useMemo(() => {
    if (!tafData) return [];
    try {
      const points = generateForecastTimeline(tafData);
      const now = new Date();
      const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      return points.filter((p) => p.time >= now && p.time <= sixHoursLater);
    } catch {
      return [];
    }
  }, [tafData]);

  // Current conditions table data
  const conditions = useMemo(() => {
    if (!metar) return [];
    const items: Array<{ label: string; value: string }> = [];

    // Wind
    const windDir = metar.wind.direction === "VRB" ? "VRB" : `${metar.wind.direction}°`;
    const windStr = metar.wind.gust
      ? `${windDir} at ${metar.wind.speed}G${metar.wind.gust} kts`
      : `${windDir} at ${metar.wind.speed} kts`;
    items.push({ label: "Wind", value: windStr });

    // Visibility
    items.push({
      label: "Visibility",
      value: `${metar.visibility.sm}${metar.visibility.isPlus ? "+" : ""} SM`,
    });

    // Ceiling
    items.push({
      label: "Ceiling",
      value: metar.ceiling ? `${metar.ceiling.toLocaleString()} ft AGL` : "Clear",
    });

    // Clouds
    if (metar.clouds.length > 0) {
      const cloudStr = metar.clouds
        .map((c) => `${c.cover} ${c.base.toLocaleString()}`)
        .join(", ");
      items.push({ label: "Clouds", value: cloudStr });
    }

    // Temperature
    items.push({
      label: "Temperature",
      value: `${metar.temperature.celsius}°C / ${metar.temperature.fahrenheit}°F`,
    });

    // Dewpoint
    items.push({
      label: "Dewpoint",
      value: `${metar.dewpoint.celsius}°C / ${metar.dewpoint.fahrenheit}°F`,
    });

    // Altimeter
    items.push({
      label: "Altimeter",
      value: `${metar.altimeter.toFixed(2)} "Hg`,
    });

    // Present weather
    if (metar.presentWeather) {
      items.push({ label: "Weather", value: metar.presentWeather });
    }

    return items;
  }, [metar]);

  const isLoading = metarLoading || (metarData && briefingLoading);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={onDismiss} hitSlop={12}>
            <X size={24} color={textColor} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Daily Briefing
            </Text>
            <Text style={[styles.headerDate, { color: subColor }]}>
              {getFormattedDate()}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <Text style={[styles.greeting, { color: textColor }]}>
              {getGreeting()}, {firstName}
            </Text>
          </Animated.View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.skeletons}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {/* Error State */}
          {metarError && !metarData && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <CloudCard>
                <View style={styles.errorContent}>
                  <AlertTriangle size={32} color={colors.alert.amber} />
                  <Text style={[styles.errorTitle, { color: textColor }]}>
                    Unable to load weather
                  </Text>
                  <Text style={[styles.errorSub, { color: subColor }]}>
                    Check your connection and try again.
                  </Text>
                  <Pressable onPress={() => onRetry()} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              </CloudCard>
            </Animated.View>
          )}

          {/* Weather Content */}
          {metar && !metarLoading && (
            <>
              {/* Station + Flight Category */}
              <Animated.View entering={FadeInDown.delay(100)}>
                <CloudCard>
                  <View style={styles.stationRow}>
                    <Text style={[styles.stationCode, { color: textColor }]}>
                      {metar.station}
                    </Text>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor:
                            FLIGHT_CATEGORY_COLORS[metar.flightCategory] ??
                            colors.stratus[500],
                        },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {metar.flightCategory}
                      </Text>
                    </View>
                  </View>
                  {metar.stationName && (
                    <Text style={[styles.stationName, { color: subColor }]}>
                      {metar.stationName}
                    </Text>
                  )}
                </CloudCard>
              </Animated.View>

              {/* Raw METAR */}
              <Animated.View entering={FadeInDown.delay(150)}>
                <CloudCard
                  style={{
                    backgroundColor: isDark
                      ? "rgba(20,20,25,0.95)"
                      : colors.stratus[50],
                  }}
                >
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: subColor, marginBottom: 8 },
                    ]}
                  >
                    RAW METAR
                  </Text>
                  <Text style={[styles.rawMetar, { color: textColor }]}>
                    {metar.rawText}
                  </Text>
                </CloudCard>
              </Animated.View>

              {/* Go/No-Go Decision */}
              {goNoGoResult && (
                <Animated.View entering={FadeInDown.delay(200)}>
                  <View
                    style={[
                      styles.verdictBanner,
                      { backgroundColor: VERDICT_CONFIG[goNoGoResult.verdict].bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.verdictLabel,
                        { color: VERDICT_CONFIG[goNoGoResult.verdict].color },
                      ]}
                    >
                      {VERDICT_CONFIG[goNoGoResult.verdict].label}
                    </Text>
                    <Text
                      style={[
                        styles.verdictSummary,
                        { color: VERDICT_CONFIG[goNoGoResult.verdict].color },
                      ]}
                    >
                      {goNoGoResult.summary}
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* AI Briefing Summary */}
              {briefingData && (
                <Animated.View entering={FadeInDown.delay(250)}>
                  <CloudCard>
                    <Text style={[styles.sectionLabel, { color: subColor }]}>
                      BRIEFING SUMMARY
                    </Text>
                    <Text style={[styles.briefingSummary, { color: textColor }]}>
                      {briefingData.summary}
                    </Text>
                  </CloudCard>
                </Animated.View>
              )}

              {/* Current Conditions Table */}
              <Animated.View entering={FadeInDown.delay(300)}>
                <CloudCard>
                  <Text style={[styles.sectionLabel, { color: subColor }]}>
                    CURRENT CONDITIONS
                  </Text>
                  {conditions.map((item, idx) => (
                    <View
                      key={item.label}
                      style={[
                        styles.conditionRow,
                        idx < conditions.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                        },
                      ]}
                    >
                      <Text style={[styles.conditionLabel, { color: subColor }]}>
                        {item.label}
                      </Text>
                      <Text
                        style={[styles.conditionValue, { color: textColor }]}
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </CloudCard>
              </Animated.View>

              {/* Hazards */}
              {hazards.length > 0 && (
                <Animated.View entering={FadeInDown.delay(350)}>
                  <CloudCard>
                    <View style={styles.hazardHeader}>
                      <AlertTriangle size={14} color={colors.alert.red} />
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.alert.red, marginBottom: 0 },
                        ]}
                      >
                        HAZARDS
                      </Text>
                    </View>
                    {hazards.map((hazard, idx) => (
                      <View key={idx} style={styles.hazardRow}>
                        <View style={styles.hazardDot} />
                        <Text
                          style={[styles.hazardText, { color: textColor }]}
                        >
                          {hazard}
                        </Text>
                      </View>
                    ))}
                  </CloudCard>
                </Animated.View>
              )}

              {/* TAF Forecast */}
              {tafData && (
                <Animated.View entering={FadeInDown.delay(400)}>
                  <CloudCard>
                    <Text style={[styles.sectionLabel, { color: subColor }]}>
                      FORECAST (NEXT 6 HOURS)
                    </Text>
                    {forecastPoints.length > 0 ? (
                      <View style={styles.forecastList}>
                        {forecastPoints.map((point, idx) => {
                          const catColor =
                            FLIGHT_CATEGORY_COLORS[point.flightCategory] ??
                            colors.stratus[500];
                          const timeStr = point.time.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                          return (
                            <View key={idx} style={styles.forecastRow}>
                              <View
                                style={[
                                  styles.forecastDot,
                                  { backgroundColor: catColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.forecastTime,
                                  { color: subColor },
                                ]}
                              >
                                {timeStr}
                              </Text>
                              <Text
                                style={[
                                  styles.forecastCat,
                                  { color: catColor },
                                ]}
                              >
                                {point.flightCategory}
                              </Text>
                              <Text
                                style={[
                                  styles.forecastDetail,
                                  { color: textColor },
                                ]}
                                numberOfLines={1}
                              >
                                {point.ceiling
                                  ? `${point.ceiling.toLocaleString()} ft`
                                  : "CLR"}{" "}
                                · {point.visibility} SM
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={[styles.noTaf, { color: subColor }]}>
                        No TAF forecast available
                      </Text>
                    )}
                  </CloudCard>
                </Animated.View>
              )}

              {!tafData && !tafLoading && (
                <Animated.View entering={FadeInDown.delay(400)}>
                  <CloudCard>
                    <Text style={[styles.sectionLabel, { color: subColor }]}>
                      FORECAST
                    </Text>
                    <Text style={[styles.noTaf, { color: subColor }]}>
                      No TAF available for this station
                    </Text>
                  </CloudCard>
                </Animated.View>
              )}

              {/* View Full Briefing CTA */}
              <TouchableOpacity
                onPress={onDismiss}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="View Full Briefing"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "#D4A853",
                  paddingVertical: 16,
                  borderRadius: 14,
                  marginTop: 4,
                }}
              >
                <Text style={styles.ctaText}>View Full Briefing</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Disclaimer */}
              <Text style={[styles.disclaimer, { color: subColor }]}>
                Not for flight planning. Always verify weather data with
                official FAA sources (1800wxbrief.com) before any flight.
                SkyBrief is a supplemental tool only.
              </Text>
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  headerDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
    maxWidth: 500,
    alignSelf: "center" as const,
    width: "100%",
  },
  greeting: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    marginBottom: 4,
  },
  skeletons: { gap: 12 },
  // Error
  errorContent: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  errorSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  // Station
  stationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stationCode: {
    fontSize: 32,
    fontFamily: "JetBrainsMono_700Bold",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  stationName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  // Raw METAR
  rawMetar: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_500Medium",
    lineHeight: 20,
  },
  // Section label
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  // Verdict
  verdictBanner: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  verdictLabel: {
    fontSize: 20,
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 2,
  },
  verdictSummary: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    opacity: 0.9,
  },
  // Briefing
  briefingSummary: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  // Conditions
  conditionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  conditionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  conditionValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_500Medium",
    maxWidth: "60%",
    textAlign: "right",
  },
  // Hazards
  hazardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  hazardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  hazardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.alert.red,
    marginTop: 6,
  },
  hazardText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  // Forecast
  forecastList: { gap: 8 },
  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  forecastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  forecastTime: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_500Medium",
    width: 80,
  },
  forecastCat: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_700Bold",
    width: 40,
  },
  forecastDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  noTaf: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  // CTA
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
  // Disclaimer
  disclaimer: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
