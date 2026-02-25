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
import { getSchoolStudents } from "@/services/tenant-api";
import { useApplyTrainingPlan } from "@/hooks/useTrainingPlans";
import type { TrainingPlan } from "@/lib/training-plans/types";
import type { UserRole } from "@/lib/auth/roles";

interface ApplyTrainingPlanModalProps {
  visible: boolean;
  plan: TrainingPlan | null;
  onClose: () => void;
  onApplied: () => void;
}

interface StudentInfo {
  uid: string;
  name: string;
  role: UserRole;
}

export function ApplyTrainingPlanModal({
  visible,
  plan,
  onClose,
  onApplied,
}: ApplyTrainingPlanModalProps) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();
  const applyMutation = useApplyTrainingPlan(tenantId);

  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(
    null
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

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

  const handleApply = async () => {
    if (!plan || !selectedStudent || !tenantId || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await applyMutation.mutateAsync({
        plan,
        studentUid: selectedStudent.uid,
        studentName: selectedStudent.name,
        instructorUid: user.uid,
        instructorName: user.displayName ?? "Instructor",
        startDate: new Date(startDate).toISOString(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (result.failed > 0) {
        Alert.alert(
          "Partial Success",
          `${result.assigned} lesson${result.assigned !== 1 ? "s" : ""} assigned, ${result.failed} failed.`
        );
      } else {
        Alert.alert(
          "Success",
          `${result.assigned} lesson${result.assigned !== 1 ? "s" : ""} assigned to ${selectedStudent.name}.`
        );
      }

      onApplied();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to apply training plan. Please try again.");
    }
  };

  const lessonCount = plan?.lessons.length ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
        <View style={[styles.header, { backgroundColor: cardBg }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Apply Training Plan
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color={subColor} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Plan Summary */}
          {plan && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.cardLabel, { color: subColor }]}>Plan</Text>
              <Text style={[styles.planTitle, { color: textColor }]}>
                {plan.title}
              </Text>
              <Text style={[styles.planMeta, { color: subColor }]}>
                {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                {plan.description ? ` · ${plan.description}` : ""}
              </Text>
            </View>
          )}

          {/* Start Date */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardRow}>
              <Calendar size={16} color={subColor} />
              <Text style={[styles.cardLabel, { color: subColor }]}>
                Start Date
              </Text>
            </View>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={subColor}
              style={[
                styles.dateInput,
                { backgroundColor: inputBg, color: textColor },
              ]}
            />
            <Text style={[styles.dateHint, { color: subColor }]}>
              Lessons will be scheduled one per day starting from this date
            </Text>
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
                              color: isSelected ? colors.accent : subColor,
                            },
                          ]}
                        >
                          {student.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[styles.studentName, { color: textColor }]}
                      >
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

        {/* Apply Button */}
        <View style={[styles.footer, { backgroundColor: cardBg }]}>
          <Pressable
            onPress={handleApply}
            disabled={!selectedStudentUid || applyMutation.isPending}
            style={[
              styles.applyBtn,
              { backgroundColor: colors.accent },
              (!selectedStudentUid || applyMutation.isPending) && {
                opacity: 0.5,
              },
            ]}
          >
            {applyMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.applyBtnText}>
                  Apply {lessonCount} Lesson{lessonCount !== 1 ? "s" : ""} to{" "}
                  {selectedStudent?.name ?? "Student"}
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
  title: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
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
  planTitle: { fontSize: 17, fontFamily: "SpaceGrotesk_700Bold" },
  planMeta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dateInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: "JetBrainsMono_400Regular",
  },
  dateHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
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
  avatarText: { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold" },
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
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
