import { View, Text, StyleSheet } from "react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { NavLogLeg } from "@/lib/navlog/types";
import type { FlightCategory } from "@/lib/api/types";
import type { ArrivalForecast } from "@/lib/route/types";
import { formatMinutesToHM } from "@/lib/utils/conversions";

interface NavLogLegCardProps {
  leg: NavLogLeg;
  index: number;
  /** Flight category of the departure station for accent color */
  flightCategory?: FlightCategory | null;
  /** Optional hazard label e.g. "Turbulence SIGMET" */
  hazardLabel?: string | null;
  /** Forecasted weather at arrival time from TAF data */
  arrivalForecast?: ArrivalForecast | null;
}

const categoryColors: Record<FlightCategory, string> = {
  VFR: colors.vfr,
  MVFR: colors.mvfr,
  IFR: colors.ifr,
  LIFR: colors.lifr,
};

function formatHeading(hdg: number): string {
  if (isNaN(hdg)) return "---";
  return hdg.toString().padStart(3, "0") + "\u00B0";
}

export function NavLogLegCard({
  leg,
  flightCategory,
  hazardLabel,
  arrivalForecast,
}: NavLogLegCardProps) {
  const { theme, isDark } = useTheme();

  const accentColor = flightCategory
    ? categoryColors[flightCategory]
    : colors.stratus[400];
  const isHazard = !!hazardLabel;
  const borderColor = isHazard ? colors.alert.red : accentColor;

  const labelColor = isDark ? theme.mutedForeground : colors.stratus[600];
  const valueColor = theme.foreground;
  const dividerColor = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(12,140,233,0.1)";

  return (
    <CloudCard style={{ overflow: "hidden" }}>
      <View style={[styles.accentBorder, { backgroundColor: borderColor }]} />
      <View style={styles.content}>
        {/* Row 1: Route leg identifier */}
        <View style={styles.legHeader}>
          <Text style={[styles.legRoute, { color: valueColor }]}>
            {leg.from.icao} → {leg.to.icao}
          </Text>
          <Text style={[styles.legDist, { color: labelColor }]}>
            {leg.distanceNm} NM
          </Text>
        </View>

        {/* Row 2: HDG / G/S / ETE / FUEL */}
        <View style={styles.dataRow}>
          <View style={styles.dataCol}>
            <Text style={[styles.dataLabel, { color: labelColor }]}>HDG</Text>
            <Text style={[styles.dataValue, { color: valueColor }]}>
              {formatHeading(leg.trueHeading)}
            </Text>
          </View>
          <View style={[styles.dataDivider, { backgroundColor: dividerColor }]} />
          <View style={styles.dataCol}>
            <Text style={[styles.dataLabel, { color: labelColor }]}>G/S</Text>
            <Text style={[styles.dataValue, { color: valueColor }]}>
              {isNaN(leg.groundSpeed) ? "---" : `${leg.groundSpeed}`}
            </Text>
          </View>
          <View style={[styles.dataDivider, { backgroundColor: dividerColor }]} />
          <View style={styles.dataCol}>
            <Text style={[styles.dataLabel, { color: labelColor }]}>ETE</Text>
            <Text style={[styles.dataValue, { color: valueColor }]}>
              {formatMinutesToHM(leg.timeEnroute)}
            </Text>
          </View>
          <View style={[styles.dataDivider, { backgroundColor: dividerColor }]} />
          <View style={styles.dataCol}>
            <Text style={[styles.dataLabel, { color: labelColor }]}>FUEL</Text>
            <Text style={[styles.dataValue, { color: valueColor }]}>
              {isNaN(leg.fuelBurn) ? "---" : leg.fuelBurn.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Hazard badge */}
        {isHazard && (
          <View style={styles.hazardBadge}>
            <Text style={styles.hazardText}>{hazardLabel}</Text>
          </View>
        )}

        {/* Arrival forecast from TAF */}
        {arrivalForecast && (
          <View style={[styles.forecastRow, { borderTopColor: dividerColor }]}>
            <View style={styles.forecastLabel}>
              <Text style={[styles.forecastLabelText, { color: labelColor }]}>
                Fcst @ arrival
              </Text>
              <View
                style={[
                  styles.forecastCatBadge,
                  { backgroundColor: categoryColors[arrivalForecast.flightCategory] },
                ]}
              >
                <Text style={styles.forecastCatText}>
                  {arrivalForecast.flightCategory}
                </Text>
              </View>
              {flightCategory && arrivalForecast.flightCategory !== flightCategory && (
                <Text style={styles.forecastChangedIcon}>*</Text>
              )}
            </View>
            <Text style={[styles.forecastDetail, { color: valueColor }]}>
              {arrivalForecast.visibility} SM · {arrivalForecast.wind}
              {arrivalForecast.ceiling ? ` · ${arrivalForecast.ceiling} ft` : ""}
            </Text>
          </View>
        )}
      </View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  accentBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  content: {
    gap: 10,
  },
  legHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legRoute: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_700Bold",
  },
  legDist: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dataCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  dataLabel: {
    fontSize: 9,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dataValue: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  dataDivider: {
    width: 1,
    height: 28,
  },
  hazardBadge: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  hazardText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#ef4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  forecastRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 4,
  },
  forecastLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  forecastLabelText: {
    fontSize: 9,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  forecastCatBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  forecastCatText: {
    fontSize: 9,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    letterSpacing: 0.4,
  },
  forecastChangedIcon: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#f59e0b",
  },
  forecastDetail: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },
});
