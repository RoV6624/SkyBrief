import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Plane } from "lucide-react-native";

import { NavLogLegCard } from "./NavLogLegCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { getArrivalForecast } from "@/lib/route/arrival-forecast";
import type { NavLog } from "@/lib/navlog/types";
import type { FlightCategory } from "@/lib/api/types";
import type { RouteWeatherPoint, ArrivalForecast } from "@/lib/route/types";

interface NavLogSectionProps {
  navLog: NavLog;
  weatherPoints: RouteWeatherPoint[];
  /** Base animation delay offset (ms) */
  baseDelay?: number;
  /** Departure time as epoch seconds (defaults to now) */
  departureTime?: number;
}

export function NavLogSection({
  navLog,
  weatherPoints,
  baseDelay = 450,
  departureTime,
}: NavLogSectionProps) {
  const { theme, isDark } = useTheme();

  const headerColor = isDark ? theme.mutedForeground : colors.stratus[700];

  /** Compute arrival forecasts from TAF data for each leg */
  const arrivalForecasts = useMemo(() => {
    const depEpoch = departureTime ?? Math.floor(Date.now() / 1000);
    const forecasts: (ArrivalForecast | null)[] = [];
    let cumulativeMin = 0;

    for (const leg of navLog.legs) {
      cumulativeMin += leg.timeEnroute;
      const arrivalEpoch = depEpoch + cumulativeMin * 60;

      // Find TAF for the destination of this leg
      const destWp = weatherPoints.find(
        (w) => w.waypoint.icao === leg.to.icao
      );
      if (destWp?.taf) {
        forecasts.push(getArrivalForecast(destWp.taf, arrivalEpoch));
      } else {
        forecasts.push(null);
      }
    }
    return forecasts;
  }, [navLog.legs, weatherPoints, departureTime]);

  /** Look up the flight category for a given ICAO from weatherPoints */
  function getCategoryForStation(icao: string): FlightCategory | null {
    const wp = weatherPoints.find((w) => w.waypoint.icao === icao);
    return wp?.metar?.flightCategory ?? null;
  }

  /** Check if a station is a hazard (sub-VFR conditions) */
  function getHazardLabel(icao: string): string | null {
    const wp = weatherPoints.find((w) => w.waypoint.icao === icao);
    if (!wp?.metar) return null;
    const cat = wp.metar.flightCategory;
    if (cat === "IFR" || cat === "LIFR") {
      if (wp.metar.presentWeather?.includes("TS")) return "Thunderstorm";
      if (wp.metar.visibility.sm < 1) return "Low Visibility";
      if (wp.metar.ceiling && wp.metar.ceiling < 500) return "Low Ceiling";
      return `${cat} Conditions`;
    }
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Animated.View
        entering={FadeInDown.delay(baseDelay)}
        style={styles.header}
      >
        <Plane size={16} color={colors.stratus[500]} strokeWidth={1.8} />
        <Text style={[styles.headerText, { color: headerColor }]}>
          Navigation Log
        </Text>
      </Animated.View>

      {/* Column Labels */}
      <Animated.View
        entering={FadeInDown.delay(baseDelay + 30)}
        style={styles.colLabels}
      >
        <Text style={[styles.colLabel, styles.colRoute, { color: headerColor }]}>
          ROUTE LEG
        </Text>
        <Text style={[styles.colLabel, { color: headerColor }]}>HDG</Text>
        <Text style={[styles.colLabel, { color: headerColor }]}>G/S</Text>
        <Text style={[styles.colLabel, { color: headerColor }]}>ETE</Text>
        <Text style={[styles.colLabel, { color: headerColor }]}>FUEL</Text>
      </Animated.View>

      {/* Leg Cards */}
      {navLog.legs.map((leg, i) => (
        <Animated.View
          key={`${leg.from.icao}-${leg.to.icao}`}
          entering={FadeInDown.delay(baseDelay + 60 + i * 60)}
        >
          <NavLogLegCard
            leg={leg}
            index={i}
            flightCategory={getCategoryForStation(leg.from.icao)}
            hazardLabel={getHazardLabel(leg.from.icao)}
            arrivalForecast={arrivalForecasts[i]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colLabels: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 2,
  },
  colLabel: {
    fontSize: 9,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
    textAlign: "center",
  },
  colRoute: {
    flex: 2,
    textAlign: "left",
  },
});
