/**
 * School Admin Dashboard — school-wide visibility for school_admin users.
 * Shows school stats, all instructors, recent dispatches, and quick actions.
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
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Shield,
  Users,
  BarChart3,
  BookOpen,
  Send,
  GraduationCap,
  UserCog,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useSchoolStudents } from "@/hooks/useStudentMetrics";
import { useSchoolInstructors } from "@/hooks/useSchoolInstructors";
import { CloudCard } from "@/components/ui/CloudCard";

export function AdminDashboard() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const { tenantId, tenantConfig } = useTenantStore();

  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } =
    useSchoolStudents(tenantId);
  const { data: instructors, isLoading: instructorsLoading, refetch: refetchInstructors } =
    useSchoolInstructors(tenantId);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStudents(), refetchInstructors()]);
  }, [refetchStudents, refetchInstructors]);

  const isLoading = studentsLoading || instructorsLoading;
  const schoolName = tenantConfig?.branding?.schoolName ?? "Flight School";
  const studentCount = students?.length ?? 0;
  const instructorCount = instructors?.length ?? 0;

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
            <Shield size={24} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                ]}
              >
                {schoolName}
              </Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>SCHOOL ADMIN</Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Stats */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(12,140,233,0.06)" },
              ]}
            >
              <GraduationCap size={18} color={colors.accent} />
              <Text
                style={[
                  styles.statNumber,
                  { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                ]}
              >
                {studentCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500] },
                ]}
              >
                Students
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(12,140,233,0.06)" },
              ]}
            >
              <Users size={18} color={colors.accent} />
              <Text
                style={[
                  styles.statNumber,
                  { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                ]}
              >
                {instructorCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500] },
                ]}
              >
                Instructors
              </Text>
            </View>
          </Animated.View>

          {/* Instructors Section */}
          <Animated.View entering={FadeInDown.delay(150)}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
              ]}
            >
              INSTRUCTORS
            </Text>
            {instructors && instructors.length > 0 ? (
              instructors.map((inst) => (
                <Pressable
                  key={inst.uid}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({ pathname: "/instructor/student-progress", params: { filterInstructor: inst.uid } });
                  }}
                  accessibilityLabel={`View students for ${inst.name}`}
                >
                  <CloudCard>
                    <View style={styles.instructorRow}>
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
                          {inst.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.instructorName,
                            { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                          ]}
                        >
                          {inst.name}
                        </Text>
                        <Text
                          style={[
                            styles.instructorRole,
                            { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                          ]}
                        >
                          {inst.role === "school_admin" ? "School Admin" : "Instructor"}
                        </Text>
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
                No instructors found
              </Text>
            )}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(200)}>
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
                router.push("/instructor/syllabus");
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
                    Manage Curriculum
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Browse and assign syllabus lessons
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
                router.push("/instructor/manage-instructors");
              }}
            >
              <CloudCard>
                <View style={styles.quickAction}>
                  <UserCog size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    Manage Instructors
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    View instructors and reassign students
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
                    Dispatch Overview
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    Review dispatch activity across all instructors
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
                  <GraduationCap size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickActionText,
                      { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    All Students
                  </Text>
                  <Text
                    style={[
                      styles.quickActionSub,
                      { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
                    ]}
                  >
                    View progress for all school students
                  </Text>
                </View>
              </CloudCard>
            </Pressable>
          </Animated.View>

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
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  adminBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
  },
  statNumber: { fontSize: 28, fontFamily: "SpaceGrotesk_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
  },
  instructorRow: {
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
  instructorName: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  instructorRole: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
  quickAction: { gap: 4 },
  quickActionText: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  quickActionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
