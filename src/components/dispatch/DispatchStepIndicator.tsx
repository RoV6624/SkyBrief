/**
 * Visual 4-circle progress indicator for the dispatch workflow.
 *
 * Completed steps show a filled green circle, the current step pulses
 * blue, and pending steps render as gray outlines. The circles are
 * connected by horizontal lines that reflect completion state.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { CheckCircle2 } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { DispatchSteps } from "@/lib/dispatch/types";
import { DISPATCH_STEP_ORDER, DISPATCH_STEP_LABELS } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  steps: DispatchSteps;
  currentStep?: keyof DispatchSteps;
}

// ---------------------------------------------------------------------------
// Pulsing circle sub-component
// ---------------------------------------------------------------------------

function PulsingCircle({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[stepStyles.circle, { borderColor: color }]}>
      <Animated.View
        style={[
          stepStyles.circleFill,
          { backgroundColor: color },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DispatchStepIndicator({ steps, currentStep }: Props) {
  const { isDark } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.stepsRow}>
        {DISPATCH_STEP_ORDER.map((key, index) => {
          const isComplete = steps[key];
          const isCurrent = key === currentStep;
          const isLast = index === DISPATCH_STEP_ORDER.length - 1;

          // Line state between this circle and the next
          const nextComplete =
            !isLast && steps[DISPATCH_STEP_ORDER[index + 1]];

          return (
            <View key={key} style={styles.stepColumn}>
              <View style={styles.circleAndLine}>
                {/* Circle */}
                {isComplete ? (
                  <View
                    style={[
                      stepStyles.circle,
                      { borderColor: colors.alert.green, backgroundColor: colors.alert.green },
                    ]}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  </View>
                ) : isCurrent ? (
                  <PulsingCircle color={colors.stratus[500]} />
                ) : (
                  <View
                    style={[
                      stepStyles.circle,
                      {
                        borderColor: isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(0,0,0,0.15)",
                      },
                    ]}
                  />
                )}

                {/* Connecting line */}
                {!isLast && (
                  <View
                    style={[
                      styles.line,
                      {
                        backgroundColor: isComplete
                          ? colors.alert.green
                          : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.08)",
                      },
                    ]}
                  />
                )}
              </View>

              {/* Label */}
              <Text
                numberOfLines={2}
                style={[
                  styles.label,
                  {
                    color: isComplete
                      ? colors.alert.green
                      : isCurrent
                      ? isDark
                        ? "#FFFFFF"
                        : colors.stratus[800]
                      : isDark
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.35)",
                    fontFamily: isCurrent
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  },
                ]}
              >
                {DISPATCH_STEP_LABELS[key]}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CIRCLE_SIZE = 28;

const stepStyles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  circleFill: {
    width: CIRCLE_SIZE - 10,
    height: CIRCLE_SIZE - 10,
    borderRadius: (CIRCLE_SIZE - 10) / 2,
  },
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepColumn: {
    flex: 1,
    alignItems: "center",
  },
  circleAndLine: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  line: {
    position: "absolute",
    height: 2,
    left: "55%",
    right: "-45%",
    top: CIRCLE_SIZE / 2 - 1,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 13,
    paddingHorizontal: 2,
  },
});
