/**
 * Step-by-step dispatch wizard.
 *
 * Renders the DispatchStepIndicator at the top and below it a CloudCard
 * showing only the current step as a single tappable row.
 * When all steps are complete the card shows a "Review & Submit" prompt.
 */

import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  CloudSun,
  Shield,
  Scale,
  ClipboardCheck,
  ChevronRight,
  Rocket,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { DispatchStepIndicator } from "./DispatchStepIndicator";
import { StationFRATCard } from "@/components/frat/StationFRATCard";
import { useDispatchStore } from "@/stores/dispatch-store";
import { DISPATCH_STEP_ORDER, DISPATCH_STEP_LABELS } from "@/lib/dispatch/types";
import type { DispatchSteps } from "@/lib/dispatch/types";
import type { NormalizedMetar } from "@/lib/api/types";
import type { FRATResult, FRATInputs } from "@/lib/frat/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  station: string;
  metar: NormalizedMetar;
  onComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Step icon map
// ---------------------------------------------------------------------------

const STEP_ICONS: Record<keyof DispatchSteps, typeof CloudSun> = {
  briefing: CloudSun,
  frat: Shield,
  wb: Scale,
  checklist: ClipboardCheck,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DispatchFlow({ station, metar, onComplete }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatchStore((s) => s.currentDispatch);
  const saveFrat = useDispatchStore((s) => s.saveFrat);
  const completeStep = useDispatchStore((s) => s.completeStep);
  const saveChecklist = useDispatchStore((s) => s.saveChecklist);

  const completedSteps = dispatch?.completedSteps ?? {
    briefing: false,
    frat: false,
    wb: false,
    checklist: false,
  };

  // Determine current step: first incomplete step in order
  const currentStep = useMemo<keyof DispatchSteps | undefined>(() => {
    for (const key of DISPATCH_STEP_ORDER) {
      if (!completedSteps[key]) return key;
    }
    return undefined; // all done
  }, [completedSteps]);

  const allComplete = currentStep === undefined;

  // Count completed for subtitle
  const completedCount = DISPATCH_STEP_ORDER.filter(
    (k) => completedSteps[k]
  ).length;

  // FRAT completion handler
  const handleFratComplete = useCallback(
    (result: FRATResult, inputs: FRATInputs) => {
      saveFrat(result, inputs);
    },
    [saveFrat]
  );

  // Step tap handler — actually navigates / acts
  const handleStepPress = useCallback(
    (step: keyof DispatchSteps) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      switch (step) {
        case "briefing":
          // The briefing is already on screen (weather data above).
          // Mark complete since the student has reviewed it.
          completeStep("briefing");
          break;
        case "frat":
          // FRAT card renders inline below — no navigation needed.
          // The card's onComplete callback calls saveFrat which marks it done.
          break;
        case "wb":
          router.push("/(tabs)/wb");
          break;
        case "checklist":
          Alert.alert(
            "Preflight Complete?",
            "Confirm you have completed the preflight checklist.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Confirm",
                onPress: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  saveChecklist();
                },
              },
            ]
          );
          break;
      }
    },
    [completeStep, saveChecklist, router]
  );

  // Resolve current step icon
  const CurrentIcon = currentStep ? STEP_ICONS[currentStep] : null;

  return (
    <View style={styles.container}>
      {/* Step indicator circles */}
      <DispatchStepIndicator steps={completedSteps} currentStep={currentStep} />

      {/* CloudCard — single current step or "all done" */}
      <Animated.View entering={FadeInDown.delay(100)}>
        <CloudCard>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            Dispatch Checklist
          </Text>

          {currentStep && CurrentIcon ? (
            <Pressable
              onPress={() => handleStepPress(currentStep)}
              style={({ pressed }) => [
                styles.currentStepRow,
                {
                  backgroundColor: isDark
                    ? "rgba(12,140,233,0.08)"
                    : "rgba(12,140,233,0.05)",
                  borderColor: isDark
                    ? "rgba(12,140,233,0.2)"
                    : "rgba(12,140,233,0.15)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Continue to ${DISPATCH_STEP_LABELS[currentStep]}`}
            >
              <CurrentIcon size={18} color={colors.stratus[500]} />
              <View style={styles.currentStepText}>
                <Text
                  style={[
                    styles.currentStepLabel,
                    { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                  ]}
                >
                  {DISPATCH_STEP_LABELS[currentStep]}
                </Text>
                <Text
                  style={[
                    styles.currentStepHint,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : colors.stratus[500],
                    },
                  ]}
                >
                  Step {completedCount + 1} of {DISPATCH_STEP_ORDER.length} — Tap to continue
                </Text>
              </View>
              <ChevronRight
                size={16}
                color={isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]}
              />
            </Pressable>
          ) : allComplete ? (
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                onComplete?.();
              }}
              style={({ pressed }) => [
                styles.allDoneRow,
                {
                  backgroundColor: `rgba(34,197,94,${pressed ? 0.15 : 0.1})`,
                  borderColor: "rgba(34,197,94,0.25)",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Review and submit dispatch"
            >
              <Rocket size={18} color={colors.alert.green} />
              <View style={styles.currentStepText}>
                <Text
                  style={[
                    styles.currentStepLabel,
                    { color: colors.alert.green },
                  ]}
                >
                  Review & Submit Dispatch
                </Text>
                <Text
                  style={[
                    styles.currentStepHint,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : colors.stratus[500],
                    },
                  ]}
                >
                  All steps complete
                </Text>
              </View>
              <ChevronRight size={16} color={colors.alert.green} />
            </Pressable>
          ) : null}
        </CloudCard>
      </Animated.View>

      {/* Inline FRAT card when that step is active */}
      {currentStep === "frat" && (
        <View style={styles.activeStepContent}>
          <StationFRATCard metar={metar} onComplete={handleFratComplete} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { gap: 12 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    marginBottom: 8,
  },
  currentStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentStepText: { flex: 1 },
  currentStepLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  currentStepHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  allDoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeStepContent: { marginTop: 4 },
});
