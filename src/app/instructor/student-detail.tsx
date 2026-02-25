/**
 * Student Detail Screen
 *
 * Displays a comprehensive view of a specific student's training progress,
 * recent dispatches, upcoming lessons, and quick actions for the instructor.
 * Accessed via route param `studentUid`.
 */

import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Send,
  Calendar,
  TrendingUp,
  Shield,
  AlertTriangle,
  FileText,
  ChevronRight,
  GraduationCap,
  Mail,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useTenantStore } from "@/stores/tenant-store";
import { useStudentMetrics, useStudentCurriculumProgress } from "@/hooks/useStudentMetrics";
import { useStudentLessons } from "@/hooks/useStudentLessons";
import { getStudentDispatchHistory } from "@/services/dispatch-api";
import { PRIVATE_PILOT_CURRICULUM } from "@/lib/curriculum/private-pilot";
import { CloudCard } from "@/components/ui/CloudCard";
import type { DispatchStatus } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDispatchStatusColor(status: DispatchStatus): string {
  switch (status) {
    case "submitted":
      return colors.alert.amber;
    case "approved":
      return colors.alert.green;
    case "rejected":
      return colors.alert.red;
    case "revision_requested":
      return "#f97316"; // orange
    case "draft":
      return "#9ca3af"; // gray
    default:
      return colors.stratus[500];
  }
}

function getDispatchStatusLabel(status: DispatchStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "revision_requested":
      return "Revision";
    case "draft":
      return "Draft";
    case "preflight":
      return "Preflight";
    case "departed":
      return "Departed";
    default:
      return status;
  }
}

/**
 * Determine the student's current training stage based on which lessons
 * they have completed in the private pilot curriculum.
 */
