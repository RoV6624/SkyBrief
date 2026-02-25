/**
 * Unified Training Screen
 *
 * Combines lesson management and training plan management into a single
 * screen with a segmented tab control.
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  ArrowLeft,
  Trash2,
  Edit3,
  UserPlus,
  ListChecks,
} from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { CloudCard } from "@/components/ui/CloudCard";
import {
  LessonPlanEditor,
  type LessonPlan,
} from "@/components/instructor/LessonPlanEditor";
import {
  getSchoolLessonPlans,
  saveLessonPlan,
  deleteLessonPlan,
} from "@/services/tenant-api";
import { AssignLessonModal } from "@/components/instructor/AssignLessonModal";
import { TrainingPlanBuilder } from "@/components/instructor/TrainingPlanBuilder";
import { ApplyTrainingPlanModal } from "@/components/instructor/ApplyTrainingPlanModal";
import {
  useTrainingPlans,
  useSaveTrainingPlan,
  useUpdateTrainingPlan,
  useDeleteTrainingPlan,
} from "@/hooks/useTrainingPlans";
import type { TrainingPlan as TrainingPlanType, TrainingPlanData } from "@/lib/training-plans/types";

type ActiveTab = "lessons" | "training-plans";

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  curriculum: { bg: "rgba(34,197,94,0.15)", text: "#16a34a" },
  custom: { bg: "rgba(59,130,246,0.15)", text: "#2563eb" },
  inline: { bg: "rgba(245,158,11,0.15)", text: "#d97706" },
};

export default function TrainingScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("lessons");

  // ── Lessons state ──
  const { data: lessons = [] } = useQuery({
    queryKey: ["lesson-plans", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await getSchoolLessonPlans(tenantId);
      return data.map(
        (d): LessonPlan => ({
          id: d.id,
          tenantId: d.tenantId,
          title: d.title,
          description: d.description,
          flightType: d.flightType as LessonPlan["flightType"],
          requiredChecklistItems:
            (d.requiredChecklistItems ?? []) as LessonPlan["requiredChecklistItems"],
          maxFratScore: d.maxFratScore,
          objectives: d.objectives ?? [],
          createdBy: d.createdBy,
          createdAt: d.createdAt,
        })
      );
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const [showEditor, setShowEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonPlan | undefined>();
  const [assigningLesson, setAssigningLesson] = useState<LessonPlan | null>(null);

  // ── Training plans state ──
  const { data: plans = [] } = useTrainingPlans(tenantId);
  const saveMutation = useSaveTrainingPlan(tenantId);
  const updateMutation = useUpdateTrainingPlan(tenantId);
  const deletePlanMutation = useDeleteTrainingPlan(tenantId);

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlanType | undefined>();
  const [applyingPlan, setApplyingPlan] = useState<TrainingPlanType | null>(null);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];

  // ── Lesson handlers ──
  const handleSaveLesson = useCallback(
    async (plan: Omit<LessonPlan, "id" | "createdAt">) => {
      if (!tenantId) return;

      const id = await saveLessonPlan(tenantId, {
        ...plan,
        createdAt: editingLesson?.createdAt ?? new Date().toISOString(),
      });

      if (id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["lesson-plans", tenantId] });
      } else {
        Alert.alert("Error", "Failed to save lesson plan. Please try again.");
      }

      setShowEditor(false);
      setEditingLesson(undefined);
    },
    [tenantId, editingLesson, queryClient]
  );

  const handleDeleteLesson = (id: string) => {
    Alert.alert("Delete Lesson", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!tenantId) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const ok = await deleteLessonPlan(tenantId, id);
          if (ok) {
            queryClient.invalidateQueries({ queryKey: ["lesson-plans", tenantId] });
          } else {
            Alert.alert("Error", "Failed to delete lesson.");
          }
        },
      },
    ]);
  };

  // ── Training plan handlers ──
  const handleSavePlan = useCallback(
    async (planData: TrainingPlanData) => {
      if (!tenantId) return;

      if (editingPlan) {
        const ok = await updateMutation.mutateAsync({
          planId: editingPlan.id,
          plan: planData,
        });
        if (ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Error", "Failed to update training plan.");
        }
      } else {
        const id = await saveMutation.mutateAsync(planData);
        if (id) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Error", "Failed to save training plan.");
        }
      }

      setShowBuilder(false);
      setEditingPlan(undefined);
    },
    [tenantId, editingPlan, saveMutation, updateMutation]
  );

  const handleDeletePlan = (plan: TrainingPlanType) => {
    Alert.alert(
      "Delete Training Plan",
      `Delete "${plan.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const ok = await deletePlanMutation.mutateAsync(plan.id);
            if (!ok) {
              Alert.alert("Error", "Failed to delete training plan.");
            }
          },
        },
      ]
    );
  };

  const getLessonSourceSummary = (plan: TrainingPlanType) => {
    const counts: Record<string, number> = {};
    for (const lesson of plan.lessons) {
      counts[lesson.source] = (counts[lesson.source] || 0) + 1;
    }
    return counts;
  };

  // ── Fullscreen editor / builder ──
  if (showEditor) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <LessonPlanEditor
            plan={editingLesson}
            tenantId={tenantId ?? ""}
            instructorUid={user?.uid ?? ""}
            onSave={handleSaveLesson}
            onCancel={() => {
              setShowEditor(false);
              setEditingLesson(undefined);
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  if (showBuilder) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <TrainingPlanBuilder
            plan={editingPlan}
            tenantId={tenantId ?? ""}
            instructorUid={user?.uid ?? ""}
            instructorName={user?.displayName ?? "Instructor"}
            onSave={handleSavePlan}
            onCancel={() => {
              setShowBuilder(false);
              setEditingPlan(undefined);
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft size={22} color={textColor} />
            </Pressable>
            <BookOpen size={22} color={colors.accent} />
            <Text style={[styles.title, { color: textColor }]}>Training</Text>
          </Animated.View>

          <Text style={[styles.subtitle, { color: subColor }]}>
            Create lessons and build training plans for your students
          </Text>

          {/* Segmented Control */}
          <Animated.View entering={FadeInDown.delay(30)}>
            <View
              style={[
                styles.segmentedControl,
                {
                  backgroundColor: isDark
                    ? colors.stratus[800]
                    : colors.stratus[100],
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab("lessons");
                }}
                style={[
                  styles.segmentTab,
                  activeTab === "lessons" && [
                    styles.segmentTabActive,
                    {
                      backgroundColor: isDark
                        ? colors.stratus[700]
                        : "#FFFFFF",
                    },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    {
                      color:
                        activeTab === "lessons"
                          ? textColor
                          : subColor,
                    },
                  ]}
                >
                  Lessons
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab("training-plans");
                }}
                style={[
                  styles.segmentTab,
                  activeTab === "training-plans" && [
                    styles.segmentTabActive,
                    {
                      backgroundColor: isDark
                        ? colors.stratus[700]
                        : "#FFFFFF",
                    },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    {
                      color:
                        activeTab === "training-plans"
                          ? textColor
                          : subColor,
                    },
                  ]}
                >
                  Training Plans
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Lessons Tab ── */}
          {activeTab === "lessons" && (
            <>
              <Animated.View entering={FadeInDown.delay(50)}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingLesson(undefined);
                    setShowEditor(true);
                  }}
                  style={styles.addBtn}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>New Lesson</Text>
                </Pressable>
              </Animated.View>

              {lessons.length > 0 ? (
                lessons.map((lesson, idx) => (
                  <Animated.View
                    key={lesson.id}
                    entering={FadeInDown.delay(100 + idx * 50)}
                  >
                    <CloudCard>
                      <View style={styles.lessonCard}>
                        <View style={styles.lessonHeader}>
                          <Text
                            style={[styles.lessonTitle, { color: textColor }]}
                          >
                            {lesson.title}
                          </Text>
                          <View
                            style={[
                              styles.typeBadge,
                              {
                                backgroundColor: isDark
                                  ? colors.stratus[700]
                                  : colors.stratus[100],
                              },
                            ]}
                          >
                            <Text style={[styles.typeText, { color: subColor }]}>
                              {lesson.flightType.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {lesson.description ? (
                          <Text
                            style={[styles.lessonDesc, { color: subColor }]}
                            numberOfLines={2}
                          >
                            {lesson.description}
                          </Text>
                        ) : null}

                        <Text style={[styles.lessonMeta, { color: subColor }]}>
                          {lesson.requiredChecklistItems.length} required items
                          {" · "}Max FRAT: {lesson.maxFratScore}
                          {lesson.objectives.length > 0
                            ? ` · ${lesson.objectives.length} objectives`
                            : ""}
                        </Text>

                        <View style={styles.lessonActions}>
                          <Pressable
                            onPress={() => {
                              Haptics.selectionAsync();
                              setAssigningLesson(lesson);
                            }}
                            style={styles.actionBtn}
                          >
                            <UserPlus size={14} color={colors.vfr} />
                            <Text
                              style={[
                                styles.actionText,
                                { color: colors.vfr },
                              ]}
                            >
                              Assign
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              Haptics.selectionAsync();
                              setEditingLesson(lesson);
                              setShowEditor(true);
                            }}
                            style={styles.actionBtn}
                          >
                            <Edit3 size={14} color={colors.accent} />
                            <Text
                              style={[
                                styles.actionText,
                                { color: colors.accent },
                              ]}
                            >
                              Edit
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteLesson(lesson.id)}
                            style={styles.actionBtn}
                          >
                            <Trash2 size={14} color={colors.alert.red} />
                            <Text
                              style={[
                                styles.actionText,
                                { color: colors.alert.red },
                              ]}
                            >
                              Delete
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </CloudCard>
                  </Animated.View>
                ))
              ) : (
                <Animated.View
                  entering={FadeInDown.delay(100)}
                  style={styles.emptyState}
                >
                  <BookOpen
                    size={40}
                    color={
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <Text style={[styles.emptyTitle, { color: subColor }]}>
                    No lessons yet
                  </Text>
                  <Text style={[styles.emptySub, { color: subColor }]}>
                    Create lessons to standardize briefing requirements for your
                    students
                  </Text>
                </Animated.View>
              )}
            </>
          )}

          {/* ── Training Plans Tab ── */}
          {activeTab === "training-plans" && (
            <>
              <Animated.View entering={FadeInDown.delay(50)}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingPlan(undefined);
                    setShowBuilder(true);
                  }}
                  style={styles.addBtn}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>New Training Plan</Text>
                </Pressable>
              </Animated.View>

              {plans.length > 0 ? (
                plans.map((plan, idx) => {
                  const sourceCounts = getLessonSourceSummary(plan);
                  return (
                    <Animated.View
                      key={plan.id}
                      entering={FadeInDown.delay(100 + idx * 50)}
                    >
                      <CloudCard>
                        <View style={styles.planCard}>
                          <View style={styles.planHeader}>
                            <Text
                              style={[
                                styles.planTitle,
                                { color: textColor },
                              ]}
                              numberOfLines={1}
                            >
                              {plan.title}
                            </Text>
                            <View
                              style={[
                                styles.countBadge,
                                {
                                  backgroundColor: isDark
                                    ? colors.stratus[700]
                                    : colors.stratus[100],
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.countText,
                                  { color: subColor },
                                ]}
                              >
                                {plan.lessons.length} lessons
                              </Text>
                            </View>
                          </View>

                          {plan.description ? (
                            <Text
                              style={[styles.planDesc, { color: subColor }]}
                              numberOfLines={2}
                            >
                              {plan.description}
                            </Text>
                          ) : null}

                          {/* Source badges */}
                          <View style={styles.sourceBadgeRow}>
                            {Object.entries(sourceCounts).map(
                              ([source, count]) => {
                                const sc =
                                  SOURCE_COLORS[source] ?? SOURCE_COLORS.inline;
                                return (
                                  <View
                                    key={source}
                                    style={[
                                      styles.sourceBadge,
                                      { backgroundColor: sc.bg },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.sourceBadgeText,
                                        { color: sc.text },
                                      ]}
                                    >
                                      {count} {source.toUpperCase()}
                                    </Text>
                                  </View>
                                );
                              }
                            )}
                          </View>

                          <View style={styles.planActions}>
                            <Pressable
                              onPress={() => {
                                Haptics.selectionAsync();
                                setApplyingPlan(plan);
                              }}
                              style={styles.actionBtn}
                            >
                              <UserPlus size={14} color={colors.vfr} />
                              <Text
                                style={[
                                  styles.actionText,
                                  { color: colors.vfr },
                                ]}
                              >
                                Apply
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                Haptics.selectionAsync();
                                setEditingPlan(plan);
                                setShowBuilder(true);
                              }}
                              style={styles.actionBtn}
                            >
                              <Edit3 size={14} color={colors.accent} />
                              <Text
                                style={[
                                  styles.actionText,
                                  { color: colors.accent },
                                ]}
                              >
                                Edit
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeletePlan(plan)}
                              style={styles.actionBtn}
                            >
                              <Trash2 size={14} color={colors.alert.red} />
                              <Text
                                style={[
                                  styles.actionText,
                                  { color: colors.alert.red },
                                ]}
                              >
                                Delete
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </CloudCard>
                    </Animated.View>
                  );
                })
              ) : (
                <Animated.View
                  entering={FadeInDown.delay(100)}
                  style={styles.emptyState}
                >
                  <ListChecks
                    size={40}
                    color={
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <Text style={[styles.emptyTitle, { color: subColor }]}>
                    No training plans yet
                  </Text>
                  <Text style={[styles.emptySub, { color: subColor }]}>
                    Create a training plan to build personalized programs for
                    your students
                  </Text>
                </Animated.View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      <AssignLessonModal
        visible={!!assigningLesson}
        lesson={assigningLesson}
        onClose={() => setAssigningLesson(null)}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ["lesson-plans", tenantId] });
        }}
      />

      <ApplyTrainingPlanModal
        visible={!!applyingPlan}
        plan={applyingPlan}
        onClose={() => setApplyingPlan(null)}
        onApplied={() => {
          queryClient.invalidateQueries({
            queryKey: ["training-plans", tenantId],
          });
        }}
      />
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
    alignSelf: "center" as const,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
    lineHeight: 19,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },

  // Shared
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 19,
  },

  // Lesson styles
  lessonCard: { padding: 14, gap: 8 },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lessonTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.5,
  },
  lessonDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  lessonMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  lessonActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },

  // Training plan styles
  planCard: { padding: 14, gap: 8 },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.5,
  },
  planDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  sourceBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  planActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
});
