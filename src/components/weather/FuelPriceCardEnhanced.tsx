import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Fuel,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useFuelPrice } from "@/hooks/useFuelPrice";
import {
  determineFreshness,
  getFreshnessColor,
  getTimeAgo,
} from "@/lib/fuel/freshness";
import type { FuelPriceReport } from "@/lib/api/types";

interface FuelPriceCardProps {
  icao: string;
  uid: string | null;
}

export function FuelPriceCardEnhanced({ icao }: FuelPriceCardProps) {
  const { theme, isDark } = useTheme();
  const { data: fuelData, isLoading } = useFuelPrice(icao);
  const [showAllReports, setShowAllReports] = useState(false);

  const reports = fuelData?.reports || [];
  const hasMultipleReports = reports.length > 1;
  const primaryReport = reports[0];

  return (
    <CloudCard>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Fuel size={16} color={colors.stratus[500]} strokeWidth={1.8} />
          <Text style={[styles.title, { color: theme.foreground }]}>
            100LL Fuel Price
          </Text>
          {hasMultipleReports && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.stratus[500] },
              ]}
            >
              <Text style={styles.countText}>{reports.length}</Text>
            </View>
          )}
        </View>

        {/* AirNav source badge */}
        <View
          style={[
            styles.sourceBadge,
            {
              backgroundColor: isDark
                ? "rgba(59,130,246,0.15)"
                : "rgba(59,130,246,0.1)",
            },
          ]}
        >
          <Text style={styles.sourceBadgeText}>AirNav</Text>
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.skeleton}>
          <ActivityIndicator size="small" color={colors.stratus[500]} />
          <Text
            style={[styles.skeletonText, { color: theme.mutedForeground }]}
          >
            Fetching price data...
          </Text>
        </View>
      ) : reports.length > 0 ? (
        <View>
          {/* Primary Report */}
          <ReportItem report={primaryReport} theme={theme} />

          {/* Show More / Show Less Button */}
          {hasMultipleReports && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAllReports(!showAllReports);
              }}
              style={styles.expandButton}
            >
              <Text
                style={[styles.expandText, { color: colors.stratus[500] }]}
              >
                {showAllReports
                  ? "Show less"
                  : `Show ${reports.length - 1} more report${reports.length - 1 > 1 ? "s" : ""}`}
              </Text>
              {showAllReports ? (
                <ChevronUp size={14} color={colors.stratus[500]} />
              ) : (
                <ChevronDown size={14} color={colors.stratus[500]} />
              )}
            </Pressable>
          )}

          {/* Additional Reports */}
          {showAllReports &&
            reports.slice(1).map((report) => (
              <View key={report.id} style={styles.additionalReport}>
                <ReportItem report={report} theme={theme} />
              </View>
            ))}

          {/* AirNav link */}
          <Pressable
            onPress={() => {
              Linking.openURL(
                `https://www.airnav.com/airport/${icao.toUpperCase()}`
              );
            }}
            style={styles.airnavLink}
          >
            <Text
              style={[styles.airnavLinkText, { color: theme.mutedForeground }]}
            >
              View on AirNav
            </Text>
            <ExternalLink
              size={11}
              color={theme.mutedForeground}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      ) : (
        /* No data */
        <View style={styles.noData}>
          <Text style={[styles.noDataTitle, { color: theme.foreground }]}>
            No price on file
          </Text>
          <Pressable
            onPress={() => {
              Linking.openURL(
                `https://www.airnav.com/airport/${icao.toUpperCase()}`
              );
            }}
          >
            <Text style={[styles.noDataSub, { color: colors.stratus[500] }]}>
              Check AirNav for details
            </Text>
          </Pressable>
        </View>
      )}
    </CloudCard>
  );
}

// ─── Report Item Component ─────────────────────────────────────────────────

interface ReportItemProps {
  report: FuelPriceReport;
  theme: any;
}

function ReportItem({ report, theme }: ReportItemProps) {
  const freshness = determineFreshness(report.reported_at);
  const freshnessColor = getFreshnessColor(freshness);
  const timeAgo = getTimeAgo(report.reported_at);

  return (
    <View>
      {/* Price with Freshness Indicator */}
      <View style={styles.priceRow}>
        <View
          style={[styles.freshnessIndicator, { backgroundColor: freshnessColor }]}
        />
        <Text style={[styles.price, { color: theme.foreground }]}>
          ${report.price_100ll.toFixed(2)}
          <Text style={[styles.priceUnit, { color: theme.mutedForeground }]}>
            {" "}
            /gal
          </Text>
        </Text>
      </View>

      {/* FBO Name */}
      {report.fbo_name && (
        <Text style={[styles.fboName, { color: theme.mutedForeground }]}>
          {report.fbo_name}
        </Text>
      )}

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <Text style={[styles.timeAgo, { color: theme.mutedForeground }]}>
          {timeAgo}
        </Text>
        <View
          style={[
            styles.freshnessBadge,
            { backgroundColor: `${freshnessColor}20` },
          ]}
        >
          <Text style={[styles.freshnessText, { color: freshnessColor }]}>
            {freshness}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#3b82f6",
  },
  skeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  skeletonText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  freshnessIndicator: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  price: {
    fontSize: 28,
    fontFamily: "JetBrainsMono_700Bold",
  },
  priceUnit: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  fboName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
    marginLeft: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  freshnessBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freshnessText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    textTransform: "uppercase",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
  },
  expandText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  additionalReport: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  airnavLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.1)",
  },
  airnavLinkText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  noData: {
    paddingVertical: 8,
  },
  noDataTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  noDataSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
