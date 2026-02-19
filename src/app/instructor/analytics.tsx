import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  BarChart3,
  Users,
  FileText,
  Shield,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useTenantStore } from "@/stores/tenant-store";
import { getSchoolStudents, getStudentMetrics } from "@/services/tenant-api";
import type { StudentMetrics } from "@/services/tenant-api";
import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

export default function SchoolAnalyticsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { tenantId } = useTenantStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all students in the school
  const {
    data: students,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["school-students", tenantId],
    queryFn: () => getSchoolStudents(tenantId!),
    enabled: !!tenantId,
  });

  // Fetch metrics for each student
  const metricsQueries = useQueries({
    queries: (students ?? []).map((s) => ({
      queryKey: ["student-metrics", s.uid, tenantId],
      queryFn: () => getStudentMetrics(s.uid, tenantId!),
      enabled: !!tenantId,
    })),
  });

  const metricsLoading = metricsQueries.some((q) => q.isLoading);
  const allMetrics = metricsQueries
    .map((q) => q.data)
    .filter((m): m is StudentMetrics => m !== null && m !== undefined);

  // Aggregate school-wide stats
  const schoolStats = useMemo(() => {
    if (allMetrics.length === 0) {
      return {
        totalStudents: students?.length ?? 0,
        totalBriefings: 0,
        avgFratScore: 0,
        approvalRate: 0,
      };
    }

    const totalBriefings = allMetrics.reduce((sum, m) => sum + m.totalBriefings, 0);
    const totalApproved = allMetrics.reduce((sum, m) => sum + m.approvedFirstTry, 0);
    const avgFratScore =
      allMetrics.reduce((sum, m) => sum + m.avgFratScore, 0) / allMetrics.length;
    const approvalRate = totalBriefings > 0 ? (totalApproved / totalBriefings) * 100 : 0;

    return {
      totalStudents: students?.length ?? 0,
      totalBriefings,
      avgFratScore: Math.round(avgFratScore * 10) / 10,
      approvalRate: Math.round(approvalRate),
    };
  }, [allMetrics, students]);

  // Sort students by total briefings (desc)
  const sortedMetrics = useMemo(() => {
    return [...allMetrics].sort((a, b) => b.totalBriefings - a.totalBriefings);
  }, [allMetrics]);

  // Identify concerning patterns
  const concerningPatterns = useMemo(() => {
    const highFrat = allMetrics.filter((m) => m.avgFratScore > 40);
    const minimumsBreaches = allMetrics.filter((m) => m.minimumsBreaches > 2);
    return { highFrat, minimumsBreaches };
  }, [allMetrics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetchStudents();
    setRefreshing(false);
  };

  const getFratColor = (score: number): string => {
    if (score < 25) return colors.alert.green;
    if (score <= 50) return colors.alert.amber;
    return colors.alert.red;
  };

  const dynamicColors = useMemo(
    () => ({
      sectionTitle: isDark ? theme.foreground : colors.stratus[700],
      cardHeader: isDark ? "rgba(255,255,255,0.9)" : colors.stratus[800],
      cardValue: isDark ? theme.foreground : colors.stratus[900],
      cardLabel: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
      tableHeader: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
      tableText: isDark ? theme.foreground : colors.stratus[800],
      tableSubtext: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600],
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(12,140,233,0.08)",
    }),
    [isDark, theme]
  );

  const isLoading = studentsLoading || metricsLoading;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={8}
            >
              <ArrowLeft size={20} color="#ffffff" strokeWidth={1.8} />
            </Pressable>
            <BarChart3 size={22} color="#ffffff" strokeWidth={1.8} />
            <Text style={styles.title}>School Analytics</Text>
          </Animated.View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.stratus[500]} />
              <Text style={[styles.loadingText, { color: dynamicColors.cardLabel }]}>
                Loading analytics...
              </Text>
            </View>
          ) : (
            <>
              {/* Overview Cards */}
              <Animated.View entering={FadeInDown.delay(50)} style={styles.gap}>
                <CloudCard>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: dynamicColors.sectionTitle },
                    ]}
                  >
                    SCHOOL OVERVIEW
                  </Text>
                  <View style={styles.overviewGrid}>
                    <View style={styles.overviewCard}>
                      <Users
                        size={18}
                        color={colors.stratus[500]}
                        strokeWidth={1.8}
                      />
                      <Text
                        style={[styles.overviewValue, { color: dynamicColors.cardValue }]}
                      >
                        {schoolStats.totalStudents}
                      </Text>
                      <Text
                        style={[styles.overviewLabel, { color: dynamicColors.cardLabel }]}
                      >
                        Students
                      </Text>
                    </View>

                    <View style={styles.overviewCard}>
                      <FileText
                        size={18}
                        color={colors.stratus[500]}
                        strokeWidth={1.8}
                      />
                      <Text
                        style={[styles.overviewValue, { color: dynamicColors.cardValue }]}
                      >
                        {schoolStats.totalBriefings}
                      </Text>
                      <Text
                        style={[styles.overviewLabel, { color: dynamicColors.cardLabel }]}
                      >
                        Briefings
                      </Text>
                    </View>

                    <View style={styles.overviewCard}>
                      <Shield
                        size={18}
                        color={getFratColor(schoolStats.avgFratScore)}
                        strokeWidth={1.8}
                      />
                      <Text
                        style={[
                          styles.overviewValue,
                          {
                            color: getFratColor(schoolStats.avgFratScore),
                          },
                        ]}
                      >
                        {schoolStats.avgFratScore.toFixed(1)}
                      </Text>
                      <Text
                        style={[styles.overviewLabel, { color: dynamicColors.cardLabel }]}
                      >
                        Avg FRAT
                      </Text>
                    </View>

                    <View style={styles.overviewCard}>
                      <TrendingUp
                        size={18}
                        color={colors.stratus[500]}
                        strokeWidth={1.8}
                      />
                      <Text
                        style={[styles.overviewValue, { color: dynamicColors.cardValue }]}
                      >
                        {schoolStats.approvalRate}%
                      </Text>
                      <Text
                        style={[styles.overviewLabel, { color: dynamicColors.cardLabel }]}
                      >
                        Approval Rate
                      </Text>
                    </View>
                  </View>
                </CloudCard>
              </Animated.View>

              {/* Student Performance Table */}
              {sortedMetrics.length > 0 && (
                <Animated.View entering={FadeInDown.delay(100)} style={styles.gap}>
                  <CloudCard>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: dynamicColors.sectionTitle },
                      ]}
                    >
                      STUDENT PERFORMANCE
                    </Text>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          styles.nameCol,
                          { color: dynamicColors.tableHeader },
                        ]}
                      >
                        Student
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          styles.numberCol,
                          { color: dynamicColors.tableHeader },
                        ]}
                      >
                        Briefings
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          styles.numberCol,
                          { color: dynamicColors.tableHeader },
                        ]}
                      >
                        Approval
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          styles.numberCol,
                          { color: dynamicColors.tableHeader },
                        ]}
                      >
                        FRAT
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          styles.numberCol,
                          { color: dynamicColors.tableHeader },
                        ]}
                      >
                        Breaches
                      </Text>
                    </View>

                    {/* Table Rows */}
                    {sortedMetrics.map((metrics, index) => {
                      const approvalRate =
                        metrics.totalBriefings > 0
                          ? Math.round(
                              (metrics.approvedFirstTry / metrics.totalBriefings) * 100
                            )
                          : 0;
                      const fratColor = getFratColor(metrics.avgFratScore);

                      return (
                        <View
                          key={metrics.studentUid}
                          style={[
                            styles.tableRow,
                            {
                              borderBottomColor: dynamicColors.borderColor,
                              borderBottomWidth:
                                index < sortedMetrics.length - 1
                                  ? StyleSheet.hairlineWidth
                                  : 0,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tableCell,
                              styles.nameCol,
                              { color: dynamicColors.tableText },
                            ]}
                            numberOfLines={1}
                          >
                            {metrics.studentName}
                          </Text>
                          <Text
                            style={[
                              styles.tableCellMono,
                              styles.numberCol,
                              { color: dynamicColors.tableText },
                            ]}
                          >
                            {metrics.totalBriefings}
                          </Text>
                          <Text
                            style={[
                              styles.tableCellMono,
                              styles.numberCol,
                              { color: dynamicColors.tableText },
                            ]}
                          >
                            {approvalRate}%
                          </Text>
                          <Text
                            style={[
                              styles.tableCellMono,
                              styles.numberCol,
                              { color: fratColor },
                            ]}
                          >
                            {metrics.avgFratScore.toFixed(1)}
                          </Text>
                          <Text
                            style={[
                              styles.tableCellMono,
                              styles.numberCol,
                              {
                                color:
                                  metrics.minimumsBreaches > 2
                                    ? colors.alert.red
                                    : dynamicColors.tableText,
                              },
                            ]}
                          >
                            {metrics.minimumsBreaches}
                          </Text>
                        </View>
                      );
                    })}
                  </CloudCard>
                </Animated.View>
              )}

              {/* Concerning Patterns */}
              {(concerningPatterns.highFrat.length > 0 ||
                concerningPatterns.minimumsBreaches.length > 0) && (
                <Animated.View entering={FadeInDown.delay(150)} style={styles.gap}>
                  <CloudCard>
                    <View style={styles.sectionHeader}>
                      <AlertTriangle
                        size={14}
                        color={colors.alert.amber}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: colors.alert.amber, flex: 1 },
                        ]}
                      >
                        CONCERNING PATTERNS
                      </Text>
                    </View>

                    {concerningPatterns.highFrat.length > 0 && (
                      <View style={styles.concernGroup}>
                        <Text
                          style={[
                            styles.concernTitle,
                            { color: dynamicColors.tableText },
                          ]}
                        >
                          High FRAT Scores (Avg &gt; 40)
                        </Text>
                        {concerningPatterns.highFrat.map((m) => (
                          <View key={m.studentUid} style={styles.concernRow}>
                            <AlertTriangle
                              size={12}
                              color={colors.alert.red}
                              strokeWidth={2}
                            />
                            <Text
                              style={[
                                styles.concernText,
                                { color: dynamicColors.tableSubtext },
                              ]}
                            >
                              {m.studentName} - Avg FRAT: {m.avgFratScore.toFixed(1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {concerningPatterns.minimumsBreaches.length > 0 && (
                      <View style={styles.concernGroup}>
                        <Text
                          style={[
                            styles.concernTitle,
                            { color: dynamicColors.tableText },
                          ]}
                        >
                          Minimums Breaches (&gt; 2)
                        </Text>
                        {concerningPatterns.minimumsBreaches.map((m) => (
                          <View key={m.studentUid} style={styles.concernRow}>
                            <AlertTriangle
                              size={12}
                              color={colors.alert.red}
                              strokeWidth={2}
                            />
                            <Text
                              style={[
                                styles.concernText,
                                { color: dynamicColors.tableSubtext },
                              ]}
                            >
                              {m.studentName} - {m.minimumsBreaches} breach
                              {m.minimumsBreaches !== 1 ? "es" : ""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </CloudCard>
                </Animated.View>
              )}

              {/* Empty State */}
              {!isLoading && sortedMetrics.length === 0 && (
                <Animated.View entering={FadeInDown.delay(100)} style={styles.gap}>
                  <CloudCard>
                    <View style={styles.emptyState}>
                      <BarChart3
                        size={48}
                        color={colors.stratus[300]}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: dynamicColors.tableText },
                        ]}
                      >
                        No Student Data
                      </Text>
                      <Text
                        style={[
                          styles.emptySubtitle,
                          { color: dynamicColors.tableSubtext },
                        ]}
                      >
                        Student metrics will appear here once briefings are submitted.
                      </Text>
                    </View>
                  </CloudCard>
                </Animated.View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stratus[50] },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 800,
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
  title: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gap: { marginTop: 12 },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  overviewCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.08)",
  },
  overviewValue: {
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  overviewLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(12,140,233,0.15)",
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  tableCell: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tableCellMono: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  nameCol: {
    flex: 2,
  },
  numberCol: {
    flex: 1,
    textAlign: "center",
  },
  concernGroup: {
    gap: 8,
    marginBottom: 12,
  },
  concernTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  concernRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
  },
  concernText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 280,
  },
});
