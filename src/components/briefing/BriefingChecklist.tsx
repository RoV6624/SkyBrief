import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileText,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { NormalizedMetar } from "@/lib/api/types";
import type { MinimumsResult } from "@/lib/minimums/types";
import type { FRATResult } from "@/lib/frat/types";
import type {
  BriefingChecklist as BriefingChecklistType,
  ChecklistItemId,
  FlightType,
  ComplianceRecord,
} from "@/lib/briefing/types";
import {
  createBriefingChecklist,
  toggleChecklistItem,
  flagChecklistItem,
  generateComplianceRecord,
  formatComplianceText,
} from "@/lib/briefing/checklist";
import { useBriefingStore } from "@/stores/briefing-store";

interface Props {
  station: string;
  stationName: string;
  pilotName: string;
  aircraftType: string;
  metar: NormalizedMetar | null;
  minimumsResult?: MinimumsResult;
  fratResult?: FRATResult;
  route?: string;
}

const FLIGHT_TYPE_LABELS: Record<FlightType, string> = {
  local: "Local VFR",
  xc: "Cross-Country",
  night: "Night VFR",
  instrument: "Instrument",
  checkride: "Checkride",
};

const CATEGORY_LABELS: Record<string, string> = {
  weather: "Weather",
  planning: "Planning",
  aircraft: "Aircraft",
  risk: "Risk Assessment",
};

