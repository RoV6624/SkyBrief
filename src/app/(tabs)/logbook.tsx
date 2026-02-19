import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BookOpen, Download, Plus, X } from "lucide-react-native";

import { useLogbookStore, FlightLogEntry } from "@/stores/logbook-store";
import { exportLogbookCSV } from "@/lib/logbook/export-csv";
import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { useSceneStore } from "@/stores/scene-store";

type FlightType = "local" | "xc" | "night" | "instrument" | "checkride";
type WeatherCondition = "VFR" | "MVFR" | "IFR" | "LIFR";

const FLIGHT_TYPE_LABELS: Record<FlightType, string> = {
  local: "Local",
  xc: "XC",
  night: "Night",
  instrument: "IFR",
  checkride: "Checkride",
};

const WEATHER_COLORS: Record<WeatherCondition, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

export default function LogbookScreen() {
  const { isDark, theme } = useTheme();
  const { scene } = useSceneStore();
  const { entries, addEntry, getTotalHours } = useLogbookStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [aircraft, setAircraft] = useState("");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [route, setRoute] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [flightType, setFlightType] = useState<FlightType>("local");
  const [weatherConditions, setWeatherConditions] = useState<WeatherCondition>("VFR");

  // Summary stats
  const totalFlights = entries.length;
  const totalHours = getTotalHours();
  const mostFlownAircraft = useMemo(() => {
    if (entries.length === 0) return "—";
    const counts: Record<string, number> = {};
    entries.forEach((entry) => {
      counts[entry.aircraft] = (counts[entry.aircraft] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "—";
  }, [entries]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 300));
    setRefreshing(false);
  }, []);

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (entries.length === 0) {
      Alert.alert("No Entries", "Add flights to your logbook before exporting.");
      return;
    }
    try {
      const csv = exportLogbookCSV(entries);
      await Share.share({
        message: csv,
        title: "SkyBrief Logbook Export",
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not export logbook.");
    }
  }, [entries]);

  const handleSaveFlight = useCallback(() => {
    if (!aircraft.trim()) {
      Alert.alert("Required Field", "Aircraft is required.");
      return;
    }
    if (!departure.trim()) {
      Alert.alert("Required Field", "Departure is required.");
      return;
    }
    if (!arrival.trim()) {
      Alert.alert("Required Field", "Arrival is required.");
      return;
    }
    const duration = parseInt(durationMinutes, 10);
    if (!duration || duration <= 0) {
      Alert.alert("Invalid Duration", "Please enter a valid duration in minutes.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addEntry({
      date: new Date().toISOString().split("T")[0],
      aircraft: aircraft.trim(),
      departure: departure.trim().toUpperCase(),
      arrival: arrival.trim().toUpperCase(),
      route: route.trim(),
      durationMinutes: duration,
      flightType,
      weatherConditions,
      station: departure.trim().toUpperCase(),
      remarks: remarks.trim(),
    });

    // Reset form
    setAircraft("");
    setDeparture("");
    setArrival("");
    setRoute("");
    setDurationMinutes("");
    setRemarks("");
    setFlightType("local");
    setWeatherConditions("VFR");
    setShowAddForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    aircraft,
    departure,
    arrival,
    route,
    durationMinutes,
    remarks,
    flightType,
    weatherConditions,
    addEntry,
  ]);

  const dynamicColors = useMemo(
    () => ({
      label: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
      value: isDark ? theme.foreground : colors.stratus[800],
      border: isDark ? "rgba(255,255,255,0.1)" : "rgba(12,140,233,0.08)",
      inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(12,140,233,0.04)",
      inputBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.12)",
      inputText: isDark ? "#FFFFFF" : colors.stratus[800],
      placeholder: isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)",
      chipText: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[500],
      chipTextActive: isDark ? "#FFFFFF" : colors.stratus[800],
      chipBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.1)",
      entryText: isDark ? "rgba(255,255,255,0.85)" : colors.stratus[700],
      entrySubtext: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
    }),
    [isDark, theme]
  );

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
          <Animated.View entering={FadeInDown} style={styles.header}>
            <BookOpen size={22} color="#ffffff" strokeWidth={1.8} />
            <Text style={styles.title}>Flight Logbook</Text>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={handleExport}
              style={styles.exportBtn}
              hitSlop={8}
              accessibilityLabel="Export logbook"
              accessibilityRole="button"
            >
              <Download size={18} color="#ffffff" />
            </Pressable>
          </Animated.View>

          {/* Summary Stats */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <CloudCard>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: dynamicColors.value }]}>
                    {totalFlights}
                  </Text>
                  <Text style={[styles.statLabel, { color: dynamicColors.label }]}>
                    Total Flights
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: dynamicColors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: dynamicColors.value }]}>
                    {totalHours.toFixed(1)}
                  </Text>
                  <Text style={[styles.statLabel, { color: dynamicColors.label }]}>
                    Total Hours
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: dynamicColors.border }]} />
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, { color: dynamicColors.value }]}
                    numberOfLines={1}
                  >
                    {mostFlownAircraft}
                  </Text>
                  <Text style={[styles.statLabel, { color: dynamicColors.label }]}>
                    Most Flown
                  </Text>
                </View>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Add Flight Button / Form */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.gap}>
            {!showAddForm ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAddForm(true);
                }}
                style={styles.addBtn}
              >
                <Plus size={18} color={colors.stratus[500]} />
                <Text style={styles.addBtnText}>Add Flight</Text>
              </Pressable>
            ) : (
              <CloudCard>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: dynamicColors.value }]}>
                    New Flight Entry
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowAddForm(false);
                    }}
                    hitSlop={8}
                  >
                    <X size={18} color={dynamicColors.label} />
                  </Pressable>
                </View>

                {/* Date display */}
                <View style={styles.formRow}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Date
                  </Text>
                  <Text style={[styles.formValue, { color: dynamicColors.value }]}>
                    {new Date().toLocaleDateString()}
                  </Text>
                </View>

                {/* Aircraft */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Aircraft
                  </Text>
                  <TextInput
                    value={aircraft}
                    onChangeText={setAircraft}
                    placeholder="e.g., N12345, C172"
                    placeholderTextColor={dynamicColors.placeholder}
                    style={[
                      styles.input,
                      {
                        backgroundColor: dynamicColors.inputBg,
                        borderColor: dynamicColors.inputBorder,
                        color: dynamicColors.inputText,
                      },
                    ]}
                  />
                </View>

                {/* Departure */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Departure (ICAO)
                  </Text>
                  <TextInput
                    value={departure}
                    onChangeText={setDeparture}
                    placeholder="e.g., KJFK"
                    placeholderTextColor={dynamicColors.placeholder}
                    autoCapitalize="characters"
                    style={[
                      styles.input,
                      {
                        backgroundColor: dynamicColors.inputBg,
                        borderColor: dynamicColors.inputBorder,
                        color: dynamicColors.inputText,
                      },
                    ]}
                  />
                </View>

                {/* Arrival */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Arrival (ICAO)
                  </Text>
                  <TextInput
                    value={arrival}
                    onChangeText={setArrival}
                    placeholder="e.g., KLGA"
                    placeholderTextColor={dynamicColors.placeholder}
                    autoCapitalize="characters"
                    style={[
                      styles.input,
                      {
                        backgroundColor: dynamicColors.inputBg,
                        borderColor: dynamicColors.inputBorder,
                        color: dynamicColors.inputText,
                      },
                    ]}
                  />
                </View>

                {/* Route */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Route (optional)
                  </Text>
                  <TextInput
                    value={route}
                    onChangeText={setRoute}
                    placeholder="e.g., Direct, via XYZ"
                    placeholderTextColor={dynamicColors.placeholder}
                    style={[
                      styles.input,
                      {
                        backgroundColor: dynamicColors.inputBg,
                        borderColor: dynamicColors.inputBorder,
                        color: dynamicColors.inputText,
                      },
                    ]}
                  />
                </View>

                {/* Duration */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Duration (minutes)
                  </Text>
                  <TextInput
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    placeholder="e.g., 90"
                    placeholderTextColor={dynamicColors.placeholder}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: dynamicColors.inputBg,
                        borderColor: dynamicColors.inputBorder,
                        color: dynamicColors.inputText,
                      },
                    ]}
                  />
                </View>

                {/* Flight Type */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Flight Type
                  </Text>
                  <View style={styles.chipRow}>
                    {(["local", "xc", "night", "instrument", "checkride"] as FlightType[]).map(
                      (type) => (
                        <Pressable
                          key={type}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setFlightType(type);
                          }}
                          style={[
                            styles.chip,
                            {
                              borderColor: dynamicColors.chipBorder,
                              backgroundColor: dynamicColors.inputBg,
                            },
                            flightType === type && styles.chipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: dynamicColors.chipText },
                              flightType === type && {
                                color: dynamicColors.chipTextActive,
                                fontFamily: "Inter_700Bold",
                              },
                            ]}
                          >
                            {FLIGHT_TYPE_LABELS[type]}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Weather Conditions */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Weather Conditions
                  </Text>
                  <View style={styles.chipRow}>
                    {(["VFR", "MVFR", "IFR", "LIFR"] as WeatherCondition[]).map((wx) => (
                      <Pressable
                        key={wx}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setWeatherConditions(wx);
                        }}
                        style={[
                          styles.chip,
                          {
                            borderColor:
                              weatherConditions === wx
                                ? WEATHER_COLORS[wx]
                                : dynamicColors.chipBorder,
                            backgroundColor:
                              weatherConditions === wx
                                ? `${WEATHER_COLORS[wx]}20`
                                : dynamicColors.inputBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color:
                                weatherConditions === wx
                                  ? WEATHER_COLORS[wx]
                                  : dynamicColors.chipText,
                            },
                            weatherConditions === wx && { fontFamily: "Inter_700Bold" },
                          ]}
                        >
                          {wx}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Remarks */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: dynamicColors.label }]}>
                    Remarks (optional)
                  </Text>
                  <TextInput
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Notes, observations, lessons learned"
                    placeholderTextColor={dynamicColors.placeholder}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: dynamicColors.inputBg,
                        borderColor: dynamicColors.inputBorder,
                        color: dynamicColors.inputText,
                      },
                    ]}
                  />
                </View>

                {/* Save Button */}
                <Pressable onPress={handleSaveFlight} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save Flight</Text>
                </Pressable>
              </CloudCard>
            )}
          </Animated.View>

          {/* Flight Log List */}
          {entries.length === 0 && !showAddForm && (
            <Animated.View entering={FadeInDown.delay(150)} style={styles.emptyState}>
              <BookOpen size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No flights logged yet</Text>
              <Text style={styles.emptySubtitle}>
                Start building your flight history by adding your first entry
              </Text>
            </Animated.View>
          )}

          {entries.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150)} style={styles.gap}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.label }]}>
                Flight History
              </Text>
              {entries.map((entry, index) => (
                <Animated.View
                  key={entry.id}
                  entering={FadeInDown.delay(200 + index * 30)}
                >
                  <CloudCard style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={[styles.entryDate, { color: dynamicColors.value }]}>
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: `${WEATHER_COLORS[entry.weatherConditions as WeatherCondition]}20`,
                              borderColor: WEATHER_COLORS[entry.weatherConditions as WeatherCondition],
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color:
                                  WEATHER_COLORS[entry.weatherConditions as WeatherCondition],
                              },
                            ]}
                          >
                            {entry.weatherConditions}
                          </Text>
                        </View>
                        <View style={[styles.badge, styles.badgeType]}>
                          <Text style={[styles.badgeText, { color: colors.stratus[600] }]}>
                            {FLIGHT_TYPE_LABELS[entry.flightType]}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.entryRow}>
                      <Text style={[styles.entryRoute, { color: dynamicColors.entryText }]}>
                        {entry.departure} → {entry.arrival}
                      </Text>
                      <Text style={[styles.entryDuration, { color: dynamicColors.value }]}>
                        {(entry.durationMinutes / 60).toFixed(1)} hrs
                      </Text>
                    </View>

                    <View style={styles.entryMeta}>
                      <Text style={[styles.entryAircraft, { color: dynamicColors.entrySubtext }]}>
                        {entry.aircraft}
                      </Text>
                      {entry.route && (
                        <Text
                          style={[styles.entryRouteDetail, { color: dynamicColors.entrySubtext }]}
                          numberOfLines={1}
                        >
                          via {entry.route}
                        </Text>
                      )}
                    </View>

                    {entry.remarks && (
                      <Text
                        style={[styles.entryRemarks, { color: dynamicColors.entrySubtext }]}
                        numberOfLines={2}
                      >
                        {entry.remarks}
                      </Text>
                    )}
                  </CloudCard>
                </Animated.View>
              ))}
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
  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  gap: { marginTop: 12 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.stratus[800],
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(12,140,233,0.08)",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(12,140,233,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
    paddingVertical: 14,
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[600],
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: colors.stratus[800],
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(12,140,233,0.08)",
    marginBottom: 12,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[600],
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  formValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[800],
  },
  input: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[800],
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.1)",
    backgroundColor: "rgba(12,140,233,0.04)",
  },
  chipActive: {
    backgroundColor: "rgba(12,140,233,0.12)",
    borderColor: colors.stratus[500],
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[500],
  },
  saveBtn: {
    backgroundColor: colors.stratus[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
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
    textAlign: "center",
    paddingHorizontal: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: colors.stratus[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  entryCard: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entryDate: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[800],
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeType: {
    backgroundColor: "rgba(12,140,233,0.06)",
    borderColor: "rgba(12,140,233,0.15)",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entryRoute: {
    fontSize: 16,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[700],
  },
  entryDuration: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: colors.stratus[800],
  },
  entryMeta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  entryAircraft: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[500],
  },
  entryRouteDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[500],
    fontStyle: "italic",
    flex: 1,
  },
  entryRemarks: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[500],
    marginTop: 4,
    lineHeight: 18,
  },
});
