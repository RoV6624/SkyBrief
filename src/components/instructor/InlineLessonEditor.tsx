import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { TrainingPlanLesson } from "@/lib/training-plans/types";
import type { FlightType } from "@/lib/briefing/types";

interface InlineLessonEditorProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (lesson: TrainingPlanLesson) => void;
}

const FLIGHT_TYPES: Array<{ value: FlightType; label: string }> = [
  { value: "local", label: "Local" },
  { value: "xc", label: "Cross-Country" },
  { value: "night", label: "Night" },
  { value: "instrument", label: "Instrument" },
  { value: "checkride", label: "Checkride" },
];

export function InlineLessonEditor({
  visible,
  onClose,
  onAdd,
}: InlineLessonEditorProps) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [flightType, setFlightType] = useState<FlightType>("local");
  const [objectives, setObjectives] = useState<string[]>([""]);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : "#FFFFFF";
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[100];
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFlightType("local");
    setObjectives([""]);
  };

  const handleAdd = () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a lesson title.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAdd({
      id: `inline-${Date.now()}`,
      source: "inline",
      sourceId: null,
      order: 0,
      title: title.trim(),
      description: description.trim(),
      flightType,
      objectives: objectives.filter((o) => o.trim()),
    });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addObjective = () => {
    Haptics.selectionAsync();
    setObjectives([...objectives, ""]);
  };

  const removeObjective = (index: number) => {
    Haptics.selectionAsync();
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...objectives];
    updated[index] = value;
    setObjectives(updated);
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
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Create Lesson
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <X size={22} color={subColor} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionTitle, { color: subColor }]}>
            LESSON DETAILS
          </Text>

          <TextInput
            style={[
              styles.inputLarge,
              { color: textColor, backgroundColor: inputBg },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Lesson title"
            placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
          />

          <TextInput
            style={[
              styles.inputMulti,
              { color: textColor, backgroundColor: inputBg },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description and notes..."
            placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.sectionTitle, { color: subColor }]}>
            FLIGHT TYPE
          </Text>
          <View style={styles.typeRow}>
            {FLIGHT_TYPES.map((ft) => {
              const active = flightType === ft.value;
              return (
                <Pressable
                  key={ft.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFlightType(ft.value);
                  }}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? colors.accent : inputBg,
                      borderColor: active ? colors.accent : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: active ? "#FFFFFF" : textColor },
                    ]}
                  >
                    {ft.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: subColor }]}>
            OBJECTIVES
          </Text>
          {objectives.map((obj, idx) => (
            <View key={idx} style={styles.objectiveRow}>
              <TextInput
                style={[
                  styles.objectiveInput,
                  { color: textColor, backgroundColor: inputBg },
                ]}
                value={obj}
                onChangeText={(v) => updateObjective(idx, v)}
                placeholder={`Objective ${idx + 1}`}
                placeholderTextColor={
                  isDark ? colors.stratus[600] : colors.stratus[300]
                }
              />
              {objectives.length > 1 && (
                <Pressable onPress={() => removeObjective(idx)} hitSlop={8}>
                  <Trash2 size={16} color={colors.alert.red} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable onPress={addObjective} style={styles.addObjBtn}>
            <Plus size={14} color={colors.accent} />
            <Text style={[styles.addObjText, { color: colors.accent }]}>
              Add Objective
            </Text>
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: cardBg }]}>
          <Pressable
            onPress={handleAdd}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.addBtnText}>Add Lesson</Text>
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
  headerTitle: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
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
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeText: { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
  objectiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  objectiveInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 10,
    borderRadius: 8,
  },
  addObjBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  addObjText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
