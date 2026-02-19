/**
 * Preflight Monitor Banner
 *
 * Displays an active monitoring session with:
 * - Elapsed time since preflight start
 * - Last weather check time
 * - List of detected changes as color-coded alert cards (amber / red)
 * - Stop Monitoring button
 *
 * Wraps content in a CloudCard with animated entrance.
 */

import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeIn, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Radar,
  Clock,
  RefreshCw,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Wind,
  Eye,
  Cloud,
  CloudLightning,
  Radio,
  ArrowDownUp,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { usePreflightMonitor } from "@/hooks/usePreflightMonitor";
import { cancelPreflightNotifications } from "@/services/preflight-notifications";
import { unregisterBackgroundWeatherTask } from "@/services/background-weather-task";
import type { WeatherChange, ChangeSeverity } from "@/lib/weather/change-detector";

// ── Icon mapping for change types ──────────────────────────────────────

const CHANGE_TYPE_ICONS: Record<string, typeof Wind> = {
  category: ArrowDownUp,
  wind: Wind,
  gust: Wind,
  visibility: Eye,
  ceiling: Cloud,
  weather: CloudLightning,
  speci: Radio,
};

// ── Severity color mapping ─────────────────────────────────────────────

function severityColor(severity: ChangeSeverity): string {
  return severity === "red" ? colors.alert.red : colors.alert.amber;
}

function severityBg(severity: ChangeSeverity, isDark: boolean): string {
  if (severity === "red") {
    return isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)";
  }
  return isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.05)";
}

function severityBorder(severity: ChangeSeverity): string {
  if (severity === "red") return "rgba(239,68,68,0.25)";
  return "rgba(245,158,11,0.25)";
}

// ── Main Component ─────────────────────────────────────────────────────

export function PreflightMonitor() {
  const { isDark } = useTheme();
  const {
    isActive,
    isLoading,
    station,
    elapsed,
    lastCheckedText,
    changes,
    hasRedChanges,
    stop,
  } = usePreflightMonitor();

  // Don't render if no active session
  if (!isActive) return null;

  const handleStop = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    stop();

    // Clean up background task and notifications
    try {
      await cancelPreflightNotifications();
      await unregisterBackgroundWeatherTask();
    } catch (err) {
      console.warn("[PreflightMonitor] Cleanup error:", err);
    }
  };

  // Determine banner accent based on worst severity
  const bannerColor = hasRedChanges ? colors.alert.red : colors.accent;
  const bannerBg = hasRedChanges
    ? isDark
      ? "rgba(239,68,68,0.1)"
      : "rgba(239,68,68,0.06)"
    : isDark
      ? "rgba(212,168,83,0.1)"
      : "rgba(212,168,83,0.06)";

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <CloudCard>
        {/* ── Header ────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: bannerBg, borderColor: `${bannerColor}33` }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.pulseContainer]}>
              <Radar size={18} color={bannerColor} />
              {isLoading && (
                <Animated.View
                  entering={FadeIn}
                  style={[styles.pulseDot, { backgroundColor: bannerColor }]}
                />
              )}
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                ]}
              >
                Monitoring {station}
              </Text>
              <View style={styles.headerMeta}>
                <Clock
                  size={11}
                  color={isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]}
                />
                <Text
                  style={[
                    styles.headerMetaText,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : colors.stratus[500],
                    },
                  ]}
                >
                  {elapsed} min elapsed
                </Text>
                {lastCheckedText && (
                  <>
                    <Text
                      style={[
                        styles.headerMetaDot,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.2)"
                            : colors.stratus[300],
                        },
                      ]}
                    >
                      {" "}
                    </Text>
                    <RefreshCw
                      size={10}
                      color={
                        isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]
                      }
                    />
                    <Text
                      style={[
                        styles.headerMetaText,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.4)"
                            : colors.stratus[500],
                        },
                      ]}
                    >
                      {lastCheckedText}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Change count badge */}
          {changes.length > 0 && (
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor: hasRedChanges
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(245,158,11,0.15)",
                  borderColor: hasRedChanges
                    ? "rgba(239,68,68,0.3)"
                    : "rgba(245,158,11,0.3)",
                },
              ]}
            >
              <Text
                style={[
                  styles.changeBadgeText,
                  {
                    color: hasRedChanges
                      ? colors.alert.red
                      : colors.alert.amber,
                  },
                ]}
              >
                {changes.length}
              </Text>
            </View>
          )}
        </View>

        {/* ── No changes state ──────────────────────────────────── */}
        {changes.length === 0 && (
          <Animated.View entering={FadeIn} style={styles.noChanges}>
            <Text
              style={[
                styles.noChangesText,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.5)"
                    : colors.stratus[600],
                },
              ]}
            >
              No significant changes detected. Checking every 2 minutes.
            </Text>
          </Animated.View>
        )}

        {/* ── Change list ───────────────────────────────────────── */}
        {changes.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={styles.changeList}
          >
            {changes.map((change, index) => (
              <ChangeCard
                key={change.id}
                change={change}
                isDark={isDark}
                index={index}
              />
            ))}
          </Animated.View>
        )}

        {/* ── Stop button ───────────────────────────────────────── */}
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            styles.stopButton,
            {
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <XCircle
            size={14}
            color={isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600]}
          />
          <Text
            style={[
              styles.stopButtonText,
              {
                color: isDark
                  ? "rgba(255,255,255,0.5)"
                  : colors.stratus[600],
              },
            ]}
          >
            Stop Monitoring
          </Text>
        </Pressable>
      </CloudCard>
    </Animated.View>
  );
}

