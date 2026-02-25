/**
 * Modal for assigning a curriculum lesson to a student.
 *
 * Shows lesson details pre-filled from the curriculum, a student picker,
 * a date input, and an "Assign" button that creates an AssignedLesson
 * via the tenant API.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  X,
  Check,
  Calendar,
  User,
  Send,
  Target,
  BookOpen,
} from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useSchoolStudents } from "@/hooks/useStudentMetrics";
import { assignLesson } from "@/services/tenant-api";
import type { CurriculumLesson } from "@/lib/curriculum/types";
import type { FlightType } from "@/lib/briefing/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onClose: () => void;
  lesson: CurriculumLesson | null;
  curriculumTitle: string;
}

// ---------------------------------------------------------------------------
// Flight type badge colors (duplicated here to keep modal self-contained)
// ---------------------------------------------------------------------------

const FLIGHT_TYPE_COLORS: Record<FlightType, string> = {
  local: colors.stratus[500],
  xc: colors.alert.amber,
  night: "#8b5cf6",
  instrument: colors.mvfr,
  checkride: colors.alert.green,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssignCurriculumLessonModal({
  visible,
  onClose,
  lesson,
  curriculumTitle,
}: Props) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const { data: students = [], isLoading: loadingStudents } =
    useSchoolStudents(visible ? tenantId : null);

  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(
    null
  );
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens with a new lesson
  useEffect(() => {
    if (visible) {
      setSelectedStudentUid(null);
      setScheduledDate(new Date().toISOString().split("T")[0]);
    }
  }, [visible, lesson?.id]);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const sub = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : "#FFFFFF";
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[50];

  const selectedStudent = students.find((s) => s.uid === selectedStudentUid);
  const badgeColor =
    FLIGHT_TYPE_COLORS[lesson?.flightType ?? "local"] ?? colors.stratus[500];

  const handleAssign = async () => {
    if (!lesson || !selectedStudent || !tenantId || !user) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const id = await assignLesson(tenantId, {
      lessonPlanId: lesson.id,
      tenantId,
      studentUid: selectedStudent.uid,
      studentName: selectedStudent.name,
      instructorUid: user.uid,
      instructorName: user.displayName ?? "Instructor",
      scheduledDate: new Date(scheduledDate).toISOString(),
      completedDate: null,
      status: "upcoming",
      studentFeedback: null,
      instructorFeedback: null,
      lessonTitle: lesson.title,
      lessonDescription: lesson.description,
      flightType: lesson.flightType,
      objectives: lesson.objectives,
      createdAt: new Date().toISOString(),
    });

    setSaving(false);

    if (id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Assigned!", "Lesson assigned to student.");
      onClose();
    } else {
      Alert.alert("Error", "Failed to assign lesson. Please try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? colors.stratus[900]
              : colors.stratus[50],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Assign Curriculum Lesson
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color={sub} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Lesson info */}
          {lesson && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <View style={styles.cardRow}>
                <BookOpen size={14} color={colors.accent} />
                <Text style={[styles.cardLabel, { color: sub }]}>
                  {curriculumTitle}
                </Text>
              </View>
              <Text style={[styles.lessonTitle, { color: textColor }]}>
                {lesson.id}: {lesson.title}
              </Text>
              <View style={styles.lessonMetaRow}>
                <View
                  style={[styles.typeBadge, { backgroundColor: badgeColor + "20" }]}
                >
                  <Text style={[styles.typeBadgeText, { color: badgeColor }]}>
                    {lesson.flightType.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.hoursText, { color: sub }]}>
                  {lesson.dualHours > 0 ? `${lesson.dualHours}h dual` : ""}
                  {lesson.dualHours > 0 && lesson.soloHours > 0 ? " · " : ""}
                  {lesson.soloHours > 0 ? `${lesson.soloHours}h solo` : ""}
                  {(lesson.dualHours > 0 || lesson.soloHours > 0) &&
                  lesson.groundHours > 0
                    ? " · "
                    : ""}
                  {lesson.groundHours > 0
                    ? `${lesson.groundHours}h ground`
                    : ""}
                </Text>
              </View>

              {/* Objectives preview */}
              <View style={styles.objectivesBlock}>
                <View style={styles.cardRow}>
                  <Target size={12} color={sub} />
                  <Text style={[styles.cardLabel, { color: sub }]}>
                    Objectives
                  </Text>
                </View>
                {lesson.objectives.map((obj, i) => (
                  <Text key={i} style={[styles.objectiveText, { color: sub }]}>
                    {"\u2022"} {obj}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Date picker */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardRow}>
              <Calendar size={16} color={sub} />
              <Text style={[styles.cardLabel, { color: sub }]}>
                Scheduled Date
              </Text>
            </View>
            <TextInput
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={sub}
              style={[
                styles.dateInput,
                { backgroundColor: inputBg, color: textColor },
              ]}
            />
          </View>

          {/* Student list */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardRow}>
              <User size={16} color={sub} />
              <Text style={[styles.cardLabel, { color: sub }]}>
                Select Student
              </Text>
            </View>

            {loadingStudents ? (
              <ActivityIndicator color={sub} style={{ padding: 20 }} />
            ) : students.length === 0 ? (
              <Text style={[styles.emptyText, { color: sub }]}>
                No students found at this school
              </Text>
            ) : (
              <View style={styles.studentList}>
                {students.map((student) => {
                  const isSelected = selectedStudentUid === student.uid;
                  return (
                    <Pressable
                      key={student.uid}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedStudentUid(student.uid);
                      }}
                      style={[
                        styles.studentRow,
                        {
                          backgroundColor: isSelected
                            ? colors.accent + "15"
                            : "transparent",
                          borderColor: isSelected
                            ? colors.accent
                            : isDark
                              ? colors.stratus[700]
                              : colors.stratus[200],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.avatar,
                          isSelected && {
                            backgroundColor: colors.accent + "30",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarText,
                            {
                              color: isSelected ? colors.accent : sub,
                            },
                          ]}
                        >
                          {student.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.studentName, { color: textColor }]}>
                        {student.name}
                      </Text>
                      {isSelected && (
                        <Check
                          size={16}
                          color={colors.accent}
                          strokeWidth={3}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: cardBg }]}>
          <Pressable
            onPress={handleAssign}
            disabled={!selectedStudentUid || saving}
            style={[
              styles.assignBtn,
              { backgroundColor: colors.accent },
              (!selectedStudentUid || saving) && { opacity: 0.5 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.assignBtnText}>
                  Assign to {selectedStudent?.name ?? "Student"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  title: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lessonTitle: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  lessonMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_400Regular",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  hoursText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_400Regular",
  },
  objectivesBlock: {
    gap: 4,
    marginTop: 4,
  },
  objectiveText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    paddingLeft: 4,
  },
  dateInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "JetBrainsMono_400Regular",
  },
  studentList: { gap: 6 },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(128,128,128,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  studentName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    padding: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  assignBtnText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
