import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { GraduationCap, School } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useUserStore } from "@/stores/user-store";
import { useSceneStore } from "@/stores/scene-store";
import { useStudentLessons, useInstructorLessons, useLessonFeedback } from "@/hooks/useStudentLessons";
import { LessonCard } from "@/components/lessons/LessonCard";
import { LessonFeedbackForm } from "@/components/lessons/LessonFeedbackForm";
import { isInstructorRole } from "@/lib/auth/roles";
import { JoinSchoolModal } from "@/components/instructor/JoinSchoolModal";
import type { AssignedLesson, StruggleArea } from "@/lib/lessons/types";

export default function LessonsScreen() {
  const { isDark } = useTheme();
  const { user, role } = useAuthStore();
  const { tenantId, isSchoolMode } = useTenantStore();
  const { experienceLevel } = useUserStore();
  const { scene } = useSceneStore();

  // Determine mode
  const isInstructor = !!(role && isInstructorRole(role) && isSchoolMode);
  const isStudent = experienceLevel === "student" && isSchoolMode;
  const isSolo = !isSchoolMode;

  const studentQuery = useStudentLessons(
    isStudent ? user?.uid : undefined,
    isStudent ? tenantId : null
  );

  const instructorQuery = useInstructorLessons(
    isInstructor ? user?.uid : undefined,
    isInstructor ? tenantId : null
  );

  const lessons = isInstructor
    ? (instructorQuery.data ?? [])
    : isStudent
      ? (studentQuery.data ?? [])
      : [];

  const isLoading = isInstructor ? instructorQuery.isLoading : isStudent ? studentQuery.isLoading : false;
  const refetch = isInstructor ? instructorQuery.refetch : isStudent ? studentQuery.refetch : () => {};

  const feedbackMutation = useLessonFeedback(tenantId);

  const [feedbackLesson, setFeedbackLesson] = useState<AssignedLesson | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const textColor = isDark ? "#FFFFFF" : "#1a1a2e";
  const subColor = isDark ? colors.stratus[400] : "#334155";

  const cardMode = isInstructor ? "instructor" : "student";

  const upcoming = lessons
    .filter((l) => l.status === "upcoming")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const completed = lessons
    .filter((l) => l.status === "completed")
    .sort((a, b) => (b.completedDate ?? b.scheduledDate).localeCompare(a.completedDate ?? a.scheduledDate));

  const handleFeedbackSubmit = useCallback(
    async (data: {
      text: string;
      areasOfStruggle?: StruggleArea[];
    }) => {
      if (!feedbackLesson) return;
      await feedbackMutation.mutateAsync({
        lessonId: feedbackLesson.id,
        feedback: {
          text: data.text,
          areasOfStruggle: data.areasOfStruggle ?? [],
          submittedAt: new Date().toISOString(),
        },
        feedbackType: isInstructor ? "instructorFeedback" : "studentFeedback",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFeedbackLesson(null);
    },
    [feedbackLesson, feedbackMutation, isInstructor]
  );

  // Dynamic header
  const headerTitle = isInstructor
    ? "Teaching Schedule"
    : isStudent
      ? "My Lessons"
      : "Lessons";

  // Dynamic empty state
  const emptyTitle = isSolo
    ? "No lessons yet"
    : isStudent
      ? "No lessons assigned yet"
      : "No lessons scheduled";

  const emptySub = isSolo
    ? "Join a flight school to see lessons here"
    : isStudent
      ? "Your instructor will assign lessons once you're set up"
      : "No lessons scheduled. Assign lessons from the Instructor Dashboard.";

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={textColor}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.headerRow}>
            <GraduationCap size={22} color={colors.accent} />
            <Text style={[styles.title, { color: textColor }, !isDark && styles.lightTextShadow]}>{headerTitle}</Text>
          </Animated.View>

          {/* Feedback Form Modal */}
          {feedbackLesson && (
            <Animated.View entering={FadeInDown}>
              <LessonFeedbackForm
                mode={cardMode}
                loading={feedbackMutation.isPending}
                onSubmit={handleFeedbackSubmit}
                onCancel={() => setFeedbackLesson(null)}
              />
            </Animated.View>
          )}

          {/* Upcoming Section */}
          {upcoming.length > 0 && (
            <>
              <Animated.View entering={FadeInDown.delay(50)}>
                <Text style={[styles.sectionTitle, { color: subColor }, !isDark && styles.lightTextShadow]}>
                  Upcoming
                </Text>
              </Animated.View>
              {upcoming.map((lesson, idx) => (
                <Animated.View
                  key={lesson.id}
                  entering={FadeInDown.delay(100 + idx * 50)}
                >
                  <LessonCard
                    lesson={lesson}
                    mode={cardMode}
                  />
                </Animated.View>
              ))}
            </>
          )}

          {/* Completed Section */}
          {completed.length > 0 && (
            <>
              <Animated.View entering={FadeInDown.delay(150)}>
                <Text style={[styles.sectionTitle, { color: subColor }, !isDark && styles.lightTextShadow]}>
                  Completed
                </Text>
              </Animated.View>
              {completed.map((lesson, idx) => (
                <Animated.View
                  key={lesson.id}
                  entering={FadeInDown.delay(200 + idx * 50)}
                >
                  <LessonCard
                    lesson={lesson}
                    mode={cardMode}
                    onFeedback={(l) => setFeedbackLesson(l)}
                  />
                </Animated.View>
              ))}
            </>
          )}

          {/* Empty State */}
          {lessons.length === 0 && !isLoading && (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <GraduationCap
                size={48}
                color={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}
              />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                {emptyTitle}
              </Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                {emptySub}
              </Text>
              {isSolo && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowJoinModal(true);
                  }}
                  style={styles.joinSchoolBtn}
                >
                  <School size={16} color="#FFFFFF" />
                  <Text style={styles.joinSchoolBtnText}>Join Flight School</Text>
                </Pressable>
              )}
            </Animated.View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      <JoinSchoolModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
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
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  lightTextShadow: {
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  joinSchoolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D4A853",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 6,
  },
  joinSchoolBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
