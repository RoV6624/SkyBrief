/**
 * Manage Instructors Screen
 *
 * Admin-only screen that shows all instructors in the flight school.
 * Displays each instructor with their role badge and student count.
 * Tapping an instructor shows their assigned students.
 */

import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  UserCheck,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { getSchoolInstructors } from "@/services/tenant-api";
import { useSchoolStudents } from "@/hooks/useStudentMetrics";
import { CloudCard } from "@/components/ui/CloudCard";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ManageInstructorsScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { role } = useAuthStore();
  const { tenantId, tenantConfig } = useTenantStore();

  const {
    data: instructors,
    isLoading: instructorsLoading,
    refetch: refetchInstructors,
  } = useQuery({
    queryKey: ["school-instructors", tenantId],
    queryFn: () => getSchoolInstructors(tenantId!),
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const {
    data: students,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useSchoolStudents(tenantId);

  const isLoading = instructorsLoading || studentsLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchInstructors(), refetchStudents()]);
  }, [refetchInstructors, refetchStudents]);

  // Build a map of instructor UID -> student count
  // Students may have `assignedInstructorUid` but it's not always in the
  // schema returned by getSchoolStudents. We show "-" when unavailable.
  const studentCountByInstructor = useMemo(() => {
    const countMap: Record<string, number> = {};
    // Students from useSchoolStudents only have uid/name/role — no
    // assignedInstructorUid. We cannot reliably count per instructor.
    // Return an empty map; the UI will show "-".
    return countMap;
  }, [students]);

  const schoolName = tenantConfig?.branding?.schoolName ?? "Flight School";

  const handleInstructorTap = useCallback(
    (instructor: { uid: string; name: string; role: string }) => {
      Haptics.selectionAsync();
      router.push({ pathname: "/instructor/student-progress", params: { filterInstructor: instructor.uid } });
    },
    [router]
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
              <ArrowLeft
                size={22}
                color={isDark ? "#FFFFFF" : colors.stratus[800]}
              />
            </Pressable>
            <Users size={22} color={colors.accent} />
            <Text
              style={[
                styles.title,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Manage Instructors
            </Text>
          </Animated.View>

          {/* School admin badge */}
          <Animated.View entering={FadeInDown.delay(80)} style={styles.badgeRow}>
            <View style={styles.adminBadge}>
              <ShieldCheck size={12} color={colors.accent} />
              <Text style={styles.adminBadgeText}>{schoolName}</Text>
            </View>
            {(role === "school_admin" || role === "admin") && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Admin</Text>
              </View>
            )}
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
            Instructors and administrators in your school
          </Text>

          {/* Instructor count */}
          <Text
            style={[
              styles.countLabel,
              {
                color: isDark
                  ? "rgba(255,255,255,0.4)"
                  : colors.stratus[500],
              },
            ]}
          >
            {instructors?.length ?? 0} INSTRUCTOR
            {(instructors?.length ?? 0) !== 1 ? "S" : ""}
          </Text>

          {/* Loading */}
          {instructorsLoading && (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={styles.loader}
            />
          )}

          {/* Instructor list */}
          {instructors?.map((instructor, index) => {
            const count = studentCountByInstructor[instructor.uid];
            const displayCount =
              count !== undefined ? `${count}` : "-";

            return (
              <Animated.View
                key={instructor.uid}
                entering={FadeInDown.delay(100 + index * 40)}
              >
                <Pressable onPress={() => handleInstructorTap(instructor)}>
                  <CloudCard>
                    <View style={styles.instructorRow}>
                      <View style={styles.instructorAvatar}>
                        <Text style={styles.instructorInitial}>
                          {instructor.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.instructorInfo}>
                        <Text
                          style={[
                            styles.instructorName,
                            {
                              color: isDark
                                ? "#FFFFFF"
                                : colors.stratus[800],
                            },
                          ]}
                        >
                          {instructor.name}
                        </Text>
                        <View style={styles.instructorMeta}>
                          <View
                            style={[
                              styles.instructorRoleBadge,
                              {
                                backgroundColor:
                                  instructor.role === "school_admin"
                                    ? `${colors.alert.amber}18`
                                    : `${colors.accent}18`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.instructorRoleText,
                                {
                                  color:
                                    instructor.role === "school_admin"
                                      ? colors.alert.amber
                                      : colors.accent,
                                },
                              ]}
                            >
                              {instructor.role === "school_admin"
                                ? "Admin"
                                : "CFI"}
                            </Text>
                          </View>
                          <View style={styles.studentCountBadge}>
                            <UserCheck
                              size={11}
                              color={
                                isDark
                                  ? "rgba(255,255,255,0.4)"
                                  : colors.stratus[500]
                              }
                            />
                            <Text
                              style={[
                                styles.studentCountText,
                                {
                                  color: isDark
                                    ? "rgba(255,255,255,0.4)"
                                    : colors.stratus[500],
                                },
                              ]}
                            >
                              {displayCount} students
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight
                        size={16}
                        color={
                          isDark
                            ? "rgba(255,255,255,0.3)"
                            : colors.stratus[400]
                        }
                      />
                    </View>
                  </CloudCard>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Empty state */}
          {instructors && instructors.length === 0 && !instructorsLoading && (
            <Animated.View
              entering={FadeInDown.delay(150)}
              style={styles.emptyState}
            >
              <Users
                size={36}
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
                No instructors found
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
                Instructors will appear here once they join your school
              </Text>
            </Animated.View>
          )}

          {/* No tenant */}
          {!tenantId && (
            <Animated.View
              entering={FadeInDown.delay(150)}
              style={styles.emptyState}
            >
              <Users
                size={36}
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
                Set up or join a school to manage instructors
              </Text>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
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
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.accent}14`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.accent,
  },
  roleBadge: {
    backgroundColor: `${colors.alert.green}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.alert.green,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  countLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 4,
  },

  // Instructor row
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  instructorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.accent}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  instructorInitial: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.accent,
  },
  instructorInfo: { flex: 1 },
  instructorName: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },
  instructorMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  instructorRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  instructorRoleText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  studentCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  studentCountText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 50,
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

  // Loader
  loader: { paddingVertical: 16 },
});
