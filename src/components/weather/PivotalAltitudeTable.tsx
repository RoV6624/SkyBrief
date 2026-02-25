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
import { useMetarBatch } from "@/hooks/useMetarBatch";
import { findNearbyStationsByICAO } from "@/lib/route/nearby-stations";
import { findStationCoords } from "@/lib/route/station-coords";
import {
  getAircraftAirspeedRange,
  generateAirspeedArray,
  calculatePivotalAltitudeFromIAS,
  calculatePivotalAltitudeRange,
} from "@/lib/aviation/pivotal-altitude";
import { colors, radii } from "@/theme/tokens";
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

  // Batch-fetch weather for nearby stations in a single request
  const nearbyIcaos = useMemo(
    () => nearbyStations.map((s) => s.icao),
    [nearbyStations]
  );
  const nearbyBatch = useMetarBatch(nearbyIcaos);

  // Build station data array
  const stations: StationData[] = useMemo(() => {
    const result: StationData[] = [
      {
        icao: primaryIcao,
        name: primaryMetar.stationName || primaryIcao,
        metar: primaryMetar,
      },
    ];

    const batchData = nearbyBatch.data || {};
    for (const ns of nearbyStations) {
      const metar = batchData[ns.icao] ?? null;
      if (metar) {
        result.push({
          icao: ns.icao,
          name: ns.name,
          distance: Math.round(ns.distance),
          metar,
        });
      }
    }

    return result;
  }, [primaryIcao, primaryMetar, nearbyStations, nearbyBatch.data]);

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

  const stripeBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  return (
    <CloudCard>
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
        {aircraftId === "c172s" ? "Cessna 172S" : "Default Aircraft"} {"\u2022"} 85-110
        KIAS {"\u2022"} AGL range for all headings
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
          style={styles.tableContainer}
          accessibilityRole="table"
          accessibilityLabel={`Pivotal altitude table for ${stations.map(s => s.icao).join(', ')}`}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerCell}>
              <Text
                style={[
                  styles.headerText,
                  { color: isDark ? theme.foreground : colors.stratus[800] },
                ]}
              >
                IAS (kts)
              </Text>
            </View>

            {stations.map((station) => (
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
                      ? `${String(station.metar.wind.direction).padStart(3, "0")}\u00B0`
                      : "VRB"}
                    @{station.metar.wind.speed}kt
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {airspeeds.map((ias, index) => (
            <View
              key={ias}
              style={[
                styles.row,
                index % 2 === 1 && { backgroundColor: stripeBg },
              ]}
            >
              <View style={styles.cell}>
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
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  tableContainer: {
    borderRadius: radii.control,
    overflow: "hidden",
    minWidth: "100%",
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderRadius: 8,
  },
  headerCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textAlign: "center",
  },
  distanceText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  windText: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: "JetBrainsMono_400Regular",
  },
  iasText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  paText: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_400Regular",
  },
  footnote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 14,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
