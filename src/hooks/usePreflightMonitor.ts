/**
 * Preflight Monitor Hook
 *
 * Polls aviationweather.gov every 2 minutes while a preflight session is
 * active. On each poll the latest METAR is compared against the snapshot
 * captured at briefing time. Detected changes are persisted in the store
 * and a local notification is fired for any red-severity changes.
 */

import { useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePreflightStore } from "@/stores/preflight-store";
import { detectWeatherChanges } from "@/lib/weather/change-detector";
import { sendPreflightNotification } from "@/services/preflight-notifications";
import { fetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function usePreflightMonitor() {
  const {
    isPreflightActive,
    station,
    snapshotMetar,
    significantChanges,
    lastChecked,
    startedAt,
    addChanges,
    updateLastChecked,
    stopPreflight,
    isExpired,
    elapsedMinutes,
    hasRedChanges,
  } = usePreflightStore();

  const queryClient = useQueryClient();

  // Check auto-timeout on mount and on each render
  useEffect(() => {
    if (isPreflightActive && isExpired()) {
      console.log("[PreflightMonitor] Session expired — auto-stopping");
      stopPreflight();
    }
  }, [isPreflightActive, isExpired, stopPreflight]);

  // Poll METAR when preflight is active
  const {
    data: latestMetar,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["preflight-metar", station],
    queryFn: async () => {
      if (!station) return null;

      const data = await fetchMetar(station);
      if (!data.length) return null;

      return normalizeMetar(data[0]);
    },
    enabled: isPreflightActive && !!station && !isExpired(),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS - 10_000, // Consider stale 10s before next poll
    refetchIntervalInBackground: true,
  });

  // Process changes when new METAR data arrives
  useEffect(() => {
    if (!latestMetar || !snapshotMetar || !isPreflightActive) return;

    const changes = detectWeatherChanges(snapshotMetar, latestMetar);

    if (changes.length > 0) {
      addChanges(changes);

      // Fire local notification for red-severity changes
      const redChanges = changes.filter((c) => c.severity === "red");
      if (redChanges.length > 0) {
        const titles = redChanges.map((c) => c.title).join(", ");
        sendPreflightNotification(
          `Weather Alert — ${station}`,
          `${titles}. Review conditions before departure.`
        ).catch((err) =>
          console.warn("[PreflightMonitor] Notification failed:", err)
        );
      }

      // Also notify for first-time amber changes (only if no red)
      if (redChanges.length === 0) {
        const amberChanges = changes.filter((c) => c.severity === "amber");
        if (amberChanges.length > 0) {
          sendPreflightNotification(
            `Weather Update — ${station}`,
            `${amberChanges.length} change${amberChanges.length > 1 ? "s" : ""} detected since your briefing.`
          ).catch((err) =>
            console.warn("[PreflightMonitor] Notification failed:", err)
          );
        }
      }
    }

    updateLastChecked();
  }, [
    latestMetar,
    snapshotMetar,
    isPreflightActive,
    station,
    addChanges,
    updateLastChecked,
  ]);

  // Stop handler that also invalidates the query
  const stop = useCallback(() => {
    stopPreflight();
    queryClient.removeQueries({ queryKey: ["preflight-metar"] });
  }, [stopPreflight, queryClient]);

  // Computed values
  const elapsed = useMemo(() => {
    if (!isPreflightActive || !startedAt) return 0;
    return elapsedMinutes();
  }, [isPreflightActive, startedAt, elapsedMinutes, lastChecked]);

  const lastCheckedText = useMemo(() => {
    if (!lastChecked) return null;

    const checked =
      lastChecked instanceof Date ? lastChecked : new Date(lastChecked);
    const diffMs = Date.now() - checked.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return "Just now";
    if (diffMin === 1) return "1 min ago";
    return `${diffMin} min ago`;
  }, [lastChecked]);

  return {
    isActive: isPreflightActive && !isExpired(),
    isLoading,
    error,
    station,
    elapsed,
    lastCheckedText,
    changes: significantChanges,
    hasRedChanges: hasRedChanges(),
    latestMetar,
    stop,
  };
}
