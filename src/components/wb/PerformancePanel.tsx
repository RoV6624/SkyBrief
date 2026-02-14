import { View, Text, TextInput, StyleSheet } from "react-native";
import { Mountain, Thermometer, Gauge } from "lucide-react-native";
import { useWBStore } from "@/stores/wb-store";
import {
  calcPressureAlt,
  calcDensityAlt,
  calcISADeviation,
  getDensityAltWarning,
} from "@/lib/wb/performance";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export function PerformancePanel() {
  const { isDark, theme } = useTheme();
  const {
    fieldElevation,
    setFieldElevation,
    altimeterSetting,
    setAltimeterSetting,
    oat,
    setOat,
  } = useWBStore();

  const pa = calcPressureAlt(fieldElevation, altimeterSetting);
  const da = calcDensityAlt(pa, oat);
  const isaDev = calcISADeviation(pa, oat);
  const severity = getDensityAltWarning(da);

  // Dynamic styles
  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 14,
    },
    headerText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[700],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputs: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },
    inputGroup: { flex: 1 },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginBottom: 4,
    },
    label: {
      fontSize: 9,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
      textTransform: "uppercase",
      marginBottom: 4,
    },
    input: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[800],
      backgroundColor: "rgba(12,140,233,0.04)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(12,140,233,0.08)",
      paddingHorizontal: 8,
      paddingVertical: 6,
      textAlign: "right",
    },
    results: {
      flexDirection: "row",
      gap: 8,
    },
    resultCard: {
      flex: 1,
      backgroundColor: "rgba(240,247,255,0.5)",
      borderRadius: 12,
      padding: 10,
      alignItems: "center",
    },
    resultDanger: {
      backgroundColor: "rgba(239,68,68,0.06)",
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.15)",
    },
    resultCaution: {
      backgroundColor: "rgba(245,158,11,0.06)",
      borderWidth: 1,
      borderColor: "rgba(245,158,11,0.15)",
    },
    resultLabel: {
      fontSize: 8,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
      textTransform: "uppercase",
      marginBottom: 4,
    },
    resultValue: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_700Bold",
      color: isDark ? theme.foreground : colors.stratus[900],
    },
  });

  return (
    <CloudCard>
      <View style={styles.header}>
        <Mountain size={14} color={colors.stratus[500]} />
        <Text style={styles.headerText}>Performance</Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputs}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Field Elev (ft)</Text>
          <TextInput
            value={fieldElevation ? String(fieldElevation) : ""}
            onChangeText={(t) => setFieldElevation(Number(t) || 0)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Gauge size={10} color={colors.stratus[500]} />
            <Text style={styles.label}>Altimeter</Text>
          </View>
          <TextInput
            value={altimeterSetting ? String(altimeterSetting) : ""}
            onChangeText={(t) => setAltimeterSetting(Number(t) || 29.92)}
            keyboardType="decimal-pad"
            placeholder="29.92"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Thermometer size={10} color={colors.stratus[500]} />
            <Text style={styles.label}>OAT (°C)</Text>
          </View>
          <TextInput
            value={String(oat)}
            onChangeText={(t) => setOat(Number(t) || 0)}
            keyboardType="numeric"
            placeholder="15"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
            style={styles.input}
          />
        </View>
      </View>

      {/* Computed Values */}
      <View style={styles.results}>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Pressure Alt</Text>
          <Text style={styles.resultValue}>{pa.toLocaleString()} ft</Text>
        </View>
        <View
          style={[
            styles.resultCard,
            severity === "warning" && styles.resultDanger,
            severity === "caution" && styles.resultCaution,
          ]}
        >
          <Text style={styles.resultLabel}>Density Alt</Text>
          <Text
            style={[
              styles.resultValue,
              severity === "warning" && { color: colors.alert.red },
              severity === "caution" && { color: colors.alert.amber },
            ]}
          >
            {da.toLocaleString()} ft
          </Text>
        </View>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>ISA Dev</Text>
          <Text style={styles.resultValue}>
            {isaDev > 0 ? "+" : ""}
            {isaDev.toFixed(1)}°C
          </Text>
        </View>
      </View>
    </CloudCard>
  );
}
