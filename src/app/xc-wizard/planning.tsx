/**
 * XC Wizard Step 3: W&B, Fuel, and FRAT
 *
 * Run weight & balance, fuel planning, and flight risk assessment.
 */

import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Scale,
  Fuel,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react-native";

import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { CloudCard } from "@/components/ui/CloudCard";
import { useSceneStore } from "@/stores/scene-store";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useWBStore } from "@/stores/wb-store";
import { calcTotalWB } from "@/lib/wb/calculations";
import { useRouteBriefing } from "@/hooks/useRouteBriefing";
import { calculateNavLog } from "@/lib/navlog/calculate";
import { useContentWidth } from "@/hooks/useContentWidth";
import { useXCWizardStore } from "@/stores/xc-wizard-store";
import { WBModal } from "@/components/xc-wizard/WBModal";
import { FRATModal } from "@/components/frat/FRATModal";
import { PerformanceCard } from "@/components/xc-wizard/PerformanceCard";

export default function XCWizardPlanningScreen() {
  const reducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const router = useRouter();
  const { waypoints: wpParam } = useLocalSearchParams<{ waypoints: string }>();
  const scene = useSceneStore((s) => s.scene);
  const contentWidth = useContentWidth();
  const xcStore = useXCWizardStore();

  const [showWBModal, setShowWBModal] = useState(false);
  const [showFRATModal, setShowFRATModal] = useState(false);

  const waypoints = useMemo(() => {
    const fromStore = xcStore.waypoints.filter((w) => w.trim().length >= 3);
    if (fromStore.length >= 2) return fromStore;
    return (wpParam ?? "").split(",").filter(Boolean);
  }, [wpParam, xcStore.waypoints]);
  const { data: briefing } = useRouteBriefing(waypoints);

  // Use route briefing from store (cached in Step 2) as fallback
  const activeBriefing = briefing ?? xcStore.routeBriefing;

  const {
    aircraft,
    stationWeights,
    fuelGallons,
    setFuelGallons,
    fuelUnit,
    customEmptyWeight,
    customEmptyArm,
  } = useWBStore();

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

  const fuelRequired = navLog ? navLog.totalFuel * 1.3 : 0; // + 30% reserve
  const hasFuel = fuelGallons >= fuelRequired;

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
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </Animated.View>

          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(50)} style={styles.header}>
            <Scale size={22} color="#ffffff" strokeWidth={1.8} />
            <View>
              <Text style={styles.stepLabel}>STEP 3 OF 4</Text>
              <Text style={styles.title}>Planning Checks</Text>
            </View>
          </Animated.View>

          <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.6)" }]}>
            Verify weight & balance, fuel, and risk assessment.
          </Text>

          {/* Weight & Balance Card — tap to open full editor */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowWBModal(true);
              }}
              accessibilityLabel="Edit weight and balance"
              accessibilityRole="button"
            >
              <CloudCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <Scale size={18} color={subColor} />
                  <Text style={[styles.cardTitle, { color: textColor }]}>
                    Weight & Balance
                  </Text>
                  {wbResult.isOverweight ? (
                    <AlertTriangle size={16} color={colors.alert.red} />
                  ) : (
                    <CheckCircle2 size={16} color={colors.alert.green} />
                  )}
                </View>

                <View style={styles.dataGrid}>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>Total Weight</Text>
                    <Text
                      style={[
                        styles.dataValue,
                        {
                          color: wbResult.isOverweight ? colors.alert.red : textColor,
                        },
                      ]}
                    >
                      {wbResult.totalWeight.toLocaleString()} lbs
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>Max Takeoff</Text>
                    <Text style={[styles.dataValue, { color: textColor }]}>
                      {aircraft.maxTakeoffWeight.toLocaleString()} lbs
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>CG</Text>
                    <Text style={[styles.dataValue, { color: textColor }]}>
                      {wbResult.cg.toFixed(1)} in
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>Status</Text>
                    <Text
                      style={[
                        styles.dataValue,
                        {
                          color: wbResult.isCGInEnvelope
                            ? colors.alert.green
                            : colors.alert.red,
                        },
                      ]}
                    >
                      {wbResult.isCGInEnvelope ? "IN ENVELOPE" : "OUT OF CG"}
                    </Text>
                  </View>
                </View>

                <View style={styles.tapHintRow}>
                  <Text style={[styles.tapHint, { color: subColor }]}>Tap to edit</Text>
                  <ChevronRight size={12} color={subColor} />
                </View>
              </CloudCard>
            </Pressable>
          </Animated.View>

          {/* Fuel Card */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(150)}>
            <CloudCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Fuel size={18} color={subColor} />
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Fuel Planning
                </Text>
                {hasFuel || !navLog ? (
                  <CheckCircle2 size={16} color={colors.alert.green} />
                ) : (
                  <AlertTriangle size={16} color={colors.alert.red} />
                )}
              </View>

              {navLog ? (
                <View style={styles.dataGrid}>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>Trip Fuel</Text>
                    <Text style={[styles.dataValue, { color: textColor }]}>
                      {navLog.totalFuel.toFixed(1)} gal
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>+ 30% Reserve</Text>
                    <Text style={[styles.dataValue, { color: textColor }]}>
                      {fuelRequired.toFixed(1)} gal
                    </Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>Onboard</Text>
                    <View style={styles.fuelInputRow}>
                      <TextInput
                        style={[
                          styles.fuelInput,
                          { color: hasFuel ? textColor : colors.alert.red },
                        ]}
                        value={fuelGallons > 0 ? String(fuelGallons) : ""}
                        placeholder="0"
                        placeholderTextColor={subColor}
                        onChangeText={(text) => {
                          const num = parseFloat(text);
                          setFuelGallons(isNaN(num) ? 0 : Math.max(0, num));
                        }}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        selectTextOnFocus
                      />
                      <Text
                        style={[
                          styles.fuelUnit,
                          { color: hasFuel ? textColor : colors.alert.red },
                        ]}
                      >
                        gal
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={[styles.dataLabel, { color: subColor }]}>Trip Time</Text>
                    <Text style={[styles.dataValue, { color: textColor }]}>
                      {Math.floor(navLog.totalTime / 60)}h {Math.round(navLog.totalTime % 60)}m
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.noData, { color: subColor }]}>
                  Route data not yet available
                </Text>
              )}
            </CloudCard>
          </Animated.View>

          {/* Performance Card */}
          {activeBriefing && (
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200)}>
              <PerformanceCard routeBriefing={activeBriefing} />
            </Animated.View>
          )}

          {/* Risk Assessment Card — tappable FRAT */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(250)}>
            <Pressable
              onPress={() => {
                if (!activeBriefing) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowFRATModal(true);
              }}
              disabled={!activeBriefing}
              accessibilityLabel="Open flight risk assessment"
              accessibilityRole="button"
            >
              <CloudCard
                style={[
                  styles.card,
                  !activeBriefing && { opacity: 0.5 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <ShieldCheck size={18} color={subColor} />
                  <Text style={[styles.cardTitle, { color: textColor }]}>
                    Risk Assessment
                  </Text>
                  {xcStore.fratResult ? (
                    <CheckCircle2 size={16} color={colors.alert.green} />
                  ) : null}
                </View>
                {xcStore.fratResult ? (
                  <View style={styles.dataGrid}>
                    <View style={styles.dataItem}>
                      <Text style={[styles.dataLabel, { color: subColor }]}>Score</Text>
                      <Text style={[styles.dataValue, { color: textColor }]}>
                        {xcStore.fratResult.totalScore}
                      </Text>
                    </View>
                    <View style={styles.dataItem}>
                      <Text style={[styles.dataLabel, { color: subColor }]}>Risk Level</Text>
                      <Text
                        style={[
                          styles.dataValue,
                          {
                            color:
                              xcStore.fratResult.riskLevel === "low"
                                ? colors.alert.green
                                : xcStore.fratResult.riskLevel === "caution"
                                ? colors.alert.amber
                                : colors.alert.red,
                          },
                        ]}
                      >
                        {xcStore.fratResult.riskLevel.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.riskNote, { color: subColor }]}>
                    {activeBriefing
                      ? "Tap to complete FRAT assessment"
                      : "Complete weather review first"}
                  </Text>
                )}
                {activeBriefing && (
                  <View style={styles.tapHintRow}>
                    <Text style={[styles.tapHint, { color: subColor }]}>
                      {xcStore.fratResult ? "Tap to redo" : "Tap to start"}
                    </Text>
                    <ChevronRight size={12} color={subColor} />
                  </View>
                )}
              </CloudCard>
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
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/xc-wizard/summary",
                  params: { waypoints: wpParam },
                });
              }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>Summary</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* W&B Full Editor Modal */}
      <WBModal visible={showWBModal} onClose={() => setShowWBModal(false)} />

      {/* FRAT Modal */}
      {activeBriefing && (
        <FRATModal
          visible={showFRATModal}
          onClose={() => setShowFRATModal(false)}
          onContinue={() => setShowFRATModal(false)}
          routeBriefing={activeBriefing}
          onComplete={(result, inputs) => {
            xcStore.setFratResult(result, inputs);
          }}
        />
      )}
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
  card: {},
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", flex: 1 },
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dataItem: {
    width: "47%",
    gap: 2,
  },
  dataLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dataValue: { fontSize: 15, fontFamily: "JetBrainsMono_600SemiBold" },
  fuelInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  fuelInput: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_600SemiBold",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    paddingVertical: 2,
    paddingHorizontal: 2,
    minWidth: 50,
  },
  fuelUnit: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  noData: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  riskNote: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  tapHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  tapHint: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
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
  backBtnText: {
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
