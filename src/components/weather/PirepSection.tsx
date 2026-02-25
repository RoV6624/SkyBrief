import { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Radio, ChevronDown, ChevronUp, Info } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { CloudCard } from "@/components/ui/CloudCard";
import { PirepCard, type PirepDisplayItem } from "./PirepCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { usePireps } from "@/hooks/usePireps";
import { useCommunityPireps } from "@/hooks/useCommunityPireps";
import type { PirepResponse } from "@/lib/api/types";
import type { SubmittedPirep } from "@/services/pirep-submit";

interface PirepSectionProps {
  station: string;
  delay?: number;
}

function officialToDisplay(pirep: PirepResponse, idx: number): PirepDisplayItem {
  return {
    id: `faa-${idx}-${pirep.obsTime}`,
    source: "faa",
    aircraftType: pirep.acType || "UNKN",
    flightLevel: pirep.fltLvl || "000",
    turbulence: pirep.tbInt1,
    icing: pirep.icgInt1,
    temperature: pirep.temp,
    windDir: pirep.wdir,
    windSpeed: pirep.wspd,
    visibility: null,
    rawText: pirep.rawOb || "",
    observationTime: new Date(pirep.obsTime * 1000),
    pirepType: pirep.pirepType,
  };
}

function communityToDisplay(pirep: SubmittedPirep): PirepDisplayItem {
  return {
    id: `community-${pirep.id}`,
    source: "community",
    aircraftType: pirep.aircraftType || "UNKN",
    flightLevel: String(Math.round(pirep.altitude / 100)).padStart(3, "0"),
    turbulence: pirep.turbulence ?? null,
    icing: pirep.icing ?? null,
    temperature: pirep.temperature ?? null,
    windDir: pirep.windDirection ?? null,
    windSpeed: pirep.windSpeed ?? null,
    visibility: pirep.flightVisibility ?? null,
    rawText: `Community PIREP near ${pirep.nearestStation} FL${String(Math.round(pirep.altitude / 100)).padStart(3, "0")} ${pirep.aircraftType}`,
    observationTime: new Date(pirep.submittedAt),
  };
}

export function PirepSection({ station, delay = 0 }: PirepSectionProps) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const { data: officialPireps = [], isLoading: officialLoading } = usePireps(station);
  const { data: communityPireps = [], isLoading: communityLoading } = useCommunityPireps(station);

  const isLoading = officialLoading || communityLoading;

  const allPireps = useMemo(() => {
    const official = officialPireps.map(officialToDisplay);
    const community = communityPireps.map(communityToDisplay);
    return [...official, ...community].sort(
      (a, b) => b.observationTime.getTime() - a.observationTime.getTime()
    );
  }, [officialPireps, communityPireps]);

  const urgentCount = allPireps.filter(
    (p) =>
      p.pirepType === "UUA" ||
      p.turbulence === "SEV" ||
      p.turbulence === "EXTRM" ||
      p.icing === "SEV"
  ).length;

  return (
    <Animated.View entering={FadeInDown.delay(delay)}>
      <CloudCard>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Radio
                size={16}
                color={isDark ? theme.mutedForeground : colors.stratus[500]}
              />
              <Text style={[styles.title, { color: theme.foreground }]}>
                PIREPs
              </Text>
              {urgentCount > 0 && (
                <View
                  style={[styles.countBadge, { backgroundColor: colors.ifr }]}
                >
                  <Text style={styles.countText}>{urgentCount}</Text>
                </View>
              )}
            </View>
            {expanded ? (
              <ChevronUp
                size={18}
                color={isDark ? theme.mutedForeground : colors.stratus[400]}
              />
            ) : (
              <ChevronDown
                size={18}
                color={isDark ? theme.mutedForeground : colors.stratus[400]}
              />
            )}
          </View>

          {!expanded && (
            <Text
              style={[
                styles.summary,
                { color: isDark ? theme.mutedForeground : colors.stratus[600] },
              ]}
            >
              {allPireps.length} pilot report{allPireps.length !== 1 ? "s" : ""} nearby
              {urgentCount > 0 ? ` • ${urgentCount} urgent` : ""} • Tap to view
            </Text>
          )}
        </Pressable>

        {expanded && (
          <View style={styles.pirepList}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={colors.stratus[500]} />
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? theme.mutedForeground : colors.stratus[400] },
                  ]}
                >
                  Loading PIREPs...
                </Text>
              </View>
            ) : allPireps.length === 0 ? (
              <View style={styles.emptyState}>
                <Info
                  size={24}
                  color={isDark ? theme.mutedForeground : colors.stratus[300]}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? theme.mutedForeground : colors.stratus[400] },
                  ]}
                >
                  No recent pilot reports near this station
                </Text>
              </View>
            ) : (
              <>
                {allPireps.map((pirep, i) => (
                  <PirepCard key={pirep.id} pirep={pirep} delay={i * 50} />
                ))}
              </>
            )}
          </View>
        )}
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  summary: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  pirepList: {
    marginTop: 12,
    gap: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
