import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Navigation,
  Plus,
  X,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
} from "lucide-react-native";

import { useRouteBriefing } from "@/hooks/useRouteBriefing";
import { CloudCard } from "@/components/ui/CloudCard";
import { FlightCategoryBadge } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { FRATModal } from "@/components/frat/FRATModal";
import { NavLogRail } from "@/components/navlog/NavLogRail";
import { calculateNavLog } from "@/lib/navlog/calculate";
import { useWBStore } from "@/stores/wb-store";
import { calcTotalWB } from "@/lib/wb/calculations";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useSceneStore } from "@/stores/scene-store";
import { generateWaypoints } from "@/lib/route/waypoint-generator";

export default function RouteScreen() {
  const { theme, isDark } = useTheme();
  const scene = useSceneStore((s) => s.scene);
  const aircraft          = useWBStore((s) => s.aircraft);
  const stationWeights    = useWBStore((s) => s.stationWeights);
  const fuelGallons       = useWBStore((s) => s.fuelGallons);
  const fuelUnit          = useWBStore((s) => s.fuelUnit);
  const customEmptyWeight = useWBStore((s) => s.customEmptyWeight);
  const customEmptyArm    = useWBStore((s) => s.customEmptyArm);
  const [waypoints, setWaypoints] = useState<string[]>(["", ""]);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [showFRAT, setShowFRAT] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [flightType, setFlightType] = useState<"VFR" | "IFR">("VFR");

  const { data: routeBriefing, isLoading } = useRouteBriefing(submitted);

  // Compute hazard stations — any station reporting MVFR, IFR, or LIFR
  const hazardStations = useMemo(() => {
    if (!routeBriefing) return [];
    return routeBriefing.weatherPoints.filter(
      (wp) =>
        wp.metar &&
        (wp.metar.flightCategory === "MVFR" ||
          wp.metar.flightCategory === "IFR" ||
          wp.metar.flightCategory === "LIFR")
    );
  }, [routeBriefing]);

  // Calculate NavLog
  const navLog = useMemo(() => {
    if (!routeBriefing) return null;
    return calculateNavLog(
      routeBriefing.legs,
      routeBriefing.weatherPoints,
      aircraft.cruiseSpeedKts,
      aircraft.fuelBurnRateGPH
    );
  }, [routeBriefing, aircraft.cruiseSpeedKts, aircraft.fuelBurnRateGPH]);

  // W&B overweight check
  const wbResult = useMemo(
    () => calcTotalWB(aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm),
    [aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm]
  );
  const isOverweight = wbResult.isOverweight;
  const overweightBy = Math.round(wbResult.totalWeight - aircraft.maxTakeoffWeight);

  const updateWaypoint = (index: number, value: string) => {
    const updated = [...waypoints];
    updated[index] = value.toUpperCase();
    setWaypoints(updated);
  };

  const addWaypoint = () => {
    if (waypoints.length < 6) {
      Haptics.selectionAsync();
      setWaypoints([...waypoints, ""]);
    }
  };

  const removeWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      Haptics.selectionAsync();
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = useCallback(() => {
    const valid = waypoints.filter((w) => w.trim().length >= 3);
    if (valid.length >= 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSubmitted(valid);
      Keyboard.dismiss();
      // Show FRAT modal after briefing loads
      setShowFRAT(true);
    }
  }, [waypoints]);

  const handleFRATContinue = useCallback(() => {
    setShowFRAT(false);
  }, []);

  const handleAutoGenerate = useCallback(async () => {
    const departure = waypoints[0]?.trim().toUpperCase();
    const destination = waypoints[waypoints.length - 1]?.trim().toUpperCase();

    if (!departure || departure.length < 3) {
      Alert.alert(
        "Invalid Departure",
        "Please enter a valid departure airport identifier (3-4 characters)"
      );
      return;
    }

    if (!destination || destination.length < 3) {
      Alert.alert(
        "Invalid Destination",
        "Please enter a valid destination airport identifier (3-4 characters)"
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);

    try {
      console.log(`[Route] Auto-generating waypoints: ${departure} → ${destination}`);

      // Generate waypoints using AI algorithm
      const generatedWaypoints = await generateWaypoints(departure, destination, {
        strategy: "direct",
        maxSegmentNm: 50,
        flightType: flightType,
        corridorWidthNm: 10,
      });

      if (generatedWaypoints.length > 0) {
        // Extract just the identifiers
        const identifiers = generatedWaypoints.map((wp) => wp.identifier);
        setWaypoints(identifiers);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log(`[Route] Generated ${identifiers.length} waypoints:`, identifiers);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("[Route] Error generating waypoints:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGenerating(false);
    }
  }, [waypoints]);

  // Dynamic styles based on theme
  const dynamicStyles = {
    sectionTitle: {
      ...styles.sectionTitle,
      color: isDark ? theme.mutedForeground : colors.stratus[700],
    },
    waypointInput: {
      ...styles.waypointInput,
      color: theme.foreground,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(12,140,233,0.06)",
    },
    overallLabel: {
      ...styles.overallLabel,
      color: theme.foreground,
    },
    distText: {
      ...styles.distText,
      color: isDark ? theme.mutedForeground : colors.stratus[400],
    },
    wpStation: {
      ...styles.wpStation,
      color: theme.foreground,
    },
    wpDetail: {
      ...styles.wpDetail,
      color: isDark ? theme.mutedForeground : colors.stratus[700],
    },
  };

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <View style={styles.titleRow}>
              <Navigation size={22} color="#ffffff" strokeWidth={1.8} />
              <Text style={styles.title}>Route Briefing</Text>
            </View>
          </Animated.View>

          {/* Waypoint Inputs */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <CloudCard>
              {/* Flight Type Selector */}
              <View style={styles.flightTypeContainer}>
                <Text style={dynamicStyles.sectionTitle}>Flight Type</Text>
                <View style={styles.toggleContainer}>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      flightType === "VFR" && styles.toggleButtonActive,
                      {
                        backgroundColor: flightType === "VFR"
                          ? colors.vfr
                          : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                      },
                    ]}
                    onPress={() => {
                      setFlightType("VFR");
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color: flightType === "VFR"
                            ? "#ffffff"
                            : isDark ? theme.mutedForeground : colors.stratus[600],
                        },
                      ]}
                    >
                      VFR
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      flightType === "IFR" && styles.toggleButtonActive,
                      {
                        backgroundColor: flightType === "IFR"
                          ? colors.mvfr
                          : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                      },
                    ]}
                    onPress={() => {
                      setFlightType("IFR");
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color: flightType === "IFR"
                            ? "#ffffff"
                            : isDark ? theme.mutedForeground : colors.stratus[600],
                        },
                      ]}
                    >
                      IFR
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[dynamicStyles.sectionTitle, { marginTop: 20 }]}>Flight Plan</Text>
              <View style={styles.waypointList}>
                {waypoints.map((wp, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInLeft.delay(i * 50)}
                    style={styles.waypointRow}
                  >
                    <View style={styles.waypointDot}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              i === 0
                                ? colors.vfr
                                : i === waypoints.length - 1
                                ? colors.ifr
                                : colors.stratus[400],
                          },
                        ]}
                      />
                      {i < waypoints.length - 1 && (
                        <View style={styles.dotLine} />
                      )}
                    </View>
                    <TextInput
                      value={wp}
                      onChangeText={(t) => updateWaypoint(i, t)}
                      placeholder={
                        i === 0 ? "Departure (e.g. KJFK)" : "Waypoint"
                      }
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
                      autoCapitalize="characters"
                      maxLength={4}
                      style={dynamicStyles.waypointInput}
                    />
                    {waypoints.length > 2 && (
                      <Pressable
                        onPress={() => removeWaypoint(i)}
                        style={styles.removeBtn}
                      >
                        <X size={14} color={colors.stratus[400]} />
                      </Pressable>
                    )}
                  </Animated.View>
                ))}
              </View>

              <View style={styles.actions}>
                {waypoints.length === 2 && waypoints[0].length >= 4 && waypoints[1].length >= 4 && (
                  <Pressable
                    onPress={handleAutoGenerate}
                    disabled={generating}
                    style={styles.autoGenBtn}
                  >
                    <Navigation size={14} color={colors.stratus[500]} />
                    <Text style={styles.addText}>
                      {generating ? "Generating..." : "Auto Generate Route"}
                    </Text>
                  </Pressable>
                )}
                {waypoints.length < 6 && waypoints.length > 2 && (
                  <Pressable onPress={addWaypoint} style={styles.addBtn}>
                    <Plus size={14} color={colors.stratus[500]} />
                    <Text style={styles.addText}>Add Waypoint</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.briefBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.briefText}>Get Briefing</Text>
                  <ChevronRight size={16} color="#ffffff" strokeWidth={2.5} />
                </Pressable>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Overweight Warning Banner */}
          {isOverweight && (
            <Animated.View entering={FadeInDown.delay(30)} style={styles.overweightBanner}>
              <ShieldAlert size={16} color="#ffffff" />
              <Text style={styles.overweightText}>
                Aircraft is {overweightBy} lbs over MTOW ({aircraft.maxTakeoffWeight} lbs). NavLog performance values may be invalid.
              </Text>
            </Animated.View>
          )}

          {/* Loading */}
          {isLoading && (
            <View style={styles.loadingCards}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {/* Route Timeline */}
          {routeBriefing && !isLoading && (
            <Animated.View entering={FadeInDown.delay(100)}>
              {/* Overall Category */}
              <CloudCard style={{ marginTop: 12 }}>
                <View style={styles.overallRow}>
                  <Text style={dynamicStyles.overallLabel}>Overall Conditions</Text>
                  {routeBriefing.worstCategory && (
                    <FlightCategoryBadge
                      category={routeBriefing.worstCategory}
                      size="md"
                    />
                  )}
                </View>
                <Text style={dynamicStyles.distText}>
                  Total: {routeBriefing.totalDistanceNm} NM •{" "}
                  {routeBriefing.weatherPoints.length} stations
                </Text>
              </CloudCard>

              {/* NavLog */}
              {navLog && <NavLogRail navLog={navLog} />}

              {/* ========== HAZARD WARNING CARD ========== */}
              {hazardStations.length > 0 && (
                <Animated.View
                  entering={FadeInDown.delay(120)}
                  style={styles.hazardCard}
                >
                  <View style={styles.hazardHeader}>
                    <ShieldAlert size={18} color="#ffffff" />
                    <Text style={styles.hazardTitle}>Hazard Warning</Text>
                  </View>
                  <Text style={styles.hazardSubtitle}>
                    {hazardStations.length} station
                    {hazardStations.length > 1 ? "s" : ""} reporting sub-VFR
                    conditions along your route
                  </Text>
                  {hazardStations.map((wp) => {
                    const cat = wp.metar!.flightCategory;
                    const catColor =
                      cat === "LIFR"
                        ? colors.lifr
                        : cat === "IFR"
                        ? colors.ifr
                        : colors.mvfr;
                    return (
                      <View key={wp.waypoint.icao} style={styles.hazardStation}>
                        <View
                          style={[
                            styles.hazardDot,
                            { backgroundColor: catColor },
                          ]}
                        />
                        <Text style={styles.hazardStationId}>
                          {wp.waypoint.icao}
                        </Text>
                        <View
                          style={[
                            styles.hazardBadge,
                            { backgroundColor: catColor },
                          ]}
                        >
                          <Text style={styles.hazardBadgeText}>{cat}</Text>
                        </View>
                        <Text style={styles.hazardDetail}>
                          Vis {wp.metar!.visibility.sm}
                          {wp.metar!.visibility.isPlus ? "+" : ""} SM
                          {wp.metar!.ceiling
                            ? ` • Ceil ${wp.metar!.ceiling.toLocaleString()} ft`
                            : ""}
                        </Text>
                      </View>
                    );
                  })}
                </Animated.View>
              )}

              {/* Gap Warnings */}
              {routeBriefing.gaps.map((gap, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(150 + i * 50)}
                  style={styles.gapBanner}
                >
                  <AlertTriangle size={14} color={colors.alert.amber} />
                  <Text style={styles.gapText}>
                    Data gap: {gap.fromWaypoint.icao} → {gap.toWaypoint.icao} (
                    {gap.gapDistanceNm} NM)
                  </Text>
                </Animated.View>
              ))}

              {/* Weather Points */}
              {routeBriefing.weatherPoints.map((wp, i) => {
                const metar = wp.metar;
                if (!metar) return null;
                const cat = metar.flightCategory;
                return (
                  <Animated.View
                    key={wp.waypoint.icao}
                    entering={FadeInDown.delay(200 + i * 80)}
                    style={styles.timelineItem}
                  >
                    <View style={styles.timelineDot}>
                      <View
                        style={[
                          styles.timelineDotInner,
                          {
                            backgroundColor:
                              cat === "VFR"
                                ? colors.vfr
                                : cat === "MVFR"
                                ? colors.mvfr
                                : cat === "IFR"
                                ? colors.ifr
                                : colors.lifr,
                          },
                        ]}
                      />
                      {i < routeBriefing.weatherPoints.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <CloudCard style={{ flex: 1 }}>
                      <View style={styles.wpHeader}>
                        <Text style={dynamicStyles.wpStation}>{wp.waypoint.icao}</Text>
                        <FlightCategoryBadge
                          category={metar.flightCategory}
                          size="sm"
                        />
                      </View>
                      <Text style={dynamicStyles.wpDetail}>
                        Wind:{" "}
                        {metar.wind.direction === "VRB"
                          ? "VRB"
                          : `${metar.wind.direction}°`}{" "}
                        @ {metar.wind.speed} kts
                        {metar.wind.gust
                          ? ` G${metar.wind.gust}`
                          : ""}
                      </Text>
                      <Text style={dynamicStyles.wpDetail}>
                        Vis: {metar.visibility.sm}
                        {metar.visibility.isPlus ? "+" : ""} SM • Ceiling:{" "}
                        {metar.ceiling
                          ? `${metar.ceiling.toLocaleString()} ft`
                          : "CLR"}
                      </Text>
                      {metar.presentWeather && (
                        <Text style={styles.wpWeather}>
                          WX: {metar.presentWeather}
                        </Text>
                      )}
                      <Text style={styles.wpDist}>
                        {Math.round(wp.distanceFromStart)} NM from departure
                      </Text>
                    </CloudCard>
                  </Animated.View>
                );
              })}
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* FRAT Modal */}
      {routeBriefing && (
        <FRATModal
          visible={showFRAT}
          onClose={() => setShowFRAT(false)}
          onContinue={handleFRATContinue}
          routeBriefing={routeBriefing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: { paddingTop: 12, marginBottom: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  waypointList: { gap: 0 },
  waypointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  waypointDot: { alignItems: "center", width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: {
    width: 2,
    height: 28,
    backgroundColor: "rgba(12,140,233,0.15)",
    marginTop: 2,
  },
  waypointInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "JetBrainsMono_600SemiBold",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  removeBtn: { padding: 4 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  autoGenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(12,140,233,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[500],
  },
  briefBtn: {
    backgroundColor: colors.stratus[500],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  briefText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  loadingCards: { gap: 12, marginTop: 12 },
  overallRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  overallLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  distText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    marginTop: 4,
  },
  // ========== HAZARD WARNING CARD ==========
  hazardCard: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.3)",
    padding: 14,
    marginTop: 10,
  },
  hazardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  hazardTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hazardSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#991b1b",
    marginTop: 4,
    marginBottom: 10,
  },
  hazardStation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(239,68,68,0.15)",
  },
  hazardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hazardStationId: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#7f1d1d",
    width: 48,
  },
  hazardBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hazardBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  hazardDetail: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_400Regular",
    color: "#991b1b",
    flex: 1,
    textAlign: "right",
  },
  // ========== GAP + TIMELINE ==========
  gapBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    padding: 10,
    marginTop: 8,
  },
  gapText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#92400e",
    flex: 1,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  timelineDot: {
    alignItems: "center",
    width: 20,
    paddingTop: 20,
  },
  timelineDotInner: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(12,140,233,0.12)",
    marginTop: 4,
  },
  wpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  wpStation: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  wpDetail: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_400Regular",
    lineHeight: 18,
  },
  wpWeather: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.alert.amber,
    marginTop: 2,
  },
  wpDist: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[400],
    marginTop: 6,
  },
  overweightBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.6)",
    padding: 12,
    marginTop: 10,
  },
  overweightText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    flex: 1,
    lineHeight: 18,
  },
  flightTypeContainer: {
    marginBottom: 0,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    // Active state controlled by backgroundColor in component
  },
  toggleText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