export function BriefingChecklist({
  station,
  stationName,
  pilotName,
  aircraftType,
  metar,
  minimumsResult,
  fratResult,
  route,
}: Props) {
  const { theme, isDark } = useTheme();
  const { activeChecklist, setActiveChecklist, updateActiveChecklist, clearActiveChecklist, addCompletedBriefing } = useBriefingStore();
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<FlightType>("local");

  // Start a new briefing
  const startBriefing = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const checklist = createBriefingChecklist({
      station,
      stationName,
      flightType: selectedType,
      pilotName,
      aircraftType,
      route,
    });
    setActiveChecklist(checklist);
    setExpanded(true);
  }, [station, stationName, selectedType, pilotName, aircraftType, route, setActiveChecklist]);

  // Toggle item
  const handleToggle = useCallback(
    (itemId: ChecklistItemId) => {
      if (!activeChecklist) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = toggleChecklistItem(activeChecklist, itemId);
      updateActiveChecklist(updated);
    },
    [activeChecklist, updateActiveChecklist]
  );

  // Complete briefing and generate record
  const completeBriefing = useCallback(() => {
    if (!activeChecklist || !metar) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const record = generateComplianceRecord(
      activeChecklist,
      metar,
      minimumsResult,
      fratResult
    );

    if (record) {
      addCompletedBriefing(record);
      Alert.alert(
        "Briefing Complete",
        "Your preflight briefing record has been saved. You can share it from the briefing history.",
        [
          {
            text: "Share Record",
            onPress: () => shareRecord(record),
          },
          { text: "Done", style: "cancel" },
        ]
      );
    }
    clearActiveChecklist();
    setExpanded(false);
  }, [activeChecklist, metar, minimumsResult, fratResult, addCompletedBriefing, clearActiveChecklist]);

  // Share compliance record
  const shareRecord = useCallback(async (record: ComplianceRecord) => {
    const text = formatComplianceText(record);
    try {
      await Share.share({
        message: text,
        title: "SkyBrief Preflight Briefing Record",
      });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  }, []);

  // Progress calculations
  const progress = useMemo(() => {
    if (!activeChecklist) return { checked: 0, total: 0, required: 0, requiredChecked: 0 };
    const total = activeChecklist.items.length;
    const checked = activeChecklist.items.filter((i) => i.status === "checked").length;
    const required = activeChecklist.items.filter((i) => i.required).length;
    const requiredChecked = activeChecklist.items.filter(
      (i) => i.required && i.status === "checked"
    ).length;
    return { checked, total, required, requiredChecked };
  }, [activeChecklist]);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!activeChecklist) return {};
    const groups: Record<string, typeof activeChecklist.items> = {};
    for (const item of activeChecklist.items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [activeChecklist]);

  // No active checklist — show start button
  if (!activeChecklist) {
    return (
      <Animated.View entering={FadeInDown.delay(200)}>
        <CloudCard>
          <View style={styles.startContainer}>
            <View style={styles.startHeader}>
              <FileText size={20} color={colors.accent} />
              <Text style={[styles.startTitle, { color: isDark ? "#FFFFFF" : colors.stratus[800] }]}>
                Preflight Briefing Checklist
              </Text>
            </View>
            <Text style={[styles.startDescription, { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600] }]}>
              Complete a structured briefing and generate a timestamped compliance record.
            </Text>

            {/* Flight type selector */}
            <View style={styles.typeSelector}>
              {(Object.keys(FLIGHT_TYPE_LABELS) as FlightType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedType(type);
                  }}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        selectedType === type
                          ? isDark ? "rgba(212,168,83,0.2)" : "rgba(212,168,83,0.15)"
                          : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      borderColor:
                        selectedType === type
                          ? colors.accent
                          : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      {
                        color:
                          selectedType === type
                            ? colors.accent
                            : isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600],
                      },
                    ]}
                  >
                    {FLIGHT_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={startBriefing}
              style={[styles.startButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.startButtonText}>Start Briefing</Text>
            </Pressable>
          </View>
        </CloudCard>
      </Animated.View>
    );
  }

  // Active checklist
  return (
    <Animated.View entering={FadeIn}>
      <CloudCard>
        {/* Header with progress */}
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <FileText size={18} color={colors.accent} />
            <View>
              <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : colors.stratus[800] }]}>
                {FLIGHT_TYPE_LABELS[activeChecklist.flightType]} Briefing
              </Text>
              <Text style={[styles.headerSub, { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] }]}>
                {progress.requiredChecked}/{progress.required} required items
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Progress ring */}
            <View style={[styles.progressBadge, {
              backgroundColor: activeChecklist.isComplete
                ? "rgba(34,197,94,0.15)"
                : "rgba(245,158,11,0.15)",
              borderColor: activeChecklist.isComplete
                ? colors.alert.green
                : colors.alert.amber,
            }]}>
              <Text style={[styles.progressText, {
                color: activeChecklist.isComplete ? colors.alert.green : colors.alert.amber,
              }]}>
                {Math.round((progress.requiredChecked / Math.max(progress.required, 1)) * 100)}%
              </Text>
            </View>
            {expanded ? (
              <ChevronUp size={16} color={isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]} />
            ) : (
              <ChevronDown size={16} color={isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]} />
            )}
          </View>
        </Pressable>

        {/* Checklist items */}
        {expanded && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.itemsList}>
            {Object.entries(groupedItems).map(([category, items]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={[styles.categoryLabel, { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] }]}>
                  {CATEGORY_LABELS[category] || category}
                </Text>
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleToggle(item.id)}
                    style={[styles.checklistItem, {
                      backgroundColor: item.status === "checked"
                        ? isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.04)"
                        : item.status === "flagged"
                        ? isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)"
                        : "transparent",
                    }]}
                  >
                    <View style={styles.checkIcon}>
                      {item.status === "checked" ? (
                        <CheckCircle2 size={20} color={colors.alert.green} />
                      ) : item.status === "flagged" ? (
                        <AlertTriangle size={20} color={colors.alert.red} />
                      ) : (
                        <Circle size={20} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"} />
                      )}
                    </View>
                    <View style={styles.checkContent}>
                      <Text style={[
                        styles.checkLabel,
                        { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                        item.status === "checked" && styles.checkLabelDone,
                      ]}>
                        {item.label}
                        {item.required && (
                          <Text style={{ color: colors.alert.red }}> *</Text>
                        )}
                      </Text>
                      <Text style={[styles.checkDesc, { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] }]}>
                        {item.description}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}

            {/* Action buttons */}
            <View style={styles.actions}>
              {activeChecklist.isComplete && (
                <Pressable
                  onPress={completeBriefing}
                  style={[styles.completeButton, { backgroundColor: colors.alert.green }]}
                >
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>Complete & Save Record</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  clearActiveChecklist();
                  setExpanded(false);
                }}
                style={[styles.cancelButton, {
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                }]}
              >
                <Text style={[styles.cancelButtonText, {
                  color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600],
                }]}>
                  Cancel Briefing
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  startContainer: { gap: 12 },
  startHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  startTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  startDescription: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  typeSelector: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  startButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  progressText: { fontSize: 11, fontFamily: "JetBrainsMono_600SemiBold" },
  itemsList: { marginTop: 16, gap: 4 },
  categoryGroup: { marginBottom: 12 },
  categoryLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  checkIcon: { marginTop: 1 },
  checkContent: { flex: 1 },
  checkLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  checkLabelDone: { textDecorationLine: "line-through", opacity: 0.6 },
  checkDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  actions: { gap: 8, marginTop: 8 },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
