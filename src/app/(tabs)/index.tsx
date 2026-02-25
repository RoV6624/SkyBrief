import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Search, CloudSun, Newspaper, AlertTriangle, CloudOff, CheckCircle2, XCircle, Clock } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useWeatherStore } from "@/stores/weather-store";
import { useAuthStore } from "@/stores/auth-store";
import { useUserStore } from "@/stores/user-store";
import { useMonitorStore } from "@/stores/monitor-store";
import { useSceneStore } from "@/stores/scene-store";
import { useDaylightStore } from "@/stores/daylight-store";
import { useMetar } from "@/hooks/useMetar";
import { useTaf } from "@/hooks/useTaf";
import { useAiBriefing } from "@/hooks/useAiBriefing";
import { useAlerts } from "@/hooks/useAlerts";
import { searchAirports } from "@/services/airport-data";
import type { AirportData } from "@/lib/airport/types";

import { WeatherCards, StationHeader } from "@/components/briefing/WeatherCards";
import { DataCard } from "@/components/briefing/DataCard";
import { GoNoGoCard } from "@/components/briefing/GoNoGoCard";
import { evaluateGoNoGo } from "@/lib/briefing/go-no-go";

import { CloudLayerStack } from "@/components/weather/CloudLayerStack";
import { DaylightTimeline } from "@/components/weather/DaylightTimeline";
import { FuelPriceCardEnhanced as FuelPriceCard } from "@/components/weather/FuelPriceCardEnhanced";
import { MetarRawDisplay } from "@/components/weather/MetarRawDisplay";
import { AiBriefingCard } from "@/components/weather/AiBriefingCard";
import { AlertFeed } from "@/components/weather/AlertFeed";
import { ForecastTimeline } from "@/components/weather/ForecastTimeline";
import { DepartureWindowCard } from "@/components/weather/DepartureWindowCard";
import { LearningAnnotation } from "@/components/weather/LearningAnnotation";
import { MultiStationDashboard } from "@/components/weather/MultiStationDashboard";
import { SubmitPirepModal } from "@/components/weather/SubmitPirepModal";
import { DailyBriefingModal } from "@/components/briefing/DailyBriefingModal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { NotamSection } from "@/components/notam/NotamSection";
import { PirepSection } from "@/components/weather/PirepSection";
import { RunwayWindCard } from "@/components/runway/RunwayWindCard";
import { useRunways } from "@/hooks/useRunways";
import { PivotalAltitudeTable } from "@/components/weather/PivotalAltitudeTable";
import { CloudCard } from "@/components/ui/CloudCard";
import { StartPreflightButton } from "@/components/briefing/StartPreflightButton";
import { PreflightMonitor } from "@/components/briefing/PreflightMonitor";
import { DispatchFlow } from "@/components/dispatch/DispatchFlow";
import { DispatchStatusBanner } from "@/components/dispatch/DispatchStatusBanner";
import { useTenantStore } from "@/stores/tenant-store";
import { usePreflightStore } from "@/stores/preflight-store";

import { mapMetarToScene } from "@/lib/weather/scene-mapper";
import { evaluateMinimums } from "@/lib/minimums/evaluate";
import { flightCategoryAnnotations } from "@/lib/weather/annotations";
import { findStationCoords } from "@/lib/route/station-coords";
import { useBriefingStore } from "@/stores/briefing-store";
import { useDailyBriefing } from "@/hooks/useDailyBriefing";
import { useFamiliarityStore } from "@/stores/familiarity-store";
import { getFamiliarityInfo, getFamiliarityText } from "@/lib/frat/familiarity";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { trackEvent } from "@/services/analytics";

function formatObservationAge(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) {
    const hh = date.getUTCHours().toString().padStart(2, "0");
    const mm = date.getUTCMinutes().toString().padStart(2, "0");
    return `Weather observed at ${hh}:${mm}Z`;
  }

  if (diffMin < 60) return `Weather observed ${diffMin} min ago`;

  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `Weather observed ${hrs} hr ago`;
  return `Weather observed ${hrs} hr ${mins} min ago`;
}

