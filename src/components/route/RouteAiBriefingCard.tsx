import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { SeverityBadge } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import type { RouteBriefingResult } from "@/lib/ai/route-briefing";

interface RouteAiBriefingCardProps {
  briefing: RouteBriefingResult | null | undefined;
  isLoading: boolean;
}

const recColors = {
  FAVORABLE: "green" as const,
  CAUTION: "amber" as const,
  UNFAVORABLE: "red" as const,
};

const recIcons = {
  FAVORABLE: CheckCircle,
  CAUTION: AlertTriangle,
  UNFAVORABLE: XCircle,
};

export function RouteAiBriefingCard({
  briefing,
  isLoading,
}: RouteAiBriefingCardProps) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);

  if (isLoading) return <SkeletonCard />;
  if (!briefing) return null;

  const severity = recColors[briefing.recommendation];
  const sevColor =
    severity === "green"
      ? colors.alert.green
      : severity === "amber"
      ? colors.alert.amber
      : colors.alert.red;

  return (
    <Animated.View entering={FadeInDown.delay(320)}>
      <CloudCard>
        {/* Header */}
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Brain size={14} color={colors.accent} />
            <Text style={[styles.headerText, { color: colors.accent }]}>
              Route Briefing
            </Text>
          </View>
          <View style={styles.headerRight}>
            <SeverityBadge
              severity={severity}
              label={briefing.recommendation}
            />
            {expanded ? (
              <ChevronUp size={14} color={colors.stratus[400]} />
            ) : (
              <ChevronDown size={14} color={colors.stratus[400]} />
            )}
          </View>
        </Pressable>

        {expanded && (
          <>
            {/* Summary */}
            <Text
              style={[
                styles.summary,
                { color: isDark ? "#FFFFFF" : "#083f6e" },
              ]}
            >
              {briefing.summary}
            </Text>

            {/* Leg Hazards */}
            {briefing.legHazards.length > 0 && (
              <View style={styles.hazards}>
                <Text
                  style={[
                    styles.hazardsTitle,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : colors.stratus[600],
                    },
                  ]}
                >
                  Route Hazards
                </Text>
                {briefing.legHazards.map((hazard, i) => (
                  <View key={i} style={styles.hazardRow}>
                    <AlertTriangle size={12} color={sevColor} />
                    <Text
                      style={[
                        styles.hazardText,
                        {
                          color: isDark ? "#FFFFFF" : colors.stratus[800],
                        },
                      ]}
                    >
                      {hazard}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 8,
  },
  hazards: {
    gap: 6,
  },
  hazardsTitle: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hazardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  hazardText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
});
