import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  ChevronDown,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { ChecklistItemId, FlightType } from "@/lib/briefing/types";
import { getDefaultChecklistItems } from "@/lib/briefing/checklist";

export interface LessonPlan {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  flightType: FlightType;
  requiredChecklistItems: ChecklistItemId[];
  maxFratScore: number;
  objectives: string[];
  createdBy: string;
  createdAt: string; // ISO
}

interface LessonPlanEditorProps {
  plan?: LessonPlan;
  tenantId: string;
  instructorUid: string;
  onSave: (plan: Omit<LessonPlan, "id" | "createdAt">) => void;
  onCancel: () => void;
}

const FLIGHT_TYPES: Array<{ value: FlightType; label: string }> = [
  { value: "local", label: "Local" },
  { value: "xc", label: "Cross-Country" },
  { value: "night", label: "Night" },
  { value: "instrument", label: "Instrument" },
  { value: "checkride", label: "Checkride" },
];

export function LessonPlanEditor({
  plan,
  tenantId,
  instructorUid,
  onSave,
  onCancel,
}: LessonPlanEditorProps) {
  const { isDark } = useTheme();

  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [flightType, setFlightType] = useState<FlightType>(plan?.flightType ?? "local");
  const [maxFrat, setMaxFrat] = useState(String(plan?.maxFratScore ?? 25));
  const [objectives, setObjectives] = useState<string[]>(plan?.objectives ?? [""]);
  const [selectedItems, setSelectedItems] = useState<Set<ChecklistItemId>>(
    new Set(plan?.requiredChecklistItems ?? [])
  );

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[100];
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];
  const cardBg = isDark ? colors.stratus[800] : colors.stratus[50];

  const checklistItems = getDefaultChecklistItems(flightType);

  const toggleItem = (id: ChecklistItemId) => {
    Haptics.selectionAsync();
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
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

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a lesson plan title.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      tenantId,
      title: title.trim(),
      description: description.trim(),
      flightType,
      requiredChecklistItems: Array.from(selectedItems),
      maxFratScore: parseInt(maxFrat, 10) || 25,
      objectives: objectives.filter((o) => o.trim()),
      createdBy: instructorUid,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { color: subColor }]}>LESSON DETAILS</Text>

      <TextInput
        style={[styles.inputLarge, { color: textColor, backgroundColor: inputBg }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Lesson title (e.g. Short Field Takeoffs)"
        placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
      />

      <TextInput
        style={[styles.inputMulti, { color: textColor, backgroundColor: inputBg }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Description and notes for the lesson..."
        placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
        multiline
        numberOfLines={3}
      />

      {/* Flight Type */}
      <Text style={[styles.sectionTitle, { color: subColor }]}>FLIGHT TYPE</Text>
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

      {/* Max FRAT */}
      <View style={[styles.fratRow, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.fratLabel, { color: textColor }]}>Max FRAT Score</Text>
        <TextInput
          style={[styles.fratInput, { color: textColor, backgroundColor: inputBg }]}
          value={maxFrat}
          onChangeText={setMaxFrat}
          keyboardType="number-pad"
        />
      </View>

      {/* Objectives */}
      <Text style={[styles.sectionTitle, { color: subColor }]}>LESSON OBJECTIVES</Text>
      {objectives.map((obj, idx) => (
        <View key={idx} style={styles.objectiveRow}>
          <TextInput
            style={[styles.objectiveInput, { color: textColor, backgroundColor: inputBg }]}
            value={obj}
            onChangeText={(v) => updateObjective(idx, v)}
            placeholder={`Objective ${idx + 1}`}
            placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
          />
          {objectives.length > 1 && (
            <Pressable onPress={() => removeObjective(idx)} hitSlop={8}>
              <Trash2 size={16} color={colors.alert.red} />
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={addObjective} style={styles.addBtn}>
        <Plus size={14} color={colors.accent} />
        <Text style={[styles.addText, { color: colors.accent }]}>Add Objective</Text>
      </Pressable>

      {/* Required Checklist Items */}
      <Text style={[styles.sectionTitle, { color: subColor }]}>
        REQUIRED BRIEFING ITEMS
      </Text>
      {checklistItems.map((item) => {
        const isSelected = selectedItems.has(item.id);
        return (
          <Pressable
            key={item.id}
            onPress={() => toggleItem(item.id)}
            style={[
              styles.checkRow,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? "rgba(212,168,83,0.1)"
                    : "rgba(212,168,83,0.06)"
                  : cardBg,
                borderColor: isSelected ? colors.accent : borderColor,
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isSelected ? colors.accent : "transparent",
                  borderColor: isSelected ? colors.accent : subColor,
                },
              ]}
            >
              {isSelected && <Check size={12} color="#FFFFFF" />}
            </View>
            <View style={styles.checkInfo}>
              <Text style={[styles.checkLabel, { color: textColor }]}>
                {item.label}
              </Text>
              <Text style={[styles.checkDesc, { color: subColor }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          style={[styles.cancelBtn, { borderColor }]}
        >
          <Text style={[styles.cancelText, { color: textColor }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>
            {plan ? "Update Lesson" : "Create Lesson"}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 10, maxWidth: 500, alignSelf: "center" as const, width: "100%" },
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
  fratRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  fratLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  fratInput: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_500Medium",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    width: 60,
    textAlign: "center",
  },
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  addText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInfo: { flex: 1, gap: 2 },
  checkLabel: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  checkDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
