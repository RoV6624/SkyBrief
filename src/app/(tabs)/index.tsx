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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Search, CloudSun } from "lucide-react-native";
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

import { WeatherSummaryCard } from "@/components/weather/WeatherSummaryCard";
import { CloudLayerStack } from "@/components/weather/CloudLayerStack";
import { DaylightTimeline } from "@/components/weather/DaylightTimeline";
import { FuelPriceCardEnhanced as FuelPriceCard } from "@/components/weather/FuelPriceCardEnhanced";
import { MetarRawDisplay } from "@/components/weather/MetarRawDisplay";
import { AiBriefingCard } from "@/components/weather/AiBriefingCard";
import { AlertFeed } from "@/components/weather/AlertFeed";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { NotamSection } from "@/components/notam/NotamSection";
import { RunwayVisualizer } from "@/components/runway/RunwayVisualizer";
import { PivotalAltitudeTable } from "@/components/weather/PivotalAltitudeTable";
import { CloudCard } from "@/components/ui/CloudCard";

import { mapMetarToScene } from "@/lib/weather/scene-mapper";
import { evaluateMinimums } from "@/lib/minimums/evaluate";
import { findStationCoords } from "@/lib/route/station-coords";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export default function BriefingScreen() {
  const { isDark, theme } = useTheme();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<AirportData[]>([]);
  const [showResults, setShowResults] = useState(false);
  const hasAutoLoadedRef = useRef(false);
  const { user } = useAuthStore();
  const { homeAirport } = useUserStore();
  const { selectedStation, setStation, recentStations, addRecentStation } =
    useWeatherStore();
  const {
    thresholds,
    runwayHeading,
    setRunwayHeading,
    personalMinimums,
    minimumsEnabled,
  } = useMonitorStore();
  const { scene, setScene } = useSceneStore();
  const { settings: daylightSettings } = useDaylightStore();

  // Data hooks
  const {
    data: metarData,
    isLoading: metarLoading,
    refetch: refetchMetar,
  } = useMetar(selectedStation);
  const { data: tafData } = useTaf(selectedStation);
  const { data: briefingData } = useAiBriefing(metarData?.raw);

  const metar = metarData?.normalized ?? null;
  const alerts = useAlerts(metar, thresholds, runwayHeading);

  // Check personal minimums
  const minimumsResult = useMemo(() => {
    if (!metar || !minimumsEnabled) return null;
    return evaluateMinimums(metar, personalMinimums);
  }, [metar, minimumsEnabled, personalMinimums]);

  const isGrounded = minimumsResult?.breached ?? false;

  // Push scene to background
  useEffect(() => {
    if (metar) {
      const scene = mapMetarToScene(metar);
      setScene(scene);
    }
  }, [metar, setScene]);

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
    Keyboard.dismiss();
  }, [setStation, addRecentStation]);

  const handleSearch = useCallback(() => {
    const icao = searchInput.trim().toUpperCase();
    if (icao.length >= 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStation(icao);
      addRecentStation(icao);
      setSearchInput("");
      setShowResults(false);
      Keyboard.dismiss();
    }
  }, [searchInput, setStation, addRecentStation]);

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
        <ScrollView
          style={[styles.scroll, { zIndex: 2 }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
            <View style={styles.titleRow}>
              <CloudSun size={24} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.title}>SkyBrief</Text>
            </View>
            <Text style={styles.subtitle}>Preflight weather briefing</Text>
          </Animated.View>

          {/* Search Bar */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                value={searchInput}
                onChangeText={handleSearchInput}
                onSubmitEditing={handleSearch}
                placeholder="Search ICAO (e.g. KJFK)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="characters"
                returnKeyType="search"
                style={styles.searchInput}
              />
            </View>
          </Animated.View>

          {/* Search Results Dropdown */}
          {showResults && (
            <Animated.View
              entering={FadeInDown}
              style={styles.searchDropdown}
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
                      style={styles.resultItem}
                    >
                      <View style={styles.resultMain}>
                        <Text style={styles.resultCode}>{airport.icao}</Text>
                        {hasAliases && (
                          <Text style={styles.resultAliases}>
                            also: {airport.aliases.join(", ")}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.resultName}>{airport.name}</Text>
                      <Text style={styles.resultLocation}>
                        {airport.municipality} · {airport.type}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* Recent Stations */}
          {recentStations.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
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
            </Animated.View>
          )}

          {/* Grounded Banner */}
          {isGrounded && (
            <Animated.View entering={FadeInUp.delay(50)} style={styles.groundedBanner}>
              <Text style={styles.groundedText}>
                GROUNDED — Personal minimums exceeded
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
            <View style={[styles.cards, isGrounded && { opacity: 0.5 }]}>
              <WeatherSummaryCard metar={metar} />
              <CloudLayerStack
                clouds={metar.clouds}
                ceiling={metar.ceiling}
              />

              {/* Daylight & Currency Timeline */}
              {selectedStation && (() => {
                const coords = findStationCoords(selectedStation);
                if (!coords) return null;
                return (
                  <Animated.View entering={FadeInDown.delay(175)}>
                    <CloudCard>
                      <DaylightTimeline
                        lat={coords.lat}
                        lon={coords.lon}
                        settings={daylightSettings}
                      />
                    </CloudCard>
                  </Animated.View>
                );
              })()}

              {/* Fuel Price */}
              {selectedStation && (
                <Animated.View entering={FadeInDown.delay(185)}>
                  <FuelPriceCard
                    icao={selectedStation}
                    uid={user?.uid ?? null}
                  />
                </Animated.View>
              )}

              {/* Runway Wind Analysis */}
              {metar.wind && (
                <Animated.View entering={FadeInDown.delay(200)}>
                  <CloudCard>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_600SemiBold",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 8,
                        color: isDark ? theme.foreground : colors.stratus[700],
                      }}
                    >
                      Runway Wind Analysis
                    </Text>
                    <RunwayVisualizer
                      runwayHeading={runwayHeading ?? 360}
                      windDirection={metar.wind.direction}
                      windSpeed={metar.wind.speed}
                      onHeadingChange={(hdg) => setRunwayHeading(hdg)}
                    />
                  </CloudCard>
                </Animated.View>
              )}

              {/* Pivotal Altitude Table */}
              {metar && selectedStation && (
                <Animated.View entering={FadeInDown.delay(225)}>
                  <PivotalAltitudeTable
                    primaryIcao={selectedStation}
                    primaryMetar={metar}
                  />
                </Animated.View>
              )}

              {/* Alerts */}
              <Animated.View entering={FadeInDown.delay(250)}>
                <AlertFeed alerts={alerts} />
              </Animated.View>

              {/* NOTAMs */}
              {selectedStation && <NotamSection station={selectedStation} delay={300} />}

              {/* AI Briefing */}
              {briefingData && <AiBriefingCard briefing={briefingData} />}

              {/* Raw METAR */}
              <MetarRawDisplay rawText={metar.rawText} />
            </View>
          )}

          {/* Empty State */}
          {!selectedStation && !metarLoading && (
            <Animated.View
              entering={FadeInDown.delay(150)}
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: {
    paddingTop: 12,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  searchContainer: { marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "JetBrainsMono_400Regular",
    color: "#ffffff",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  searchDropdown: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    maxHeight: 300,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
    borderBottomColor: 'rgba(12,140,233,0.1)',
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
    color: colors.stratus[800],
  },
  resultAliases: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.stratus[500],
    fontStyle: 'italic',
  },
  resultName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.stratus[700],
    marginBottom: 2,
  },
  resultLocation: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.stratus[500],
  },
});