// ── Individual change card ──────────────────────────────────────────────

function ChangeCard({
  change,
  isDark,
  index,
}: {
  change: WeatherChange;
  isDark: boolean;
  index: number;
}) {
  const color = severityColor(change.severity);
  const bg = severityBg(change.severity, isDark);
  const border = severityBorder(change.severity);
  const Icon = CHANGE_TYPE_ICONS[change.type] || AlertTriangle;

  const timeAgo = useMemo(() => {
    const detected =
      change.detectedAt instanceof Date
        ? change.detectedAt
        : new Date(change.detectedAt);
    const diffMin = Math.floor((Date.now() - detected.getTime()) / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin === 1) return "1 min ago";
    return `${diffMin} min ago`;
  }, [change.detectedAt]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(200)}
      layout={Layout.springify()}
    >
      <View
        style={[
          styles.changeCard,
          {
            backgroundColor: bg,
            borderColor: border,
          },
        ]}
      >
        <View style={styles.changeCardHeader}>
          <View style={[styles.changeDot, { backgroundColor: color }]} />
          <Icon size={14} color={color} />
          <Text
            style={[
              styles.changeTitle,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            {change.title}
          </Text>
          <Text
            style={[
              styles.changeTime,
              {
                color: isDark
                  ? "rgba(255,255,255,0.3)"
                  : colors.stratus[400],
              },
            ]}
          >
            {timeAgo}
          </Text>
        </View>

        <Text
          style={[
            styles.changeDescription,
            {
              color: isDark
                ? "rgba(255,255,255,0.6)"
                : colors.stratus[700],
            },
          ]}
        >
          {change.description}
        </Text>

        <View style={styles.changeValues}>
          <View style={styles.changeValuePill}>
            <Text
              style={[
                styles.changeValueLabel,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.35)"
                    : colors.stratus[500],
                },
              ]}
            >
              Was
            </Text>
            <Text
              style={[
                styles.changeValueText,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.6)"
                    : colors.stratus[700],
                },
              ]}
            >
              {change.previousValue}
            </Text>
          </View>
          <Text
            style={[
              styles.changeArrow,
              { color: isDark ? "rgba(255,255,255,0.2)" : colors.stratus[300] },
            ]}
          >
            {"\u2192"}
          </Text>
          <View style={styles.changeValuePill}>
            <Text
              style={[
                styles.changeValueLabel,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.35)"
                    : colors.stratus[500],
                },
              ]}
            >
              Now
            </Text>
            <Text
              style={[
                styles.changeValueText,
                { color },
              ]}
            >
              {change.currentValue}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pulseContainer: {
    position: "relative",
  },
  pulseDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  headerMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  headerMetaDot: {
    fontSize: 11,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 28,
    alignItems: "center",
  },
  changeBadgeText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  noChanges: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  noChangesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  changeList: {
    marginTop: 12,
    gap: 8,
  },
  changeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  changeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  changeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  changeTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  changeTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  changeDescription: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginLeft: 12,
  },
  changeValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
    marginTop: 4,
  },
  changeValuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeValueLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  changeValueText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  changeArrow: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 12,
  },
  stopButtonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
