import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Wind,
  Eye,
  Cloud,
  Sun,
  AlertOctagon,
  Gauge,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { evaluateGoNoGo } from "@/lib/briefing/go-no-go";
import type { NormalizedMetar, AiBriefing, AlertCondition, TafResponse } from "@/lib/api/types";
import type { PersonalMinimums, MinimumsResult } from "@/lib/minimums/types";
import type { FRATResult } from "@/lib/frat/types";
import type { GoNoGoVerdict, GoNoGoFactor } from "@/lib/briefing/types";

interface Props {
  metar: NormalizedMetar;
  minimums: PersonalMinimums;
  minimumsResult: MinimumsResult;
  fratResult?: FRATResult;
  alerts?: AlertCondition[];
  briefing?: AiBriefing;
  taf?: TafResponse | null;
  daylightRemaining?: number;
}

const VERDICT_CONFIG: Record<
  GoNoGoVerdict,
  { label: string; color: string; bgColor: string; borderColor: string; icon: typeof CheckCircle2 }
> = {
  go: {
    label: "GO",
    color: "#22c55e",
    bgColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.3)",
    icon: CheckCircle2,
  },
  marginal: {
    label: "MARGINAL",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.3)",
    icon: AlertTriangle,
  },
  nogo: {
    label: "NO-GO",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.3)",
    icon: XCircle,
  },
};

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  weather: Cloud,
  minimums: Gauge,
  wind: Wind,
  performance: Gauge,
  risk: Shield,
  daylight: Sun,
  notam: AlertOctagon,
};

export function GoNoGoCard({
  metar,
  minimums,
  minimumsResult,
  fratResult,
  alerts,
  briefing,
  taf,
  daylightRemaining,
}: Props) {
  const { isDark } = useTheme();

  const result = useMemo(
    () =>
      evaluateGoNoGo({
        metar,
        minimums,
        minimumsResult,
        fratResult,
        alerts,
        briefing,
        taf,
        daylightRemaining,
      }),
    [metar, minimums, minimumsResult, fratResult, alerts, briefing, taf, daylightRemaining]
  );

  const config = VERDICT_CONFIG[result.verdict];
  const VerdictIcon = config.icon;

  // Separate factors by severity
  const redFactors = result.factors.filter((f) => f.severity === "red");
  const amberFactors = result.factors.filter((f) => f.severity === "amber");
  const greenFactors = result.factors.filter((f) => f.severity === "green");

  return (
    <Animated.View entering={FadeInDown.delay(175)}>
      <CloudCard>
        {/* Verdict Banner */}
        <View
          style={[
            styles.verdictBanner,
            {
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            },
          ]}
        >
          <VerdictIcon size={28} color={config.color} />
          <View style={styles.verdictTextContainer}>
            <Text style={[styles.verdictLabel, { color: config.color }]}>
              {config.label}
            </Text>
            <Text
              style={[
                styles.verdictSummary,
                { color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[700] },
              ]}
            >
              {result.summary}
            </Text>
          </View>
        </View>

        {/* Factor List */}
        <View style={styles.factorsList}>
          {/* Red factors first */}
          {redFactors.map((factor) => (
            <FactorRow key={factor.id} factor={factor} isDark={isDark} />
          ))}
          {/* Then amber */}
          {amberFactors.map((factor) => (
            <FactorRow key={factor.id} factor={factor} isDark={isDark} />
          ))}
          {/* Then green (collapsed if many) */}
          {greenFactors.length > 0 && greenFactors.length <= 3 &&
            greenFactors.map((factor) => (
              <FactorRow key={factor.id} factor={factor} isDark={isDark} />
            ))}
          {greenFactors.length > 3 && (
            <View style={styles.greenSummary}>
              <CheckCircle2 size={14} color={colors.alert.green} />
              <Text
                style={[
                  styles.greenSummaryText,
                  { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
                ]}
              >
                {greenFactors.length} factors within acceptable limits
              </Text>
            </View>
          )}
        </View>
      </CloudCard>
    </Animated.View>
  );
}

function FactorRow({ factor, isDark }: { factor: GoNoGoFactor; isDark: boolean }) {
  const severityColor =
    factor.severity === "red"
      ? colors.alert.red
      : factor.severity === "amber"
      ? colors.alert.amber
      : colors.alert.green;

  const Icon = CATEGORY_ICONS[factor.category] || Shield;

  return (
    <View
      style={[
        styles.factorRow,
        {
          backgroundColor:
            factor.severity === "red"
              ? isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.03)"
              : factor.severity === "amber"
              ? isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.03)"
              : "transparent",
        },
      ]}
    >
      <View style={[styles.factorDot, { backgroundColor: severityColor }]} />
      <Icon size={14} color={severityColor} />
      <View style={styles.factorContent}>
        <View style={styles.factorHeader}>
          <Text
            style={[
              styles.factorLabel,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            {factor.label}
          </Text>
          {factor.current && (
            <Text
              style={[
                styles.factorValue,
                { color: severityColor },
              ]}
            >
              {factor.current}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.factorDetail,
            { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
          ]}
        >
          {factor.detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verdictBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  verdictTextContainer: { flex: 1 },
  verdictLabel: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 2,
  },
  verdictSummary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 3,
  },
  factorsList: { marginTop: 14, gap: 2 },
  factorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  factorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  factorContent: { flex: 1 },
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factorLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  factorValue: { fontSize: 12, fontFamily: "JetBrainsMono_600SemiBold" },
  factorDetail: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  greenSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  greenSummaryText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