function getCurrentStage(completedLessonIds: string[]): {
  stageName: string;
  stageNumber: number;
  totalStages: number;
} {
  const stages = PRIVATE_PILOT_CURRICULUM.stages;
  const totalStages = stages.length;

  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    const stageLessonIds = stage.lessons.map((l) => l.id);
    const completedInStage = stageLessonIds.filter((id) =>
      completedLessonIds.includes(id)
    ).length;

    if (completedInStage > 0) {
      // If all lessons in this stage are complete, they are on the next stage
      if (completedInStage >= stageLessonIds.length && i < stages.length - 1) {
        return {
          stageName: stages[i + 1].title,
          stageNumber: stages[i + 1].stageNumber,
          totalStages,
        };
      }
      return {
        stageName: stage.title,
        stageNumber: stage.stageNumber,
        totalStages,
      };
    }
  }

  // No completed lessons means they are on Stage 1
  return {
    stageName: stages[0].title,
    stageNumber: stages[0].stageNumber,
    totalStages,
  };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function StudentDetailScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { studentUid } = useLocalSearchParams<{ studentUid: string }>();
  const { tenantId } = useTenantStore();

  // Data hooks
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useStudentMetrics(studentUid ?? null, tenantId);

  const {
    data: progress,
    isLoading: progressLoading,
    refetch: refetchProgress,
  } = useStudentCurriculumProgress(studentUid ?? null, tenantId);

  const {
    data: dispatches,
    isLoading: dispatchesLoading,
    refetch: refetchDispatches,
  } = useQuery({
    queryKey: ["student-dispatch-history", studentUid, tenantId],
    queryFn: () => getStudentDispatchHistory(studentUid!, tenantId!),
    enabled: !!studentUid && !!tenantId,
    staleTime: 300_000,
  });

  const {
    data: lessons,
    isLoading: lessonsLoading,
    refetch: refetchLessons,
  } = useStudentLessons(studentUid, tenantId);

  const isLoading = metricsLoading || progressLoading || dispatchesLoading || lessonsLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchMetrics(),
      refetchProgress(),
      refetchDispatches(),
      refetchLessons(),
    ]);
  }, [refetchMetrics, refetchProgress, refetchDispatches, refetchLessons]);

  // Derived data
  const studentName = metrics?.studentName ?? "Student";
  const studentEmail = metrics?.studentName ? undefined : undefined; // Email not in metrics
  const completedLessonIds = progress?.completedLessonIds ?? [];
  const totalAssigned = progress?.totalAssigned ?? 0;
  const completedCount = completedLessonIds.length;
  const progressPercent =
    totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  const stageInfo = getCurrentStage(completedLessonIds);

  // Recent dispatches (last 5)
  const recentDispatches = (dispatches ?? []).slice(0, 5);

  // Upcoming lessons
  const upcomingLessons = (lessons ?? []).filter(
    (l) => l.status === "upcoming"
  );

  // Metrics
  const approvalRate =
    metrics && metrics.totalBriefings > 0
      ? Math.round((metrics.approvedFirstTry / metrics.totalBriefings) * 100)
      : 0;
  const fratColor =
    metrics && metrics.avgFratScore < 25
      ? colors.alert.green
      : metrics && metrics.avgFratScore < 50
      ? colors.alert.amber
      : colors.alert.red;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={isDark ? "#ffffff" : colors.stratus[500]}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft
                size={22}
                color={isDark ? "#FFFFFF" : colors.stratus[800]}
              />
            </Pressable>
            <GraduationCap size={22} color={colors.accent} />
            <Text
              style={[
                styles.title,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Student Detail
            </Text>
          </Animated.View>

          {/* Student Info */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <CloudCard>
              <View style={styles.studentHeader}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentInitial}>
                    {studentName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentHeaderInfo}>
                  <Text
                    style={[
                      styles.studentName,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    {studentName}
                  </Text>
                  {studentEmail && (
                    <View style={styles.emailRow}>
                      <Mail
                        size={12}
                        color={
                          isDark
                            ? "rgba(255,255,255,0.4)"
                            : colors.stratus[500]
                        }
                      />
                      <Text
                        style={[
                          styles.emailText,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : colors.stratus[500],
                          },
                        ]}
                      >
                        {studentEmail}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.stageLabel,
                      {
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : colors.stratus[600],
                      },
                    ]}
                  >
                    Stage {stageInfo.stageNumber}/{stageInfo.totalStages} -{" "}
                    {stageInfo.stageName}
                  </Text>
                </View>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Training Progress */}
          <Animated.View entering={FadeInDown.delay(150)}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.4)"
                    : colors.stratus[500],
                },
              ]}
            >
              TRAINING PROGRESS
            </Text>
            <CloudCard>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <TrendingUp size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.progressTitle,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Curriculum Progress
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarBg,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor:
                            progressPercent >= 80
                              ? colors.alert.green
                              : progressPercent >= 40
                              ? colors.alert.amber
                              : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressPercent,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    {progressPercent}%
                  </Text>
                </View>

                <Text
                  style={[
                    styles.progressDetail,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : colors.stratus[500],
                    },
                  ]}
                >
                  {completedCount} of {totalAssigned} lessons completed
                </Text>

                {/* Metrics grid */}
                {metrics && (
                  <View style={styles.metricsGrid}>
                    <MetricItem
                      icon={FileText}
                      label="Briefings"
                      value={`${metrics.totalBriefings}`}
                      isDark={isDark}
                    />
                    <MetricItem
                      icon={TrendingUp}
                      label="Approval"
                      value={`${approvalRate}%`}
                      color={
                        approvalRate >= 80
                          ? colors.alert.green
                          : approvalRate >= 50
                          ? colors.alert.amber
                          : colors.alert.red
                      }
                      isDark={isDark}
                    />
                    <MetricItem
                      icon={Shield}
                      label="Avg FRAT"
                      value={`${metrics.avgFratScore}`}
                      color={fratColor}
                      isDark={isDark}
                    />
                    <MetricItem
                      icon={AlertTriangle}
                      label="Min. Breaches"
                      value={`${metrics.minimumsBreaches}`}
                      color={
                        metrics.minimumsBreaches > 0
                          ? colors.alert.red
                          : colors.alert.green
                      }
                      isDark={isDark}
                    />
                  </View>
                )}
              </View>
            </CloudCard>
          </Animated.View>

          {/* Recent Dispatches */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.4)"
                    : colors.stratus[500],
                },
              ]}
            >
              RECENT DISPATCHES
            </Text>

            {dispatchesLoading && (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={styles.loader}
              />
            )}

            {recentDispatches.length === 0 && !dispatchesLoading && (
              <CloudCard>
                <View style={styles.emptySection}>
                  <Send
                    size={20}
                    color={
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: isDark
                          ? "rgba(255,255,255,0.4)"
                          : colors.stratus[500],
                      },
                    ]}
                  >
                    No dispatches yet
                  </Text>
                </View>
              </CloudCard>
            )}

            {recentDispatches.map((dispatch, index) => (
              <Animated.View
                key={dispatch.id}
                entering={FadeInDown.delay(220 + index * 30)}
              >
                <CloudCard style={styles.dispatchCard}>
                  <View style={styles.dispatchRow}>
                    <View style={styles.dispatchInfo}>
                      <Text
                        style={[
                          styles.dispatchStation,
                          { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                        ]}
                      >
                        {dispatch.station || "Unknown"}
                      </Text>
                      <Text
                        style={[
                          styles.dispatchDate,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : colors.stratus[500],
                          },
                        ]}
                      >
                        {dispatch.createdAt
                          ? new Date(dispatch.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : ""}
                        {" - "}
                        {dispatch.flightType?.toUpperCase() ?? "LOCAL"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${getDispatchStatusColor(dispatch.status)}18`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getDispatchStatusColor(dispatch.status) },
                        ]}
                      >
                        {getDispatchStatusLabel(dispatch.status)}
                      </Text>
                    </View>
                  </View>
                </CloudCard>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Upcoming Lessons */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.4)"
                    : colors.stratus[500],
                },
              ]}
            >
              UPCOMING LESSONS
            </Text>

            {lessonsLoading && (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={styles.loader}
              />
            )}

            {upcomingLessons.length === 0 && !lessonsLoading && (
              <CloudCard>
                <View style={styles.emptySection}>
                  <Calendar
                    size={20}
                    color={
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color: isDark
                          ? "rgba(255,255,255,0.4)"
                          : colors.stratus[500],
                      },
                    ]}
                  >
                    No upcoming lessons
                  </Text>
                </View>
              </CloudCard>
            )}

            {upcomingLessons.map((lesson, index) => (
              <Animated.View
                key={lesson.id}
                entering={FadeInDown.delay(320 + index * 30)}
              >
                <CloudCard style={styles.lessonCard}>
                  <View style={styles.lessonRow}>
                    <BookOpen
                      size={16}
                      color={colors.accent}
                    />
                    <View style={styles.lessonInfo}>
                      <Text
                        style={[
                          styles.lessonTitle,
                          { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                        ]}
                      >
                        {lesson.lessonTitle || "Untitled Lesson"}
                      </Text>
                      <Text
                        style={[
                          styles.lessonDate,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.4)"
                              : colors.stratus[500],
                          },
                        ]}
                      >
                        {lesson.scheduledDate
                          ? new Date(lesson.scheduledDate).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "Not scheduled"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${colors.accent}18`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: colors.accent },
                        ]}
                      >
                        {lesson.status === "upcoming"
                          ? "Upcoming"
                          : lesson.status}
                      </Text>
                    </View>
                  </View>
                </CloudCard>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(400)}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.4)"
                    : colors.stratus[500],
                },
              ]}
            >
              QUICK ACTIONS
            </Text>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/instructor/training", params: { preselectedStudent: studentUid } });
              }}
            >
              <CloudCard>
                <View style={styles.actionRow}>
                  <BookOpen size={18} color={colors.accent} />
                  <View style={styles.actionInfo}>
                    <Text
                      style={[
                        styles.actionTitle,
                        { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                      ]}
                    >
                      Assign Lesson
                    </Text>
                    <Text
                      style={[
                        styles.actionSub,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.4)"
                            : colors.stratus[500],
                        },
                      ]}
                    >
                      Browse syllabus and assign a new lesson
                    </Text>
                  </View>
                  <ChevronRight
                    size={16}
                    color={
                      isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]
                    }
                  />
                </View>
              </CloudCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/dispatch-queue");
              }}
            >
              <CloudCard>
                <View style={styles.actionRow}>
                  <Send size={18} color={colors.accent} />
                  <View style={styles.actionInfo}>
                    <Text
                      style={[
                        styles.actionTitle,
                        { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                      ]}
                    >
                      View Dispatch History
                    </Text>
                    <Text
                      style={[
                        styles.actionSub,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.4)"
                            : colors.stratus[500],
                        },
                      ]}
                    >
                      Review all dispatches for this student
                    </Text>
                  </View>
                  <ChevronRight
                    size={16}
                    color={
                      isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]
                    }
                  />
                </View>
              </CloudCard>
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Metric Item sub-component
// ---------------------------------------------------------------------------

function MetricItem({
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
    <View style={styles.metricItem}>
      <Icon size={14} color={color ?? colors.accent} />
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
          {
            color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500],
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    marginTop: 12,
    marginBottom: 2,
  },

  // Student header
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  studentInitial: {
    fontSize: 20,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.accent,
  },
  studentHeaderInfo: { flex: 1 },
  studentName: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold" },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  emailText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stageLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },

  // Progress section
  progressSection: { gap: 10 },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_400Regular",
    minWidth: 36,
    textAlign: "right",
  },
  progressDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Metrics grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    justifyContent: "space-around",
  },
  metricItem: {
    alignItems: "center",
    gap: 3,
    minWidth: 60,
  },
  metricValue: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold" },
  metricLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Dispatch cards
  dispatchCard: { marginBottom: 2 },
  dispatchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dispatchInfo: { flex: 1 },
  dispatchStation: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  dispatchDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Status badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  // Lesson cards
  lessonCard: { marginBottom: 2 },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  lessonDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Quick actions
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  actionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Empty & loader
  emptySection: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loader: { paddingVertical: 12 },
});
