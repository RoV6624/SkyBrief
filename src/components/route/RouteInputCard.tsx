import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Navigation, Plus, X, ChevronRight } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

type FlightType = "VFR" | "IFR";

interface RouteInputCardProps {
  waypoints: string[];
  flightType: FlightType;
  generating: boolean;
  onUpdateWaypoint: (index: number, value: string) => void;
  onAddWaypoint: () => void;
  onRemoveWaypoint: (index: number) => void;
  onFlightTypeChange: (type: FlightType) => void;
  onAutoGenerate: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function RouteInputCard({
  waypoints,
  flightType,
  generating,
  onUpdateWaypoint,
  onAddWaypoint,
  onRemoveWaypoint,
  onFlightTypeChange,
  onAutoGenerate,
  onClear,
  onSubmit,
}: RouteInputCardProps) {
  const { theme, isDark } = useTheme();

  const sectionTitleColor = isDark ? theme.mutedForeground : colors.stratus[700];
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(12,140,233,0.06)";
  const placeholderColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)";

  function getPlaceholder(index: number): string {
    if (index === 0) return "Departure (e.g. KJFK)";
    if (index === waypoints.length - 1) return "Destination (e.g. KLAX)";
    return "VOR / Airport / Fix";
  }

  return (
    <CloudCard>
      {/* Flight Type Selector */}
      <View style={styles.flightTypeContainer}>
        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
          Flight Type
        </Text>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleButton,
              {
                backgroundColor:
                  flightType === "VFR"
                    ? colors.vfr
                    : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              onFlightTypeChange("VFR");
              Haptics.selectionAsync();
            }}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    flightType === "VFR"
                      ? "#ffffff"
                      : isDark
                      ? theme.mutedForeground
                      : colors.stratus[600],
                },
              ]}
            >
              VFR
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              {
                backgroundColor:
                  flightType === "IFR"
                    ? colors.mvfr
                    : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              onFlightTypeChange("IFR");
              Haptics.selectionAsync();
            }}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    flightType === "IFR"
                      ? "#ffffff"
                      : isDark
                      ? theme.mutedForeground
                      : colors.stratus[600],
                },
              ]}
            >
              IFR
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Waypoint List */}
      <Text
        style={[styles.sectionTitle, { color: sectionTitleColor, marginTop: 20 }]}
      >
        Flight Plan
      </Text>
      <View style={styles.waypointList}>
        {waypoints.map((wp, i) => (
          <Animated.View
            key={i}
            entering={FadeInLeft.delay(i * 50)}
            style={styles.waypointRow}
          >
            <View style={styles.waypointDotContainer}>
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
              {i < waypoints.length - 1 && <View style={styles.dotLine} />}
            </View>
            <TextInput
              value={wp}
              onChangeText={(t) => onUpdateWaypoint(i, t)}
              placeholder={getPlaceholder(i)}
              placeholderTextColor={placeholderColor}
              autoCapitalize="characters"
              maxLength={5}
              style={[
                styles.waypointInput,
                { color: theme.foreground, backgroundColor: inputBg },
              ]}
            />
            {waypoints.length > 2 && (
              <Pressable
                onPress={() => onRemoveWaypoint(i)}
                style={styles.removeBtn}
              >
                <X size={14} color={colors.stratus[400]} />
              </Pressable>
            )}
          </Animated.View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {waypoints.length === 2 &&
            waypoints[0].length >= 4 &&
            waypoints[1].length >= 4 && (
              <Pressable
                onPress={onAutoGenerate}
                disabled={generating}
                style={styles.autoGenBtn}
              >
                <Navigation size={14} color={colors.stratus[700]} />
                <Text style={styles.addText}>
                  {generating ? "Generating..." : "Auto Generate Route"}
                </Text>
              </Pressable>
            )}
          {waypoints.length < 6 && waypoints.length > 2 && (
            <Pressable onPress={onAddWaypoint} style={styles.addBtn}>
              <Plus size={14} color={colors.stratus[700]} />
              <Text style={styles.addText}>Add Waypoint</Text>
            </Pressable>
          )}
          {(waypoints.length > 2 || waypoints.some((w) => w.length > 0)) && (
            <Pressable onPress={onClear} style={styles.clearBtn}>
              <X size={14} color="#ef4444" />
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={onSubmit}
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
  );
}

const styles = StyleSheet.create({
  flightTypeContainer: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
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
  toggleText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.3,
  },
  waypointList: { gap: 0 },
  waypointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  waypointDotContainer: { alignItems: "center", width: 20 },
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
    backgroundColor: "rgba(12,140,233,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#ef4444",
  },
  addText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: colors.stratus[700],
  },
  briefBtn: {
    backgroundColor: colors.stratus[700],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  briefText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
  },
});
