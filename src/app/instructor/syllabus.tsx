/**
 * Syllabus Browser screen.
 *
 * Displays available curricula with expandable stages and lessons.
 * Instructors can browse lesson details and assign lessons to students.
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  BookMarked,
  Users,
  Plane,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { CloudCard } from "@/components/ui/CloudCard";
import { AVAILABLE_CURRICULA } from "@/lib/curriculum/private-pilot";
import { AssignCurriculumLessonModal } from "@/components/instructor/AssignCurriculumLessonModal";
import type { Curriculum, CurriculumStage, CurriculumLesson } from "@/lib/curriculum/types";
import type { FlightType } from "@/lib/briefing/types";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------------------------------------------------------------------------
// Flight type badge colors
// ---------------------------------------------------------------------------

const FLIGHT_TYPE_COLORS: Record<FlightType, string> = {
  local: colors.stratus[500],
  xc: colors.alert.amber,
  night: "#8b5cf6",
  instrument: colors.mvfr,
  checkride: colors.alert.green,
};

const FLIGHT_TYPE_LABELS: Record<FlightType, string> = {
  local: "LOCAL",
  xc: "XC",
  night: "NIGHT",
  instrument: "INST",
  checkride: "CHECKRIDE",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FlightTypeBadge({ type }: { type: FlightType }) {
  const bg = FLIGHT_TYPE_COLORS[type] ?? colors.stratus[500];
  return (
    <View style={[styles.badge, { backgroundColor: bg + "20" }]}>
      <Text style={[styles.badgeText, { color: bg }]}>
        {FLIGHT_TYPE_LABELS[type] ?? type.toUpperCase()}
      </Text>
    </View>
  );
}

function HoursRow({
  dualHours,
  soloHours,
  groundHours,
  isDark,
}: {
  dualHours: number;
  soloHours: number;
  groundHours: number;
  isDark: boolean;
}) {
  const sub = isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500];
  const items: { label: string; value: number }[] = [];
  if (dualHours > 0) items.push({ label: "Dual", value: dualHours });
  if (soloHours > 0) items.push({ label: "Solo", value: soloHours });
  if (groundHours > 0) items.push({ label: "Ground", value: groundHours });

  return (
    <View style={styles.hoursRow}>
      {items.map((item, i) => (
        <View key={item.label} style={styles.hourItem}>
          {i > 0 && <Text style={[styles.hourDot, { color: sub }]}> · </Text>}
          <Clock size={11} color={sub} />
          <Text style={[styles.hourText, { color: sub }]}>
            {item.value}h {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Lesson card
// ---------------------------------------------------------------------------

function LessonCard({
  lesson,
  index,
  isDark,
  onAssign,
}: {
  lesson: CurriculumLesson;
  index: number;
  isDark: boolean;
  onAssign: (lesson: CurriculumLesson) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const textColor = isDark ? "#FFFFFF" : colors.stratus[800];
  const sub = isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500];
  const divider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const toggleExpand = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <Pressable onPress={toggleExpand}>
      <View
        style={[
          styles.lessonCard,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.02)",
            borderColor: divider,
          },
        ]}
      >
        {/* Lesson header */}
        <View style={styles.lessonHeader}>
          <View style={styles.lessonIdBubble}>
            <Text style={styles.lessonIdText}>{lesson.id}</Text>
          </View>
          <View style={styles.lessonHeaderText}>
            <Text
              style={[styles.lessonTitle, { color: textColor }]}
              numberOfLines={expanded ? undefined : 1}
            >
              {lesson.title}
            </Text>
            <View style={styles.lessonMeta}>
              <FlightTypeBadge type={lesson.flightType} />
              <HoursRow
                dualHours={lesson.dualHours}
                soloHours={lesson.soloHours}
                groundHours={lesson.groundHours}
                isDark={isDark}
              />
            </View>
          </View>
          {expanded ? (
            <ChevronDown size={16} color={sub} />
          ) : (
            <ChevronRight size={16} color={sub} />
          )}
        </View>

        {/* Expanded details */}
        {expanded && (
          <View style={styles.lessonDetails}>
            <Text style={[styles.lessonDesc, { color: sub }]}>
              {lesson.description}
            </Text>

            {/* Objectives */}
            <View style={styles.detailSection}>
              <View style={styles.detailLabelRow}>
                <Target size={12} color={colors.accent} />
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Objectives
                </Text>
              </View>
              {lesson.objectives.map((obj, i) => (
                <Text key={i} style={[styles.objectiveText, { color: sub }]}>
                  {"\u2022"} {obj}
                </Text>
              ))}
            </View>

            {/* Completion Standards */}
            <View style={styles.detailSection}>
              <View style={styles.detailLabelRow}>
                <Target size={12} color={colors.alert.green} />
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Completion Standards
                </Text>
              </View>
              {lesson.completionStandards.map((std, i) => (
                <Text key={i} style={[styles.objectiveText, { color: sub }]}>
                  {"\u2022"} {std}
                </Text>
              ))}
            </View>

            {/* References */}
            {lesson.references.length > 0 && (
              <View style={styles.detailSection}>
                <View style={styles.detailLabelRow}>
                  <BookMarked size={12} color={colors.stratus[400]} />
                  <Text style={[styles.detailLabel, { color: textColor }]}>
                    References
                  </Text>
                </View>
                <View style={styles.refsRow}>
                  {lesson.references.map((ref, i) => (
                    <View
                      key={i}
                      style={[
                        styles.refBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : colors.stratus[100],
                        },
                      ]}
                    >
                      <Text style={[styles.refText, { color: sub }]}>
                        {ref}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Assign button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAssign(lesson);
              }}
              style={styles.assignBtn}
            >
              <Users size={14} color="#FFFFFF" />
              <Text style={styles.assignBtnText}>Assign to Student</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Stage card
// ---------------------------------------------------------------------------

function StageCard({
  stage,
  curriculum,
  stageIndex,
  isDark,
  onAssignLesson,
}: {
  stage: CurriculumStage;
  curriculum: Curriculum;
  stageIndex: number;
  isDark: boolean;
  onAssignLesson: (lesson: CurriculumLesson, curriculumTitle: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const textColor = isDark ? "#FFFFFF" : colors.stratus[800];
  const sub = isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500];

  const totalDual = stage.lessons.reduce((s, l) => s + l.dualHours, 0);
  const totalSolo = stage.lessons.reduce((s, l) => s + l.soloHours, 0);
  const totalGround = stage.lessons.reduce((s, l) => s + l.groundHours, 0);

  const toggleExpand = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <Animated.View entering={FadeInDown.delay(150 + stageIndex * 60)}>
      <CloudCard>
        <Pressable onPress={toggleExpand}>
          <View style={styles.stageHeader}>
            <View style={styles.stageNumberBubble}>
              <Text style={styles.stageNumberText}>{stage.stageNumber}</Text>
            </View>
            <View style={styles.stageTitleBlock}>
              <Text style={[styles.stageTitle, { color: textColor }]}>
                {stage.title}
              </Text>
              <Text
                style={[styles.stageSubtitle, { color: sub }]}
                numberOfLines={expanded ? undefined : 1}
              >
                {stage.lessons.length} lessons · {stage.requiredHours}h
                required
              </Text>
            </View>
            {expanded ? (
              <ChevronDown size={18} color={sub} />
            ) : (
              <ChevronRight size={18} color={sub} />
            )}
          </View>
        </Pressable>

        {expanded && (
          <View style={styles.stageBody}>
            <Text style={[styles.stageDesc, { color: sub }]}>
              {stage.description}
            </Text>

            {/* Stage objectives */}
            <View style={styles.stageObjectives}>
              {stage.objectives.map((obj, i) => (
                <Text key={i} style={[styles.objectiveText, { color: sub }]}>
                  {"\u2022"} {obj}
                </Text>
              ))}
            </View>

            {/* Hours summary */}
            <View
              style={[
                styles.hoursSummary,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                },
              ]}
            >
              <HoursSummaryItem label="Dual" value={totalDual} isDark={isDark} />
              <HoursSummaryItem label="Solo" value={totalSolo} isDark={isDark} />
              <HoursSummaryItem label="Ground" value={totalGround} isDark={isDark} />
            </View>

            {/* Lessons */}
            <View style={styles.lessonsList}>
              {stage.lessons.map((lesson, i) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={i}
                  isDark={isDark}
                  onAssign={(l) => onAssignLesson(l, curriculum.title)}
                />
              ))}
            </View>
          </View>
        )}
      </CloudCard>
    </Animated.View>
  );
}

function HoursSummaryItem({
  label,
  value,
  isDark,
}: {
  label: string;
  value: number;
  isDark: boolean;
}) {
  const textColor = isDark ? "#FFFFFF" : colors.stratus[800];
  const sub = isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500];

  return (
    <View style={styles.hoursSummaryItem}>
      <Text style={[styles.hoursSummaryValue, { color: textColor }]}>
        {value}h
      </Text>
      <Text style={[styles.hoursSummaryLabel, { color: sub }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SyllabusScreen() {
  const { isDark } = useTheme();
  const router = useRouter();

  const [assignModal, setAssignModal] = useState<{
    visible: boolean;
    lesson: CurriculumLesson | null;
    curriculumTitle: string;
  }>({ visible: false, lesson: null, curriculumTitle: "" });

  const handleAssignLesson = useCallback(
    (lesson: CurriculumLesson, curriculumTitle: string) => {
      setAssignModal({ visible: true, lesson, curriculumTitle });
    },
    []
  );

  const handleCloseAssign = useCallback(() => {
    setAssignModal({ visible: false, lesson: null, curriculumTitle: "" });
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft
                size={22}
                color={isDark ? "#FFFFFF" : colors.stratus[800]}
              />
            </Pressable>
            <BookOpen size={22} color={colors.accent} />
            <Text
              style={[
                styles.title,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Syllabus
            </Text>
          </Animated.View>

          <Text
            style={[
              styles.subtitle,
              {
                color: isDark
                  ? "rgba(255,255,255,0.5)"
                  : colors.stratus[600],
              },
            ]}
          >
            Browse curricula, stages, and lessons
          </Text>

          {/* Curricula */}
          {AVAILABLE_CURRICULA.map((curriculum) => (
            <View key={curriculum.id} style={styles.curriculumBlock}>
              {/* Curriculum header card */}
              <Animated.View entering={FadeInDown.delay(100)}>
                <CloudCard>
                  <View style={styles.curriculumHeader}>
                    <Plane size={20} color={colors.accent} />
                    <View style={styles.curriculumTitleBlock}>
                      <Text
                        style={[
                          styles.curriculumTitle,
                          {
                            color: isDark ? "#FFFFFF" : colors.stratus[800],
                          },
                        ]}
                      >
                        {curriculum.title}
                      </Text>
                      <Text
                        style={[
                          styles.curriculumMeta,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.5)"
                              : colors.stratus[500],
                          },
                        ]}
                      >
                        {curriculum.stages.length} stages ·{" "}
                        {curriculum.totalMinHours}h minimum ·{" "}
                        {curriculum.stages.reduce(
                          (s, st) => s + st.lessons.length,
                          0
                        )}{" "}
                        lessons
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.curriculumDesc,
                      {
                        color: isDark
                          ? "rgba(255,255,255,0.4)"
                          : colors.stratus[500],
                      },
                    ]}
                  >
                    {curriculum.description}
                  </Text>
                </CloudCard>
              </Animated.View>

              {/* Stages */}
              {curriculum.stages.map((stage, i) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  curriculum={curriculum}
                  stageIndex={i}
                  isDark={isDark}
                  onAssignLesson={handleAssignLesson}
                />
              ))}
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        <AssignCurriculumLessonModal
          visible={assignModal.visible}
          onClose={handleCloseAssign}
          lesson={assignModal.lesson}
          curriculumTitle={assignModal.curriculumTitle}
        />
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },

  // Curriculum
  curriculumBlock: { gap: 12 },
  curriculumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  curriculumTitleBlock: { flex: 1 },
  curriculumTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  curriculumMeta: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_400Regular",
    marginTop: 2,
  },
  curriculumDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },

  // Stage
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stageNumberBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  stageNumberText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.accent,
  },
  stageTitleBlock: { flex: 1 },
  stageTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  stageSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  stageBody: {
    marginTop: 14,
    gap: 12,
  },
  stageDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  stageObjectives: { gap: 4 },

  // Hours summary
  hoursSummary: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 12,
    justifyContent: "space-around",
  },
  hoursSummaryItem: { alignItems: "center", gap: 2 },
  hoursSummaryValue: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_400Regular",
  },
  hoursSummaryLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Lessons list
  lessonsList: { gap: 8 },
  lessonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  lessonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lessonIdBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  lessonIdText: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_400Regular",
    color: colors.accent,
  },
  lessonHeaderText: { flex: 1, gap: 4 },
  lessonTitle: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_400Regular",
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Hours row
  hoursRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  hourItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  hourDot: { fontSize: 11 },
  hourText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },

  // Lesson details
  lessonDetails: {
    marginTop: 8,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.15)",
    paddingTop: 10,
  },
  lessonDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  detailSection: { gap: 4 },
  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  objectiveText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    paddingLeft: 6,
  },

  // References
  refsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  refBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },

  // Assign button
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  assignBtnText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
