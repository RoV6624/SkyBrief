import { View, Text, StyleSheet } from "react-native";

const STEP_LABELS = ["Profile", "Minimums", "Aircraft", "Permissions"];
const TOTAL_STEPS = 4;

interface StepProgressBarProps {
  currentStep: number; // 1-indexed
}

export function StepProgressBar({ currentStep }: StepProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < currentStep ? styles.segmentActive : styles.segmentInactive,
              i < TOTAL_STEPS - 1 && styles.segmentGap,
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        Step {currentStep} of {TOTAL_STEPS} — {STEP_LABELS[currentStep - 1]}
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
  segmentActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  segmentInactive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
