import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { ReadinessResult, ReadinessLevel } from "@/lib/progress/readiness";

interface ReadinessCardProps {
  readiness: ReadinessResult;
  studentName: string;
}

const LEVEL_CONFIG: Record<
  ReadinessLevel,
  { color: string; label: string; icon: typeof CheckCircle2 }
> = {
  ready: { color: colors.alert.green, label: "READY", icon: CheckCircle2 },
  nearly_ready: { color: colors.alert.amber, label: "NEARLY READY", icon: AlertTriangle },
  needs_work: { color: colors.alert.red, label: "NEEDS WORK", icon: XCircle },
  insufficient_data: { color: colors.stratus[500], label: "INSUFFICIENT DATA", icon: HelpCircle },
};

export function ReadinessCard({ readiness, studentName }: ReadinessCardProps) {
  const { isDark } = useTheme();
  const config = LEVEL_CONFIG[readiness.overallLevel];
  const Icon = config.icon;

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];

  return (
    <CloudCard style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: config.color }]}>
          <Icon size={14} color="#FFFFFF" />
          <Text style={styles.levelText}>{config.label}</Text>
        </View>
        <Text style={[styles.scoreText, { color: config.color }]}>
          {readiness.overallScore}%
        </Text>
      </View>

      <Text style={[styles.title, { color: textColor }]}>Stage Check Readiness</Text>
      <Text style={[styles.summary, { color: subColor }]}>{readiness.summary}</Text>

      {/* Category Bars */}
      <View style={styles.categories}>
        {readiness.categories.map((cat) => {
          const barColor =
            cat.status === "pass"
              ? colors.alert.green
              : cat.status === "marginal"
              ? colors.alert.amber
              : colors.alert.red;

          return (
            <View key={cat.id} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryLabel, { color: textColor }]}>
                  {cat.label}
                </Text>
                <Text style={[styles.categoryDetail, { color: subColor }]}>
                  {cat.detail}
                </Text>
              </View>
              <View
                style={[
                  styles.barBg,
                  {
                    backgroundColor: isDark
                      ? colors.stratus[700]
                      : colors.stratus[100],
                  },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: barColor,
                      width: `${Math.min(cat.score, 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.categoryScore,
                  { color: barColor },
                ]}
              >
                {cat.score}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Recommendations */}
      {readiness.recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={[styles.recHeader, { color: subColor }]}>
            RECOMMENDATIONS
          </Text>
          {readiness.recommendations.map((rec, i) => (
            <View key={i} style={styles.recRow}>
              <View style={[styles.recDot, { backgroundColor: colors.alert.amber }]} />
              <Text style={[styles.recText, { color: textColor }]}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  title: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 16,
  },
  categories: { gap: 14 },
  categoryRow: { gap: 4 },
  categoryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  categoryDetail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  categoryScore: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_500Medium",
    position: "absolute",
    right: 0,
    top: 0,
  },
  recommendations: {
    marginTop: 16,
    gap: 8,
  },
  recHeader: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.5,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  recText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 19,
  },
});
