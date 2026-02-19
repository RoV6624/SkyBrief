/**
 * Standalone FRAT (Flight Risk Assessment Tool) card for single-station briefing.
 *
 * Auto-calculates the weather score from the provided METAR, then presents
 * three Pressable-based custom sliders for pilot-rated inputs. The combined
 * score and risk level are displayed with colour-coded badges.
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { calculateWeatherScore, calculateFRAT } from "@/lib/frat/calculate";
import type { FRATInputs, FRATResult, RiskLevel } from "@/lib/frat/types";
import type { NormalizedMetar } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  metar: NormalizedMetar;
  onComplete: (result: FRATResult, inputs: FRATInputs) => void;
}

// ---------------------------------------------------------------------------
// Risk badge config
// ---------------------------------------------------------------------------

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  low: {
    label: "LOW",
    color: colors.alert.green,
    bg: "rgba(34,197,94,0.12)",
    icon: CheckCircle2,
  },
  caution: {
    label: "CAUTION",
    color: colors.alert.amber,
    bg: "rgba(245,158,11,0.12)",
    icon: AlertTriangle,
  },
  high: {
    label: "HIGH",
    color: colors.alert.red,
    bg: "rgba(239,68,68,0.12)",
    icon: XCircle,
  },
};

// ---------------------------------------------------------------------------
// Custom slider component (Pressable-based, no native Slider)
// ---------------------------------------------------------------------------

interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (v: number) => void;
  isDark: boolean;
}

function CustomSlider({
  label,
  description,
  value,
  min,
  max,
  onValueChange,
  isDark,
}: SliderProps) {
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const steps = max - min;
  const fraction = (value - min) / steps;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const handlePress = useCallback(
    (evt: any) => {
      if (trackWidth === 0) return;
      const x = evt.nativeEvent.locationX;
      const raw = Math.round((x / trackWidth) * steps + min);
      const clamped = Math.max(min, Math.min(max, raw));
      if (clamped !== value) {
        Haptics.selectionAsync();
        onValueChange(clamped);
      }
    },
    [trackWidth, steps, min, max, value, onValueChange]
  );

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text
          style={[
            sliderStyles.label,
            { color: isDark ? "#FFFFFF" : colors.stratus[800] },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            sliderStyles.valueLabel,
            { color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600] },
          ]}
        >
          {value}/{max}
        </Text>
      </View>
      <Text
        style={[
          sliderStyles.description,
          { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
        ]}
      >
        {description}
      </Text>

      {/* Track */}
      <Pressable onPress={handlePress}>
        <View
          ref={trackRef}
          onLayout={onTrackLayout}
          style={[
            sliderStyles.track,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          {/* Filled portion */}
          <View
            style={[
              sliderStyles.trackFill,
              {
                width: `${fraction * 100}%`,
                backgroundColor:
                  value <= 3
                    ? colors.alert.green
                    : value <= 6
                    ? colors.alert.amber
                    : colors.alert.red,
              },
            ]}
          />
          {/* Thumb */}
          <View
            style={[
              sliderStyles.thumb,
              {
                left: `${fraction * 100}%`,
                backgroundColor: "#FFFFFF",
                borderColor:
                  value <= 3
                    ? colors.alert.green
                    : value <= 6
                    ? colors.alert.amber
                    : colors.alert.red,
              },
            ]}
          />
        </View>
      </Pressable>

      {/* Step indicators */}
      <View style={sliderStyles.stepRow}>
        {Array.from({ length: steps + 1 }, (_, i) => {
          const step = min + i;
          const isActive = step === value;
          return (
            <Pressable
              key={step}
              onPress={() => {
                if (step !== value) {
                  Haptics.selectionAsync();
                  onValueChange(step);
                }
              }}
              style={sliderStyles.stepTap}
            >
              <Text
                style={[
                  sliderStyles.stepText,
                  {
                    color: isActive
                      ? isDark
                        ? "#FFFFFF"
                        : colors.stratus[800]
                      : isDark
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.25)",
                    fontFamily: isActive
                      ? "JetBrainsMono_600SemiBold"
                      : "JetBrainsMono_400Regular",
                  },
                ]}
              >
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { marginTop: 16 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  valueLabel: { fontSize: 13, fontFamily: "JetBrainsMono_600SemiBold" },
  description: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 10,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "visible",
    justifyContent: "center",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    marginLeft: -10,
    top: -7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepTap: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  stepText: { fontSize: 9 },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StationFRATCard({ metar, onComplete }: Props) {
  const { isDark } = useTheme();

  // Auto-calculated weather score
  const weatherScore = useMemo(() => {
    const maxWind = metar.wind.gust ?? metar.wind.speed;
    return calculateWeatherScore(
      metar.flightCategory,
      metar.ceiling,
      metar.visibility.sm,
      maxWind
    );
  }, [metar]);

  // Pilot-rated inputs
  const [pilotFatigue, setPilotFatigue] = useState(3);
  const [airportFamiliarity, setAirportFamiliarity] = useState(3);
  const [tripUrgency, setTripUrgency] = useState(3);

  // Combined FRAT result
  const inputs: FRATInputs = useMemo(
    () => ({
      weatherScore,
      pilotFatigue,
      airportFamiliarity,
      tripUrgency,
    }),
    [weatherScore, pilotFatigue, airportFamiliarity, tripUrgency]
  );

  const result = useMemo(() => calculateFRAT(inputs), [inputs]);

  const riskCfg = RISK_CONFIG[result.riskLevel];
  const RiskIcon = riskCfg.icon;

  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(result, inputs);
  }, [result, inputs, onComplete]);

  return (
    <Animated.View entering={FadeInDown.delay(100)}>
      <CloudCard>
        {/* Header */}
        <View style={styles.headerRow}>
          <Shield size={18} color={colors.accent} />
          <Text
            style={[
              styles.title,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            FRAT Assessment
          </Text>
        </View>

        {/* Weather score (auto) */}
        <View
          style={[
            styles.weatherScoreRow,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.02)",
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <View style={styles.weatherScoreLeft}>
            <Text
              style={[
                styles.weatherScoreLabel,
                { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
              ]}
            >
              Weather Score (auto)
            </Text>
            <Text
              style={[
                styles.weatherScoreStation,
                { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
              ]}
            >
              {metar.station} -- {metar.flightCategory}
            </Text>
          </View>
          <Text
            style={[
              styles.weatherScoreValue,
              {
                color:
                  weatherScore <= 6
                    ? colors.alert.green
                    : weatherScore <= 12
                    ? colors.alert.amber
                    : colors.alert.red,
              },
            ]}
          >
            {weatherScore}/20
          </Text>
        </View>

        {/* Pilot input sliders */}
        <CustomSlider
          label="Pilot Fatigue"
          description="1 = well rested, 10 = exhausted / poorly rested"
          value={pilotFatigue}
          min={1}
          max={10}
          onValueChange={setPilotFatigue}
          isDark={isDark}
        />

        <CustomSlider
          label="Airport Familiarity"
          description="1 = home base / familiar, 10 = new or challenging airport"
          value={airportFamiliarity}
          min={1}
          max={10}
          onValueChange={setAirportFamiliarity}
          isDark={isDark}
        />

        <CustomSlider
          label="Trip Urgency"
          description="1 = flexible / no pressure, 10 = must-go / high pressure"
          value={tripUrgency}
          min={1}
          max={10}
          onValueChange={setTripUrgency}
          isDark={isDark}
        />

        {/* Result banner */}
        <View
          style={[
            styles.resultBanner,
            { backgroundColor: riskCfg.bg, borderColor: riskCfg.color },
          ]}
        >
          <RiskIcon size={22} color={riskCfg.color} />
          <View style={styles.resultContent}>
            <View style={styles.resultTopRow}>
              <Text style={[styles.resultRisk, { color: riskCfg.color }]}>
                {riskCfg.label}
              </Text>
              <Text style={[styles.resultScore, { color: riskCfg.color }]}>
                {result.totalScore}/70
              </Text>
            </View>
            <Text
              style={[
                styles.resultRecommendation,
                { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[700] },
              ]}
            >
              {result.recommendation}
            </Text>
          </View>
        </View>

        {/* Complete button */}
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => [
            styles.completeBtn,
            {
              backgroundColor: riskCfg.color,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.completeBtnText}>Save FRAT Assessment</Text>
        </Pressable>
      </CloudCard>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold" },

  weatherScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  weatherScoreLeft: { flex: 1 },
  weatherScoreLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  weatherScoreStation: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    marginTop: 2,
  },
  weatherScoreValue: {
    fontSize: 22,
    fontFamily: "JetBrainsMono_700Bold",
  },

  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  resultContent: { flex: 1 },
  resultTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultRisk: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 2,
  },
  resultScore: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_700Bold",
  },
  resultRecommendation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    lineHeight: 17,
  },

  completeBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  completeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
