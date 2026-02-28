/**
 * Takeoff / Landing Performance Card for XC Wizard Step 3.
 *
 * Reads departure airport METAR from the route briefing,
 * calculates density altitude and performance impacts, and
 * displays green/amber/red status.
 */

import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Gauge, CheckCircle2, AlertTriangle } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useWBStore } from "@/stores/wb-store";
import { calcPressureAlt, calcDensityAlt } from "@/lib/wb/performance";
import { getPerformanceReport } from "@/lib/wb/performance-impact";
import type { RouteBriefing } from "@/lib/route/types";

interface PerformanceCardProps {
  routeBriefing: RouteBriefing;
}

const SEVERITY_COLOR: Record<string, string> = {
  normal: colors.alert.green,
  caution: colors.alert.amber,
  warning: colors.alert.red,
};

export function PerformanceCard({ routeBriefing }: PerformanceCardProps) {
  const { isDark } = useTheme();
  const { aircraft, fieldElevation } = useWBStore();

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];

  const report = useMemo(() => {
    // Use departure (first) waypoint's METAR
    const depWx = routeBriefing.weatherPoints[0]?.metar;
    if (!depWx) return null;

    const temp = depWx.temperature.celsius;
    const altimeter = depWx.altimeter ?? 29.92;
    const elev = fieldElevation || 0;

    const pa = calcPressureAlt(elev, altimeter);
    const da = calcDensityAlt(pa, temp);

    return getPerformanceReport({
      densityAlt: da,
      fieldElevation: elev,
      temperature: temp,
      aircraftName: aircraft.name,
    });
  }, [routeBriefing, fieldElevation, aircraft]);

  if (!report) return null;

  const sevColor = SEVERITY_COLOR[report.severity] ?? colors.stratus[500];
  const StatusIcon = report.severity === "normal" ? CheckCircle2 : AlertTriangle;

  return (
    <CloudCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Gauge size={18} color={subColor} />
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Takeoff Performance
        </Text>
        <StatusIcon size={16} color={sevColor} />
      </View>

      <View style={styles.dataGrid}>
        <View style={styles.dataItem}>
          <Text style={[styles.dataLabel, { color: subColor }]}>Density Alt</Text>
          <Text style={[styles.dataValue, { color: sevColor }]}>
            {report.densityAlt.toLocaleString()} ft
          </Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={[styles.dataLabel, { color: subColor }]}>T/O Roll</Text>
          <Text style={[styles.dataValue, { color: textColor }]}>
            {report.takeoffRoll.actual.toLocaleString()} ft
          </Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={[styles.dataLabel, { color: subColor }]}>Roll Increase</Text>
          <Text
            style={[
              styles.dataValue,
              {
                color:
                  report.takeoffRoll.increasePercent >= 50
                    ? colors.alert.red
                    : report.takeoffRoll.increasePercent >= 20
                    ? colors.alert.amber
                    : textColor,
              },
            ]}
          >
            +{report.takeoffRoll.increasePercent}%
          </Text>
        </View>

        <View style={styles.dataItem}>
          <Text style={[styles.dataLabel, { color: subColor }]}>Climb Rate</Text>
          <Text
            style={[
              styles.dataValue,
              {
                color:
                  report.climbRate.actual <= 300
                    ? colors.alert.red
                    : report.climbRate.actual <= 500
                    ? colors.alert.amber
                    : textColor,
              },
            ]}
          >
            {report.climbRate.actual} fpm
          </Text>
        </View>
      </View>

      {report.warnings.length > 0 && (
        <View style={styles.warningBox}>
          {report.warnings.map((w, i) => (
            <Text key={i} style={[styles.warningText, { color: sevColor }]}>
              {w}
            </Text>
          ))}
        </View>
      )}
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  card: {},
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", flex: 1 },
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dataItem: {
    width: "47%",
    gap: 2,
  },
  dataLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dataValue: { fontSize: 15, fontFamily: "JetBrainsMono_600SemiBold" },
  warningBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: 4,
  },
  warningText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
});
