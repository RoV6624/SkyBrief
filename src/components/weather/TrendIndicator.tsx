import { View, Text, StyleSheet } from "react-native";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import type { TrendDirection, WeatherTrend } from "@/lib/briefing/types";

interface Props {
  trend: WeatherTrend;
  compact?: boolean;
}

const TREND_CONFIG: Record<
  TrendDirection,
  { icon: typeof TrendingUp; color: string; label: string }
> = {
  improving: {
    icon: TrendingUp,
    color: colors.alert.green,
    label: "Improving",
  },
  deteriorating: {
    icon: TrendingDown,
    color: colors.alert.red,
    label: "Deteriorating",
  },
  stable: {
    icon: Minus,
    color: colors.alert.amber,
    label: "Stable",
  },
};

export function TrendIndicator({ trend, compact }: Props) {
  const { isDark } = useTheme();
  const config = TREND_CONFIG[trend.direction];
  const Icon = config.icon;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Icon size={12} color={config.color} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? `${config.color}11`
            : `${config.color}08`,
          borderColor: `${config.color}33`,
        },
      ]}
    >
      <View style={styles.iconRow}>
        <Icon size={14} color={config.color} />
        <Text style={[styles.metric, { color: isDark ? "#FFFFFF" : colors.stratus[800] }]}>
          {trend.metric}
        </Text>
        <Text style={[styles.direction, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
      <Text
        style={[
          styles.description,
          { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
        ]}
      >
        {trend.changeDescription}
      </Text>
    </View>
  );
}

/**
 * Inline trend arrow for use next to weather values
 */
export function TrendArrow({
  direction,
  size = 12,
}: {
  direction: TrendDirection;
  size?: number;
}) {
  const config = TREND_CONFIG[direction];
  const Icon = config.icon;
  return <Icon size={size} color={config.color} />;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compactContainer: {
    marginLeft: 4,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metric: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  direction: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 16,
  },
});
