import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Send, X } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { STRUGGLE_AREAS, type StruggleArea } from "@/lib/lessons/types";

interface LessonFeedbackFormProps {
  mode: "student" | "instructor";
  onSubmit: (data: {
    text: string;
    areasOfStruggle?: StruggleArea[];
    performanceNotes?: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function LessonFeedbackForm({
  mode,
  onSubmit,
  onCancel,
  loading,
}: LessonFeedbackFormProps) {
  const { isDark } = useTheme();
  const [text, setText] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<StruggleArea[]>([]);
  const [perfNotes, setPerfNotes] = useState("");

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const cardBg = isDark ? colors.stratus[800] : colors.stratus[50];
  const inputBg = isDark ? colors.stratus[700] : "#FFFFFF";

  const isValid = text.trim().length > 0;

  const toggleArea = (area: StruggleArea) => {
    Haptics.selectionAsync();
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = () => {
    if (!isValid || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (mode === "student") {
      onSubmit({ text: text.trim(), areasOfStruggle: selectedAreas });
    } else {
      onSubmit({ text: text.trim(), performanceNotes: perfNotes.trim() });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>
          {mode === "student" ? "Your Feedback" : "Instructor Feedback"}
        </Text>
        <Pressable onPress={onCancel} hitSlop={12}>
          <X size={20} color={subColor} />
        </Pressable>
      </View>

      {/* Text Input */}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={
          mode === "student"
            ? "How did the lesson go? What did you learn?"
            : "Assessment of student performance..."
        }
        placeholderTextColor={subColor}
        multiline
        numberOfLines={4}
        style={[
          styles.textInput,
          { backgroundColor: inputBg, color: textColor },
        ]}
      />

      {/* Student: Struggle Areas */}
      {mode === "student" && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: subColor }]}>
            Areas of Struggle (optional)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {STRUGGLE_AREAS.map((area) => {
              const isSelected = selectedAreas.includes(area);
              return (
                <Pressable
                  key={area}
                  onPress={() => toggleArea(area)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.accent + "30"
                        : isDark
                        ? colors.stratus[700]
                        : colors.stratus[100],
                      borderColor: isSelected ? colors.accent : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.accent : subColor },
                    ]}
                  >
                    {area}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Instructor: Performance Notes */}
      {mode === "instructor" && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: subColor }]}>
            Performance Notes
          </Text>
          <TextInput
            value={perfNotes}
            onChangeText={setPerfNotes}
            placeholder="Specific areas for improvement, strengths observed..."
            placeholderTextColor={subColor}
            multiline
            numberOfLines={2}
            style={[
              styles.textInput,
              styles.smallInput,
              { backgroundColor: inputBg, color: textColor },
            ]}
          />
        </View>
      )}

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        disabled={!isValid || loading}
        style={[
          styles.submitBtn,
          { backgroundColor: colors.accent },
          (!isValid || loading) && { opacity: 0.5 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Send size={16} color="#FFFFFF" />
            <Text style={styles.submitText}>Submit Feedback</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  textInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
  },
  smallInput: {
    minHeight: 60,
  },
  section: { gap: 6 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
