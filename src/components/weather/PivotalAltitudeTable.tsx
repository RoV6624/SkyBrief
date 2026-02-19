/**
 * Pivotal Altitude Table Component
 *
 * Displays a table of pivotal altitudes for various airspeeds and nearby airports.
 * Accounts for wind conditions at each airport to calculate ground speed.
 */

import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { CloudCard } from "@/components/ui/CloudCard";
import { useUserStore } from "@/stores/user-store";
import { useMetar } from "@/hooks/useMetar";
import { findNearbyStationsByICAO } from "@/lib/route/nearby-stations";
import { findStationCoords } from "@/lib/route/station-coords";
import {
  getAircraftAirspeedRange,
  generateAirspeedArray,
  calculatePivotalAltitudeFromIAS,
  calculatePivotalAltitudeRange,
} from "@/lib/aviation/pivotal-altitude";
import { colors } from "@/theme/tokens";
import { useMemo } from "react";
import type { NormalizedMetar } from "@/lib/api/types";

interface PivotalAltitudeTableProps {
  primaryIcao: string;
  primaryMetar: NormalizedMetar;
}

interface StationData {
  icao: string;
  name: string;
  distance?: number;
  metar: NormalizedMetar | null;
}

export function PivotalAltitudeTable({
  primaryIcao,
  primaryMetar,
}: PivotalAltitudeTableProps) {
  const { theme, isDark } = useTheme();
  const { defaultAircraft } = useUserStore();

  // Get airspeed range for the aircraft
  const aircraftId = defaultAircraft || "c172s";
  const airspeedRange = useMemo(
    () => getAircraftAirspeedRange(aircraftId),
    [aircraftId]
  );

  const airspeeds = useMemo(
    () =>
      generateAirspeedArray(
        airspeedRange.min,
        airspeedRange.max,
        airspeedRange.step
      ),
    [airspeedRange]
  );

  // Find nearby stations
  const nearbyStations = useMemo(() => {
    const primaryCoords = findStationCoords(primaryIcao);
    if (!primaryCoords) return [];

    return findNearbyStationsByICAO(primaryIcao, 25, 3); // Get 3 nearby stations within 25nm
  }, [primaryIcao]);

  // Fetch weather for nearby stations
  const nearby1 = useMetar(nearbyStations[0]?.icao || null);
  const nearby2 = useMetar(nearbyStations[1]?.icao || null);
  const nearby3 = useMetar(nearbyStations[2]?.icao || null);

  // Build station data array
  const stations: StationData[] = useMemo(() => {
    const result: StationData[] = [
      {
        icao: primaryIcao,
        name: primaryMetar.stationName || primaryIcao,
        metar: primaryMetar,
      },
    ];

    if (nearbyStations[0] && nearby1.data?.normalized) {
      result.push({
        icao: nearbyStations[0].icao,
        name: nearbyStations[0].name,
        distance: Math.round(nearbyStations[0].distance),
        metar: nearby1.data.normalized,
      });
    }

    if (nearbyStations[1] && nearby2.data?.normalized) {
      result.push({
        icao: nearbyStations[1].icao,
        name: nearbyStations[1].name,
        distance: Math.round(nearbyStations[1].distance),
        metar: nearby2.data.normalized,
      });
    }

    if (nearbyStations[2] && nearby3.data?.normalized) {
      result.push({
        icao: nearbyStations[2].icao,
        name: nearbyStations[2].name,
        distance: Math.round(nearbyStations[2].distance),
        metar: nearby3.data.normalized,
      });
    }

    return result;
  }, [
    primaryIcao,
    primaryMetar,
    nearbyStations,
    nearby1.data,
    nearby2.data,
    nearby3.data,
  ]);

  // Calculate pivotal altitude range for each combination
  const calculatePA = (ias: number, station: StationData): string => {
    if (!station.metar) return "—";

    const windDir = station.metar.wind.direction;
    const windSpeed = station.metar.wind.speed;

    // Calculate pivotal altitude range accounting for all possible headings
    const { min, max } = calculatePivotalAltitudeRange(ias, windDir, windSpeed);

    // Show range if different, single value if same
    if (min === max) {
      return `${min}'`;
    } else {
      return `${min}'-${max}'`;
    }
  };

  if (stations.length === 0) {
    return null;
  }

  return (
    <CloudCard style={{ padding: 16 }}>
      <Text
        style={[
          styles.title,
          { color: isDark ? theme.foreground : colors.stratus[700] },
        ]}
      >
        Pivotal Altitude Table
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? theme.mutedForeground : colors.stratus[600] },
        ]}
      >
        {aircraftId === "c172s" ? "Cessna 172S" : "Default Aircraft"} • 85-110
        KIAS • AGL range for all headings
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableContainer}>
          {/* Header Row */}
          <View style={styles.row}>
            <View style={[styles.headerCell, styles.leftColumn]}>
              <Text
                style={[
                  styles.headerText,
                  { color: isDark ? theme.foreground : colors.stratus[800] },
                ]}
              >
                IAS (kts)
              </Text>
            </View>

            {stations.map((station, idx) => (
              <View key={station.icao} style={styles.headerCell}>
                <Text
                  style={[
                    styles.headerText,
                    { color: isDark ? theme.foreground : colors.stratus[800] },
                  ]}
                >
                  {station.icao}
                </Text>
                {station.distance !== undefined && (
                  <Text
                    style={[
                      styles.distanceText,
                      { color: theme.mutedForeground },
                    ]}
                  >
                    {station.distance}nm
                  </Text>
                )}
                {station.metar && (
                  <Text
                    style={[
                      styles.windText,
                      { color: theme.mutedForeground },
                    ]}
                  >
                    {typeof station.metar.wind.direction === "number"
                      ? `${String(station.metar.wind.direction).padStart(3, "0")}°`
                      : "VRB"}
                    @{station.metar.wind.speed}kt
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {airspeeds.map((ias) => (
            <View
              key={ias}
              style={[
                styles.row,
                { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
              ]}
            >
              <View style={[styles.cell, styles.leftColumn]}>
                <Text
                  style={[
                    styles.iasText,
                    { color: isDark ? theme.foreground : colors.stratus[700] },
                  ]}
                >
                  {ias}
                </Text>
              </View>

              {stations.map((station) => (
                <View key={`${ias}-${station.icao}`} style={styles.cell}>
                  <Text
                    style={[
                      styles.paText,
                      {
                        color: isDark
                          ? theme.foreground
                          : colors.stratus[700],
                      },
                    ]}
                  >
                    {calculatePA(ias, station)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <Text
        style={[
          styles.footnote,
          { color: theme.mutedForeground },
        ]}
      >
        Note: Pivotal altitude = GS² ÷ 11.3 (feet AGL). Ground speed calculated
        from IAS + wind component.
      </Text>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  tableContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerCell: {
    padding: 12,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  leftColumn: {
    minWidth: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cell: {
    padding: 12,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  distanceText: {
    fontSize: 10,
    marginTop: 2,
  },
  windText: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: "monospace",
  },
  iasText: {
    fontSize: 14,
    fontWeight: "600",
  },
  paText: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  footnote: {
    fontSize: 11,
    marginTop: 12,
    fontStyle: "italic",
  },
});
