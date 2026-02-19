/**
 * Instructor Scheduling Screen
 *
 * Manage student-CFI assignments and lesson scheduling.
 */

import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Calendar,
  ArrowLeft,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useSchedulingStore, type LessonSlot } from "@/stores/scheduling-store";
import { CloudCard } from "@/components/ui/CloudCard";

export default function InstructorSchedulingScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const uid = user?.uid ?? "";

  const {
    getUpcomingLessons,
    getTodayLessons,
    getAssignedStudents,
    addLesson,
    cancelLesson,
    updateLesson,
  } = useSchedulingStore();

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : colors.stratus[50];
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  const todayLessons = getTodayLessons(uid);
  const upcomingLessons = getUpcomingLessons(uid);
  const assignedStudents = getAssignedStudents(uid);

  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newStudent, setNewStudent] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const handleAddLesson = useCallback(() => {
    if (!newDate || !newStart || !newStudent) {
      Alert.alert("Missing Info", "Fill in date, time, and student name.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addLesson({
      date: newDate,
      startTime: newStart,
      endTime: newEnd || newStart,
      studentUid: newStudent.toLowerCase().replace(/\s/g, ""),
      studentName: newStudent,
      instructorUid: uid,
      instructorName: user?.displayName ?? "Instructor",
      lessonTitle: newTitle || undefined,
    });

    setShowAdd(false);
    setNewDate("");
    setNewStart("");
    setNewEnd("");
    setNewStudent("");
    setNewTitle("");
  }, [newDate, newStart, newEnd, newStudent, newTitle, uid, user, addLesson]);

  const handleCancel = (id: string) => {
    Alert.alert("Cancel Lesson", "Cancel this scheduled lesson?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Lesson",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          cancelLesson(id);
        },
      },
    ]);
  };

  const handleComplete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateLesson(id, { status: "completed" });
  };

  const LessonCard = ({ lesson }: { lesson: LessonSlot }) => (
    <CloudCard>
      <View style={styles.lessonCard}>
        <View style={styles.lessonTop}>
          <View>
            <Text style={[styles.lessonDate, { color: textColor }]}>
              {lesson.date}
            </Text>
            <Text style={[styles.lessonTime, { color: subColor }]}>
              {lesson.startTime} — {lesson.endTime}
            </Text>
          </View>
          {lesson.briefingCompleted && (
            <View style={styles.briefedBadge}>
              <CheckCircle2 size={12} color="#FFFFFF" />
              <Text style={styles.briefedText}>Briefed</Text>
            </View>
          )}
        </View>

        <View style={styles.lessonInfo}>
          <User size={14} color={subColor} />
          <Text style={[styles.studentName, { color: textColor }]}>
            {lesson.studentName}
          </Text>
        </View>

        {lesson.lessonTitle && (
          <Text style={[styles.lessonTitle, { color: subColor }]}>
            {lesson.lessonTitle}
          </Text>
        )}

        <View style={styles.lessonActions}>
          <Pressable
            onPress={() => handleComplete(lesson.id)}
            style={[styles.actionChip, { backgroundColor: colors.alert.green }]}
          >
            <CheckCircle2 size={12} color="#FFFFFF" />
            <Text style={styles.actionChipText}>Complete</Text>
          </Pressable>
          <Pressable
            onPress={() => handleCancel(lesson.id)}
            style={[styles.actionChip, { backgroundColor: colors.alert.red }]}
          >
            <XCircle size={12} color="#FFFFFF" />
            <Text style={styles.actionChipText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </CloudCard>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft size={22} color={textColor} />
            </Pressable>
            <Calendar size={22} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Schedule
            </Text>
          </Animated.View>

          {/* Add Lesson Button */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowAdd(!showAdd);
              }}
              style={styles.addBtn}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Schedule Lesson</Text>
            </Pressable>
          </Animated.View>

          {/* Add Form */}
          {showAdd && (
            <Animated.View entering={FadeInDown}>
              <CloudCard style={styles.addForm}>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? colors.stratus[700] : colors.stratus[100] }]}
                  value={newDate}
                  onChangeText={setNewDate}
                  placeholder="Date (YYYY-MM-DD)"
                  placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
                />
                <View style={styles.timeRow}>
                  <TextInput
                    style={[styles.input, styles.timeInput, { color: textColor, backgroundColor: isDark ? colors.stratus[700] : colors.stratus[100] }]}
                    value={newStart}
                    onChangeText={setNewStart}
                    placeholder="Start (HH:MM)"
                    placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
                  />
                  <TextInput
                    style={[styles.input, styles.timeInput, { color: textColor, backgroundColor: isDark ? colors.stratus[700] : colors.stratus[100] }]}
                    value={newEnd}
                    onChangeText={setNewEnd}
                    placeholder="End (HH:MM)"
                    placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
                  />
                </View>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? colors.stratus[700] : colors.stratus[100] }]}
                  value={newStudent}
                  onChangeText={setNewStudent}
                  placeholder="Student name"
                  placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
                />
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? colors.stratus[700] : colors.stratus[100] }]}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Lesson title (optional)"
                  placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
                />
                <Pressable onPress={handleAddLesson} style={styles.confirmBtn}>
                  <Text style={styles.confirmText}>Add to Schedule</Text>
                </Pressable>
              </CloudCard>
            </Animated.View>
          )}

          {/* Today's Lessons */}
          {todayLessons.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: subColor }]}>
                TODAY
              </Text>
              {todayLessons.map((lesson, idx) => (
                <Animated.View
                  key={lesson.id}
                  entering={FadeInDown.delay(100 + idx * 50)}
                >
                  <LessonCard lesson={lesson} />
                </Animated.View>
              ))}
            </>
          )}

          {/* Upcoming */}
          {upcomingLessons.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: subColor }]}>
                UPCOMING
              </Text>
              {upcomingLessons.slice(0, 10).map((lesson, idx) => (
                <Animated.View
                  key={lesson.id}
                  entering={FadeInDown.delay(150 + idx * 50)}
                >
                  <LessonCard lesson={lesson} />
                </Animated.View>
              ))}
            </>
          )}

          {/* Empty State */}
          {todayLessons.length === 0 && upcomingLessons.length === 0 && !showAdd && (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <Calendar
                size={40}
                color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
              />
              <Text style={[styles.emptyTitle, { color: subColor }]}>
                No scheduled lessons
              </Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Schedule lessons with your students to track briefing completion
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
  headerTitle: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
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
  addForm: { padding: 14, gap: 10 },
  input: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 10,
    borderRadius: 8,
  },
  timeRow: { flexDirection: "row", gap: 10 },
  timeInput: { flex: 1 },
  confirmBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 1,
    marginTop: 4,
  },
  lessonCard: { padding: 14, gap: 8 },
  lessonTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  lessonDate: { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold" },
  lessonTime: { fontSize: 13, fontFamily: "JetBrainsMono_500Medium" },
  briefedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.alert.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  briefedText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  lessonInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  studentName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  lessonTitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lessonActions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionChipText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
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
