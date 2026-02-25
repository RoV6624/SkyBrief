import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

const DEFAULT_LABELS = ["Profile", "Minimums", "Aircraft", "Permissions"];
const STUDENT_LABELS = ["Profile", "School", "Instructor", "Minimums", "Aircraft", "Permissions"];
const INSTRUCTOR_LABELS = ["Profile", "School", "Minimums", "Aircraft", "Permissions"];

export function getOnboardingStepConfig(experienceLevel: string): {
  totalSteps: number;
  labels: string[];
} {
  if (experienceLevel === "student") {
    return { totalSteps: STUDENT_LABELS.length, labels: STUDENT_LABELS };
  }
  if (experienceLevel === "instructor") {
    return { totalSteps: INSTRUCTOR_LABELS.length, labels: INSTRUCTOR_LABELS };
  }
  return { totalSteps: DEFAULT_LABELS.length, labels: DEFAULT_LABELS };
}

interface StepProgressBarProps {
  currentStep: number; // 1-indexed
  totalSteps?: number;
  stepLabels?: string[];
}

export function StepProgressBar({
  currentStep,
  totalSteps,
  stepLabels,
}: StepProgressBarProps) {
  const steps = totalSteps ?? DEFAULT_LABELS.length;
  const labels = stepLabels ?? DEFAULT_LABELS;
  const { isDark } = useTheme();

  // Onboarding always renders on a gradient background, so white tints
  // work for both modes. Dark mode uses slightly brighter values.
  const activeColor = isDark ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.9)";
  const inactiveColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.2)";
  const labelColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.5)";

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {Array.from({ length: steps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < currentStep ? activeColor : inactiveColor },
              i < steps - 1 && styles.segmentGap,
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: labelColor }]}>
        Step {currentStep} of {steps} — {labels[currentStep - 1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  bar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentGap: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
