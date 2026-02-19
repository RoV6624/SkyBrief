/**
 * Individual dispatch review card for the instructor queue.
 *
 * Shows a compact summary with expandable details, colour-coded
 * FRAT badge, W&B pass/fail, and Go/No-Go verdict. Action buttons
 * allow the instructor to approve, reject, or request revision.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  User,
  ChevronDown,
  ChevronUp,
  Shield,
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  CloudSun,
  Clock,
  MapPin,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { DispatchPacket, DispatchStatus } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  dispatch: DispatchPacket;
  onAction: (
    action: "approved" | "rejected" | "revision_requested",
    comment?: string
  ) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskColor(level: string | undefined): string {
  if (level === "low") return colors.alert.green;
  if (level === "caution") return colors.alert.amber;
  return colors.alert.red;
}

function riskLabel(level: string | undefined): string {
  if (level === "low") return "LOW";
  if (level === "caution") return "CAUTION";
  if (level === "high") return "HIGH";
  return "N/A";
}

function verdictColor(verdict: string | undefined): string {
  if (verdict === "go") return colors.alert.green;
  if (verdict === "marginal") return colors.alert.amber;
  return colors.alert.red;
}

function verdictLabel(verdict: string | undefined): string {
  if (verdict === "go") return "GO";
  if (verdict === "marginal") return "MARGINAL";
  if (verdict === "nogo") return "NO-GO";
  return "N/A";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DispatchReviewCard({ dispatch, onAction }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    onAction("approved", comment || undefined);
    setLoading(false);
  }, [comment, onAction]);

  const handleReject = useCallback(() => {
    if (!comment.trim()) {
      Alert.alert(
        "Comment Required",
        "Please provide feedback explaining the rejection."
      );
      setShowComment(true);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLoading(true);
    onAction("rejected", comment);
    setLoading(false);
  }, [comment, onAction]);

  const handleRevision = useCallback(() => {
    if (!comment.trim()) {
      Alert.alert(
        "Comment Required",
        "Please explain what needs to be revised."
      );
      setShowComment(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    onAction("revision_requested", comment);
    setLoading(false);
  }, [comment, onAction]);

  const fratResult = dispatch.fratResult;
  const wbSnapshot = dispatch.wbSnapshot;
  const goNoGo = dispatch.goNoGoResult;
  const weather = dispatch.weatherSnapshot;

  return (
    <Animated.View entering={FadeInDown}>
      <CloudCard>
        {/* Top row: student info */}
        <View style={styles.topRow}>
          <User size={16} color={colors.accent} />
          <View style={styles.studentInfo}>
            <Text
              style={[
                styles.studentName,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              {dispatch.studentName}
            </Text>
            <View style={styles.metaRow}>
              <MapPin
                size={11}
                color={
                  isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]
                }
              />
              <Text
                style={[
                  styles.metaText,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : colors.stratus[600],
                  },
                ]}
              >
                {dispatch.station} -- {dispatch.flightType.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Clock size={12} color={colors.alert.amber} />
            <Text style={[styles.statusText, { color: colors.alert.amber }]}>
              Pending
            </Text>
          </View>
        </View>

        {/* Compact summary badges */}
        <View style={styles.badgeRow}>
          {/* FRAT */}
          {fratResult && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    fratResult.riskLevel === "low"
                      ? "rgba(34,197,94,0.12)"
                      : fratResult.riskLevel === "caution"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(239,68,68,0.12)",
                },
              ]}
            >
              <Shield size={12} color={riskColor(fratResult.riskLevel)} />
              <Text
                style={[
                  styles.badgeText,
                  { color: riskColor(fratResult.riskLevel) },
                ]}
              >
                FRAT: {fratResult.totalScore}
              </Text>
            </View>
          )}

          {/* W&B */}
          {wbSnapshot && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: wbSnapshot.withinLimits
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(239,68,68,0.12)",
                },
              ]}
            >
              {wbSnapshot.withinLimits ? (
                <CheckCircle2 size={12} color={colors.alert.green} />
              ) : (
                <XCircle size={12} color={colors.alert.red} />
              )}
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: wbSnapshot.withinLimits
                      ? colors.alert.green
                      : colors.alert.red,
                  },
                ]}
              >
                W&B {wbSnapshot.withinLimits ? "OK" : "FAIL"}
              </Text>
            </View>
          )}

          {/* Go/No-Go */}
          {goNoGo && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    goNoGo.verdict === "go"
                      ? "rgba(34,197,94,0.12)"
                      : goNoGo.verdict === "marginal"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(239,68,68,0.12)",
                },
              ]}
            >
              {goNoGo.verdict === "go" ? (
                <CheckCircle2 size={12} color={verdictColor(goNoGo.verdict)} />
              ) : goNoGo.verdict === "marginal" ? (
                <AlertTriangle size={12} color={verdictColor(goNoGo.verdict)} />
              ) : (
                <XCircle size={12} color={verdictColor(goNoGo.verdict)} />
              )}
              <Text
                style={[
                  styles.badgeText,
                  { color: verdictColor(goNoGo.verdict) },
                ]}
              >
                {verdictLabel(goNoGo.verdict)}
              </Text>
            </View>
          )}
        </View>

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            {
              color: isDark
                ? "rgba(255,255,255,0.3)"
                : colors.stratus[400],
            },
          ]}
        >
          Submitted {formatDate(dispatch.submittedAt)}
        </Text>

        {/* Expand / collapse toggle */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
          style={[
            styles.expandBtn,
            {
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <Text
            style={[
              styles.expandBtnText,
              {
                color: isDark
                  ? "rgba(255,255,255,0.5)"
                  : colors.stratus[600],
              },
            ]}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </Text>
          {expanded ? (
            <ChevronUp
              size={14}
              color={
                isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]
              }
            />
          ) : (
            <ChevronDown
              size={14}
              color={
                isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]
              }
            />
          )}
        </Pressable>

        {/* Expanded details */}
        {expanded && (
          <View style={styles.details}>
            {/* Weather */}
            {weather && (
              <View style={styles.detailSection}>
                <View style={styles.detailHeaderRow}>
                  <CloudSun
                    size={13}
                    color={
                      isDark
                        ? "rgba(255,255,255,0.5)"
                        : colors.stratus[600]
                    }
                  />
                  <Text
                    style={[
                      styles.detailSectionLabel,
                      {
                        color: isDark ? "#FFFFFF" : colors.stratus[800],
                      },
                    ]}
                  >
                    Weather Snapshot
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailMono,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : colors.stratus[700],
                    },
                  ]}
                >
                  {weather.flightCategory} | Ceil:{" "}
                  {weather.ceiling != null ? `${weather.ceiling} ft` : "CLR"} |
                  Vis: {weather.visibility.sm}
                  {weather.visibility.isPlus ? "+" : ""} SM | Wind:{" "}
                  {weather.wind.direction === "VRB"
                    ? "VRB"
                    : weather.wind.direction}
                  @{weather.wind.speed}
                  {weather.wind.gust ? `G${weather.wind.gust}` : ""} kt
                </Text>
              </View>
            )}

            {/* FRAT breakdown */}
            {fratResult && (
              <View style={styles.detailSection}>
                <View style={styles.detailHeaderRow}>
                  <Shield
                    size={13}
                    color={
                      isDark
                        ? "rgba(255,255,255,0.5)"
                        : colors.stratus[600]
                    }
                  />
                  <Text
                    style={[
                      styles.detailSectionLabel,
                      {
                        color: isDark ? "#FFFFFF" : colors.stratus[800],
                      },
                    ]}
                  >
                    FRAT Breakdown
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailMono,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : colors.stratus[700],
                    },
                  ]}
                >
                  Total: {fratResult.totalScore}/70 | Weather:{" "}
                  {fratResult.weatherScore} | Pilot: {fratResult.pilotScore}
                </Text>
                <Text
                  style={[
                    styles.detailText,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : colors.stratus[500],
                    },
                  ]}
                >
                  {fratResult.recommendation}
                </Text>
              </View>
            )}

            {/* W&B */}
            {wbSnapshot && (
              <View style={styles.detailSection}>
                <View style={styles.detailHeaderRow}>
                  <Scale
                    size={13}
                    color={
                      isDark
                        ? "rgba(255,255,255,0.5)"
                        : colors.stratus[600]
                    }
                  />
                  <Text
                    style={[
                      styles.detailSectionLabel,
                      {
                        color: isDark ? "#FFFFFF" : colors.stratus[800],
                      },
                    ]}
                  >
                    Weight & Balance
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailMono,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : colors.stratus[700],
                    },
                  ]}
                >
                  {wbSnapshot.aircraftType} | {wbSnapshot.totalWeight} lbs | CG{" "}
                  {wbSnapshot.cg.toFixed(1)} |{" "}
                  {wbSnapshot.withinLimits ? "WITHIN LIMITS" : "OUT OF LIMITS"}
                </Text>
              </View>
            )}

            {/* Go/No-Go */}
            {goNoGo && (
              <View style={styles.detailSection}>
                <View style={styles.detailHeaderRow}>
                  <Shield
                    size={13}
                    color={
                      isDark
                        ? "rgba(255,255,255,0.5)"
                        : colors.stratus[600]
                    }
                  />
                  <Text
                    style={[
                      styles.detailSectionLabel,
                      {
                        color: isDark ? "#FFFFFF" : colors.stratus[800],
                      },
                    ]}
                  >
                    Go/No-Go
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailText,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : colors.stratus[600],
                    },
                  ]}
                >
                  {goNoGo.summary}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Comment input */}
        {showComment && (
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add feedback for the student..."
            placeholderTextColor={
              isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]
            }
            multiline
            style={[
              styles.commentInput,
              {
                color: isDark ? "#FFFFFF" : colors.stratus[800],
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.02)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
              },
            ]}
          />
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => setShowComment(!showComment)}
            style={[
              styles.commentBtn,
              {
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <MessageSquare
              size={14}
              color={
                isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600]
              }
            />
          </Pressable>

          <Pressable
            onPress={handleReject}
            disabled={loading}
            style={[styles.rejectBtn, { opacity: loading ? 0.5 : 1 }]}
          >
            <XCircle size={14} color={colors.alert.red} />
            <Text style={[styles.actionText, { color: colors.alert.red }]}>
              Reject
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRevision}
            disabled={loading}
            style={[styles.revisionBtn, { opacity: loading ? 0.5 : 1 }]}
          >
            <AlertTriangle size={14} color={colors.alert.amber} />
            <Text style={[styles.actionText, { color: colors.alert.amber }]}>
              Revise
            </Text>
          </Pressable>

          <Pressable
            onPress={handleApprove}
            disabled={loading}
            style={[
              styles.approveBtn,
              {
                backgroundColor: colors.alert.green,
                opacity: loading ? 0.5 : 1,
              },
            ]}
          >
            <CheckCircle2 size={14} color="#FFFFFF" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
        </View>
      </CloudCard>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  timestamp: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },

  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  expandBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  details: {
    gap: 12,
    marginTop: 8,
  },
  detailSection: { gap: 4 },
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailSectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailMono: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    lineHeight: 16,
  },
  detailText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },

  commentInput: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 60,
    textAlignVertical: "top",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  commentBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  revisionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  actionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  approveBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