function getObservationTier(observationTime: Date): "green" | "default" | "amber" | "red" {
  const ageMin = Math.floor((Date.now() - observationTime.getTime()) / 60_000);
  if (ageMin > 120) return "red";
  if (ageMin > 60) return "amber";
  if (ageMin < 30) return "green";
  return "default";
}

function FamiliarityBadge({ station }: { station: string }) {
  const { getVisit, getFamiliarityScore } = useFamiliarityStore();
  const visit = getVisit(station);
  const score = getFamiliarityScore(station);
  const info = getFamiliarityInfo(visit, score);
  const famColor = info.label === "home" ? colors.alert.green
    : info.label === "familiar" ? "#0c8ce9"
    : info.label === "visited" ? colors.alert.amber
    : colors.alert.red;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <View style={{ backgroundColor: famColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
        <Text style={{ fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: "#FFFFFF", letterSpacing: 0.5 }}>
          {info.label === "unfamiliar" ? "FIRST VISIT" : info.label.toUpperCase()}
        </Text>
      </View>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" }}>
        {getFamiliarityText(info)}
      </Text>
    </View>
  );
}

function DaylightSection({ station, settings }: { station: string; settings: any }) {
  const reducedMotion = useReducedMotion();
  const coords = findStationCoords(station);
  if (!coords) return null;
  return (
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(175)}>
      <CloudCard>
        <DaylightTimeline
          lat={coords.lat}
          lon={coords.lon}
          settings={settings}
        />
      </CloudCard>
    </Animated.View>
  );
}

