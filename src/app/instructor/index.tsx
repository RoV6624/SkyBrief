import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Users, BarChart3, BookOpen, Calendar, Send } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useReviewQueue } from "@/hooks/useStudentMetrics";
import { BriefingReviewCard } from "@/components/instructor/BriefingReviewCard";
import { CloudCard } from "@/components/ui/CloudCard";

export default function InstructorReviewScreen() {
  const { isDark, theme } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const {
    data: queue,
    isLoading,
    refetch,
  } = useReviewQueue(user?.uid ?? null, tenantId);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleStatusChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }, [queryClient]);

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
            <ClipboardList size={24} color={colors.accent} />
            <Text
              style={[
                styles.title,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Review Queue
            </Text>
          </Animated.View>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
            ]}
          >
            Student briefings awaiting your review
          </Text>

          {/* Quick actions */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.quickActions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/student-progress");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <Users size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Student Progress
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    View metrics for your students
                  </Text>
                </View>
              </CloudCard>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/analytics");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <BarChart3 size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    School Analytics
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    School-wide performance data
                  </Text>
                </View>
              </CloudCard>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/lessons");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <BookOpen size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Lesson Plans
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Create and manage lesson plans
                  </Text>
                </View>
              </CloudCard>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/scheduling");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <Calendar size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Schedule
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Manage lesson scheduling
                  </Text>
                </View>
              </CloudCard>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/dispatch-queue");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <Send size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Dispatch Queue
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Review and approve student dispatches
                  </Text>
                </View>
              </CloudCard>
            </Pressable>
          </Animated.View>

          {/* Queue count */}
          {queue && queue.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150)}>
              <Text
                style={[
                  styles.queueCount,
                  { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                ]}
              >
                {queue.length} briefing{queue.length !== 1 ? "s" : ""} pending review
              </Text>
            </Animated.View>
          )}

          {/* Review cards */}
          {queue &&
            queue.map((submission, index) => (
              <Animated.View
                key={submission.id}
                entering={FadeInDown.delay(200 + index * 50)}
              >
                <BriefingReviewCard
                  submission={submission}
                  onStatusChange={handleStatusChange}
                />
              </Animated.View>
            ))}

          {/* Empty state */}
          {queue && queue.length === 0 && !isLoading && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
              <ClipboardList size={40} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
                ]}
              >
                No pending briefings
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
                ]}
              >
                Student briefings will appear here when submitted for review
              </Text>
            </Animated.View>
          )}

          {/* No tenant setup */}
          {!tenantId && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
              <Users size={40} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600] },
                ]}
              >
                Not connected to a flight school
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
                ]}
              >
                Ask your school administrator for an invitation code to join
              </Text>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

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
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  quickActions: {},
  quickAction: { gap: 4 },
  quickActionText: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  quickActionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
});
