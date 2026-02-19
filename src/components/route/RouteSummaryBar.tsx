import { View, Text, StyleSheet } from "react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { formatMinutesToHM } from "@/lib/utils/conversions";

interface RouteSummaryBarProps {
  totalDistanceNm: number;
  totalTimeMin: number;
  totalFuelGal: number;
}

export function RouteSummaryBar({
  totalDistanceNm,
  totalTimeMin,
  totalFuelGal,
}: RouteSummaryBarProps) {
  const { theme, isDark } = useTheme();

  const valueColor = theme.foreground;
  const labelColor = isDark ? theme.mutedForeground : colors.stratus[600];
  const dividerColor = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(12,140,233,0.12)";

  return (
    <CloudCard>
      <View style={styles.row}>
        {/* Distance */}
        <View style={styles.col}>
          <Text style={[styles.value, { color: valueColor }]}>
            {totalDistanceNm}
          </Text>
          <Text style={[styles.label, { color: labelColor }]}>NM</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* ETE */}
        <View style={styles.col}>
          <Text style={[styles.value, { color: valueColor }]}>
            {formatMinutesToHM(totalTimeMin)}
          </Text>
          <Text style={[styles.label, { color: labelColor }]}>ETE</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Fuel */}
        <View style={styles.col}>
          <Text style={[styles.value, { color: valueColor }]}>
            {totalFuelGal.toFixed(1)}
          </Text>
          <Text style={[styles.label, { color: labelColor }]}>GAL</Text>
        </View>
      </View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  value: {
    fontSize: 26,
    fontFamily: "JetBrainsMono_700Bold",
  },
  label: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 36,
  },
});
