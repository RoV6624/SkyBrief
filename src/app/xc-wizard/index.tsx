/**
 * XC Wizard Step 1: Route Selection
 *
 * Pick departure, destination, and waypoints.
 * Auto-generate route or enter manually.
 */

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Navigation,
  MapPin,
  Plus,
  Trash2,
  ArrowRight,
  Wand2,
  X,
} from "lucide-react-native";

import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { CloudCard } from "@/components/ui/CloudCard";
import { useSceneStore } from "@/stores/scene-store";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { generateWaypoints } from "@/lib/route/waypoint-generator";
import { useContentWidth } from "@/hooks/useContentWidth";
import { useXCWizardStore } from "@/stores/xc-wizard-store";

export default function XCWizardRouteScreen() {
  const reducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const router = useRouter();
  const scene = useSceneStore((s) => s.scene);
  const contentWidth = useContentWidth();
  const xcStore = useXCWizardStore();

  const [waypoints, setWaypointsLocal] = useState(() => {
    const stored = xcStore.waypoints;
    return stored.length >= 2 && stored.some((w) => w.length > 0)
      ? stored
      : ["", ""];
  });
  const [generating, setGenerating] = useState(false);

  // Sync local state to persisted store
  useEffect(() => {
    xcStore.setWaypoints(waypoints);
    xcStore.setCurrentStep(1);
  }, [waypoints]);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";

  const updateWaypoint = (index: number, value: string) => {
    const updated = [...waypoints];
    updated[index] = value.toUpperCase();
    setWaypointsLocal(updated);
  };

  const addWaypoint = () => {
    if (waypoints.length < 6) {
      Haptics.selectionAsync();
      setWaypointsLocal([...waypoints, ""]);
    }
  };

  const removeWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      Haptics.selectionAsync();
      setWaypointsLocal(waypoints.filter((_, i) => i !== index));
    }
  };

  const handleAutoGenerate = useCallback(async () => {
    const dep = waypoints[0]?.trim();
    const dest = waypoints[waypoints.length - 1]?.trim();
    if (!dep || dep.length < 3 || !dest || dest.length < 3) {
      Alert.alert("Enter Airports", "Enter departure and destination first.");
      return;
    }

    setGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await generateWaypoints(dep, dest, {
        strategy: "direct",
        maxSegmentNm: 25,
        flightType: "VFR",
        corridorWidthNm: 30,
      });
      if (result.length > 0) {
        setWaypointsLocal(result.map((wp) => wp.identifier));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Could not generate route. Try different airports.");
    } finally {
      setGenerating(false);
    }
  }, [waypoints]);

  const handleNext = () => {
    const valid = waypoints.filter((w) => w.trim().length >= 3);
    if (valid.length < 2) {
      Alert.alert("Need Airports", "Enter at least departure and destination.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/xc-wizard/weather",
      params: { waypoints: valid.join(",") },
    });
  };

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            contentWidth ? { maxWidth: contentWidth } : undefined,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close Button */}
          <View style={styles.closeRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                Alert.alert(
                  "Exit Planning?",
                  "Your route data will be saved as a draft.",
                  [
                    { text: "Keep Planning", style: "cancel" },
                    { text: "Exit", style: "destructive", onPress: () => router.dismissAll() },
                  ]
                );
              }}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <X size={22} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Step Indicator */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown} style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </Animated.View>

          {/* Header */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(50)} style={styles.header}>
            <Navigation size={22} color="#ffffff" strokeWidth={1.8} />
            <View>
              <Text style={styles.stepLabel}>STEP 1 OF 4</Text>
              <Text style={styles.title}>Plan Your Route</Text>
            </View>
          </Animated.View>

          <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.6)" }]}>
            Enter your departure, destination, and any intermediate waypoints.
          </Text>

          {/* Waypoint Inputs */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
            <CloudCard style={styles.card}>
              <View style={styles.cardInner}>
              {waypoints.map((wp, idx) => (
                <View key={idx} style={styles.wpRow}>
                  <MapPin
                    size={16}
                    color={
                      idx === 0
                        ? colors.alert.green
                        : idx === waypoints.length - 1
                        ? colors.alert.red
                        : subColor
                    }
                  />
                  <TextInput
                    style={[
                      styles.wpInput,
                      {
                        color: textColor,
                        backgroundColor: isDark
                          ? colors.stratus[700]
                          : colors.stratus[100],
                      },
                    ]}
                    value={wp}
                    onChangeText={(v) => updateWaypoint(idx, v)}
                    placeholder={
                      idx === 0
                        ? "Departure (ICAO)"
                        : idx === waypoints.length - 1
                        ? "Destination (ICAO)"
                        : `Waypoint ${idx}`
                    }
                    placeholderTextColor={
                      isDark ? colors.stratus[600] : colors.stratus[300]
                    }
                    autoCapitalize="characters"
                    maxLength={5}
                  />
                  {waypoints.length > 2 && idx > 0 && idx < waypoints.length - 1 && (
                    <Pressable onPress={() => removeWaypoint(idx)} hitSlop={8}>
                      <Trash2 size={16} color={colors.alert.red} />
                    </Pressable>
                  )}
                </View>
              ))}

              {waypoints.length < 6 && (
                <Pressable onPress={addWaypoint} style={styles.addRow}>
                  <Plus size={14} color={colors.accent} />
                  <Text style={[styles.addText, { color: colors.accent }]}>
                    Add Waypoint
                  </Text>
                </Pressable>
              )}
              </View>
            </CloudCard>
          </Animated.View>

          {/* Auto Generate */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(150)}>
            <Pressable
              onPress={handleAutoGenerate}
              disabled={generating}
              style={[styles.generateBtn, { opacity: generating ? 0.5 : 1 }]}
            >
              <Wand2 size={16} color="#FFFFFF" />
              <Text style={styles.generateText}>
                {generating ? "Generating..." : "Auto-Generate Route"}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Next Button */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200)}>
            <Pressable onPress={handleNext} style={styles.nextBtn}>
              <Text style={styles.nextText}>Next: Review Weather</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
        </KeyboardAvoidingView>
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
    gap: 16,
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
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  stepActive: { backgroundColor: colors.accent },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
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
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  card: {},
  cardInner: { gap: 12 },
  wpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wpInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "JetBrainsMono_500Medium",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingTop: 4,
  },
  addText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  generateBtn: {
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
  generateText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
});
