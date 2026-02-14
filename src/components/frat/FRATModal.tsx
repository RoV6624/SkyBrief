import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { Shield, AlertTriangle, X } from "lucide-react-native";

import type { RouteBriefing } from "@/lib/route/types";
import { calculateWeatherScore, calculateFRAT } from "@/lib/frat/calculate";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface FRATModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  routeBriefing: RouteBriefing;
}

export function FRATModal({
  visible,
  onClose,
  onContinue,
  routeBriefing,
}: FRATModalProps) {
  const { theme, isDark } = useTheme();

  const [pilotFatigue, setPilotFatigue] = useState(5);
  const [airportFamiliarity, setAirportFamiliarity] = useState(3);
  const [tripUrgency, setTripUrgency] = useState(5);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  // Calculate weather score from route briefing
  const weatherScore = useMemo(() => {
    const ceilings = routeBriefing.weatherPoints
      .map((wp) => wp.metar?.ceiling)
      .filter((c): c is number => c !== null);
    const avgCeiling = ceilings.length > 0
      ? ceilings.reduce((sum, c) => sum + c, 0) / ceilings.length
      : null;

    const visibilities = routeBriefing.weatherPoints
      .map((wp) => wp.metar?.visibility.sm)
      .filter((v): v is number => v !== undefined);
    const avgVisibility = visibilities.length > 0
      ? visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length
      : null;

    const winds = routeBriefing.weatherPoints
      .map((wp) => wp.metar?.wind.speed ?? 0);
    const maxWind = Math.max(...winds, 0);

    return calculateWeatherScore(
      routeBriefing.worstCategory,
      avgCeiling,
      avgVisibility,
      maxWind
    );
  }, [routeBriefing]);

  // Calculate FRAT result
  const fratResult = useMemo(() => {
    return calculateFRAT({
      weatherScore,
      pilotFatigue,
      airportFamiliarity,
      tripUrgency,
    });
  }, [weatherScore, pilotFatigue, airportFamiliarity, tripUrgency]);

  // Trigger haptic error feedback for high risk (only once per modal open)
  useEffect(() => {
    if (visible && fratResult.riskLevel === "high" && !hasTriggeredHaptic) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setHasTriggeredHaptic(true);
    }
    if (!visible) {
      setHasTriggeredHaptic(false); // Reset for next open
    }
  }, [visible, fratResult.riskLevel, hasTriggeredHaptic]);

  // Risk level colors
  const riskColor =
    fratResult.riskLevel === "low"
      ? colors.vfr
      : fratResult.riskLevel === "caution"
      ? colors.mvfr
      : colors.ifr;

  const riskBgColor =
    fratResult.riskLevel === "low"
      ? "rgba(16,185,129,0.12)"
      : fratResult.riskLevel === "caution"
      ? "rgba(245,158,11,0.12)"
      : "rgba(239,68,68,0.12)";

  const riskBorderColor =
    fratResult.riskLevel === "low"
      ? "rgba(16,185,129,0.3)"
      : fratResult.riskLevel === "caution"
      ? "rgba(245,158,11,0.3)"
      : "rgba(239,68,68,0.3)";

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.container}
          >
            <CloudCard>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Shield size={20} color={colors.stratus[500]} strokeWidth={1.8} />
                  <Text style={[styles.title, { color: theme.foreground }]}>
                    Flight Risk Assessment
                  </Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={theme.mutedForeground} />
                </Pressable>
              </View>

              <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                Review risk factors before your flight
              </Text>

              {/* Weather Score (Read-Only) */}
              <View style={styles.section}>
                <Text style={[styles.label, { color: theme.foreground }]}>
                  Weather Score
                </Text>
                <View style={styles.scoreRow}>
                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(12,140,233,0.15)"
                          : "rgba(12,140,233,0.1)",
                      },
                    ]}
                  >
                    <Text style={styles.scoreText}>{weatherScore} / 20</Text>
                  </View>
                  <Text style={[styles.scoreLabel, { color: theme.mutedForeground }]}>
                    Auto-calculated from route conditions
                  </Text>
                </View>
              </View>

              {/* Pilot Fatigue Slider */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.label, { color: theme.foreground }]}>
                    Pilot Fatigue
                  </Text>
                  <Text style={[styles.sliderValue, { color: colors.stratus[500] }]}>
                    {pilotFatigue}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={pilotFatigue}
                  onValueChange={(val) => {
                    setPilotFatigue(val);
                    Haptics.selectionAsync();
                  }}
                  minimumTrackTintColor={colors.stratus[500]}
                  maximumTrackTintColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.15)"}
                  thumbTintColor={colors.stratus[500]}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabelText, { color: theme.mutedForeground }]}>
                    Rested
                  </Text>
                  <Text style={[styles.sliderLabelText, { color: theme.mutedForeground }]}>
                    Exhausted
                  </Text>
                </View>
              </View>

              {/* Airport Familiarity Slider */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.label, { color: theme.foreground }]}>
                    Airport Familiarity
                  </Text>
                  <Text
                    style={[
                      styles.sliderValue,
                      {
                        color:
                          airportFamiliarity <= 3
                            ? colors.vfr
                            : airportFamiliarity <= 6
                            ? colors.mvfr
                            : colors.ifr,
                      },
                    ]}
                  >
                    {airportFamiliarity <= 3
                      ? "Home Base"
                      : airportFamiliarity <= 6
                      ? "Been There"
                      : "New Airport"}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={airportFamiliarity}
                  onValueChange={(val) => {
                    setAirportFamiliarity(val);
                    Haptics.selectionAsync();
                  }}
                  minimumTrackTintColor={
                    airportFamiliarity <= 3
                      ? colors.vfr
                      : airportFamiliarity <= 6
                      ? colors.mvfr
                      : colors.ifr
                  }
                  maximumTrackTintColor={
                    isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.15)"
                  }
                  thumbTintColor={
                    airportFamiliarity <= 3
                      ? colors.vfr
                      : airportFamiliarity <= 6
                      ? colors.mvfr
                      : colors.ifr
                  }
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabelText, { color: theme.mutedForeground }]}>
                    Home Base
                  </Text>
                  <Text style={[styles.sliderLabelText, { color: theme.mutedForeground }]}>
                    New Airport
                  </Text>
                </View>
              </View>

              {/* Trip Urgency Slider */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.label, { color: theme.foreground }]}>
                    Trip Urgency
                  </Text>
                  <Text style={[styles.sliderValue, { color: colors.stratus[500] }]}>
                    {tripUrgency}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={tripUrgency}
                  onValueChange={(val) => {
                    setTripUrgency(val);
                    Haptics.selectionAsync();
                  }}
                  minimumTrackTintColor={colors.stratus[500]}
                  maximumTrackTintColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.15)"}
                  thumbTintColor={colors.stratus[500]}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabelText, { color: theme.mutedForeground }]}>
                    Leisure
                  </Text>
                  <Text style={[styles.sliderLabelText, { color: theme.mutedForeground }]}>
                    Critical
                  </Text>
                </View>
              </View>

              {/* Total Score & Risk Level */}
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: riskBgColor,
                    borderColor: riskBorderColor,
                  },
                ]}
              >
                <View style={styles.resultHeader}>
                  {fratResult.riskLevel !== "low" && (
                    <AlertTriangle size={18} color={riskColor} />
                  )}
                  <Text style={[styles.resultTitle, { color: riskColor }]}>
                    {fratResult.riskLevel === "low"
                      ? "LOW RISK"
                      : fratResult.riskLevel === "caution"
                      ? "CAUTION"
                      : "HIGH RISK"}
                  </Text>
                </View>

                <Text style={[styles.totalScore, { color: theme.foreground }]}>
                  Total Score: {fratResult.totalScore}
                </Text>

                <Text style={[styles.recommendation, { color: theme.mutedForeground }]}>
                  {fratResult.recommendation}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.dismissBtn,
                    { borderColor: theme.mutedForeground },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.dismissText, { color: theme.mutedForeground }]}>
                    Dismiss
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onContinue();
                  }}
                  style={({ pressed }) => [
                    styles.continueBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.continueText}>Continue to Briefing</Text>
                </Pressable>
              </View>
            </CloudCard>
          </Animated.View>
        </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 20,
    justifyContent: "center",
    minHeight: "100%",
  },
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_700Bold",
    color: colors.stratus[500],
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_700Bold",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  totalScore: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_700Bold",
    marginBottom: 6,
  },
  recommendation: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  dismissBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  continueBtn: {
    flex: 2,
    backgroundColor: colors.stratus[500],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  continueText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
});
