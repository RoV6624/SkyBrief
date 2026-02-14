import { View, Text, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export interface Notam {
  id: string;
  station: string;
  category: "runway" | "taxiway" | "navaid" | "airspace" | "other";
  effectiveStart: Date;
  effectiveEnd: Date;
  message: string;
  priority: "high" | "medium" | "low";
}

interface NotamCardProps {
  notam: Notam;
  delay?: number;
}

export function NotamCard({ notam, delay = 0 }: NotamCardProps) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const priorityColor =
    notam.priority === "high"
      ? colors.ifr
      : notam.priority === "medium"
      ? colors.alert.amber
      : colors.stratus[500];

  const categoryLabel =
    notam.category === "runway"
      ? "RWY"
      : notam.category === "taxiway"
      ? "TWY"
      : notam.category === "navaid"
      ? "NAV"
      : notam.category === "airspace"
      ? "AIRSPACE"
      : "INFO";

  return (
    <Animated.View entering={FadeInDown.delay(delay)}>
      <CloudCard style={{ marginBottom: 8 }}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[styles.priorityDot, { backgroundColor: priorityColor }]}
              />
              <View
                style={[styles.categoryBadge, { backgroundColor: priorityColor }]}
              >
                <Text style={styles.categoryText}>{categoryLabel}</Text>
              </View>
              <Text style={[styles.notamId, { color: theme.foreground }]}>
                {notam.id}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {expanded ? (
                <ChevronUp
                  size={16}
                  color={isDark ? theme.mutedForeground : colors.stratus[400]}
                />
              ) : (
                <ChevronDown
                  size={16}
                  color={isDark ? theme.mutedForeground : colors.stratus[400]}
                />
              )}
            </View>
          </View>

          {!expanded && (
            <Text
              style={[styles.summary, { color: theme.foreground }]}
              numberOfLines={1}
            >
              {notam.message}
            </Text>
          )}

          {expanded && (
            <View style={styles.details}>
              <Text style={[styles.message, { color: theme.foreground }]}>
                {notam.message}
              </Text>
              <View style={styles.times}>
                <Text
                  style={[
                    styles.timeLabel,
                    { color: isDark ? theme.mutedForeground : colors.stratus[400] },
                  ]}
                >
                  Effective:{" "}
                  {notam.effectiveStart.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text
                  style={[
                    styles.timeLabel,
                    { color: isDark ? theme.mutedForeground : colors.stratus[400] },
                  ]}
                >
                  Until:{" "}
                  {notam.effectiveEnd.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerRight: {
    marginLeft: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  notamId: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  summary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  details: {
    marginTop: 4,
  },
  message: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  times: {
    gap: 4,
  },
  timeLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
