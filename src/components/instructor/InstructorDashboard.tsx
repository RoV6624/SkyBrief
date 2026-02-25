/**
 * Instructor Dashboard — focused view for CFI users.
 * Shows their students, pending dispatches, and teaching-focused quick actions.
 */

import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardList,
  Users,
  BookOpen,
  Send,
  GraduationCap,
  Calendar,
  User,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useReviewQueue } from "@/hooks/useStudentMetrics";
import { getInstructorStudents } from "@/services/tenant-api";
import { getDispatchQueue } from "@/services/dispatch-api";
import { CloudCard } from "@/components/ui/CloudCard";
import { JoinSchoolModal } from "@/components/instructor/JoinSchoolModal";
import { useState } from "react";

export function InstructorDashboard() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const { tenantId } = useTenantStore();

  const instructorUid = user?.uid ?? "";
  const pilotName = user?.displayName ?? "Instructor";

  const [showJoinModal, setShowJoinModal] = useState(false);

  // My students
  const {
    data: myStudents,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["instructor-students", instructorUid, tenantId],
    queryFn: () => getInstructorStudents(instructorUid, tenantId ?? ""),
    enabled: !!instructorUid && !!tenantId,
    staleTime: 300_000,
  });

  // Pending dispatches count
  const {
    data: dispatchQueue,
    isLoading: dispatchLoading,
    refetch: refetchDispatches,
  } = useQuery({
    queryKey: ["dispatch-queue", instructorUid, tenantId],
    queryFn: () => getDispatchQueue(instructorUid, tenantId ?? ""),
    enabled: !!instructorUid && !!tenantId,
    staleTime: 30_000,
  });

  // Briefing review queue
  const {
    data: reviewQueue,
    isLoading: reviewLoading,
    refetch: refetchReview,
  } = useReviewQueue(instructorUid || null, tenantId);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStudents(), refetchDispatches(), refetchReview()]);
  }, [refetchStudents, refetchDispatches, refetchReview]);

  const isLoading = studentsLoading || dispatchLoading || reviewLoading;
  const pendingDispatches = dispatchQueue?.length ?? 0;
  const pendingBriefings = reviewQueue?.length ?? 0;
  const studentCount = myStudents?.length ?? 0;

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
            <ClipboardList size={24} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.greeting,
                  { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500] },
                ]}
              >
                Welcome back,
              </Text>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                ]}
              >
                {pilotName}
              </Text>
            </View>
          </Animated.View>

          {/* Pending Counts */}
          {tenantId && (pendingDispatches > 0 || pendingBriefings > 0) && (
            <Animated.View entering={FadeInDown.delay(80)} style={styles.alertRow}>
              {pendingDispatches > 0 && (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push("/instructor/dispatch-queue");
                  }}
                  style={[styles.alertBadge, { backgroundColor: "rgba(245,158,11,0.12)" }]}
                >
                  <Send size={14} color={colors.alert.amber} />
                  <Text style={[styles.alertBadgeText, { color: colors.alert.amber }]}>
                    {pendingDispatches} dispatch{pendingDispatches !== 1 ? "es" : ""} pending
                  </Text>
                </Pressable>
              )}
              {pendingBriefings > 0 && (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    // scroll down to briefings or navigate
                  }}
                  style={[styles.alertBadge, { backgroundColor: "rgba(12,140,233,0.12)" }]}
                >
                  <ClipboardList size={14} color={colors.accent} />
                  <Text style={[styles.alertBadgeText, { color: colors.accent }]}>
                    {pendingBriefings} briefing{pendingBriefings !== 1 ? "s" : ""} to review
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* My Students */}
          {tenantId && (
            <Animated.View entering={FadeInDown.delay(120)}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                ]}
              >
                MY STUDENTS ({studentCount})
              </Text>
              {myStudents && myStudents.length > 0 ? (
                myStudents.map((student) => (
                  <Pressable
                    key={student.uid}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push({
                        pathname: "/instructor/student-detail",
                        params: { studentUid: student.uid },
                      });
                    }}
                  >
                    <CloudCard>
                      <View style={styles.studentRow}>
                        <View
                          style={[
                            styles.avatar,
                            { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(12,140,233,0.1)" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                            ]}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.studentName,
                              { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                            ]}
                          >
                            {student.name}
                          </Text>
                          {student.email && (
                            <Text
                              style={[
                                styles.studentEmail,
                                { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                              ]}
                            >
                              {student.email}
                            </Text>
                          )}
                        </View>
                      </View>
                    </CloudCard>
                  </Pressable>
                ))
              ) : (
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
                  ]}
                >
                  No students assigned to you yet
                </Text>
              )}
            </Animated.View>
          )}

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(180)}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
              ]}
            >
              QUICK ACTIONS
            </Text>

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
                    My Students
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    View student metrics and progress
                  </Text>
                </View>
              </CloudCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/syllabus");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <GraduationCap size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Syllabus
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Browse curriculum and assign lessons
                  </Text>
                </View>
              </CloudCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/instructor/training");
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
                    Training
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Create lessons and build training plans
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
          </Animated.View>

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  alertRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  alertBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold" },
  studentName: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  studentEmail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
  quickAction: { gap: 4 },
  quickActionText: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  quickActionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
