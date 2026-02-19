/**
 * XC Wizard Step 3: W&B, Fuel, and FRAT
 *
 * Run weight & balance, fuel planning, and flight risk assessment.
 */

import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
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

export default function XCWizardPlanningScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { waypoints: wpParam } = useLocalSearchParams<{ waypoints: string }>();
  const scene = useSceneStore((s) => s.scene);
  const contentWidth = useContentWidth();

  const waypoints = useMemo(() => (wpParam ?? "").split(",").filter(Boolean), [wpParam]);
  const { data: briefing } = useRouteBriefing(waypoints);

  const {
    aircraft,
    stationWeights,
    fuelGallons,
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
    if (!briefing) return null;
    return calculateNavLog(
      briefing.legs,
      briefing.weatherPoints,
      aircraft.cruiseSpeedKts,
      aircraft.fuelBurnRateGPH
    );
  }, [briefing, aircraft.cruiseSpeedKts, aircraft.fuelBurnRateGPH]);

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
          {/* Step Indicator */}
          <Animated.View entering={FadeInDown} style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, styles.stepLineDone]} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
            <Scale size={22} color="#ffffff" strokeWidth={1.8} />
            <View>
              <Text style={styles.stepLabel}>STEP 3 OF 4</Text>
              <Text style={styles.title}>Planning Checks</Text>
            </View>
          </Animated.View>

          <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.6)" }]}>
            Verify weight & balance, fuel, and risk assessment.
          </Text>

          {/* Weight & Balance Card */}
          <Animated.View entering={FadeInDown.delay(100)}>
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
            </CloudCard>
          </Animated.View>

          {/* Fuel Card */}
          <Animated.View entering={FadeInDown.delay(150)}>
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
                    <Text
                      style={[
                        styles.dataValue,
                        { color: hasFuel ? textColor : colors.alert.red },
                      ]}
                    >
                      {fuelGallons.toFixed(1)} gal
                    </Text>
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

          {/* Risk Assessment Card */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <CloudCard style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={18} color={subColor} />
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Risk Assessment
                </Text>
              </View>
              <Text style={[styles.riskNote, { color: subColor }]}>
                Complete the FRAT assessment on the final summary screen to evaluate overall flight risk.
              </Text>
            </CloudCard>
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
  card: { padding: 16 },
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
  noData: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  riskNote: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
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
