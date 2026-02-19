import { View, Text, StyleSheet } from "react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function MetricCard({ label, value, subtitle }: MetricCardProps) {
  return (
    <CloudCard>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.stratus[800],
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[500],
    marginTop: 2,
  },
});
