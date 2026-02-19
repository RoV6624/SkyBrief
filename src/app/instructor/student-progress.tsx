import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Users,
  TrendingUp,
  Shield,
  AlertTriangle,
  FileText,
  ChevronRight,
  ArrowLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useTenantStore } from "@/stores/tenant-store";
import { useSchoolStudents, useStudentMetrics } from "@/hooks/useStudentMetrics";
import { CloudCard } from "@/components/ui/CloudCard";
import type { StudentMetrics } from "@/services/tenant-api";

export default function StudentProgressScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { tenantId } = useTenantStore();
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(null);

  const { data: students, isLoading: studentsLoading, refetch } = useSchoolStudents(tenantId);
  const { data: metrics } = useStudentMetrics(selectedStudentUid, tenantId);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={studentsLoading}
              onRefresh={handleRefresh}
              tintColor={isDark ? "#ffffff" : colors.stratus[500]}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft size={22} color={isDark ? "#FFFFFF" : colors.stratus[800]} />
            </Pressable>
            <Users size={22} color={colors.accent} />
            <Text
              style={[
                styles.title,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Student Progress
            </Text>
          </Animated.View>

          {/* Student detail view */}
          {selectedStudentUid && metrics && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <Pressable
                onPress={() => setSelectedStudentUid(null)}
                style={styles.backLink}
              >
                <ArrowLeft size={14} color={colors.accent} />
                <Text style={[styles.backText, { color: colors.accent }]}>
                  All Students
                </Text>
              </Pressable>

              <StudentDetailView metrics={metrics} isDark={isDark} />
            </Animated.View>
          )}

          {/* Student list */}
          {!selectedStudentUid && (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                ]}
              >
                {students?.length ?? 0} STUDENTS
              </Text>

              {students?.map((student, index) => (
                <Animated.View
                  key={student.uid}
                  entering={FadeInDown.delay(100 + index * 30)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedStudentUid(student.uid);
                    }}
                  >
                    <CloudCard>
                      <View style={styles.studentRow}>
                        <View style={styles.studentAvatar}>
                          <Text style={styles.studentInitial}>
                            {student.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.studentInfo}>
                          <Text
                            style={[
                              styles.studentName,
                              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                            ]}
                          >
                            {student.name}
                          </Text>
                          <Text
                            style={[
                              styles.studentRole,
                              { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                            ]}
                          >
                            Student Pilot
                          </Text>
                        </View>
                        <ChevronRight
                          size={16}
                          color={isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]}
                        />
                      </View>
                    </CloudCard>
                  </Pressable>
                </Animated.View>
              ))}

              {students && students.length === 0 && !studentsLoading && (
                <View style={styles.emptyState}>
                  <Users size={36} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
                    ]}
                  >
                    No students enrolled yet
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StudentDetailView({
  metrics,
  isDark,
}: {
  metrics: StudentMetrics;
  isDark: boolean;
}) {
  const approvalRate =
    metrics.totalBriefings > 0
      ? Math.round((metrics.approvedFirstTry / metrics.totalBriefings) * 100)
      : 0;

  const fratColor =
    metrics.avgFratScore < 25
      ? colors.alert.green
      : metrics.avgFratScore < 50
      ? colors.alert.amber
      : colors.alert.red;

  return (
    <View style={styles.detailContainer}>
      <Text
        style={[
          styles.detailName,
          { color: isDark ? "#FFFFFF" : colors.stratus[800] },
        ]}
      >
        {metrics.studentName}
      </Text>

      {/* Metric cards */}
      <View style={styles.metricsGrid}>
        <MetricCard
          icon={FileText}
          label="Briefings"
          value={`${metrics.totalBriefings}`}
          isDark={isDark}
        />
        <MetricCard
          icon={TrendingUp}
          label="Approval Rate"
          value={`${approvalRate}%`}
          color={approvalRate >= 80 ? colors.alert.green : approvalRate >= 50 ? colors.alert.amber : colors.alert.red}
          isDark={isDark}
        />
        <MetricCard
          icon={Shield}
          label="Avg FRAT"
          value={`${metrics.avgFratScore}`}
          color={fratColor}
          isDark={isDark}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Minimums Breaches"
          value={`${metrics.minimumsBreaches}`}
          color={metrics.minimumsBreaches > 0 ? colors.alert.red : colors.alert.green}
          isDark={isDark}
        />
      </View>

      {/* Briefings by type */}
      {Object.keys(metrics.briefingsByType).length > 0 && (
        <CloudCard>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
            ]}
          >
            Briefings by Type
          </Text>
          <View style={styles.typeList}>
            {Object.entries(metrics.briefingsByType).map(([type, count]) => (
              <View key={type} style={styles.typeRow}>
                <Text
                  style={[
                    styles.typeLabel,
                    { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600] },
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.typeCount,
                    { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                  ]}
                >
                  {count}
                </Text>
              </View>
            ))}
          </View>
        </CloudCard>
      )}

      {/* Last briefing */}
      {metrics.lastBriefingDate && (
        <Text
          style={[
            styles.lastBriefing,
            { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
          ]}
        >
          Last briefing:{" "}
          {new Date(metrics.lastBriefingDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      )}
    </View>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  color?: string;
  isDark: boolean;
}) {
  return (
    <CloudCard>
      <View style={styles.metricCard}>
        <Icon size={16} color={color ?? colors.accent} />
        <Text
          style={[
            styles.metricValue,
            { color: color ?? (isDark ? "#FFFFFF" : colors.stratus[800]) },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.metricLabel,
            { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
          ]}
        >
          {label}
        </Text>
      </View>
    </CloudCard>
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
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  studentInitial: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.accent,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  studentRole: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyState: {
    alignItems: "center",
    paddingTop: 50,
    gap: 10,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  backText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detailContainer: { gap: 12 },
  detailName: { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    alignItems: "center",
    gap: 4,
    minWidth: 70,
  },
  metricValue: { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold" },
  metricLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  sectionTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", marginBottom: 8 },
  typeList: { gap: 4 },
  typeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  typeLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  typeCount: { fontSize: 14, fontFamily: "JetBrainsMono_600SemiBold" },
  lastBriefing: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
});
