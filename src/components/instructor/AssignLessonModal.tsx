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
import { X, Check, Calendar, User, Send } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { getSchoolStudents, assignLesson } from "@/services/tenant-api";
import type { LessonPlan } from "@/components/instructor/LessonPlanEditor";
import type { UserRole } from "@/lib/auth/roles";

interface AssignLessonModalProps {
  visible: boolean;
  lesson: LessonPlan | null;
  onClose: () => void;
  onAssigned: () => void;
}

interface StudentInfo {
  uid: string;
  name: string;
  role: UserRole;
}

export function AssignLessonModal({
  visible,
  lesson,
  onClose,
  onAssigned,
}: AssignLessonModalProps) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { tenantId, tenantConfig } = useTenantStore();

  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : "#FFFFFF";
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[50];

  useEffect(() => {
    if (visible && tenantId) {
      setLoading(true);
      getSchoolStudents(tenantId).then((data) => {
        setStudents(data);
        setLoading(false);
      });
    }
  }, [visible, tenantId]);

  const selectedStudent = students.find((s) => s.uid === selectedStudentUid);

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
      flightType: lesson.flightType as any,
      objectives: lesson.objectives,
      createdAt: new Date().toISOString(),
    });

    setSaving(false);

    if (id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAssigned();
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
    >
      <View style={[styles.container, { backgroundColor: isDark ? colors.stratus[900] : colors.stratus[50] }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg }]}>
          <Text style={[styles.title, { color: textColor }]}>Assign Lesson</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color={subColor} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Lesson Info */}
          {lesson && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.cardLabel, { color: subColor }]}>Lesson</Text>
              <Text style={[styles.lessonTitle, { color: textColor }]}>
                {lesson.title}
              </Text>
              <Text style={[styles.lessonMeta, { color: subColor }]}>
                {lesson.flightType.toUpperCase()} · {lesson.objectives.length} objectives
              </Text>
            </View>
          )}

          {/* Date Picker */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardRow}>
              <Calendar size={16} color={subColor} />
              <Text style={[styles.cardLabel, { color: subColor }]}>
                Scheduled Date
              </Text>
            </View>
            <TextInput
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={subColor}
              style={[styles.dateInput, { backgroundColor: inputBg, color: textColor }]}
            />
          </View>

          {/* Student List */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardRow}>
              <User size={16} color={subColor} />
              <Text style={[styles.cardLabel, { color: subColor }]}>
                Select Student
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color={subColor} style={{ padding: 20 }} />
            ) : students.length === 0 ? (
              <Text style={[styles.emptyText, { color: subColor }]}>
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
                      <View style={[styles.avatar, isSelected && { backgroundColor: colors.accent + "30" }]}>
                        <Text style={[styles.avatarText, { color: isSelected ? colors.accent : subColor }]}>
                          {student.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.studentName, { color: textColor }]}>
                        {student.name}
                      </Text>
                      {isSelected && (
                        <Check size={16} color={colors.accent} strokeWidth={3} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Assign Button */}
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
  lessonMeta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