export default function BriefingScreen() {
  const { isDark, theme } = useTheme();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<AirportData[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchExpandedSV = useSharedValue(false);
  const hasAutoLoadedRef = useRef(false);
  const { user } = useAuthStore();
  const { homeAirport, pilotName, defaultAircraft } = useUserStore();
  const { selectedStation, setStation, recentStations, addRecentStation, pinnedStations, togglePinnedStation } =
    useWeatherStore();
  const {
    thresholds,
    runwayHeading,
    personalMinimums,
    minimumsEnabled,
  } = useMonitorStore();
  const { scene, setScene } = useSceneStore();
  const { settings: daylightSettings } = useDaylightStore();
  const { learningMode } = useBriefingStore();
  const { getVisit, getFamiliarityScore, recordVisit } = useFamiliarityStore();
  // M2: Proper Zustand selectors instead of .getState() in JSX
  const isSchoolMode = useTenantStore(s => s.isSchoolMode);
  const authRole = useAuthStore(s => s.role);
  const isPreflightActive = usePreflightStore(s => s.isPreflightActive);
  // M5: Reduced motion support
  const reducedMotion = useReducedMotion();
  const [showPirepModal, setShowPirepModal] = useState(false);
  // C2: Refs for Go/No-Go banner → card scroll
  const scrollViewRef = useRef<any>(null);
  const cardsOffsetY = useRef(0);
  const goNoGoOffsetY = useRef(0);

  // Daily briefing popup
  const dailyBriefing = useDailyBriefing();

  const collapseSearch = useCallback(() => {
    setSearchExpanded(false);
    searchExpandedSV.value = false;
    setSearchInput("");
    setShowResults(false);
    Keyboard.dismiss();
  }, [searchExpandedSV]);

  // ---- Scroll & condensing header state ----
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
    onBeginDrag: () => {
      if (searchExpandedSV.value) runOnJS(collapseSearch)();
    },
  });

  const topRowAnimatedStyle = useAnimatedStyle(() => {
    if (searchExpandedSV.value) return { opacity: 1, transform: [{ translateY: 0 }] };
    return {
      opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(scrollY.value, [0, 50], [0, -12], Extrapolation.CLAMP) }],
    };
  });

  // Data hooks
  const {
    data: metarData,
    isLoading: metarLoading,
    refetch: refetchMetar,
  } = useMetar(selectedStation);
  const { data: tafResult } = useTaf(selectedStation);
  const tafData = tafResult?.taf ?? null;
  const { data: briefingData } = useAiBriefing(metarData?.raw);
  const { data: airportData } = useRunways(selectedStation);

  const metar = metarData?.normalized ?? null;
  const nearbyInfo = metarData?.nearbyInfo;
  const alerts = useAlerts(metar, thresholds, runwayHeading);

  // Check personal minimums
  const minimumsResult = useMemo(() => {
    if (!metar || !minimumsEnabled) return null;
    return evaluateMinimums(metar, personalMinimums);
  }, [metar, minimumsEnabled, personalMinimums]);

  const isGrounded = minimumsResult?.breached ?? false;

  // C2: Compute Go/No-Go verdict for compact banner
  const goNoGoResult = useMemo(() => {
    if (!metar || !minimumsEnabled || !minimumsResult) return null;
    return evaluateGoNoGo({ metar, minimums: personalMinimums, minimumsResult, alerts, briefing: briefingData ?? undefined, taf: tafData ?? undefined });
  }, [metar, minimumsEnabled, minimumsResult, personalMinimums, alerts, briefingData, tafData]);

  // M4: Observation age tier
  const observationAgeText = metar?.observationTime ? formatObservationAge(metar.observationTime) : null;
  const observationTier = metar?.observationTime ? getObservationTier(metar.observationTime) : null;

  // Push scene to background
  useEffect(() => {
    if (metar) {
      const scene = mapMetarToScene(metar);
      setScene(scene);
    }
  }, [metar, setScene]);

  // Track briefing view
  const trackedStationRef = useRef<string | null>(null);
  useEffect(() => {
    if (metar && selectedStation && selectedStation !== trackedStationRef.current) {
      trackedStationRef.current = selectedStation;
      trackEvent({ type: "briefing", station: selectedStation });
    }
  }, [metar, selectedStation]);

  // Auto-load home airport when available (only once)
  useEffect(() => {
    // Log full state for debugging
    console.log(`[Briefing] Auto-load check - selectedStation: "${selectedStation}", homeAirport: "${homeAirport}", hasAutoLoaded: ${hasAutoLoadedRef.current}`);

    // FIRST: Check if we've already auto-loaded (exit early)
    if (hasAutoLoadedRef.current) {
      console.log(`[Briefing] Auto-load already completed, skipping`);
      return;
    }

    // SECOND: If there's a persisted station, respect it and mark as loaded
    if (selectedStation) {
      console.log(`[Briefing] Station already selected from persistence: ${selectedStation}, marking as loaded`);
      hasAutoLoadedRef.current = true;
      return;
    }

    // THIRD: Auto-load home airport if available
    if (homeAirport && homeAirport.trim() !== '') {
      console.log(`[Briefing] ✓ Auto-loading home airport: ${homeAirport}`);
      setStation(homeAirport);
      hasAutoLoadedRef.current = true;
    } else {
      console.log(`[Briefing] No home airport to auto-load`);
    }
  }, [homeAirport, selectedStation, setStation]);

  // Search handlers
  const handleSearchInput = useCallback((text: string) => {
    setSearchInput(text);

    if (text.trim().length >= 2) {
      const results = searchAirports(text);
      setSearchResults(results);
      setShowResults(results.length > 0);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, []);

  const selectAirport = useCallback((airport: AirportData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStation(airport.icao);
    addRecentStation(airport.icao);
    setSearchInput("");
    setShowResults(false);
    setSearchExpanded(false);
    searchExpandedSV.value = false;
    Keyboard.dismiss();
  }, [setStation, addRecentStation, searchExpandedSV]);

  const handleSearch = useCallback(() => {
    const icao = searchInput.trim().toUpperCase();
    if (icao.length >= 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStation(icao);
      addRecentStation(icao);
      setSearchInput("");
      setShowResults(false);
      setSearchExpanded(false);
      searchExpandedSV.value = false;
      Keyboard.dismiss();
    }
  }, [searchInput, setStation, addRecentStation, searchExpandedSV]);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["metar"] });
    await refetchMetar();
    setRefreshing(false);
  }, [queryClient, refetchMetar]);

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />

      <SafeAreaView style={[styles.safe, { zIndex: 1 }]} edges={["top"]}>
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.scroll, { zIndex: 2 }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
        >
          {/* Search Icon + Inline Chips Row */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(50)} style={[styles.topRow, topRowAnimatedStyle]}>
            {!searchExpanded ? (
              <View style={styles.topRowCollapsed}>
                {recentStations.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsInline}
                    style={styles.chipsScroll}
                  >
                    {recentStations.map((icao) => (
                      <Pressable
                        key={icao}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setStation(icao);
                        }}
                        style={[
                          styles.chip,
                          selectedStation === icao && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedStation === icao && styles.chipTextActive,
                          ]}
                        >
                          {icao}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {dailyBriefing.hasBeenShownToday && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      dailyBriefing.openManually();
                    }}
                    style={styles.searchIconButton}
                    hitSlop={8}
                    accessibilityLabel="Daily briefing"
                    accessibilityRole="button"
                  >
                    <Newspaper size={20} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSearchExpanded(true);
                    searchExpandedSV.value = true;
                  }}
                  style={styles.searchIconButton}
                  hitSlop={8}
                  accessibilityLabel="Search airports"
                  accessibilityRole="button"
                >
                  <Search size={20} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>
            ) : (
              <Animated.View style={styles.topRowExpanded} entering={reducedMotion ? undefined : FadeIn.duration(200)} exiting={reducedMotion ? undefined : FadeOut.duration(150)}>
                <View style={styles.searchBarCompact}>
                  <Search size={16} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    value={searchInput}
                    onChangeText={handleSearchInput}
                    onSubmitEditing={handleSearch}
                    placeholder="Search ICAO (e.g. KJFK)"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    autoCapitalize="characters"
                    autoFocus
                    returnKeyType="search"
                    style={styles.searchInputCompact}
                  />
                </View>
                <Pressable onPress={collapseSearch} hitSlop={8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>

          {/* Search Results Dropdown */}
          {showResults && searchExpanded && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown}
              style={[
                styles.searchDropdown,
                {
                  top: 56,
                  backgroundColor: isDark
                    ? "rgba(30,30,35,0.97)"
                    : "rgba(255,255,255,0.95)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.3)",
                },
              ]}
            >
              <ScrollView
                style={styles.resultsList}
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.map((airport) => {
                  const hasAliases = airport.aliases.length > 0;

                  return (
                    <Pressable
                      key={airport.icao}
                      onPress={() => selectAirport(airport)}
                      style={[
                        styles.resultItem,
                        {
                          borderBottomColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(12,140,233,0.1)",
                        },
                      ]}
                    >
                      <View style={styles.resultMain}>
                        <Text
                          style={[
                            styles.resultCode,
                            { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                          ]}
                        >
                          {airport.icao}
                        </Text>
                        {hasAliases && (
                          <Text
                            style={[
                              styles.resultAliases,
                              {
                                color: isDark
                                  ? "rgba(255,255,255,0.5)"
                                  : colors.stratus[500],
                              },
                            ]}
                          >
                            also: {airport.aliases.join(", ")}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.resultName,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.85)"
                              : colors.stratus[700],
                          },
                        ]}
                      >
                        {airport.name}
                      </Text>
                      <Text
                        style={[
                          styles.resultLocation,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.5)"
                              : colors.stratus[500],
                          },
                        ]}
                      >
                        {airport.municipality} · {airport.type}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* Grounded Banner */}
          {isGrounded && (
            <Animated.View entering={reducedMotion ? undefined : FadeInUp.delay(50)} style={styles.groundedBanner}>
              <Text style={styles.groundedText}>
                GROUNDED — Personal minimums exceeded
              </Text>
            </Animated.View>
          )}

          {/* Dispatch Status Banner (school students) */}
          {isSchoolMode && authRole === "student" && (
            <DispatchStatusBanner />
          )}

          {/* Nearby Station Banner */}
          {nearbyInfo && metar && !metarLoading && (
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(50)} style={styles.nearbyBanner}>
              <AlertTriangle size={16} color={colors.alert.amber} />
              <Text style={styles.nearbyBannerText}>
                No weather station at <Text style={styles.nearbyBannerBold}>{selectedStation}</Text>.{" "}
                Showing <Text style={styles.nearbyBannerBold}>{nearbyInfo.station}</Text>
                {nearbyInfo.distance != null ? ` (${nearbyInfo.distance} nm away)` : ""}
              </Text>
            </Animated.View>
          )}

          {/* Loading */}
          {metarLoading && selectedStation && (
            <View style={styles.skeletons}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {/* Weather Data */}
          {metar && !metarLoading && (
            <View
              style={[styles.cards, isGrounded && { opacity: 0.5 }]}
              onLayout={(e) => { cardsOffsetY.current = e.nativeEvent.layout.y; }}
            >
              <StationHeader metar={metar} />

              {/* C2: Compact Go/No-Go verdict banner */}
              {minimumsEnabled && minimumsResult && goNoGoResult && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scrollViewRef.current?.scrollTo({ y: cardsOffsetY.current + goNoGoOffsetY.current - 16, animated: true });
                  }}
                  style={[
                    styles.goNoGoBanner,
                    {
                      backgroundColor: goNoGoResult.verdict === "go" ? "rgba(34,197,94,0.15)"
                        : goNoGoResult.verdict === "marginal" ? "rgba(245,158,11,0.15)"
                        : "rgba(239,68,68,0.15)",
                      borderColor: goNoGoResult.verdict === "go" ? "rgba(34,197,94,0.3)"
                        : goNoGoResult.verdict === "marginal" ? "rgba(245,158,11,0.3)"
                        : "rgba(239,68,68,0.3)",
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Go No-Go verdict: ${goNoGoResult.verdict}`}
                >
                  {goNoGoResult.verdict === "go" ? (
                    <CheckCircle2 size={16} color={colors.alert.green} />
                  ) : goNoGoResult.verdict === "marginal" ? (
                    <AlertTriangle size={16} color={colors.alert.amber} />
                  ) : (
                    <XCircle size={16} color={colors.alert.red} />
                  )}
                  <Text style={[
                    styles.goNoGoBannerText,
                    {
                      color: goNoGoResult.verdict === "go" ? colors.alert.green
                        : goNoGoResult.verdict === "marginal" ? colors.alert.amber
                        : colors.alert.red,
                    },
                  ]}>
                    {goNoGoResult.verdict === "go" ? "GO" : goNoGoResult.verdict === "marginal" ? "MARGINAL" : "NO-GO"}
                  </Text>
                  <Text style={styles.goNoGoBannerSummary} numberOfLines={1}>
                    {goNoGoResult.summary}
                  </Text>
                </Pressable>
              )}

              {/* m8: Airport Familiarity Badge (extracted) */}
              <FamiliarityBadge station={metar.station} />

              {/* M4: Tiered observation age indicator */}
              {observationAgeText && observationTier === "red" && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)} style={styles.staleRedBanner}>
                  <AlertTriangle size={14} color="#FFFFFF" />
                  <Text style={styles.staleRedText}>{observationAgeText} — DATA MAY BE UNRELIABLE</Text>
                </Animated.View>
              )}
              {observationAgeText && observationTier === "amber" && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)} style={styles.staleAmberBanner}>
                  <Clock size={14} color={colors.alert.amber} />
                  <Text style={styles.staleAmberText}>{observationAgeText}</Text>
                </Animated.View>
              )}
              {observationAgeText && observationTier === "green" && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
                  <Text style={styles.observationAgeFresh}>{observationAgeText}</Text>
                </Animated.View>
              )}
              {observationAgeText && observationTier === "default" && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
                  <Text style={styles.observationAge}>{observationAgeText}</Text>
                </Animated.View>
              )}

              {/* Flight Rules + Wind (inside WeatherCards) */}
              <WeatherCards metar={metar} hideHeader hideSideBySide />

              {/* VIS + CEILING */}
              <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(150)} style={styles.sideBySide}>
                <View style={{ flex: 1 }}>
                  <DataCard
                    label="VISIBILITY"
                    value={`${metar.visibility.sm}${metar.visibility.isPlus ? "+" : ""}`}
                    unit="SM"
                    style={{ flex: 1 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DataCard
                    label="CEILING"
                    value={metar.ceiling ? metar.ceiling.toLocaleString() : "CLR"}
                    unit={metar.ceiling ? "FT" : ""}
                    accentColor={
                      metar.flightCategory === "IFR" || metar.flightCategory === "LIFR"
                        ? colors[metar.flightCategory.toLowerCase() as "ifr" | "lifr"]
                        : undefined
                    }
                    style={{ flex: 1 }}
                  />
                </View>
              </Animated.View>

              {/* TEMP + ALT */}
              <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(175)} style={styles.sideBySide}>
                <View style={{ flex: 1 }}>
                  <DataCard
                    label="TEMP / DEWPT"
                    value={`${metar.temperature.celsius}/${metar.dewpoint.celsius}`}
                    unit={"\u00B0C"}
                    supplementary={metar.tempDewpointSpread <= 3 ? "Fog risk \u2014 spread \u2264 3\u00B0C" : undefined}
                    supplementaryColor={metar.tempDewpointSpread <= 3 ? colors.alert.amber : undefined}
                    style={{ flex: 1 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DataCard
                    label="ALTIMETER"
                    value={metar.altimeter.toFixed(2)}
                    unit={'"Hg'}
                    supplementary={`PA: ${Math.round((29.92 - metar.altimeter) * 1000 + Math.round(metar.location.elevation * 3.28084)).toLocaleString()} ft`}
                    style={{ flex: 1 }}
                  />
                </View>
              </Animated.View>

              {/* Cloud Layers */}
              <CloudLayerStack clouds={metar.clouds} ceiling={metar.ceiling} />

              {/* m8: Daylight & Currency Timeline (extracted) */}
              {selectedStation && (
                <DaylightSection station={selectedStation} settings={daylightSettings} />
              )}

              {/* Fuel Price */}
              {selectedStation && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(185)}>
                  <FuelPriceCard icao={selectedStation} uid={user?.uid ?? null} />
                </Animated.View>
              )}

              {/* Runway Wind Analysis */}
              {metar.wind && airportData?.runways && airportData.runways.length > 0 && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200)} style={{ gap: 12 }}>
                  {airportData.runways.map((runway) => (
                    <RunwayWindCard
                      key={runway.runway_id}
                      runway={runway}
                      windDirection={metar.wind.direction}
                      windSpeed={metar.wind.speed}
                    />
                  ))}
                </Animated.View>
              )}

              {/* Pivotal Altitude Table */}
              {metar && selectedStation && (
                <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(225)}>
                  <PivotalAltitudeTable
                    primaryIcao={selectedStation}
                    primaryMetar={metar}
                  />
                </Animated.View>
              )}

              {/* Alerts */}
              <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(250)}>
                <AlertFeed alerts={alerts} />
              </Animated.View>

              {/* NOTAMs */}
              {selectedStation && (
                <NotamSection station={selectedStation} delay={300} />
              )}

              {/* PIREPs */}
              {selectedStation && (
                <PirepSection station={selectedStation} delay={325} />
              )}

              {/* AI Briefing */}
              {briefingData && (
                <AiBriefingCard briefing={briefingData} />
              )}

              {/* Go/No-Go Decision Engine */}
              {metar && minimumsEnabled && minimumsResult && (
                <View onLayout={(e) => { goNoGoOffsetY.current = e.nativeEvent.layout.y; }}>
                  <GoNoGoCard
                    metar={metar}
                    minimums={personalMinimums}
                    minimumsResult={minimumsResult}
                    alerts={alerts}
                    briefing={briefingData ?? undefined}
                    taf={tafData ?? undefined}
                  />
                </View>
              )}

              {/* Forecast Timeline */}
              {tafData && (
                <ForecastTimeline
                  taf={tafData}
                  currentMetar={metar}
                />
              )}

              {/* Departure Window */}
              {tafData && minimumsEnabled && (
                <DepartureWindowCard
                  taf={tafData}
                  minimums={personalMinimums}
                />
              )}

              {/* Learning Mode - Flight Category Annotation */}
              {learningMode && metar && (
                <LearningAnnotation
                  annotation={flightCategoryAnnotations[metar.flightCategory]}
                />
              )}

              {/* Start Preflight Button */}
              {metar && selectedStation && (
                <StartPreflightButton
                  station={selectedStation}
                  metar={metar}
                />
              )}

              {/* Active Preflight Monitor */}
              {isPreflightActive && (
                <PreflightMonitor />
              )}

              {/* Dispatch Flow (for school students) */}
              {metar && selectedStation && isSchoolMode && (
                <DispatchFlow
                  station={selectedStation}
                  metar={metar}
                />
              )}

              {/* Raw METAR */}
              <MetarRawDisplay rawText={metar.rawText} />
            </View>
          )}

          {/* No Weather Data State */}
          {selectedStation && !metarLoading && !metar && (
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(150)} style={styles.noDataState}>
              <CloudOff size={40} color="rgba(255,255,255,0.35)" />
              <Text style={styles.noDataTitle}>No weather data available</Text>
              <Text style={styles.noDataSubtitle}>
                {selectedStation} does not have a weather reporting station and no nearby stations were found.
              </Text>
            </Animated.View>
          )}

          {/* Submit PIREP Button */}
          {metar && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPirepModal(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "rgba(255,255,255,0.08)",
                paddingVertical: 12,
                borderRadius: 24,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: "rgba(255,255,255,0.7)" }}>
                Submit PIREP
              </Text>
            </Pressable>
          )}

          {/* Multi-Station Dashboard */}
          {pinnedStations.length > 0 && (
            <MultiStationDashboard
              stations={pinnedStations}
              onRemoveStation={(icao) => togglePinnedStation(icao)}
              onAddStation={() => {}}
            />
          )}

          {/* Empty State */}
          {!selectedStation && !metarLoading && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.delay(150)}
              style={styles.emptyState}
            >
              <CloudSun size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>Enter an ICAO code</Text>
              <Text style={styles.emptySubtitle}>
                Search for a station to view weather data
              </Text>
            </Animated.View>
          )}

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SafeAreaView>

      {/* PIREP Modal */}
      <SubmitPirepModal
        visible={showPirepModal}
        onClose={() => setShowPirepModal(false)}
        station={selectedStation ?? ""}
      />

      {/* Daily Briefing Modal */}
      <DailyBriefingModal
        visible={dailyBriefing.isVisible}
        onDismiss={dailyBriefing.dismiss}
        homeAirport={dailyBriefing.homeAirport}
        pilotName={dailyBriefing.pilotName}
        metarData={dailyBriefing.metarData}
        metarLoading={dailyBriefing.metarLoading}
        metarError={dailyBriefing.metarError}
        tafData={dailyBriefing.tafData}
        tafLoading={dailyBriefing.tafLoading}
        briefingData={dailyBriefing.briefingData}
        briefingLoading={dailyBriefing.briefingLoading}
        onRetry={() => dailyBriefing.refetchMetar()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, maxWidth: 500, width: "100%", alignSelf: "center" },
  topRow: { marginTop: 8, marginBottom: 12, minHeight: 36 },
  topRowCollapsed: { flexDirection: "row", alignItems: "center", gap: 12 },
  chipsScroll: { flex: 1 },
  chipsInline: { flexDirection: "row", gap: 8, paddingRight: 4 },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  topRowExpanded: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchBarCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInputCompact: {
    flex: 1,
    fontSize: 15,
    fontFamily: "JetBrainsMono_400Regular",
    color: "#ffffff",
    padding: 0,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "#ffffff",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  chipTextActive: { color: "#ffffff" },
  groundedBanner: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  groundedText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#ef4444",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  skeletons: { gap: 12 },
  cards: { gap: 12 },
  observationAge: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
    marginTop: -4,
  },
  observationAgeFresh: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#22c55e",
    marginBottom: 4,
    marginTop: -4,
  },
  staleAmberBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    marginTop: -4,
  },
  staleAmberText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#f59e0b",
  },
  staleRedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.2)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    marginTop: -4,
  },
  staleRedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#ef4444",
    letterSpacing: 0.3,
  },
  goNoGoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goNoGoBannerText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 1.5,
  },
  goNoGoBannerSummary: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  sideBySide: { flexDirection: "row", gap: 12 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  nearbyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    padding: 12,
    marginBottom: 12,
  },
  nearbyBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },
  nearbyBannerBold: {
    fontFamily: "JetBrainsMono_600SemiBold",
    color: "#FFFFFF",
  },
  noDataState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 20,
    gap: 12,
  },
  noDataTitle: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
  noDataSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  searchDropdown: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    maxHeight: 300,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultCode: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  resultAliases: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    fontStyle: 'italic',
  },
  resultName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginBottom: 2,
  },
  resultLocation: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
