import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/user-store";
import { useDailyBriefingStore } from "@/stores/daily-briefing-store";
import { useMetar } from "./useMetar";
import { useTaf } from "./useTaf";
import { useAiBriefing } from "./useAiBriefing";

export function useDailyBriefing() {
  const { homeAirport, pilotName } = useUserStore();
  const {
    isVisible,
    shouldAutoShow,
    markShownToday,
    dismiss,
    openManually,
    lastShownDate,
  } = useDailyBriefingStore();

  const shouldFetch = !!homeAirport && (isVisible || shouldAutoShow());
  const station = shouldFetch ? homeAirport : null;

  const { data: metarData, isLoading: metarLoading, error: metarError, refetch: refetchMetar } = useMetar(station);
  const { data: tafResult, isLoading: tafLoading } = useTaf(station);
  const tafData = tafResult?.taf ?? null;
  const { data: briefingData, isLoading: briefingLoading } = useAiBriefing(metarData?.raw);

  const hasTriggeredRef = useRef(false);

  // Auto-trigger: once METAR loads and we haven't shown today, open the modal
  useEffect(() => {
    if (hasTriggeredRef.current) return;
    if (!homeAirport) return;
    if (!shouldAutoShow()) return;
    if (metarLoading) return;
    if (!metarData) return;

    hasTriggeredRef.current = true;
    markShownToday();
    openManually();
  }, [homeAirport, metarData, metarLoading, shouldAutoShow, markShownToday, openManually]);

  // Reset trigger ref when date changes
  useEffect(() => {
    hasTriggeredRef.current = false;
  }, [lastShownDate]);

  return {
    homeAirport,
    pilotName,
    metarData,
    metarLoading,
    metarError,
    tafData,
    tafLoading,
    briefingData,
    briefingLoading,
    isVisible,
    dismiss,
    openManually,
    refetchMetar,
    hasBeenShownToday: !useDailyBriefingStore.getState().shouldAutoShow(),
  };
}
