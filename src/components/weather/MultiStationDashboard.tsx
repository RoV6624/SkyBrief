import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQueries } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  LayoutGrid,
  Wind,
  Eye,
  CloudRain,
  Plus,
  X,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { fetchMetar } from "@/services/api-client";
import { normalizeMetar } from "@/lib/parsers/metar";
import type { NormalizedMetar } from "@/lib/api/types";

interface MultiStationDashboardProps {
  stations: string[]; // Array of ICAO codes (max 4)
  onRemoveStation: (icao: string) => void;
  onAddStation: () => void;
}

const FLIGHT_CATEGORY_COLORS = {
  VFR: colors.alert.green,
  MVFR: "#0c8ce9",
  IFR: colors.alert.red,
  LIFR: "#9B30FF",
};

export function MultiStationDashboard({
  stations,
  onRemoveStation,
  onAddStation,
}: MultiStationDashboardProps) {
  const { isDark } = useTheme();

  const results = useQueries({
    queries: stations.map((icao) => ({
      queryKey: ["metar", icao],
      queryFn: async () => {
        const data = await fetchMetar(icao);
        if (!data.length) return null;
        return normalizeMetar(data[0]);
      },
      enabled: !!icao,
      refetchInterval: 60_000,
      staleTime: 30_000,
    })),
  });

  const handleRemoveStation = (icao: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemoveStation(icao);
  };

  const handleAddStation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddStation();
  };

  return (
    <CloudCard style={styles.container}>
      <View style={styles.header}>
        <LayoutGrid
          size={20}
          color={isDark ? colors.stratus[400] : colors.stratus[600]}
        />
        <Text
          style={[
            styles.headerText,
            { color: isDark ? colors.stratus[400] : colors.stratus[600] },
          ]}
        >
          MULTI-STATION
        </Text>
      </View>

      <View style={styles.grid}>
        {results.map((result, index) => {
          const icao = stations[index];
          const metar = result.data;
          const isLoading = result.isLoading;
          const isError = result.isError;

          return (
            <Animated.View
              key={icao}
              entering={FadeInDown.delay(index * 100)}
              style={styles.stationCardWrapper}
            >
              <View
                style={[
                  styles.stationCard,
                  {
                    backgroundColor: isDark
                      ? colors.stratus[800]
                      : colors.stratus[50],
                    borderColor: isDark
                      ? colors.stratus[700]
                      : colors.stratus[200],
                  },
                ]}
              >
                <Pressable
                  onPress={() => handleRemoveStation(icao)}
                  style={styles.removeButton}
                  hitSlop={8}
                >
                  <X
                    size={16}
                    color={isDark ? colors.stratus[500] : colors.stratus[400]}
                  />
                </Pressable>

                <Text
                  style={[
                    styles.icaoCode,
                    { color: isDark ? colors.stratus[100] : colors.stratus[900] },
                  ]}
                >
                  {icao}
                </Text>

                {isLoading ? (
                  <Text
                    style={[
                      styles.loadingText,
                      {
                        color: isDark ? colors.stratus[500] : colors.stratus[400],
                      },
                    ]}
                  >
                    Loading...
                  </Text>
                ) : isError || !metar ? (
                  <Text
                    style={[
                      styles.errorText,
                      { color: colors.alert.red },
                    ]}
                  >
                    Error loading data
                  </Text>
                ) : (
                  <>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor:
                            FLIGHT_CATEGORY_COLORS[
                              metar.flightCategory as keyof typeof FLIGHT_CATEGORY_COLORS
                            ] || colors.stratus[500],
                        },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {metar.flightCategory || "UNKN"}
                      </Text>
                    </View>

                    <View style={styles.weatherData}>
                      <View style={styles.dataRow}>
                        <Wind
                          size={14}
                          color={
                            isDark ? colors.stratus[400] : colors.stratus[500]
                          }
                        />
                        <Text
                          style={[
                            styles.dataText,
                            {
                              color: isDark
                                ? colors.stratus[300]
                                : colors.stratus[700],
                            },
                          ]}
                        >
                          {metar.wind.speed > 0
                            ? `${metar.wind.direction}° ${metar.wind.speed} kts`
                            : "Calm"}
                        </Text>
                      </View>

                      <View style={styles.dataRow}>
                        <Eye
                          size={14}
                          color={
                            isDark ? colors.stratus[400] : colors.stratus[500]
                          }
                        />
                        <Text
                          style={[
                            styles.dataText,
                            {
                              color: isDark
                                ? colors.stratus[300]
                                : colors.stratus[700],
                            },
                          ]}
                        >
                          {metar.visibility
                            ? `${metar.visibility.sm} SM`
                            : "---"}
                        </Text>
                      </View>

                      <View style={styles.dataRow}>
                        <CloudRain
                          size={14}
                          color={
                            isDark ? colors.stratus[400] : colors.stratus[500]
                          }
                        />
                        <Text
                          style={[
                            styles.dataText,
                            {
                              color: isDark
                                ? colors.stratus[300]
                                : colors.stratus[700],
                            },
                          ]}
                        >
                          {metar.ceiling ? `${metar.ceiling} ft` : "CLR"}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          );
        })}

        {stations.length < 4 && (
          <Animated.View
            entering={FadeInDown.delay(stations.length * 100)}
            style={styles.stationCardWrapper}
          >
            <Pressable
              onPress={handleAddStation}
              style={[
                styles.addCard,
                {
                  borderColor: isDark
                    ? colors.stratus[600]
                    : colors.stratus[300],
                },
              ]}
            >
              <Plus
                size={32}
                color={isDark ? colors.stratus[500] : colors.stratus[400]}
              />
              <Text
                style={[
                  styles.addText,
                  {
                    color: isDark ? colors.stratus[500] : colors.stratus[400],
                  },
                ]}
              >
                Add Station
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stationCardWrapper: {
    width: "48%",
    minWidth: 150,
  },
  stationCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },
  icaoCode: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  categoryText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  weatherData: {
    gap: 8,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 8,
  },
  addCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 12,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
