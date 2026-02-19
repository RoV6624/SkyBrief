/**
 * Step-by-step dispatch wizard.
 *
 * Renders the DispatchStepIndicator at the top and below it shows
 * the content for the active step. Completed steps display a read-only
 * summary; the current step shows the interactive input component.
 */

import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  CheckCircle2,
  CloudSun,
  Shield,
  Scale,
  ClipboardCheck,
  ChevronRight,
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
// Sub-component: completed step summary row
// ---------------------------------------------------------------------------

function CompletedStepRow({
  stepKey,
  isDark,
}: {
  stepKey: keyof DispatchSteps;
  isDark: boolean;
}) {
  const dispatch = useDispatchStore((s) => s.currentDispatch);
  const Icon = STEP_ICONS[stepKey];

  let detail = "";
  if (dispatch) {
    switch (stepKey) {
      case "briefing":
        if (dispatch.weatherSnapshot) {
          detail = `${dispatch.weatherSnapshot.flightCategory} -- ${dispatch.station}`;
        }
        break;
      case "frat":
        if (dispatch.fratResult) {
          detail = `Score ${dispatch.fratResult.totalScore} -- ${dispatch.fratResult.riskLevel.toUpperCase()}`;
        }
        break;
      case "wb":
        if (dispatch.wbSnapshot) {
          detail = `${dispatch.wbSnapshot.totalWeight} lbs -- CG ${dispatch.wbSnapshot.cg.toFixed(1)} -- ${dispatch.wbSnapshot.withinLimits ? "Within Limits" : "OUT OF LIMITS"}`;
        }
        break;
      case "checklist":
        detail = "Complete";
        break;
    }
  }

  return (
    <View style={completedStyles.row}>
      <CheckCircle2 size={16} color={colors.alert.green} />
      <Icon
        size={14}
        color={isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600]}
      />
      <View style={completedStyles.textContainer}>
        <Text
          style={[
            completedStyles.label,
            { color: isDark ? "#FFFFFF" : colors.stratus[800] },
          ]}
        >
          {DISPATCH_STEP_LABELS[stepKey]}
        </Text>
        {detail ? (
          <Text
            style={[
              completedStyles.detail,
              {
                color: isDark
                  ? "rgba(255,255,255,0.4)"
                  : colors.stratus[500],
              },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const completedStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textContainer: { flex: 1 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detail: { fontSize: 11, fontFamily: "JetBrainsMono_400Regular", marginTop: 1 },
});

// ---------------------------------------------------------------------------
// Sub-component: pending step placeholder
// ---------------------------------------------------------------------------

function PendingStepRow({
  stepKey,
  isCurrent,
  isDark,
  onPress,
}: {
  stepKey: keyof DispatchSteps;
  isCurrent: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  const Icon = STEP_ICONS[stepKey];

  if (!isCurrent) {
    return (
      <View style={pendingStyles.row}>
        <View
          style={[
            pendingStyles.dotOutline,
            {
              borderColor: isDark
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.12)",
            },
          ]}
        />
        <Icon
          size={14}
          color={
            isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"
          }
        />
        <Text
          style={[
            pendingStyles.label,
            {
              color: isDark
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.3)",
            },
          ]}
        >
          {DISPATCH_STEP_LABELS[stepKey]}
        </Text>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          pendingStyles.currentRow,
          {
            backgroundColor: isDark
              ? "rgba(12,140,233,0.08)"
              : "rgba(12,140,233,0.05)",
            borderColor: isDark
              ? "rgba(12,140,233,0.2)"
              : "rgba(12,140,233,0.15)",
          },
        ]}
      >
        <Icon size={16} color={colors.stratus[500]} />
        <View style={pendingStyles.currentTextContainer}>
          <Text
            style={[
              pendingStyles.currentLabel,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            {DISPATCH_STEP_LABELS[stepKey]}
          </Text>
          <Text
            style={[
              pendingStyles.currentHint,
              {
                color: isDark
                  ? "rgba(255,255,255,0.4)"
                  : colors.stratus[500],
              },
            ]}
          >
            Tap to begin
          </Text>
        </View>
        <ChevronRight
          size={16}
          color={isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]}
        />
      </View>
    </Pressable>
  );
}

const pendingStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dotOutline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentTextContainer: { flex: 1 },
  currentLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  currentHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DispatchFlow({ station, metar, onComplete }: Props) {
  const { isDark } = useTheme();
  const dispatch = useDispatchStore((s) => s.currentDispatch);
  const saveFrat = useDispatchStore((s) => s.saveFrat);

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

  // Check if all steps complete
  const allComplete = currentStep === undefined;

  // FRAT completion handler
  const handleFratComplete = useCallback(
    (result: FRATResult, inputs: FRATInputs) => {
      saveFrat(result, inputs);
    },
    [saveFrat]
  );

  // Placeholder press for non-FRAT steps
  const handleStepPress = useCallback(
    (step: keyof DispatchSteps) => {
      Haptics.selectionAsync();
      // In the full app, this would navigate to the relevant screen.
      // For now the briefing, W&B, and checklist steps are completed
      // from their respective screens and feed data back to the dispatch store.
    },
    []
  );

  return (
    <View style={styles.container}>
      {/* Step indicator */}
      <DispatchStepIndicator steps={completedSteps} currentStep={currentStep} />

      {/* Steps list */}
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

          <View style={styles.stepsListContainer}>
            {DISPATCH_STEP_ORDER.map((key) => {
              if (completedSteps[key]) {
                return (
                  <CompletedStepRow key={key} stepKey={key} isDark={isDark} />
                );
              }
              return (
                <PendingStepRow
                  key={key}
                  stepKey={key}
                  isCurrent={key === currentStep}
                  isDark={isDark}
                  onPress={() => handleStepPress(key)}
                />
              );
            })}
          </View>
        </CloudCard>
      </Animated.View>

      {/* Active step content */}
      {currentStep === "frat" && (
        <View style={styles.activeStepContent}>
          <StationFRATCard metar={metar} onComplete={handleFratComplete} />
        </View>
      )}

      {/* All done: show proceed button */}
      {allComplete && (
        <Animated.View entering={FadeInDown.delay(200)}>
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              onComplete?.();
            }}
            style={({ pressed }) => [
              styles.proceedBtn,
              {
                backgroundColor: colors.alert.green,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.proceedBtnText}>Review & Submit Dispatch</Text>
          </Pressable>
        </Animated.View>
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
  stepsListContainer: { gap: 2 },
  activeStepContent: { marginTop: 4 },
  proceedBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  proceedBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
