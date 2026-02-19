import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Plane, Clock, CheckCircle2, XCircle } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { calculateDepartureWindows } from "@/lib/weather/departure-window";
import type { TafResponse, FlightCategory } from "@/lib/api/types";
import type { PersonalMinimums } from "@/lib/minimums/types";
import type { DepartureWindow } from "@/lib/briefing/types";

interface Props {
  taf: TafResponse;
  minimums: PersonalMinimums;
}

const CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

export function DepartureWindowCard({ taf, minimums }: Props) {
  const { isDark } = useTheme();

  const result = useMemo(
    () => calculateDepartureWindows(taf, minimums),
    [taf, minimums]
  );

  const hasWindows = result.windows.length > 0;
  const statusColor = result.currentlyVfr ? colors.alert.green : hasWindows ? colors.alert.amber : colors.alert.red;
  const StatusIcon = result.currentlyVfr ? CheckCircle2 : hasWindows ? Clock : XCircle;

  return (
    <Animated.View entering={FadeInDown.delay(225)}>
      <CloudCard>
        {/* Header */}
        <View style={styles.header}>
          <Plane size={16} color={colors.accent} />
          <Text
            style={[
              styles.title,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            Departure Window
          </Text>
        </View>

        {/* Status indicator */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: `${statusColor}15`,
              borderColor: `${statusColor}33`,
            },
          ]}
        >
          <StatusIcon size={18} color={statusColor} />
          <Text
            style={[
              styles.statusText,
              { color: isDark ? "rgba(255,255,255,0.8)" : colors.stratus[800] },
            ]}
          >
            {result.advisory}
          </Text>
        </View>

        {/* Window Timeline */}
        {hasWindows && (
          <View style={styles.windowsContainer}>
            {result.windows.map((window, index) => (
              <WindowBar
                key={index}
                window={window}
                isBest={result.bestWindow === window}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        {/* Your minimums reference */}
        <View style={styles.minimumsRef}>
          <Text
            style={[
              styles.minimumsLabel,
              { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
            ]}
          >
            Based on your minimums: {minimums.ceiling} ft ceiling, {minimums.visibility} SM vis, {minimums.maxWind} kt wind
          </Text>
        </View>
      </CloudCard>
    </Animated.View>
  );
}

function WindowBar({
  window,
  isBest,
  isDark,
}: {
  window: DepartureWindow;
  isBest: boolean;
  isDark: boolean;
}) {
  const startTime = window.start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = window.end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const durationMin = Math.round(
    (window.end.getTime() - window.start.getTime()) / 60_000
  );
  const durationStr =
    durationMin >= 60
      ? `${Math.round((durationMin / 60) * 10) / 10} hrs`
      : `${durationMin} min`;

  const catColor = CATEGORY_COLORS[window.category];

  return (
    <View
      style={[
        styles.windowBar,
        {
          borderColor: isBest ? catColor : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          borderWidth: isBest ? 1.5 : 1,
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        },
      ]}
    >
      <View style={[styles.windowDot, { backgroundColor: catColor }]} />
      <View style={styles.windowContent}>
        <View style={styles.windowTimeRow}>
          <Text
            style={[
              styles.windowTime,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            {startTime} – {endTime}
          </Text>
          <View style={[styles.windowCatBadge, { backgroundColor: catColor }]}>
            <Text style={styles.windowCatText}>{window.category}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.windowDuration,
            { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
          ]}
        >
          {durationStr}
          {isBest ? " — Best window" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    flex: 1,
  },
  windowsContainer: { marginTop: 10, gap: 6 },
  windowBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowContent: { flex: 1 },
  windowTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  windowTime: { fontSize: 13, fontFamily: "JetBrainsMono_500Medium" },
  windowCatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  windowCatText: {
    fontSize: 9,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  windowDuration: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  minimumsRef: { marginTop: 10 },
  minimumsLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },
});
