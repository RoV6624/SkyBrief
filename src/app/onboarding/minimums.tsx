import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ShieldCheck, ChevronRight, Zap } from "lucide-react-native";
import { useMonitorStore } from "@/stores/monitor-store";
import { useUserStore } from "@/stores/user-store";
import { StepProgressBar } from "@/components/onboarding/StepProgressBar";
import type { PersonalMinimums } from "@/lib/minimums/types";

const PRESETS: Record<string, PersonalMinimums> = {
  student: { ceiling: 3500, visibility: 7, crosswind: 10, maxWind: 20, maxGust: 20 },
  private: { ceiling: 3000, visibility: 5, crosswind: 15, maxWind: 25, maxGust: 25 },
  commercial: { ceiling: 2000, visibility: 3, crosswind: 20, maxWind: 30, maxGust: 30 },
  atp: { ceiling: 1000, visibility: 2, crosswind: 25, maxWind: 35, maxGust: 35 },
};

const LEVEL_LABELS: Record<string, string> = {
  student: "Student",
  private: "Private",
  commercial: "Commercial",
  atp: "ATP",
};

export default function MinimumsScreen() {
  const router = useRouter();
  const { personalMinimums, setPersonalMinimum, setMinimumsEnabled } =
    useMonitorStore();
  const { experienceLevel } = useUserStore();

  const applyPreset = (level: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const preset = PRESETS[level];
    if (!preset) return;
    for (const [key, value] of Object.entries(preset)) {
      setPersonalMinimum(key as keyof PersonalMinimums, value);
    }
  };

  // Auto-apply presets on mount based on experience level
  useEffect(() => {
    const preset = PRESETS[experienceLevel];
    if (preset) {
      for (const [key, value] of Object.entries(preset)) {
        setPersonalMinimum(key as keyof PersonalMinimums, value);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sliders = [
    {
      key: "ceiling" as const,
      label: "Ceiling (ft AGL)",
      min: 200,
      max: 5000,
      step: 100,
      value: personalMinimums.ceiling,
      format: (v: number) => `${v.toLocaleString()} ft`,
    },
    {
      key: "visibility" as const,
      label: "Visibility (SM)",
      min: 1,
      max: 10,
      step: 0.5,
      value: personalMinimums.visibility,
      format: (v: number) => `${v} SM`,
    },
    {
      key: "crosswind" as const,
      label: "Max Crosswind (kts)",
      min: 5,
      max: 30,
      step: 1,
      value: personalMinimums.crosswind,
      format: (v: number) => `${v} kts`,
    },
    {
      key: "maxWind" as const,
      label: "Max Wind (kts)",
      min: 10,
      max: 40,
      step: 1,
      value: personalMinimums.maxWind,
      format: (v: number) => `${v} kts`,
    },
    {
      key: "maxGust" as const,
      label: "Max Gust (kts)",
      min: 10,
      max: 40,
      step: 1,
      value: personalMinimums.maxGust,
      format: (v: number) => `${v} kts`,
    },
  ];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinimumsEnabled(true);
    router.push("/onboarding/aircraft");
  };

  return (
    <LinearGradient
      colors={["#1e90ff", "#87ceeb", "#b0d4f1"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <StepProgressBar currentStep={2} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <View style={styles.headerRow}>
            <ShieldCheck size={24} color="#ffffff" />
            <Text style={styles.title}>Personal Minimums</Text>
          </View>
          <Text style={styles.subtitle}>
            Set your comfort limits. You can adjust these anytime in Settings.
          </Text>
        </Animated.View>

        {/* Experience Preset Banner */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Pressable onPress={() => applyPreset(experienceLevel)} style={styles.presetBanner}>
            <Zap size={16} color="#f59e0b" />
            <Text style={styles.presetText}>
              Apply {LEVEL_LABELS[experienceLevel] || "Private"} Presets
            </Text>
          </Pressable>
        </Animated.View>

        {/* Sliders */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.sliders}>
          {sliders.map((s, i) => (
            <Animated.View
              key={s.key}
              entering={FadeInDown.delay(350 + i * 80)}
              style={styles.sliderCard}
            >
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>{s.label}</Text>
                <Text style={styles.sliderValue}>{s.format(s.value)}</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={styles.sliderRow}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      const newVal = Math.max(s.min, s.value - s.step);
                      setPersonalMinimum(s.key, newVal);
                    }}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>{"\u2212"}</Text>
                  </Pressable>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${((s.value - s.min) / (s.max - s.min)) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      const newVal = Math.min(s.max, s.value + s.step);
                      setPersonalMinimum(s.key, newVal);
                    }}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.footer}>
          <Animated.View entering={FadeInDown.delay(800)}>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.nextText}>Next</Text>
              <ChevronRight size={20} color="#1e90ff" strokeWidth={2.5} />
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 16,
  },
  presetBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    paddingVertical: 10,
    marginBottom: 16,
  },
  presetText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#f59e0b",
  },
  sliders: { gap: 12 },
  sliderCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 14,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
  },
  sliderValue: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#ffffff",
  },
  sliderTrack: {},
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  barContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
  },
  nextButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  nextText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1e90ff",
  },
});
