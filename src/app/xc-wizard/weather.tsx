/**
 * XC Wizard Step 2: Weather Review
 *
 * Shows weather at all waypoints along the route.
 * Highlights hazards and allows go/no-go assessment.
 */

import { useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  CloudSun,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react-native";

import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { CloudCard } from "@/components/ui/CloudCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useSceneStore } from "@/stores/scene-store";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useRouteBriefing } from "@/hooks/useRouteBriefing";
import { useContentWidth } from "@/hooks/useContentWidth";
import { useXCWizardStore } from "@/stores/xc-wizard-store";
import type { FlightCategory } from "@/lib/api/types";

const CAT_COLORS: Record<FlightCategory, string> = {
  VFR: colors.alert.green,
  MVFR: "#0c8ce9",
  IFR: colors.alert.red,
  LIFR: "#9B30FF",
};

export default function XCWizardWeatherScreen() {
  const reducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const router = useRouter();
  const { waypoints: wpParam } = useLocalSearchParams<{ waypoints: string }>();
  const scene = useSceneStore((s) => s.scene);
  const contentWidth = useContentWidth();
  const xcStore = useXCWizardStore();

  const waypoints = useMemo(() => {
    const fromStore = xcStore.waypoints.filter((w) => w.trim().length >= 3);
    if (fromStore.length >= 2) return fromStore;
    return (wpParam ?? "").split(",").filter(Boolean);
  }, [wpParam, xcStore.waypoints]);
  const { data: briefing, isLoading, isError, error, refetch } = useRouteBriefing(waypoints);

  // Cache briefing in the wizard store so Steps 3 & 4 can use it
  useEffect(() => {
    if (briefing) {
      xcStore.setRouteBriefing(briefing);
    }
  }, [briefing]);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];

  const hazardCount = briefing?.weatherPoints.filter(
    (wp) =>
      wp.metar &&
      (wp.metar.flightCategory === "IFR" || wp.metar.flightCategory === "LIFR")
  ).length ?? 0;

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            contentWidth ? { maxWidth: contentWidth } : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Close Button */}
          <View style={styles.closeRow}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.dismissAll(); }}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <X size={22} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Step Indicator */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown} style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </Animated.View>

          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(50)} style={styles.header}>
            <CloudSun size={22} color="#ffffff" strokeWidth={1.8} />
            <View>
              <Text style={styles.stepLabel}>STEP 2 OF 4</Text>
              <Text style={styles.title}>Route Weather</Text>
            </View>
          </Animated.View>

          <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.6)" }]}>
            Review conditions at each waypoint along your route.
          </Text>

          {isLoading ? (
            <View style={{ gap: 12 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : isError ? (
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
              <CloudCard style={styles.stationCard}>
                <View style={styles.errorContent}>
                  <AlertTriangle size={28} color={colors.alert.amber} />
                  <Text style={[styles.errorTitle, { color: textColor }]}>
                    Weather Unavailable
                  </Text>
                  <Text style={[styles.errorMessage, { color: subColor }]}>
                    {error instanceof Error
                      ? error.message
                      : "Could not load weather data. Check your connection and try again."}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      refetch();
                    }}
                    style={styles.retryBtn}
                  >
                    <RefreshCw size={14} color="#FFFFFF" />
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              </CloudCard>
            </Animated.View>
          ) : briefing ? (
            <>
              {/* Hazard Summary */}
              {hazardCount > 0 && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)} style={styles.hazardBanner}>
                  <AlertTriangle size={18} color="#FFFFFF" />
                  <Text style={styles.hazardText}>
                    {hazardCount} station{hazardCount > 1 ? "s" : ""} reporting IFR/LIFR conditions
                  </Text>
                </Animated.View>
              )}

              {hazardCount === 0 && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)} style={styles.clearBanner}>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.clearText}>All stations reporting VFR or MVFR</Text>
                </Animated.View>
              )}

              {/* Station Weather Cards */}
              {briefing.weatherPoints.map((wp, idx) => {
                const metar = wp.metar;
                const cat = metar?.flightCategory ?? "VFR";
                const catColor = CAT_COLORS[cat] ?? colors.stratus[500];

                return (
                  <Animated.View
                    key={wp.waypoint.icao}
                    entering={reducedMotion ? undefined : FadeInDown.delay(150 + idx * 50)}
                  >
                    <CloudCard style={styles.stationCard}>
                      <View style={styles.stationHeader}>
                        <Text style={[styles.stationIcao, { color: textColor }]}>
                          {wp.waypoint.icao}
                        </Text>
                        <View style={[styles.catBadge, { backgroundColor: catColor }]}>
                          <Text style={styles.catText}>{cat}</Text>
                        </View>
                      </View>

                      {metar ? (
                        <View style={styles.wxData}>
                          <View style={styles.wxRow}>
                            <Text style={[styles.wxLabel, { color: subColor }]}>Wind</Text>
                            <Text style={[styles.wxValue, { color: textColor }]}>
                              {metar.wind.speed > 0
                                ? `${metar.wind.direction}° @ ${metar.wind.speed}${
                                    metar.wind.gust ? `G${metar.wind.gust}` : ""
                                  } kt`
                                : "Calm"}
                            </Text>
                          </View>
                          <View style={styles.wxRow}>
                            <Text style={[styles.wxLabel, { color: subColor }]}>Visibility</Text>
                            <Text style={[styles.wxValue, { color: textColor }]}>
                              {metar.visibility.sm}{metar.visibility.isPlus ? "+" : ""} SM
                            </Text>
                          </View>
                          <View style={styles.wxRow}>
                            <Text style={[styles.wxLabel, { color: subColor }]}>Ceiling</Text>
                            <Text style={[styles.wxValue, { color: textColor }]}>
                              {metar.ceiling ? `${metar.ceiling.toLocaleString()} ft` : "CLR"}
                            </Text>
                          </View>
                          <View style={styles.wxRow}>
                            <Text style={[styles.wxLabel, { color: subColor }]}>Temp/Dewpoint</Text>
                            <Text style={[styles.wxValue, { color: textColor }]}>
                              {metar.temperature.celsius}°C / {metar.dewpoint.celsius}°C
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.noData, { color: subColor }]}>
                          No METAR data available
                        </Text>
                      )}
                    </CloudCard>
                  </Animated.View>
                );
              })}
            </>
          ) : waypoints.length < 2 ? (
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
              <CloudCard style={styles.stationCard}>
                <View style={styles.errorContent}>
                  <AlertTriangle size={28} color={colors.alert.amber} />
                  <Text style={[styles.errorTitle, { color: textColor }]}>
                    No Route Defined
                  </Text>
                  <Text style={[styles.errorMessage, { color: subColor }]}>
                    Go back to Step 1 and enter at least two waypoints to view route weather.
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.back();
                    }}
                    style={styles.retryBtn}
                  >
                    <ArrowLeft size={14} color="#FFFFFF" />
                    <Text style={styles.retryText}>Back to Route</Text>
                  </Pressable>
                </View>
              </CloudCard>
            </Animated.View>
          ) : null}

          {/* Navigation */}
          <View style={styles.navRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backBtn}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/xc-wizard/planning",
                  params: { waypoints: wpParam },
                });
              }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>Next: Planning</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center" as const,
    gap: 12,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  stepActive: { backgroundColor: colors.accent },
  stepDone: { backgroundColor: colors.alert.green },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  stepLineDone: { backgroundColor: colors.alert.green },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  hazardBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.85)",
    padding: 12,
    borderRadius: 10,
  },
  hazardText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
    flex: 1,
  },
  clearBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.8)",
    padding: 12,
    borderRadius: 10,
  },
  clearText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  stationCard: {},
  stationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stationIcao: {
    fontSize: 18,
    fontFamily: "JetBrainsMono_700Bold",
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  wxData: { gap: 6 },
  wxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wxLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wxValue: { fontSize: 13, fontFamily: "JetBrainsMono_500Medium" },
  noData: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  errorContent: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  backText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  nextText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
});
