import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X, Check, GraduationCap } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { AVAILABLE_CURRICULA } from "@/lib/curriculum/private-pilot";
import type { CurriculumLesson } from "@/lib/curriculum/types";
import type { TrainingPlanLesson } from "@/lib/training-plans/types";
import type { FlightType } from "@/lib/briefing/types";

interface CurriculumLessonPickerProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (lessons: TrainingPlanLesson[]) => void;
  existingIds: Set<string>;
}

export function CurriculumLessonPicker({
  visible,
  onClose,
  onAdd,
  existingIds,
}: CurriculumLessonPickerProps) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : "#FFFFFF";
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  const curriculum = AVAILABLE_CURRICULA[0];

  const toggleLesson = (id: string) => {
    Haptics.selectionAsync();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleAdd = () => {
    const lessons: TrainingPlanLesson[] = [];
    let order = 0;

    for (const stage of curriculum.stages) {
      for (const lesson of stage.lessons) {
        if (selected.has(lesson.id)) {
          lessons.push({
            id: `curriculum-${lesson.id}-${Date.now()}-${order}`,
            source: "curriculum",
            sourceId: lesson.id,
            order,
            title: lesson.title,
            description: lesson.description,
            flightType: lesson.flightType as FlightType,
            objectives: lesson.objectives,
          });
          order++;
        }
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAdd(lessons);
    setSelected(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? colors.stratus[900] : colors.stratus[50] },
        ]}
      >
        <View style={[styles.header, { backgroundColor: cardBg }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Curriculum Lessons
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <X size={22} color={subColor} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {curriculum.stages.map((stage) => (
            <View key={stage.id} style={styles.stageGroup}>
              <View style={styles.stageHeader}>
                <GraduationCap size={14} color={colors.accent} />
                <Text style={[styles.stageTitle, { color: subColor }]}>
                  STAGE {stage.stageNumber} — {stage.title.toUpperCase()}
                </Text>
              </View>

              {stage.lessons.map((lesson) => {
                const isSelected = selected.has(lesson.id);
                const alreadyAdded = existingIds.has(lesson.id);
                return (
                  <Pressable
                    key={lesson.id}
                    onPress={() => {
                      if (!alreadyAdded) toggleLesson(lesson.id);
                    }}
                    disabled={alreadyAdded}
                    style={[
                      styles.lessonRow,
                      {
                        backgroundColor: isSelected
                          ? colors.accent + "12"
                          : alreadyAdded
                          ? (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")
                          : cardBg,
                        borderColor: isSelected
                          ? colors.accent
                          : borderColor,
                        opacity: alreadyAdded ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : "transparent",
                          borderColor: isSelected
                            ? colors.accent
                            : alreadyAdded
                            ? subColor
                            : borderColor,
                        },
                      ]}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" />}
                    </View>
                    <View style={styles.lessonInfo}>
                      <Text style={[styles.lessonTitle, { color: textColor }]}>
                        {lesson.id}: {lesson.title}
                      </Text>
                      <Text
                        style={[styles.lessonDesc, { color: subColor }]}
                        numberOfLines={2}
                      >
                        {lesson.description}
                      </Text>
                      <Text style={[styles.lessonMeta, { color: subColor }]}>
                        {lesson.flightType.toUpperCase()} ·{" "}
                        {lesson.objectives.length} objectives
                        {alreadyAdded ? " · Already added" : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: cardBg }]}>
          <Pressable
            onPress={handleAdd}
            disabled={selected.size === 0}
            style={[
              styles.addBtn,
              { backgroundColor: colors.accent },
              selected.size === 0 && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.addBtnText}>
              Add Selected ({selected.size})
            </Text>
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
  scrollContent: { padding: 16, gap: 6 },
  stageGroup: { gap: 6, marginBottom: 8 },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  stageTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.5,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  lessonInfo: { flex: 1, gap: 3 },
  lessonTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  lessonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  lessonMeta: { fontSize: 11, fontFamily: "Inter_500Medium" },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  addBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
