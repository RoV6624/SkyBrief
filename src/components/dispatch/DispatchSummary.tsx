/**
 * Read-only summary of a bundled dispatch packet.
 *
 * Displays station, flight type, weather snapshot, FRAT score, W&B
 * status, and Go/No-Go verdict. A "Request Dispatch" button at the
 * bottom triggers the submit callback.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  MapPin,
  Plane,
  CloudSun,
  Shield,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import type { DispatchPacket } from "@/lib/dispatch/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  packet: DispatchPacket;
  onSubmit: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Verdict helpers
// ---------------------------------------------------------------------------

function verdictColor(verdict: string | undefined): string {
  if (verdict === "go") return colors.alert.green;
  if (verdict === "marginal") return colors.alert.amber;
  return colors.alert.red;
}

function verdictLabel(verdict: string | undefined): string {
  if (verdict === "go") return "GO";
  if (verdict === "marginal") return "MARGINAL";
  if (verdict === "nogo") return "NO-GO";
  return "N/A";
}

function VerdictIcon({ verdict }: { verdict: string | undefined }) {
  const color = verdictColor(verdict);
  if (verdict === "go") return <CheckCircle2 size={14} color={color} />;
  if (verdict === "marginal") return <AlertTriangle size={14} color={color} />;
  return <XCircle size={14} color={color} />;
}

// ---------------------------------------------------------------------------
// Risk badge helpers
// ---------------------------------------------------------------------------

function riskColor(level: string | undefined): string {
  if (level === "low") return colors.alert.green;
  if (level === "caution") return colors.alert.amber;
  return colors.alert.red;
}

function riskLabel(level: string | undefined): string {
  if (level === "low") return "LOW";
  if (level === "caution") return "CAUTION";
  if (level === "high") return "HIGH";
  return "N/A";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DispatchSummary({ packet, onSubmit, loading }: Props) {
  const { isDark } = useTheme();

  const fcat = packet.weatherSnapshot?.flightCategory ?? "N/A";
  const fcatColor =
    fcat === "VFR"
      ? colors.vfr
      : fcat === "MVFR"
      ? colors.mvfr
      : fcat === "IFR"
      ? colors.ifr
      : fcat === "LIFR"
      ? colors.lifr
      : isDark
      ? "rgba(255,255,255,0.4)"
      : colors.stratus[500];

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)}>
        <CloudCard>
          <View style={styles.headerRow}>
            <MapPin size={16} color={colors.accent} />
            <Text
              style={[
                styles.station,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              {packet.station}
            </Text>
            <View
              style={[
                styles.flightTypeBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Plane
                size={12}
                color={
                  isDark ? "rgba(255,255,255,0.5)" : colors.stratus[600]
                }
              />
              <Text
                style={[
                  styles.flightTypeText,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.6)"
                      : colors.stratus[700],
                  },
                ]}
              >
                {packet.flightType.toUpperCase()}
              </Text>
            </View>
          </View>
          {packet.stationName ? (
            <Text
              style={[
                styles.stationName,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.4)"
                    : colors.stratus[500],
                },
              ]}
            >
              {packet.stationName}
            </Text>
          ) : null}
        </CloudCard>
      </Animated.View>

      {/* Weather snapshot */}
      <Animated.View entering={FadeInDown.delay(100)}>
        <CloudCard>
          <View style={styles.sectionHeaderRow}>
            <CloudSun size={15} color={colors.accent} />
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Weather
            </Text>
          </View>
          {packet.weatherSnapshot ? (
            <View style={styles.weatherGrid}>
              <SummaryCell
                label="Category"
                value={fcat}
                valueColor={fcatColor}
                isDark={isDark}
              />
              <SummaryCell
                label="Ceiling"
                value={
                  packet.weatherSnapshot.ceiling != null
                    ? `${packet.weatherSnapshot.ceiling} ft`
                    : "CLR"
                }
                isDark={isDark}
              />
              <SummaryCell
                label="Visibility"
                value={`${packet.weatherSnapshot.visibility.sm}${packet.weatherSnapshot.visibility.isPlus ? "+" : ""} SM`}
                isDark={isDark}
              />
              <SummaryCell
                label="Wind"
                value={`${packet.weatherSnapshot.wind.direction === "VRB" ? "VRB" : `${packet.weatherSnapshot.wind.direction}`}@${packet.weatherSnapshot.wind.speed}${packet.weatherSnapshot.wind.gust ? `G${packet.weatherSnapshot.wind.gust}` : ""} kt`}
                isDark={isDark}
              />
            </View>
          ) : (
            <Text
              style={[
                styles.noData,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.3)"
                    : colors.stratus[400],
                },
              ]}
            >
              No weather data
            </Text>
          )}
        </CloudCard>
      </Animated.View>

      {/* FRAT */}
      <Animated.View entering={FadeInDown.delay(150)}>
        <CloudCard>
          <View style={styles.sectionHeaderRow}>
            <Shield size={15} color={colors.accent} />
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              FRAT Assessment
            </Text>
          </View>
          {packet.fratResult ? (
            <View style={styles.fratRow}>
              <View
                style={[
                  styles.riskBadge,
                  {
                    backgroundColor:
                      packet.fratResult.riskLevel === "low"
                        ? "rgba(34,197,94,0.12)"
                        : packet.fratResult.riskLevel === "caution"
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(239,68,68,0.12)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.riskBadgeText,
                    { color: riskColor(packet.fratResult.riskLevel) },
                  ]}
                >
                  {riskLabel(packet.fratResult.riskLevel)}
                </Text>
              </View>
              <Text
                style={[
                  styles.fratScore,
                  { color: riskColor(packet.fratResult.riskLevel) },
                ]}
              >
                {packet.fratResult.totalScore}/70
              </Text>
              <Text
                style={[
                  styles.fratDetail,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.4)"
                      : colors.stratus[500],
                  },
                ]}
              >
                Wx {packet.fratResult.weatherScore} | Pilot{" "}
                {packet.fratResult.pilotScore}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.noData,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.3)"
                    : colors.stratus[400],
                },
              ]}
            >
              Not assessed
            </Text>
          )}
        </CloudCard>
      </Animated.View>

      {/* W&B */}
      <Animated.View entering={FadeInDown.delay(200)}>
        <CloudCard>
          <View style={styles.sectionHeaderRow}>
            <Scale size={15} color={colors.accent} />
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Weight & Balance
            </Text>
          </View>
          {packet.wbSnapshot ? (
            <View style={styles.wbRow}>
              <View
                style={[
                  styles.wbStatusBadge,
                  {
                    backgroundColor: packet.wbSnapshot.withinLimits
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(239,68,68,0.12)",
                  },
                ]}
              >
                {packet.wbSnapshot.withinLimits ? (
                  <CheckCircle2 size={13} color={colors.alert.green} />
                ) : (
                  <XCircle size={13} color={colors.alert.red} />
                )}
                <Text
                  style={[
                    styles.wbStatusText,
                    {
                      color: packet.wbSnapshot.withinLimits
                        ? colors.alert.green
                        : colors.alert.red,
                    },
                  ]}
                >
                  {packet.wbSnapshot.withinLimits
                    ? "Within Limits"
                    : "OUT OF LIMITS"}
                </Text>
              </View>
              <Text
                style={[
                  styles.wbDetail,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.4)"
                      : colors.stratus[500],
                  },
                ]}
              >
                {packet.wbSnapshot.aircraftType} -- {packet.wbSnapshot.totalWeight} lbs --
                CG {packet.wbSnapshot.cg.toFixed(1)}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.noData,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.3)"
                    : colors.stratus[400],
                },
              ]}
            >
              Not calculated
            </Text>
          )}
        </CloudCard>
      </Animated.View>

      {/* Go/No-Go */}
      <Animated.View entering={FadeInDown.delay(250)}>
        <CloudCard>
          <View style={styles.sectionHeaderRow}>
            <Shield size={15} color={colors.accent} />
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? "#FFFFFF" : colors.stratus[800] },
              ]}
            >
              Go / No-Go Decision
            </Text>
          </View>
          {packet.goNoGoResult ? (
            <View style={styles.verdictRow}>
              <VerdictIcon verdict={packet.goNoGoResult.verdict} />
              <Text
                style={[
                  styles.verdictText,
                  { color: verdictColor(packet.goNoGoResult.verdict) },
                ]}
              >
                {verdictLabel(packet.goNoGoResult.verdict)}
              </Text>
              <Text
                style={[
                  styles.verdictSummary,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : colors.stratus[600],
                  },
                ]}
                numberOfLines={2}
              >
                {packet.goNoGoResult.summary}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.noData,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.3)"
                    : colors.stratus[400],
                },
              ]}
            >
              Not evaluated
            </Text>
          )}
        </CloudCard>
      </Animated.View>

      {/* Submit button */}
      <Animated.View entering={FadeInDown.delay(300)}>
        <Pressable
          onPress={onSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.stratus[500],
              opacity: loading ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Send size={16} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Request Dispatch</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reusable cell
// ---------------------------------------------------------------------------

function SummaryCell({
  label,
  value,
  valueColor,
  isDark,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isDark: boolean;
}) {
  return (
    <View style={styles.cell}>
      <Text
        style={[
          styles.cellLabel,
          { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[500] },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.cellValue,
          {
            color:
              valueColor ??
              (isDark ? "#FFFFFF" : colors.stratus[800]),
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  station: { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold" },
  stationName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  flightTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: "auto",
  },
  flightTypeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
  noData: { fontSize: 12, fontFamily: "Inter_400Regular" },

  weatherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cell: { width: "45%" },
  cellLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 2 },
  cellValue: { fontSize: 14, fontFamily: "JetBrainsMono_600SemiBold" },

  fratRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  riskBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  fratScore: { fontSize: 16, fontFamily: "JetBrainsMono_700Bold" },
  fratDetail: { fontSize: 11, fontFamily: "JetBrainsMono_400Regular" },

  wbRow: { gap: 6 },
  wbStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  wbStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  wbDetail: { fontSize: 11, fontFamily: "JetBrainsMono_400Regular" },

  verdictRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  verdictText: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: 1 },
  verdictSummary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    width: "100%",
    marginTop: 2,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
