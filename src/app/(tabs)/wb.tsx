import { useMemo } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Scale } from "lucide-react-native";

import { useWBStore } from "@/stores/wb-store";
import { useSceneStore } from "@/stores/scene-store";
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

export default function WBScreen() {
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

  const pa = calcPressureAlt(fieldElevation, altimeterSetting);
  const da = calcDensityAlt(pa, oat);
  const daSeverity = getDensityAltWarning(da);

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
  scrollContent: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gap: { marginTop: 12 },
});
