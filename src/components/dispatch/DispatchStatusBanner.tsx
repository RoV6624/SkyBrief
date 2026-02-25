/**
 * DispatchStatusBanner
 *
 * A banner shown on the student's main briefing tab when they have
 * a pending or active dispatch. Fetches its own data — no props needed.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Clock, CheckCircle2, AlertTriangle, FileEdit } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { getStudentDispatchHistory } from "@/services/dispatch-api";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { DispatchStatus } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

interface StatusConfig {
  icon: React.ReactNode;
  label: string;
  description: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const ACTIVE_STATUSES: DispatchStatus[] = [
  "draft",
  "submitted",
  "revision_requested",
  "approved",
];

function getStatusConfig(status: DispatchStatus, isDark: boolean): StatusConfig | null {
  switch (status) {
    case "draft":
      return {
        icon: <FileEdit size={16} color={isDark ? "rgba(255,255,255,0.6)" : "#6b7280"} />,
        label: "Draft",
        description: "Complete your dispatch to submit",
        backgroundColor: isDark ? "rgba(107,114,128,0.15)" : "rgba(107,114,128,0.1)",
        borderColor: isDark ? "rgba(107,114,128,0.3)" : "rgba(107,114,128,0.25)",
        textColor: isDark ? "rgba(255,255,255,0.7)" : "#6b7280",
      };
    case "submitted":
      return {
        icon: <Clock size={16} color={colors.alert.amber} />,
        label: "Submitted",
        description: "Awaiting instructor review",
        backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
        borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.25)",
        textColor: colors.alert.amber,
      };
    case "approved":
      return {
        icon: <CheckCircle2 size={16} color={colors.alert.green} />,
        label: "Approved",
        description: "You're cleared for flight!",
        backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.1)",
        borderColor: isDark ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.25)",
        textColor: colors.alert.green,
      };
    case "revision_requested":
      return {
        icon: <AlertTriangle size={16} color="#f97316" />,
        label: "Revision Needed",
        description: "Tap to see feedback",
        backgroundColor: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.1)",
        borderColor: isDark ? "rgba(249,115,22,0.3)" : "rgba(249,115,22,0.25)",
        textColor: "#f97316",
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DispatchStatusBanner() {
  const { isDark } = useTheme();
  const router = useRouter();
  const uid = useAuthStore((s) => s.user?.uid);
  const tenantId = useTenantStore((s) => s.tenantId);

  const { data: dispatches } = useQuery({
    queryKey: ["student-dispatch-banner", uid, tenantId],
    queryFn: () => getStudentDispatchHistory(uid!, tenantId!),
    enabled: !!uid && !!tenantId,
    staleTime: 30_000,
  });

  // Find the most recent active dispatch
  const activeDispatch = dispatches?.find((d) =>
    ACTIVE_STATUSES.includes(d.status)
  );

  if (!activeDispatch) return null;

  const config = getStatusConfig(activeDispatch.status, isDark);
  if (!config) return null;

  return (
    <Animated.View entering={FadeInDown.delay(80)}>
      <Pressable
        onPress={() => {
          router.push("/instructor/dispatch-queue" as any);
        }}
        style={[
          styles.banner,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        {config.icon}
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: config.textColor }]}>
            {config.label}
          </Text>
          <Text
            style={[
              styles.description,
              {
                color: isDark
                  ? "rgba(255,255,255,0.5)"
                  : "rgba(0,0,0,0.5)",
              },
            ]}
          >
            {config.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
