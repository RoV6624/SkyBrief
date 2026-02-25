import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X, Check, BookOpen } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { getSchoolLessonPlans, type LessonPlanData } from "@/services/tenant-api";
import type { TrainingPlanLesson } from "@/lib/training-plans/types";
import type { FlightType } from "@/lib/briefing/types";

interface CustomLessonPickerProps {
  visible: boolean;
  tenantId: string;
  onClose: () => void;
  onAdd: (lessons: TrainingPlanLesson[]) => void;
}

export function CustomLessonPicker({
  visible,
  tenantId,
  onClose,
  onAdd,
}: CustomLessonPickerProps) {
  const { isDark } = useTheme();
  const [plans, setPlans] = useState<LessonPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : "#FFFFFF";
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  useEffect(() => {
    if (visible && tenantId) {
      setLoading(true);
      getSchoolLessonPlans(tenantId).then((data) => {
        setPlans(data);
        setLoading(false);
      });
    }
  }, [visible, tenantId]);

  const togglePlan = (id: string) => {
    Haptics.selectionAsync();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleAdd = () => {
    const lessons: TrainingPlanLesson[] = [];
    let order = 0;

    for (const plan of plans) {
      if (selected.has(plan.id)) {
        lessons.push({
          id: `custom-${plan.id}-${Date.now()}-${order}`,
          source: "custom",
          sourceId: plan.id,
          order,
          title: plan.title,
          description: plan.description,
          flightType: plan.flightType as FlightType,
          objectives: plan.objectives ?? [],
        });
        order++;
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
            Custom Lessons
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <X size={22} color={subColor} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <ActivityIndicator color={subColor} style={{ padding: 40 }} />
          ) : plans.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen
                size={36}
                color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
              />
              <Text style={[styles.emptyText, { color: subColor }]}>
                No custom lesson plans found
              </Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Create lessons first from the Training screen
              </Text>
            </View>
          ) : (
            plans.map((plan) => {
              const isSelected = selected.has(plan.id);
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => togglePlan(plan.id)}
                  style={[
                    styles.planRow,
                    {
                      backgroundColor: isSelected
                        ? colors.accent + "12"
                        : cardBg,
                      borderColor: isSelected ? colors.accent : borderColor,
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
                        borderColor: isSelected ? colors.accent : borderColor,
                      },
                    ]}
                  >
                    {isSelected && <Check size={12} color="#FFFFFF" />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: textColor }]}>
                      {plan.title}
                    </Text>
                    {plan.description ? (
                      <Text
                        style={[styles.planDesc, { color: subColor }]}
                        numberOfLines={2}
                      >
                        {plan.description}
                      </Text>
                    ) : null}
                    <Text style={[styles.planMeta, { color: subColor }]}>
                      {plan.flightType.toUpperCase()} ·{" "}
                      {(plan.objectives ?? []).length} objectives
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

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
  scrollContent: { padding: 16, gap: 8 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  planRow: {
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
  planInfo: { flex: 1, gap: 3 },
  planTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  planMeta: { fontSize: 11, fontFamily: "Inter_500Medium" },
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
