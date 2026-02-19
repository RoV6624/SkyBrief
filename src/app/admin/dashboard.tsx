import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft, RefreshCw } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { CloudCard } from "@/components/ui/CloudCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { FeatureUsageList } from "@/components/admin/FeatureUsageList";
import { useSceneStore } from "@/stores/scene-store";
import {
  useAdminUsers,
  useAdminDailyMetrics,
  useAdminAirportMetrics,
  useAdminRetention,
} from "@/hooks/useAdminDashboard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useContentWidth } from "@/hooks/useContentWidth";

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark, theme } = useTheme();
  const contentWidth = useContentWidth();
  const { scene } = useSceneStore();
  const [metricsPeriod, setMetricsPeriod] = useState<7 | 30>(7);
  const [refreshing, setRefreshing] = useState(false);

  const { data: userData, isLoading: usersLoading } = useAdminUsers();
  const { data: dailyMetrics, isLoading: metricsLoading } = useAdminDailyMetrics(metricsPeriod);
  const { data: airportMetrics, isLoading: airportsLoading } = useAdminAirportMetrics();
  const { data: retention } = useAdminRetention();

  // Aggregate feature usage from daily metrics
  const featureUsage = useMemo(() => {
    if (!dailyMetrics) return [];
    const totals = {
      briefings: 0,
      routes: 0,
      wb_calculations: 0,
      chart_views: 0,
      fuel_lookups: 0,
      notam_views: 0,
    };
    for (const day of dailyMetrics) {
      totals.briefings += day.briefings;
      totals.routes += day.routes;
      totals.wb_calculations += day.wb_calculations;
      totals.chart_views += day.chart_views;
      totals.fuel_lookups += day.fuel_lookups;
      totals.notam_views += day.notam_views;
    }
    return [
      { label: "Briefings", count: totals.briefings },
      { label: "Routes", count: totals.routes },
      { label: "W&B", count: totals.wb_calculations },
      { label: "Charts", count: totals.chart_views },
      { label: "Fuel", count: totals.fuel_lookups },
      { label: "NOTAMs", count: totals.notam_views },
    ];
  }, [dailyMetrics]);

  // Top airports sorted by count
  const topAirports = useMemo(() => {
    if (!airportMetrics) return [];
    return Object.entries(airportMetrics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }, [airportMetrics]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    setRefreshing(false);
  }, [queryClient]);

  const isLoading = usersLoading || metricsLoading || airportsLoading;

  const dynamicColors = useMemo(() => ({
    sectionTitle: isDark ? theme.foreground : colors.stratus[700],
    label: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
    value: isDark ? theme.foreground : colors.stratus[800],
    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.1)",
  }), [isDark, theme]);

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            contentWidth ? { maxWidth: contentWidth } : undefined,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backBtn}
            >
              <ChevronLeft size={22} color="#ffffff" />
            </Pressable>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Pressable onPress={onRefresh} hitSlop={8}>
              <RefreshCw size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </Animated.View>

          {isLoading && !refreshing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.stratus[500]} />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          )}

          {!isLoading && (
            <>
              {/* Users Section */}
              <Animated.View entering={FadeInDown.delay(50)}>
                <CloudCard>
                  <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>
                    USERS
                  </Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCell}>
                      <Text style={[styles.metricValue, { color: dynamicColors.value }]}>
                        {userData?.total ?? 0}
                      </Text>
                      <Text style={[styles.metricLabel, { color: dynamicColors.label }]}>
                        Total
                      </Text>
                    </View>
                    <View style={styles.metricCell}>
                      <Text style={[styles.metricValue, { color: dynamicColors.value }]}>
                        {userData?.new7d ?? 0}
                      </Text>
                      <Text style={[styles.metricLabel, { color: dynamicColors.label }]}>
                        New (7d)
                      </Text>
                    </View>
                    <View style={styles.metricCell}>
                      <Text style={[styles.metricValue, { color: dynamicColors.value }]}>
                        {userData?.new30d ?? 0}
                      </Text>
                      <Text style={[styles.metricLabel, { color: dynamicColors.label }]}>
                        New (30d)
                      </Text>
                    </View>
                    <View style={styles.metricCell}>
                      <Text style={[styles.metricValue, { color: dynamicColors.value }]}>
                        {userData?.studentPercent ?? 0}%
                      </Text>
                      <Text style={[styles.metricLabel, { color: dynamicColors.label }]}>
                        Student
                      </Text>
                    </View>
                  </View>
                </CloudCard>
              </Animated.View>

              {/* Retention Section */}
              <Animated.View entering={FadeInDown.delay(100)} style={styles.gap}>
                <CloudCard>
                  <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>
                    RETENTION
                  </Text>
                  <View style={styles.retentionRow}>
                    <View style={styles.retentionItem}>
                      <Text style={[styles.retentionValue, { color: dynamicColors.value }]}>
                        {retention?.dau ?? 0}
                      </Text>
                      <Text style={[styles.retentionLabel, { color: dynamicColors.label }]}>
                        DAU
                      </Text>
                    </View>
                    <Text style={[styles.retentionDot, { color: dynamicColors.label }]}>
                      ·
                    </Text>
                    <View style={styles.retentionItem}>
                      <Text style={[styles.retentionValue, { color: dynamicColors.value }]}>
                        {retention?.wau ?? 0}
                      </Text>
                      <Text style={[styles.retentionLabel, { color: dynamicColors.label }]}>
                        WAU
                      </Text>
                    </View>
                    <Text style={[styles.retentionDot, { color: dynamicColors.label }]}>
                      ·
                    </Text>
                    <View style={styles.retentionItem}>
                      <Text style={[styles.retentionValue, { color: dynamicColors.value }]}>
                        {retention?.mau ?? 0}
                      </Text>
                      <Text style={[styles.retentionLabel, { color: dynamicColors.label }]}>
                        MAU
                      </Text>
                    </View>
                  </View>
                </CloudCard>
              </Animated.View>

              {/* Feature Usage Section */}
              <Animated.View entering={FadeInDown.delay(150)} style={styles.gap}>
                <CloudCard>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle, flex: 1 }]}>
                      FEATURE USAGE
                    </Text>
                    <View style={styles.periodToggle}>
                      {([7, 30] as const).map((period) => (
                        <Pressable
                          key={period}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setMetricsPeriod(period);
                          }}
                          style={[
                            styles.periodBtn,
                            { borderColor: dynamicColors.borderColor },
                            metricsPeriod === period && styles.periodBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.periodBtnText,
                              metricsPeriod === period && styles.periodBtnTextActive,
                            ]}
                          >
                            {period}d
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <FeatureUsageList features={featureUsage} />
                </CloudCard>
              </Animated.View>

              {/* Top Airports Section */}
              <Animated.View entering={FadeInDown.delay(200)} style={styles.gap}>
                <CloudCard>
                  <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>
                    TOP AIRPORTS
                  </Text>
                  {topAirports.length === 0 ? (
                    <Text style={[styles.emptyText, { color: dynamicColors.label }]}>
                      No airport data yet
                    </Text>
                  ) : (
                    <View style={styles.airportList}>
                      {topAirports.map(([icao, count], index) => (
                        <View key={icao} style={styles.airportRow}>
                          <Text style={[styles.airportRank, { color: dynamicColors.label }]}>
                            {index + 1}.
                          </Text>
                          <Text style={[styles.airportIcao, { color: dynamicColors.value }]}>
                            {icao}
                          </Text>
                          <Text style={[styles.airportCount, { color: dynamicColors.label }]}>
                            {count.toLocaleString()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </CloudCard>
              </Animated.View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gap: { marginTop: 12 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: colors.stratus[700],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  // Users grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCell: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.stratus[800],
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[600],
    marginTop: 2,
  },
  // Retention
  retentionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  retentionItem: {
    alignItems: "center",
  },
  retentionValue: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.stratus[800],
  },
  retentionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[600],
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  retentionDot: {
    fontSize: 20,
    color: colors.stratus[400],
  },
  // Period toggle
  periodToggle: {
    flexDirection: "row",
    gap: 4,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.1)",
    backgroundColor: "rgba(12,140,233,0.04)",
  },
  periodBtnActive: {
    backgroundColor: "rgba(12,140,233,0.12)",
    borderColor: colors.stratus[500],
  },
  periodBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[400],
  },
  periodBtnTextActive: {
    color: colors.stratus[800],
  },
  // Airports
  airportList: {
    gap: 8,
  },
  airportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  airportRank: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[500],
    width: 24,
  },
  airportIcao: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[800],
    flex: 1,
  },
  airportCount: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[600],
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[500],
    textAlign: "center",
    paddingVertical: 12,
  },
});
