import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  GraduationCap,
  BookOpen,
  PenLine,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type {
  TrainingPlan,
  TrainingPlanLesson,
  TrainingPlanData,
} from "@/lib/training-plans/types";
import { CurriculumLessonPicker } from "./CurriculumLessonPicker";
import { CustomLessonPicker } from "./CustomLessonPicker";
import { InlineLessonEditor } from "./InlineLessonEditor";

interface TrainingPlanBuilderProps {
  plan?: TrainingPlan;
  tenantId: string;
  instructorUid: string;
  instructorName: string;
  onSave: (plan: TrainingPlanData) => void;
  onCancel: () => void;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  curriculum: { bg: "rgba(34,197,94,0.15)", text: "#16a34a" },
  custom: { bg: "rgba(59,130,246,0.15)", text: "#2563eb" },
  inline: { bg: "rgba(245,158,11,0.15)", text: "#d97706" },
};

const SOURCE_LABELS: Record<string, string> = {
  curriculum: "CURRICULUM",
  custom: "CUSTOM",
  inline: "INLINE",
};

export function TrainingPlanBuilder({
  plan,
  tenantId,
  instructorUid,
  instructorName,
  onSave,
  onCancel,
}: TrainingPlanBuilderProps) {
  const { isDark } = useTheme();

  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [lessons, setLessons] = useState<TrainingPlanLesson[]>(
    plan?.lessons ?? []
  );

  const [showCurriculumPicker, setShowCurriculumPicker] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[100];
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];
  const cardBg = isDark ? colors.stratus[800] : colors.stratus[50];

  const reorder = (updated: TrainingPlanLesson[]) =>
    updated.map((l, i) => ({ ...l, order: i }));

  const handleAddCurriculumLessons = (newLessons: TrainingPlanLesson[]) => {
    setLessons((prev) => reorder([...prev, ...newLessons]));
  };

  const handleAddCustomLessons = (newLessons: TrainingPlanLesson[]) => {
    setLessons((prev) => reorder([...prev, ...newLessons]));
  };

  const handleAddInlineLesson = (lesson: TrainingPlanLesson) => {
    setLessons((prev) => reorder([...prev, lesson]));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    Haptics.selectionAsync();
    const updated = [...lessons];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setLessons(reorder(updated));
  };

  const moveDown = (index: number) => {
    if (index === lessons.length - 1) return;
    Haptics.selectionAsync();
    const updated = [...lessons];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setLessons(reorder(updated));
  };

  const removeLesson = (index: number) => {
    Haptics.selectionAsync();
    setLessons((prev) => reorder(prev.filter((_, i) => i !== index)));
  };

  const existingCurriculumIds = new Set(
    lessons
      .filter((l) => l.source === "curriculum" && l.sourceId)
      .map((l) => l.sourceId!)
  );

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a training plan title.");
      return;
    }
    if (lessons.length === 0) {
      Alert.alert("No Lessons", "Add at least one lesson to the training plan.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      tenantId,
      title: title.trim(),
      description: description.trim(),
      lessons: reorder(lessons),
      createdBy: plan?.createdBy ?? instructorUid,
      createdByName: plan?.createdByName ?? instructorName,
      createdAt: plan?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: subColor }]}>
          PLAN DETAILS
        </Text>

        <TextInput
          style={[
            styles.inputLarge,
            { color: textColor, backgroundColor: inputBg },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="Training plan title"
          placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
        />

        <TextInput
          style={[
            styles.inputMulti,
            { color: textColor, backgroundColor: inputBg },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Plan description..."
          placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
          multiline
          numberOfLines={3}
        />

        {/* Lessons List */}
        <Text style={[styles.sectionTitle, { color: subColor }]}>
          LESSONS ({lessons.length})
        </Text>

        {lessons.length === 0 ? (
          <View style={styles.emptyLessons}>
            <Text style={[styles.emptyText, { color: subColor }]}>
              No lessons added yet. Use the buttons below to add lessons.
            </Text>
          </View>
        ) : (
          lessons.map((lesson, idx) => {
            const sourceStyle = SOURCE_COLORS[lesson.source] ?? SOURCE_COLORS.inline;
            return (
              <View
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  { backgroundColor: cardBg, borderColor },
                ]}
              >
                <View style={styles.lessonTop}>
                  {/* Number circle */}
                  <View style={[styles.numberCircle, { borderColor: subColor }]}>
                    <Text style={[styles.numberText, { color: textColor }]}>
                      {idx + 1}
                    </Text>
                  </View>

                  <View style={styles.lessonContent}>
                    <View style={styles.lessonTitleRow}>
                      <Text
                        style={[styles.lessonTitle, { color: textColor }]}
                        numberOfLines={1}
                      >
                        {lesson.title}
                      </Text>
                      <View
                        style={[
                          styles.sourceBadge,
                          { backgroundColor: sourceStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sourceBadgeText,
                            { color: sourceStyle.text },
                          ]}
                        >
                          {SOURCE_LABELS[lesson.source]}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.lessonMeta, { color: subColor }]}>
                      {lesson.flightType.toUpperCase()} ·{" "}
                      {lesson.objectives.length} objectives
                    </Text>
                  </View>
                </View>

                <View style={styles.lessonActions}>
                  <Pressable
                    onPress={() => moveUp(idx)}
                    disabled={idx === 0}
                    style={[styles.iconBtn, idx === 0 && { opacity: 0.3 }]}
                    hitSlop={8}
                  >
                    <ChevronUp size={16} color={subColor} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveDown(idx)}
                    disabled={idx === lessons.length - 1}
                    style={[
                      styles.iconBtn,
                      idx === lessons.length - 1 && { opacity: 0.3 },
                    ]}
                    hitSlop={8}
                  >
                    <ChevronDown size={16} color={subColor} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeLesson(idx)}
                    style={styles.iconBtn}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={colors.alert.red} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* Add Buttons */}
        <Text style={[styles.sectionTitle, { color: subColor }]}>
          ADD LESSONS
        </Text>
        <View style={styles.addRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowCurriculumPicker(true);
            }}
            style={[styles.addCard, { backgroundColor: cardBg, borderColor }]}
          >
            <GraduationCap size={18} color="#16a34a" />
            <Text style={[styles.addCardText, { color: textColor }]}>
              From Curriculum
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowCustomPicker(true);
            }}
            style={[styles.addCard, { backgroundColor: cardBg, borderColor }]}
          >
            <BookOpen size={18} color="#2563eb" />
            <Text style={[styles.addCardText, { color: textColor }]}>
              From Custom Plans
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowInlineEditor(true);
            }}
            style={[styles.addCard, { backgroundColor: cardBg, borderColor }]}
          >
            <PenLine size={18} color="#d97706" />
            <Text style={[styles.addCardText, { color: textColor }]}>
              Create New
            </Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={[styles.cancelBtn, { borderColor }]}
          >
            <Text style={[styles.cancelText, { color: textColor }]}>
              Cancel
            </Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>
              {plan ? "Update Plan" : "Save Plan"}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CurriculumLessonPicker
        visible={showCurriculumPicker}
        onClose={() => setShowCurriculumPicker(false)}
        onAdd={handleAddCurriculumLessons}
        existingIds={existingCurriculumIds}
      />

      <CustomLessonPicker
        visible={showCustomPicker}
        tenantId={tenantId}
        onClose={() => setShowCustomPicker(false)}
        onAdd={handleAddCustomLessons}
      />

      <InlineLessonEditor
        visible={showInlineEditor}
        onClose={() => setShowInlineEditor(false)}
        onAdd={handleAddInlineLesson}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 10,
    maxWidth: 500,
    alignSelf: "center" as const,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 1,
    marginTop: 8,
  },
  inputLarge: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    padding: 12,
    borderRadius: 10,
  },
  inputMulti: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 12,
    borderRadius: 10,
    minHeight: 70,
    textAlignVertical: "top",
  },
  emptyLessons: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  lessonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  lessonTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  lessonContent: { flex: 1, gap: 3 },
  lessonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lessonTitle: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    flex: 1,
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
  lessonMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  lessonActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  iconBtn: { padding: 4 },
  addRow: {
    flexDirection: "row",
    gap: 8,
  },
  addCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  addCardText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  saveText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
