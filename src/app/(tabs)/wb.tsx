import { useMemo, useEffect, useRef } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Scale, Save } from "lucide-react-native";

import { useWBStore } from "@/stores/wb-store";
import { useSceneStore } from "@/stores/scene-store";
import { useDispatchStore } from "@/stores/dispatch-store";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { calcTotalWB, calcLandingWB } from "@/lib/wb/calculations";
import {
  calcPressureAlt,
  calcDensityAlt,
  getDensityAltWarning,
} from "@/lib/wb/performance";

import { WeightBalanceForm } from "@/components/wb/WeightBalanceForm";
import { CGEnvelopeGraph } from "@/components/wb/CGEnvelopeGraph";
import { WBAlerts } from "@/components/wb/WBAlerts";
import { PerformancePanel } from "@/components/wb/PerformancePanel";
import { PerformanceImpactCard } from "@/components/wb/PerformanceImpactCard";
import { getPerformanceReport } from "@/lib/wb/performance-impact";
import { useContentWidth } from "@/hooks/useContentWidth";
import { trackEvent } from "@/services/analytics";
import { colors } from "@/theme/tokens";

export default function WBScreen() {
  const contentWidth = useContentWidth();
  const { scene } = useSceneStore();

  const {
    aircraft,
    stationWeights,
    fuelGallons,
    fuelUnit,
    estimatedFuelBurn,
    showLanding,
    fieldElevation,
    altimeterSetting,
    oat,
    customEmptyWeight,
    customEmptyArm,
  } = useWBStore();

  const takeoff = useMemo(
    () => calcTotalWB(aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm),
    [aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm]
  );

  const landing = useMemo(() => {
    if (!showLanding || estimatedFuelBurn <= 0) return null;
    return calcLandingWB(takeoff, estimatedFuelBurn, aircraft);
  }, [showLanding, estimatedFuelBurn, takeoff, aircraft]);

  // Track W&B calculation when user modifies inputs
  const wbTrackedRef = useRef(false);
  useEffect(() => {
    // Track once per session when user has filled in some data
    const hasData = stationWeights.some((w) => w > 0) || fuelGallons > 0;
    if (hasData && !wbTrackedRef.current) {
      wbTrackedRef.current = true;
      trackEvent({ type: "wb_calculation" });
    }
  }, [stationWeights, fuelGallons]);

  const pa = calcPressureAlt(fieldElevation, altimeterSetting);
  const da = calcDensityAlt(pa, oat);
  const daSeverity = getDensityAltWarning(da);

  const perfReport = useMemo(
    () =>
      getPerformanceReport({
        densityAlt: da,
        fieldElevation,
        temperature: oat,
        aircraftName: aircraft.name,
      }),
    [da, fieldElevation, oat, aircraft.name]
  );

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentWidth ? { maxWidth: contentWidth } : undefined]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <Scale size={22} color="#ffffff" strokeWidth={1.8} />
            <Text style={styles.title}>Weight & Balance</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <WeightBalanceForm result={takeoff} />
          </Animated.View>

          {/* CG Graph */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.gap}>
            <CGEnvelopeGraph
              aircraft={aircraft}
              takeoff={takeoff}
              landing={landing}
              showLanding={showLanding}
            />
          </Animated.View>

          {/* Alerts */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.gap}>
            <WBAlerts
              takeoff={takeoff}
              landing={landing}
              showLanding={showLanding}
              densityAlt={da}
              densityAltSeverity={daSeverity}
            />
          </Animated.View>

          {/* Performance */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.gap}>
            <PerformancePanel />
          </Animated.View>

          {/* Density Altitude Performance Impact */}
          <Animated.View entering={FadeInDown.delay(250)} style={styles.gap}>
            <PerformanceImpactCard
              densityAlt={perfReport.densityAlt}
              severity={perfReport.severity}
              takeoffRoll={perfReport.takeoffRoll}
              climbRate={perfReport.climbRate}
              runway={perfReport.runway}
              warnings={perfReport.warnings}
              advisory={perfReport.advisory}
            />
          </Animated.View>

          {/* Save to Dispatch */}
          {useDispatchStore.getState().currentDispatch && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.gap}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  useDispatchStore.getState().saveWB({
                    aircraftType: aircraft.name,
                    totalWeight: takeoff.totalWeight,
                    cg: takeoff.cg,
                    withinLimits: takeoff.isCGInEnvelope && !takeoff.isOverweight,
                    timestamp: new Date(),
                  });
                }}
                style={styles.saveDispatchBtn}
              >
                <Save size={18} color="#ffffff" />
                <Text style={styles.saveDispatchText}>Save to Dispatch</Text>
              </Pressable>
            </Animated.View>
          )}

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
  scrollContent: { paddingHorizontal: 16, maxWidth: 500, width: "100%", alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gap: { marginTop: 12 },
  saveDispatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveDispatchText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#ffffff",
  },
});
