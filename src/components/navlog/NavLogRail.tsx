import { View, Text, StyleSheet } from "react-native";
import { Plane, Navigation, Radio, MapPin, Satellite } from "lucide-react-native";

import type { NavLog } from "@/lib/navlog/types";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { navaidDataService } from "@/services/navaid-data";

interface NavLogRailProps {
  navLog: NavLog;
}

/**
 * Get waypoint type icon based on identifier
 * Checks navaid database first, then infers from identifier pattern
 */
function getWaypointIcon(identifier: string, color: string) {
  const size = 14;
  const strokeWidth = 2;

  // Check if it's a real navaid
  const navaid = navaidDataService.getNavaid(identifier);

  if (navaid) {
    // Use navaid type
    if (navaid.type.includes("VOR")) {
      return <Radio size={size} color={color} strokeWidth={strokeWidth} />;
    }
    if (navaid.type === "NDB") {
      return <Radio size={size} color={color} strokeWidth={strokeWidth} />;
    }
    if (navaid.type === "GPS" || navaid.type === "FIX") {
      return <MapPin size={size} color={color} strokeWidth={strokeWidth} />;
    }
  }

  // Infer from identifier pattern
  if (identifier.startsWith("WPT")) {
    // Synthetic GPS waypoint
    return <Satellite size={size} color={color} strokeWidth={strokeWidth} />;
  }

  // Default to airport icon
  return <Navigation size={size} color={color} strokeWidth={strokeWidth} />;
}

export function NavLogRail({ navLog }: NavLogRailProps) {
  const { theme, isDark } = useTheme();

  const dynamicStyles = {
    sectionTitle: {
      ...styles.sectionTitle,
      color: isDark ? theme.mutedForeground : colors.stratus[700],
    },
    summaryText: {
      ...styles.summaryText,
      color: isDark ? theme.mutedForeground : colors.stratus[500],
    },
    legText: {
      ...styles.legText,
      color: theme.foreground,
    },
    legDetail: {
      ...styles.legDetail,
      color: isDark ? theme.mutedForeground : colors.stratus[600],
    },
  };

  return (
    <CloudCard style={{ marginTop: 12 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Plane size={16} color={colors.stratus[500]} strokeWidth={1.8} />
          <Text style={dynamicStyles.sectionTitle}>Automated NavLog</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={dynamicStyles.summaryText}>
          {navLog.totalDistance} NM • {navLog.totalTime} min •{" "}
          {navLog.totalFuel.toFixed(1)} gal
        </Text>
      </View>

      {/* Legs */}
      <View style={styles.legsList}>
        {navLog.legs.map((leg, i) => (
          <View key={i} style={styles.legRow}>
            {/* Waypoint IDs with Type Icons */}
            <View style={styles.waypoints}>
              <View style={styles.waypointWithIcon}>
                {getWaypointIcon(leg.from.icao, colors.vfr)}
                <Text style={dynamicStyles.legText}>{leg.from.icao}</Text>
              </View>
              <Text style={[styles.arrow, { color: colors.stratus[400] }]}>→</Text>
              <View style={styles.waypointWithIcon}>
                {getWaypointIcon(leg.to.icao, colors.vfr)}
                <Text style={dynamicStyles.legText}>{leg.to.icao}</Text>
              </View>
            </View>

            {/* Flight Data */}
            <View style={styles.flightData}>
              <View style={styles.dataItem}>
                <Text style={dynamicStyles.legDetail}>
                  HDG{" "}
                  {isNaN(leg.trueHeading) || leg.trueHeading === null
                    ? "---"
                    : leg.trueHeading.toString().padStart(3, "0")}
                  °
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.dataItem}>
                <Text style={dynamicStyles.legDetail}>
                  {isNaN(leg.distanceNm) || leg.distanceNm === null
                    ? "---"
                    : leg.distanceNm}{" "}
                  NM
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.dataItem}>
                <Text style={dynamicStyles.legDetail}>
                  {isNaN(leg.timeEnroute) || leg.timeEnroute === null
                    ? "---"
                    : leg.timeEnroute}{" "}
                  min
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.dataItem}>
                <Text style={dynamicStyles.legDetail}>
                  {isNaN(leg.fuelBurn) || leg.fuelBurn === null
                    ? "---"
                    : leg.fuelBurn.toFixed(1)}{" "}
                  gal
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summary: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  legsList: {
    gap: 10,
  },
  legRow: {
    gap: 8,
  },
  waypoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  waypointWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  arrow: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  legText: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_700Bold",
  },
  flightData: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dataItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(12,140,233,0.15)",
    marginHorizontal: 6,
  },
  legDetail: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_500Medium",
  },
});
