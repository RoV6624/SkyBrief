/**
 * XC Wizard Step 4: Final Summary & Briefing Packet
 *
 * Generates a complete XC briefing summary with all data.
 * Allows sharing as text and logging the flight.
 */

import { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  FileText,
  Share2,
  CheckCircle2,
  ArrowLeft,
  Home,
  AlertTriangle,
  Send,
  X,
} from "lucide-react-native";

import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { CloudCard } from "@/components/ui/CloudCard";
import { useSceneStore } from "@/stores/scene-store";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useRouteBriefing } from "@/hooks/useRouteBriefing";
import { calculateNavLog } from "@/lib/navlog/calculate";
import { useWBStore } from "@/stores/wb-store";
import { calcTotalWB } from "@/lib/wb/calculations";
import { useUserStore } from "@/stores/user-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useAuthStore } from "@/stores/auth-store";
import { useContentWidth } from "@/hooks/useContentWidth";
import { useXCWizardStore } from "@/stores/xc-wizard-store";
import { useRouteHistoryStore } from "@/stores/route-history-store";
import { submitDispatch } from "@/services/dispatch-api";
import { emptySteps } from "@/lib/dispatch/types";
import type { DispatchPacket } from "@/lib/dispatch/types";
import type { FlightCategory } from "@/lib/api/types";

