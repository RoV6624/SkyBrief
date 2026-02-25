/**
 * CFI Dispatch Approval Queue screen.
 *
 * Lists pending dispatch packets from Firestore, allowing the
 * instructor to review each packet's FRAT, W&B, weather, and
 * Go/No-Go data and then approve, reject, or request revision.
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Inbox, CheckCircle2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { getDispatchQueue, updateDispatchStatus } from "@/services/dispatch-api";
import { DispatchReviewCard } from "@/components/instructor/DispatchReviewCard";
import { JoinSchoolModal } from "@/components/instructor/JoinSchoolModal";
import type { DispatchStatus } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DispatchQueueScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const instructorUid = user?.uid ?? "";

  const {
    data: queue,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["dispatch-queue", instructorUid, tenantId],
    queryFn: () => getDispatchQueue(instructorUid, tenantId ?? ""),
    enabled: !!instructorUid && !!tenantId,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleAction = useCallback(
    async (
      dispatchId: string,
      action: "approved" | "rejected" | "revision_requested",
      comment?: string
    ) => {
      setProcessingIds((prev) => new Set(prev).add(dispatchId));

      const success = await updateDispatchStatus(
        dispatchId,
        action as DispatchStatus,
        comment
      );

      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(dispatchId);
        return next;
      });

      if (success) {
        queryClient.invalidateQueries({ queryKey: ["dispatch-queue"] });
      } else {
        Alert.alert(
          "Error",
          `Failed to ${action === "approved" ? "approve" : action === "rejected" ? "reject" : "request revision for"} dispatch. Please try again.`
        );
      }
    },
    [queryClient]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={isDark ? "#ffffff" : colors.stratus[500]}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft size={22} color={isDark ? "#FFFFFF" : colors.stratus[800]} />
            </Pressable>
            <Send size={22} color={colors.accent} />
            <Text
              style={[
                styles.title,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Dispatch Queue
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
            Student dispatch packets awaiting your approval
          </Text>

          {/* Queue count */}
          {queue && queue.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <Text
                style={[
                  styles.queueCount,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.4)"
                      : colors.stratus[500],
                  },
                ]}
              >
                {queue.length} dispatch{queue.length !== 1 ? "es" : ""} pending
              </Text>
            </Animated.View>
          )}

          {/* Cards */}
          {queue &&
            queue.map((dispatchPacket, index) => {
              const isQuickApprovable =
                dispatchPacket.fratResult?.riskLevel === "low" &&
                dispatchPacket.wbSnapshot?.withinLimits === true;

              return (
                <Animated.View
                  key={dispatchPacket.id}
                  entering={FadeInDown.delay(150 + index * 50)}
                  style={styles.cardWrapper}
                >
                  {isQuickApprovable && (
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success
                        );
                        Alert.alert(
                          "Approve Dispatch",
                          "Are you sure you want to approve this dispatch?",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Approve", onPress: () => handleAction(dispatchPacket.id, "approved") },
                          ]
                        );
                      }}
                      disabled={processingIds.has(dispatchPacket.id)}
                      style={[
                        styles.quickApproveBtn,
                        {
                          opacity: processingIds.has(dispatchPacket.id) ? 0.5 : 1,
                        },
                      ]}
                      accessibilityLabel="Quick approve dispatch"
                    >
                      <CheckCircle2 size={16} color="#FFFFFF" />
                      <Text style={styles.quickApproveBtnText}>Approve</Text>
                    </Pressable>
                  )}
                  <DispatchReviewCard
                    dispatch={dispatchPacket}
                    onAction={(action, comment) =>
                      handleAction(dispatchPacket.id, action, comment)
                    }
                  />
                </Animated.View>
              );
            })}

          {/* Empty state */}
          {queue && queue.length === 0 && !isLoading && (
            <Animated.View
              entering={FadeInDown.delay(150)}
              style={styles.emptyState}
            >
              <Inbox
                size={40}
                color={
                  isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                }
              />
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : colors.stratus[600],
                  },
                ]}
              >
                No pending dispatches
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.3)"
                      : colors.stratus[400],
                  },
                ]}
              >
                Student dispatch packets will appear here when submitted for
                approval
              </Text>
            </Animated.View>
          )}

          {/* No tenant */}
          {!tenantId && (
            <Animated.View
              entering={FadeInDown.delay(150)}
              style={styles.emptyState}
            >
              <Send
                size={40}
                color={
                  isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                }
              />
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : colors.stratus[600],
                  },
                ]}
              >
                Not connected to a flight school
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.3)"
                      : colors.stratus[400],
                  },
                ]}
              >
                Enter your school's invitation code to get started
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowJoinModal(true);
                }}
                style={styles.joinSchoolBtn}
              >
                <Text style={styles.joinSchoolBtnText}>Join School</Text>
              </Pressable>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <JoinSchoolModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
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
  queueCount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 19,
  },
  cardWrapper: {
    position: "relative",
  },
  quickApproveBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.alert.green,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickApproveBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  joinSchoolBtn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  joinSchoolBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
});
