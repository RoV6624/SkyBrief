import { useState, useCallback } from "react";
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
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  User,
  FileText,
  Shield,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { updateBriefingStatus } from "@/services/tenant-api";
import type { BriefingSubmission } from "@/lib/briefing/types";

interface Props {
  submission: BriefingSubmission;
  onStatusChange?: () => void;
}

export function BriefingReviewCard({ submission, onStatusChange }: Props) {
  const { isDark } = useTheme();
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date | any) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleApprove = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    const success = await updateBriefingStatus(
      submission.id,
      "approved",
      comment || undefined
    );
    setLoading(false);
    if (success) {
      onStatusChange?.();
    } else {
      Alert.alert("Error", "Failed to approve briefing. Please try again.");
    }
  }, [submission.id, comment, onStatusChange]);

  const handleReject = useCallback(async () => {
    if (!comment.trim()) {
      Alert.alert("Comment Required", "Please provide feedback explaining what needs revision.");
      setShowComment(true);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLoading(true);
    const success = await updateBriefingStatus(
      submission.id,
      "revision_requested",
      comment
    );
    setLoading(false);
    if (success) {
      onStatusChange?.();
    } else {
      Alert.alert("Error", "Failed to request revision. Please try again.");
    }
  }, [submission.id, comment, onStatusChange]);

  const checklist = submission.checklist;
  const checkedCount = checklist.items.filter((i) => i.status === "checked").length;
  const totalCount = checklist.items.length;
  const flaggedCount = checklist.items.filter((i) => i.status === "flagged").length;

  return (
    <Animated.View entering={FadeInDown}>
      <CloudCard>
        {/* Student info */}
        <View style={styles.studentRow}>
          <User size={16} color={colors.accent} />
          <View style={styles.studentInfo}>
            <Text
              style={[
                styles.studentName,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              {submission.studentName}
            </Text>
            <Text
              style={[
                styles.briefingType,
                { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
              ]}
            >
              {checklist.flightType.toUpperCase()} — {checklist.station}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Clock size={12} color={colors.alert.amber} />
            <Text style={[styles.statusText, { color: colors.alert.amber }]}>
              Pending
            </Text>
          </View>
        </View>

        {/* Checklist summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <FileText size={13} color={isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500]} />
            <Text
              style={[
                styles.summaryLabel,
                { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600] },
              ]}
            >
              {checkedCount}/{totalCount} items
            </Text>
          </View>

          {submission.fratScore !== undefined && (
            <View style={styles.summaryItem}>
              <Shield size={13} color={
                submission.fratScore < 25 ? colors.alert.green
                  : submission.fratScore < 50 ? colors.alert.amber
                  : colors.alert.red
              } />
              <Text
                style={[
                  styles.summaryLabel,
                  { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600] },
                ]}
              >
                FRAT: {submission.fratScore}
              </Text>
            </View>
          )}

          {submission.minimumsPass !== undefined && (
            <View style={styles.summaryItem}>
              {submission.minimumsPass ? (
                <CheckCircle2 size={13} color={colors.alert.green} />
              ) : (
                <XCircle size={13} color={colors.alert.red} />
              )}
              <Text
                style={[
                  styles.summaryLabel,
                  { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600] },
                ]}
              >
                Minimums {submission.minimumsPass ? "Pass" : "Fail"}
              </Text>
            </View>
          )}

          {flaggedCount > 0 && (
            <View style={styles.summaryItem}>
              <XCircle size={13} color={colors.alert.red} />
              <Text style={[styles.summaryLabel, { color: colors.alert.red }]}>
                {flaggedCount} flagged
              </Text>
            </View>
          )}
        </View>

        {/* Submitted time */}
        <Text
          style={[
            styles.timestamp,
            { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
          ]}
        >
          Submitted {formatDate(submission.submittedAt)}
        </Text>

        {/* Comment input */}
        {showComment && (
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add feedback for the student..."
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]}
            multiline
            style={[
              styles.commentInput,
              {
                color: isDark ? "#FFFFFF" : colors.stratus[800],
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
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
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <MessageSquare
              size={14}
              color={isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600]}
            />
          </Pressable>

          <Pressable
            onPress={handleReject}
            disabled={loading}
            style={[styles.rejectBtn, { opacity: loading ? 0.5 : 1 }]}
          >
            <XCircle size={14} color={colors.alert.red} />
            <Text style={[styles.actionText, { color: colors.alert.red }]}>
              Request Revision
            </Text>
          </Pressable>

          <Pressable
            onPress={handleApprove}
            disabled={loading}
            style={[
              styles.approveBtn,
              { backgroundColor: colors.alert.green, opacity: loading ? 0.5 : 1 },
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

const styles = StyleSheet.create({
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  briefingType: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
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
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timestamp: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
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
    gap: 8,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    flex: 1,
    justifyContent: "center",
  },
  actionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  approveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
