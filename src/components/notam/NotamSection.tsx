import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Bell, ChevronDown, ChevronUp, Info } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { CloudCard } from "@/components/ui/CloudCard";
import { NotamCard } from "./NotamCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useNotams } from "@/hooks/useNotams";

interface NotamSectionProps {
  station: string;
  delay?: number;
}

export function NotamSection({ station, delay = 0 }: NotamSectionProps) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const { data: notams = [], isLoading, error, refetch } = useNotams(station);
  const isMissingCredentials = error?.message?.includes("credentials not configured");
  const highPriorityCount = notams.filter((n) => n.priority === "high").length;

  return (
    <Animated.View entering={FadeInDown.delay(delay)}>
      <CloudCard>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bell
                size={16}
                color={isDark ? theme.mutedForeground : colors.stratus[500]}
              />
              <Text style={[styles.title, { color: theme.foreground }]}>
                NOTAMs
              </Text>
              {highPriorityCount > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: colors.ifr },
                  ]}
                >
                  <Text style={styles.countText}>{highPriorityCount}</Text>
                </View>
              )}
            </View>
            {expanded ? (
              <ChevronUp
                size={18}
                color={isDark ? theme.mutedForeground : colors.stratus[400]}
              />
            ) : (
              <ChevronDown
                size={18}
                color={isDark ? theme.mutedForeground : colors.stratus[400]}
              />
            )}
          </View>

          {!expanded && (
            <Text
              style={[
                styles.summary,
                { color: isDark ? theme.mutedForeground : colors.stratus[600] },
              ]}
            >
              {notams.length} active NOTAM{notams.length !== 1 ? "s" : ""} •{" "}
              Tap to view
            </Text>
          )}
        </Pressable>

        {expanded && (
          <View style={styles.notamList}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={colors.stratus[500]} />
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? theme.mutedForeground : colors.stratus[400] },
                  ]}
                >
                  Loading NOTAMs...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.emptyState}>
                <Info
                  size={24}
                  color={colors.alert.amber}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.alert.amber },
                  ]}
                >
                  {isMissingCredentials
                    ? "FAA API credentials required"
                    : "Failed to load NOTAMs"}
                </Text>
                {isMissingCredentials ? (
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: isDark
                          ? "rgba(255,255,255,0.4)"
                          : colors.stratus[400],
                        fontSize: 10,
                        textAlign: "center",
                        paddingHorizontal: 12,
                      },
                    ]}
                  >
                    Add FAA NOTAM API keys to .env{"\n"}Register free at api.faa.gov
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      refetch();
                    }}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                )}
              </View>
            ) : notams.length === 0 ? (
              <View style={styles.emptyState}>
                <Info
                  size={24}
                  color={isDark ? theme.mutedForeground : colors.stratus[300]}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? theme.mutedForeground : colors.stratus[400] },
                  ]}
                >
                  No active NOTAMs for this station
                </Text>
              </View>
            ) : (
              <>
                {notams.map((notam, i) => (
                  <NotamCard key={notam.id} notam={notam} delay={i * 50} />
                ))}
              </>
            )}
          </View>
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
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  summary: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  notamList: {
    marginTop: 12,
    gap: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  retryText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
});
