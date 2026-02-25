import { useState } from "react";
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

/** Clamp a value to [min, max], returning defaultVal if NaN */
function clampOrDefault(value: string, min: number, max: number, defaultVal: number): number {
  const num = parseFloat(value);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

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

  const [elevText, setElevText] = useState(fieldElevation ? String(fieldElevation) : "");
  const [altText, setAltText] = useState(String(altimeterSetting));
  const [oatText, setOatText] = useState(String(oat));

  const pa = calcPressureAlt(fieldElevation, altimeterSetting);
  const da = calcDensityAlt(pa, oat);
  const isaDev = calcISADeviation(pa, oat);
  const severity = getDensityAltWarning(da);

  const dynamicColors = {
    headerText: isDark ? theme.foreground : colors.stratus[700],
    label: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
    input: isDark ? theme.foreground : colors.stratus[800],
    resultLabel: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
    resultValue: isDark ? theme.foreground : colors.stratus[900],
    placeholder: isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)",
  };

  return (
    <CloudCard>
      <View style={styles.header}>
        <Mountain size={14} color={colors.stratus[500]} />
        <Text style={[styles.headerText, { color: dynamicColors.headerText }]}>Performance</Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputs}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: dynamicColors.label }]}>Field Elev (ft)</Text>
          <TextInput
            value={elevText}
            onChangeText={setElevText}
            onBlur={() => {
              const val = clampOrDefault(elevText, 0, 50000, 0);
              setFieldElevation(val);
              setElevText(val === 0 ? "" : String(val));
            }}
            onFocus={(e) => e.target && (e.target as any).setSelection?.(0, elevText.length)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={dynamicColors.placeholder}
            style={[styles.input, { color: dynamicColors.input }]}
          />
        </View>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Gauge size={10} color={colors.stratus[500]} />
            <Text style={[styles.label, { color: dynamicColors.label }]}>Altimeter</Text>
          </View>
          <TextInput
            value={altText}
            onChangeText={setAltText}
            onBlur={() => {
              const val = clampOrDefault(altText, 25.0, 32.0, 29.92);
              setAltimeterSetting(val);
              setAltText(String(val));
            }}
            onFocus={(e) => e.target && (e.target as any).setSelection?.(0, altText.length)}
            keyboardType="decimal-pad"
            placeholder="29.92"
            placeholderTextColor={dynamicColors.placeholder}
            style={[styles.input, { color: dynamicColors.input }]}
          />
        </View>
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Thermometer size={10} color={colors.stratus[500]} />
            <Text style={[styles.label, { color: dynamicColors.label }]}>OAT (°C)</Text>
          </View>
          <TextInput
            value={oatText}
            onChangeText={setOatText}
            onBlur={() => {
              const val = clampOrDefault(oatText, -50, 60, 15);
              setOat(val);
              setOatText(String(val));
            }}
            onFocus={(e) => e.target && (e.target as any).setSelection?.(0, oatText.length)}
            keyboardType="numeric"
            placeholder="15"
            placeholderTextColor={dynamicColors.placeholder}
            style={[styles.input, { color: dynamicColors.input }]}
          />
        </View>
      </View>

      {/* Computed Values */}
      <View style={styles.results}>
        <View style={[styles.resultCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(240,247,255,0.5)" }]}>
          <Text style={[styles.resultLabel, { color: dynamicColors.resultLabel }]}>Pressure Alt</Text>
          <Text style={[styles.resultValue, { color: dynamicColors.resultValue }]}>{pa.toLocaleString()} ft</Text>
        </View>
        <View
          style={[
            styles.resultCard,
            { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(240,247,255,0.5)" },
            severity === "warning" && styles.resultDanger,
            severity === "caution" && styles.resultCaution,
          ]}
        >
          <Text style={[styles.resultLabel, { color: dynamicColors.resultLabel }]}>Density Alt</Text>
          <Text
            style={[
              styles.resultValue,
              { color: dynamicColors.resultValue },
              severity === "warning" && { color: colors.alert.red },
              severity === "caution" && { color: colors.alert.amber },
            ]}
          >
            {da.toLocaleString()} ft
          </Text>
        </View>
        <View style={[styles.resultCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(240,247,255,0.5)" }]}>
          <Text style={[styles.resultLabel, { color: dynamicColors.resultLabel }]}>ISA Dev</Text>
          <Text style={[styles.resultValue, { color: dynamicColors.resultValue }]}>
            {isaDev > 0 ? "+" : ""}
            {isaDev.toFixed(1)}°C
          </Text>
        </View>
      </View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
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
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  input: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
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
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_700Bold",
  },
});
