import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ChevronDown, ChevronUp, Plane } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type PirepSource = "faa" | "community";

export interface PirepDisplayItem {
  id: string;
  source: PirepSource;
  aircraftType: string;
  flightLevel: string;
  turbulence: string | null;
  icing: string | null;
  temperature: number | null;
  windDir: number | null;
  windSpeed: number | null;
  visibility: number | null;
  rawText: string;
  observationTime: Date;
  pirepType?: string; // "UA", "UUA", etc.
}

interface PirepCardProps {
  pirep: PirepDisplayItem;
  delay?: number;
}

const INTENSITY_COLORS: Record<string, string> = {
  NEG: colors.vfr,
  TRC: "#a3e635",
  LGT: colors.mvfr,
  "LGT-MOD": colors.alert.amber,
  MOD: colors.alert.amber,
  "MOD-SEV": colors.ifr,
  SEV: colors.ifr,
  EXTRM: colors.lifr,
};

function getIntensityColor(intensity: string | null): string {
  if (!intensity) return colors.stratus[500];
  return INTENSITY_COLORS[intensity] ?? colors.stratus[500];
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PirepCard({ pirep, delay = 0 }: PirepCardProps) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isUrgent =
    pirep.pirepType === "UUA" ||
    pirep.turbulence === "SEV" ||
    pirep.turbulence === "EXTRM" ||
    pirep.icing === "SEV";

  return (
    <CloudCard style={[styles.card, isUrgent && styles.urgentCard]}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setExpanded(!expanded);
        }}
      >
        {/* Header: aircraft + flight level */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Plane size={14} color={isDark ? theme.mutedForeground : colors.stratus[500]} />
            <Text style={[styles.acType, { color: theme.foreground }]}>
              {pirep.aircraftType}
            </Text>
            <Text style={[styles.flightLevel, { color: isDark ? theme.mutedForeground : colors.stratus[500] }]}>
              FL{pirep.flightLevel}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.time, { color: isDark ? theme.mutedForeground : colors.stratus[400] }]}>
              {formatRelativeTime(pirep.observationTime)}
            </Text>
            {expanded ? (
              <ChevronUp size={14} color={isDark ? theme.mutedForeground : colors.stratus[400]} />
            ) : (
              <ChevronDown size={14} color={isDark ? theme.mutedForeground : colors.stratus[400]} />
            )}
          </View>
        </View>

        {/* Badges row */}
        <View style={styles.badges}>
          {pirep.turbulence && pirep.turbulence !== "NEG" && (
            <View style={[styles.badge, { backgroundColor: getIntensityColor(pirep.turbulence) }]}>
              <Text style={styles.badgeText}>TB {pirep.turbulence}</Text>
            </View>
          )}
          {pirep.icing && pirep.icing !== "NEG" && (
            <View style={[styles.badge, { backgroundColor: getIntensityColor(pirep.icing) }]}>
              <Text style={styles.badgeText}>IC {pirep.icing}</Text>
            </View>
          )}
          {!pirep.turbulence && !pirep.icing && (
            <View style={[styles.badge, { backgroundColor: colors.vfr }]}>
              <Text style={styles.badgeText}>SMOOTH</Text>
            </View>
          )}
          <View
            style={[
              styles.sourceBadge,
              {
                backgroundColor: pirep.source === "faa"
                  ? isDark ? "rgba(30,144,255,0.2)" : "rgba(30,144,255,0.1)"
                  : isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.1)",
              },
            ]}
          >
            <Text
              style={[
                styles.sourceText,
                {
                  color: pirep.source === "faa" ? colors.accent : "#a855f7",
                },
              ]}
            >
              {pirep.source === "faa" ? "FAA" : "Community"}
            </Text>
          </View>
        </View>

        {/* Optional info line */}
        {(pirep.temperature != null || pirep.windSpeed != null || pirep.visibility != null) && !expanded && (
          <View style={styles.infoRow}>
            {pirep.temperature != null && (
              <Text style={[styles.infoText, { color: isDark ? theme.mutedForeground : colors.stratus[500] }]}>
                {pirep.temperature}°C
              </Text>
            )}
            {pirep.windSpeed != null && pirep.windDir != null && (
              <Text style={[styles.infoText, { color: isDark ? theme.mutedForeground : colors.stratus[500] }]}>
                {String(pirep.windDir).padStart(3, "0")}°/{pirep.windSpeed}kt
              </Text>
            )}
            {pirep.visibility != null && (
              <Text style={[styles.infoText, { color: isDark ? theme.mutedForeground : colors.stratus[500] }]}>
                Vis {pirep.visibility}SM
              </Text>
            )}
          </View>
        )}

        {/* Expanded: raw PIREP text */}
        {expanded && (
          <View style={styles.rawSection}>
            {pirep.temperature != null && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? theme.mutedForeground : colors.stratus[400] }]}>Temp</Text>
                <Text style={[styles.detailValue, { color: theme.foreground }]}>{pirep.temperature}°C</Text>
              </View>
            )}
            {pirep.windSpeed != null && pirep.windDir != null && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? theme.mutedForeground : colors.stratus[400] }]}>Wind</Text>
                <Text style={[styles.detailValue, { color: theme.foreground }]}>{String(pirep.windDir).padStart(3, "0")}°/{pirep.windSpeed}kt</Text>
              </View>
            )}
            {pirep.visibility != null && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? theme.mutedForeground : colors.stratus[400] }]}>Visibility</Text>
                <Text style={[styles.detailValue, { color: theme.foreground }]}>{pirep.visibility} SM</Text>
              </View>
            )}
            <Text
              style={[
                styles.rawText,
                {
                  color: isDark ? theme.mutedForeground : colors.stratus[600],
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                },
              ]}
            >
              {pirep.rawText}
            </Text>
          </View>
        )}
      </Pressable>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  urgentCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.ifr,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  acType: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  flightLevel: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  sourceBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sourceText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },
  rawSection: {
    marginTop: 8,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  detailValue: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_500Medium",
  },
  rawText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    lineHeight: 16,
  },
});