export default function XCWizardSummaryScreen() {
  const reducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const router = useRouter();
  const { waypoints: wpParam } = useLocalSearchParams<{ waypoints: string }>();
  const scene = useSceneStore((s) => s.scene);
  const contentWidth = useContentWidth();
  const { pilotName, assignedInstructorUid, assignedInstructorName } = useUserStore();
  const { isSchoolMode, tenantId, tenantConfig } = useTenantStore();
  const user = useAuthStore((s) => s.user);
  const xcStore = useXCWizardStore();
  const addHistoryEntry = useRouteHistoryStore((s) => s.addEntry);

  const [dispatchSent, setDispatchSent] = useState(false);
  const [dispatchSending, setDispatchSending] = useState(false);

  // Show "Send to Instructor" when user is a student in a school with assigned instructor
  const canSendToInstructor =
    isSchoolMode && !!assignedInstructorUid && !!tenantId;

  const waypoints = useMemo(() => {
    const fromStore = xcStore.waypoints.filter((w) => w.trim().length >= 3);
    if (fromStore.length >= 2) return fromStore;
    return (wpParam ?? "").split(",").filter(Boolean);
  }, [wpParam, xcStore.waypoints]);
  const { data: briefing } = useRouteBriefing(waypoints);
  const activeBriefing = briefing ?? xcStore.routeBriefing;
  const { aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm } = useWBStore();

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];

  const wbResult = useMemo(
    () => calcTotalWB(aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm),
    [aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm]
  );

  const navLog = useMemo(() => {
    if (!activeBriefing) return null;
    return calculateNavLog(
      activeBriefing.legs,
      activeBriefing.weatherPoints,
      aircraft.cruiseSpeedKts,
      aircraft.fuelBurnRateGPH
    );
  }, [activeBriefing, aircraft.cruiseSpeedKts, aircraft.fuelBurnRateGPH]);

  const worstCategory = useMemo(() => {
    if (!activeBriefing) return "VFR" as FlightCategory;
    const rank: Record<FlightCategory, number> = { VFR: 0, MVFR: 1, IFR: 2, LIFR: 3 };
    let worst: FlightCategory = "VFR";
    for (const wp of activeBriefing.weatherPoints) {
      if (wp.metar?.flightCategory) {
        const cat = wp.metar.flightCategory;
        if (rank[cat] > rank[worst]) worst = cat;
      }
    }
    return worst;
  }, [activeBriefing]);

  const generateBriefingText = useCallback(() => {
    const lines: string[] = [
      "═══ SKYBRIEF CROSS-COUNTRY BRIEFING ═══",
      "",
      `Pilot: ${pilotName || "---"}`,
      `Aircraft: ${aircraft.name}`,
      `Route: ${waypoints.join(" → ")}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Time: ${new Date().toLocaleTimeString()}`,
      "",
      "── Route Summary ──",
    ];

    if (navLog) {
      lines.push(`Distance: ${navLog.totalDistance.toFixed(0)} NM`);
      lines.push(
        `Est. Time: ${Math.floor(navLog.totalTime / 60)}h ${Math.round(navLog.totalTime % 60)}m`
      );
      lines.push(`Fuel Required: ${navLog.totalFuel.toFixed(1)} gal`);
    }

    lines.push("", "── Weather Along Route ──");
    if (activeBriefing) {
      for (const wp of activeBriefing.weatherPoints) {
        const m = wp.metar;
        if (m) {
          lines.push(
            `${m.station}: ${m.flightCategory} | Wind ${m.wind.direction}@${m.wind.speed}kt | Vis ${m.visibility.sm}SM | ${m.ceiling ? `Ceil ${m.ceiling}ft` : "CLR"}`
          );
        }
      }
    }

    lines.push("", "── Weight & Balance ──");
    lines.push(`Total Weight: ${wbResult.totalWeight} lbs / ${aircraft.maxTakeoffWeight} lbs`);
    lines.push(`CG: ${wbResult.cg.toFixed(1)} in`);
    lines.push(`Envelope: ${wbResult.isCGInEnvelope ? "WITHIN LIMITS" : "OUT OF LIMITS"}`);

    lines.push("", "── Risk Assessment ──");
    if (xcStore.fratResult) {
      lines.push(`FRAT Score: ${xcStore.fratResult.totalScore}`);
      lines.push(`Risk Level: ${xcStore.fratResult.riskLevel.toUpperCase()}`);
      lines.push(`Recommendation: ${xcStore.fratResult.recommendation}`);
    } else {
      lines.push("Not completed");
    }

    lines.push("", "═══════════════════════════════════════");
    lines.push("Generated by SkyBrief");

    return lines.join("\n");
  }, [pilotName, aircraft, waypoints, navLog, activeBriefing, wbResult, xcStore.fratResult]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: generateBriefingText(),
        title: `XC Briefing: ${waypoints[0]} → ${waypoints[waypoints.length - 1]}`,
      });
    } catch {
      // User cancelled
    }
  }, [generateBriefingText, waypoints]);

  const handleSendToInstructor = useCallback(async () => {
    if (!canSendToInstructor || dispatchSent || dispatchSending) return;
    if (!user?.uid) return;

    setDispatchSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const depWx = activeBriefing?.weatherPoints[0]?.metar ?? null;

    const packet: DispatchPacket = {
      id: "", // server generates
      studentUid: user.uid,
      studentName: pilotName || "Student",
      instructorUid: assignedInstructorUid!,
      instructorName: assignedInstructorName || "Instructor",
      tenantId: tenantId!,
      station: waypoints[0] ?? "",
      stationName: waypoints[0] ?? "",
      flightType: "local",
      status: "submitted",
      briefingRecord: null,
      fratResult: xcStore.fratResult,
      fratInputs: xcStore.fratInputs,
      wbSnapshot: {
        aircraftType: aircraft.name,
        totalWeight: wbResult.totalWeight,
        cg: wbResult.cg,
        withinLimits: wbResult.isCGInEnvelope && !wbResult.isOverweight,
        timestamp: new Date(),
      },
      goNoGoResult: null,
      weatherSnapshot: depWx,
      completedSteps: {
        briefing: true,
        frat: !!xcStore.fratResult,
        wb: true,
        checklist: true,
      },
      createdAt: new Date(),
      submittedAt: new Date(),
      reviewedAt: null,
      reviewerComment: null,
      preflightStartedAt: null,
      departedAt: null,
    };

    const docId = await submitDispatch(packet);
    setDispatchSending(false);

    if (docId) {
      setDispatchSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Send Failed", "Could not send to instructor. Check your connection and try again.");
    }
  }, [
    canSendToInstructor,
    dispatchSent,
    dispatchSending,
    user,
    pilotName,
    assignedInstructorUid,
    assignedInstructorName,
    tenantId,
    waypoints,
    activeBriefing,
    aircraft,
    wbResult,
    xcStore.fratResult,
    xcStore.fratInputs,
  ]);

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save to route history so it shows in "Recent Briefings"
    addHistoryEntry({
      waypoints,
      flightType: "VFR", // XC wizard is VFR-only; update if IFR support is added
      isAutoGenerated: false,
      totalDistanceNm: navLog ? Math.round(navLog.totalDistance) : 0,
      worstCategory,
      legCount: activeBriefing?.legs.length ?? 0,
    });

    xcStore.reset();

    // Navigate to the Route tab so the user sees their new briefing
    router.dismissAll();
    setTimeout(() => {
      router.replace("/(tabs)/route");
    }, 0);
  };

  const catColor =
    worstCategory === "LIFR"
      ? "#9B30FF"
      : worstCategory === "IFR"
      ? colors.alert.red
      : worstCategory === "MVFR"
      ? "#0c8ce9"
      : colors.alert.green;

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

          {/* Step Indicator - All Done */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown} style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
          </Animated.View>

          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(50)} style={styles.header}>
            <FileText size={22} color="#ffffff" strokeWidth={1.8} />
            <View>
              <Text style={styles.stepLabel}>STEP 4 OF 4</Text>
              <Text style={styles.title}>Briefing Summary</Text>
            </View>
          </Animated.View>

          {/* Route Overview */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
            <CloudCard style={styles.card}>
              <Text style={[styles.routeTitle, { color: textColor }]}>
                {waypoints[0]} → {waypoints[waypoints.length - 1]}
              </Text>
              {waypoints.length > 2 && (
                <Text style={[styles.routeVia, { color: subColor }]}>
                  via {waypoints.slice(1, -1).join(", ")}
                </Text>
              )}

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: subColor }]}>Distance</Text>
                  <Text style={[styles.summaryValue, { color: textColor }]}>
                    {navLog ? `${navLog.totalDistance.toFixed(0)} NM` : "---"}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: subColor }]}>Time</Text>
                  <Text style={[styles.summaryValue, { color: textColor }]}>
                    {navLog
                      ? `${Math.floor(navLog.totalTime / 60)}h ${Math.round(navLog.totalTime % 60)}m`
                      : "---"}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: subColor }]}>Fuel</Text>
                  <Text style={[styles.summaryValue, { color: textColor }]}>
                    {navLog ? `${navLog.totalFuel.toFixed(1)} gal` : "---"}
                  </Text>
                </View>
              </View>

              {/* Worst category badge */}
              <View style={styles.catRow}>
                <Text style={[styles.catLabel, { color: subColor }]}>
                  Worst Conditions:
                </Text>
                <View style={[styles.catBadge, { backgroundColor: catColor }]}>
                  <Text style={styles.catText}>{worstCategory}</Text>
                </View>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Checklist Status */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(150)}>
            <CloudCard style={styles.card}>
              <Text style={[styles.checkHeader, { color: textColor }]}>
                Pre-Flight Checklist
              </Text>

              {[
                {
                  label: "Weather Reviewed",
                  ok: !!activeBriefing,
                },
                {
                  label: "Weight & Balance",
                  ok: wbResult.isCGInEnvelope && !wbResult.isOverweight,
                },
                {
                  label: "Fuel Planning",
                  ok: navLog ? fuelGallons >= navLog.totalFuel * 1.3 : false,
                },
                {
                  label: "Risk Assessment (FRAT)",
                  ok: !!xcStore.fratResult,
                },
                { label: "Route Planned", ok: waypoints.length >= 2 },
              ].map((item, idx) => (
                <View key={idx} style={styles.checkItem}>
                  {item.ok ? (
                    <CheckCircle2 size={16} color={colors.alert.green} />
                  ) : (
                    <AlertTriangle size={16} color={colors.alert.amber} />
                  )}
                  <Text style={[styles.checkText, { color: textColor }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </CloudCard>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200)} style={styles.actions}>
            {canSendToInstructor && (
              <Pressable
                onPress={handleSendToInstructor}
                disabled={dispatchSent || dispatchSending}
                style={[
                  styles.instructorBtn,
                  dispatchSent && styles.instructorBtnSent,
                ]}
              >
                {dispatchSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : dispatchSent ? (
                  <CheckCircle2 size={18} color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
                <Text style={styles.instructorBtnText}>
                  {dispatchSent ? "Sent to Instructor" : "Send to Instructor"}
                </Text>
              </Pressable>
            )}

            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Share2 size={18} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share Briefing</Text>
            </Pressable>
          </Animated.View>

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

            <Pressable onPress={handleDone} style={styles.doneBtn}>
              <Home size={18} color="#FFFFFF" />
              <Text style={styles.doneText}>Done</Text>
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
  card: {},
  routeTitle: {
    fontSize: 20,
    fontFamily: "JetBrainsMono_700Bold",
    marginBottom: 2,
  },
  routeVia: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  summaryValue: { fontSize: 16, fontFamily: "JetBrainsMono_600SemiBold" },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  catLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  catText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  checkHeader: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_700Bold",
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  checkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actions: { gap: 10 },
  instructorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  instructorBtnSent: {
    backgroundColor: colors.alert.green,
  },
  instructorBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  shareBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
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
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  doneText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
});
