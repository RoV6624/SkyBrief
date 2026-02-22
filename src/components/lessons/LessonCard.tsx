import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronDown, ChevronUp, Calendar, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { AssignedLesson } from "@/lib/lessons/types";

interface LessonCardProps {
  lesson: AssignedLesson;
  mode: "student" | "instructor";
  onFeedback?: (lesson: AssignedLesson) => void;
}

function getFlightTypeColor(flightType: string): string {
  switch (flightType) {
    case "local": return "#22c55e";
    case "cross-country": return "#D4A853";
    case "instrument": return "#ef4444";
    case "night": return "#8b5cf6";
    case "checkride": return "#f59e0b";
    default: return "#94a3b8";
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function LessonCard({ lesson, mode, onFeedback }: LessonCardProps) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? "#3fa8ff" : "#475569";
  const badgeColor = getFlightTypeColor(lesson.flightType);

  const isCompleted = lesson.status === "completed";
  const hasFeedback = mode === "student"
    ? !!lesson.studentFeedback
    : !!lesson.instructorFeedback;

  return (
    <CloudCard>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setExpanded(!expanded);
        }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: textColor }]}>
              {lesson.lessonTitle}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>
                  {lesson.flightType.toUpperCase()}
                </Text>
              </View>
              {isCompleted && (
                <View style={[styles.badge, { backgroundColor: "#22c55e20" }]}>
                  <Text style={[styles.badgeText, { color: "#22c55e" }]}>
                    COMPLETED
                  </Text>
                </View>
              )}
            </View>
          </View>
          {expanded ? (
            <ChevronUp size={18} color={subColor} />
          ) : (
            <ChevronDown size={18} color={subColor} />
          )}
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <Calendar size={12} color={subColor} />
          <Text style={[styles.infoText, { color: subColor }]}>
            {formatDate(lesson.scheduledDate)}
          </Text>
          <User size={12} color={subColor} />
          <Text style={[styles.infoText, { color: subColor }]}>
            {mode === "student" ? lesson.instructorName : lesson.studentName}
          </Text>
        </View>

        {/* Expanded content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {lesson.lessonDescription ? (
              <Text style={[styles.description, { color: subColor }]}>
                {lesson.lessonDescription}
              </Text>
            ) : null}

            {lesson.objectives.length > 0 && (
              <View style={styles.objectivesSection}>
                <Text style={[styles.sectionLabel, { color: subColor }]}>
                  Objectives
                </Text>
                {lesson.objectives.map((obj, i) => (
                  <Text key={i} style={[styles.objective, { color: textColor }]}>
                    {"\u2022"} {obj}
                  </Text>
                ))}
              </View>
            )}

            {/* Student Feedback */}
            {lesson.studentFeedback && (
              <View style={styles.feedbackSection}>
                <Text style={[styles.sectionLabel, { color: subColor }]}>
                  Student Feedback
                </Text>
                <Text style={[styles.feedbackText, { color: textColor }]}>
                  {lesson.studentFeedback.text}
                </Text>
                {lesson.studentFeedback.areasOfStruggle.length > 0 && (
                  <View style={styles.chipRow}>
                    {lesson.studentFeedback.areasOfStruggle.map((area) => (
                      <View
                        key={area}
                        style={[
                          styles.chip,
                          { backgroundColor: isDark ? "#085696" : "#d4e9ff" },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: subColor }]}>{area}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Instructor Feedback */}
            {lesson.instructorFeedback && (
              <View style={styles.feedbackSection}>
                <Text style={[styles.sectionLabel, { color: subColor }]}>
                  Instructor Feedback
                </Text>
                <Text style={[styles.feedbackText, { color: textColor }]}>
                  {lesson.instructorFeedback.text}
                </Text>
                {lesson.instructorFeedback.performanceNotes ? (
                  <Text style={[styles.perfNotes, { color: subColor }]}>
                    Notes: {lesson.instructorFeedback.performanceNotes}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Add Feedback button */}
            {isCompleted && !hasFeedback && onFeedback && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFeedback(lesson);
                }}
                style={[styles.feedbackBtn, { backgroundColor: "#D4A853" }]}
              >
                <Text style={styles.feedbackBtnText}>Add Feedback</Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold" },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginRight: 8,
  },
  expandedContent: { gap: 10, paddingTop: 4 },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  objectivesSection: { gap: 4 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  objective: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingLeft: 4,
  },
  feedbackSection: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
    paddingTop: 8,
  },
  feedbackText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  perfNotes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  feedbackBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  feedbackBtnText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
