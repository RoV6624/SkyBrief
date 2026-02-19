import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchAllUsers,
  fetchDailyMetrics,
  fetchAirportMetrics,
  computeRetention,
  type AdminUserSummary,
  type DailyMetrics,
  type AirportMetrics,
  type RetentionMetrics,
} from "@/services/admin-api";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useAdminUsers() {
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return useQuery<AdminUserSummary>({
    queryKey: ["admin", "users"],
    queryFn: fetchAllUsers,
    staleTime: STALE_TIME,
    enabled: isAdmin,
  });
}

export function useAdminDailyMetrics(days: number = 7) {
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return useQuery<DailyMetrics[]>({
    queryKey: ["admin", "dailyMetrics", days],
    queryFn: () => fetchDailyMetrics(days),
    staleTime: STALE_TIME,
    enabled: isAdmin,
  });
}

export function useAdminAirportMetrics() {
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return useQuery<AirportMetrics>({
    queryKey: ["admin", "airportMetrics"],
    queryFn: fetchAirportMetrics,
    staleTime: STALE_TIME,
    enabled: isAdmin,
  });
}

export function useAdminRetention() {
  const { data: userData } = useAdminUsers();

  return useQuery<RetentionMetrics>({
    queryKey: ["admin", "retention", userData?.users.length],
    queryFn: () => computeRetention(userData?.users ?? []),
    staleTime: STALE_TIME,
    enabled: !!userData,
  });
}
