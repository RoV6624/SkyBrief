import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/theme/tokens";

interface FeatureRow {
  label: string;
  count: number;
}

interface FeatureUsageListProps {
  features: FeatureRow[];
}

export function FeatureUsageList({ features }: FeatureUsageListProps) {
  const maxCount = Math.max(...features.map((f) => f.count), 1);

  return (
    <View style={styles.container}>
      {features.map((feature) => {
        const barWidth = Math.max((feature.count / maxCount) * 100, 2);
        return (
          <View key={feature.label} style={styles.row}>
            <Text style={styles.label}>{feature.label}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${barWidth}%` }]} />
            </View>
            <Text style={styles.count}>{feature.count.toLocaleString()}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[700],
    width: 80,
  },
  barContainer: {
    flex: 1,
    height: 18,
    backgroundColor: "rgba(12,140,233,0.06)",
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: colors.stratus[500],
    borderRadius: 4,
  },
  count: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[800],
    width: 50,
    textAlign: "right",
  },
});
