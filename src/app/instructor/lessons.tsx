/**
 * Instructor Lesson Plans Screen
 *
 * CFIs can create and manage lesson plans that auto-configure
 * briefing templates for their students.
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
import {
  BookOpen,
  Plus,
  ArrowLeft,
  Trash2,
  Edit3,
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

// Local state for lesson plans (would sync with Firestore in production)
const SAMPLE_LESSONS: LessonPlan[] = [];

export default function InstructorLessonsScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const [lessons, setLessons] = useState<LessonPlan[]>(SAMPLE_LESSONS);
  const [showEditor, setShowEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonPlan | undefined>();

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];

  const handleSave = useCallback(
    (plan: Omit<LessonPlan, "id" | "createdAt">) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (editingLesson) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === editingLesson.id
              ? { ...plan, id: l.id, createdAt: l.createdAt }
              : l
          )
        );
      } else {
        const newLesson: LessonPlan = {
          ...plan,
          id: `LP-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
        };
        setLessons((prev) => [...prev, newLesson]);
      }

      setShowEditor(false);
      setEditingLesson(undefined);
    },
    [editingLesson]
  );

  const handleDelete = (id: string) => {
    Alert.alert("Delete Lesson Plan", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setLessons((prev) => prev.filter((l) => l.id !== id));
        },
      },
    ]);
  };

  if (showEditor) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <LessonPlanEditor
            plan={editingLesson}
            tenantId={tenantId ?? ""}
            instructorUid={user?.uid ?? ""}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingLesson(undefined);
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
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
            >
              <ArrowLeft size={22} color={textColor} />
            </Pressable>
            <BookOpen size={22} color={colors.accent} />
            <Text style={[styles.title, { color: textColor }]}>
              Lesson Plans
            </Text>
          </Animated.View>

          <Text style={[styles.subtitle, { color: subColor }]}>
            Create lesson plans that auto-configure briefing requirements for students
          </Text>

          {/* Add Button */}
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
              <Text style={styles.addBtnText}>New Lesson Plan</Text>
            </Pressable>
          </Animated.View>

          {/* Lesson List */}
          {lessons.length > 0 ? (
            lessons.map((lesson, idx) => (
              <Animated.View
                key={lesson.id}
                entering={FadeInDown.delay(100 + idx * 50)}
              >
                <CloudCard>
                  <View style={styles.lessonCard}>
                    <View style={styles.lessonHeader}>
                      <Text style={[styles.lessonTitle, { color: textColor }]}>
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
                          setEditingLesson(lesson);
                          setShowEditor(true);
                        }}
                        style={styles.actionBtn}
                      >
                        <Edit3 size={14} color={colors.accent} />
                        <Text style={[styles.actionText, { color: colors.accent }]}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(lesson.id)}
                        style={styles.actionBtn}
                      >
                        <Trash2 size={14} color={colors.alert.red} />
                        <Text style={[styles.actionText, { color: colors.alert.red }]}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </CloudCard>
              </Animated.View>
            ))
          ) : (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <BookOpen
                size={40}
                color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
              />
              <Text style={[styles.emptyTitle, { color: subColor }]}>
                No lesson plans yet
              </Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Create lesson plans to standardize briefing requirements for your students
              </Text>
            </Animated.View>
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
  },
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
  lessonCard: { padding: 14, gap: 8 },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lessonTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", flex: 1 },
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
  lessonDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  lessonMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  lessonActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
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
});
