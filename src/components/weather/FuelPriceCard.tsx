import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Fuel, ExternalLink } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useFuelPrice } from "@/hooks/useFuelPrice";
import { daysSince } from "@/lib/utils/date-helpers";

interface FuelPriceCardProps {
  icao: string;
  uid: string | null;
}

export function FuelPriceCard({ icao }: FuelPriceCardProps) {
  const { theme, isDark } = useTheme();
  const { data: fuelData, isLoading } = useFuelPrice(icao);

  const isStale =
    fuelData && fuelData.confidence === "low";

  return (
    <CloudCard>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Fuel size={16} color={colors.stratus[500]} strokeWidth={1.8} />
          <Text style={[styles.title, { color: theme.foreground }]}>
            100LL Fuel Price
          </Text>
        </View>
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
      ) : fuelData && !isStale ? (
        /* Fresh data */
        <View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.foreground }]}>
              ${fuelData.price_100ll.toFixed(2)}
              <Text
                style={[styles.priceUnit, { color: theme.mutedForeground }]}
              >
                {" "}
                /gal
              </Text>
            </Text>
          </View>
          {fuelData.fbo_name && (
            <Text style={[styles.fboName, { color: theme.mutedForeground }]}>
              {fuelData.fbo_name}
            </Text>
          )}
          <View style={styles.metaRow}>
            <Text
              style={[styles.updatedAt, { color: theme.mutedForeground }]}
            >
              Updated {daysSince(fuelData.updated_at)} day
              {daysSince(fuelData.updated_at) !== 1 ? "s" : ""} ago
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Linking.openURL(
                `https://www.airnav.com/airport/${icao.toUpperCase()}`
              );
            }}
            style={styles.airnavLink}
          >
            <Text
              style={[
                styles.airnavLinkText,
                { color: theme.mutedForeground },
              ]}
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
      ) : fuelData && isStale ? (
        /* Stale data */
        <View>
          <View style={styles.priceRow}>
            <Text
              style={[
                styles.price,
                { color: theme.mutedForeground, opacity: 0.6 },
              ]}
            >
              ${fuelData.price_100ll.toFixed(2)}
              <Text style={styles.priceUnit}> /gal</Text>
            </Text>
          </View>
          <View style={styles.staleWarning}>
            <Text style={styles.staleText}>
              Data outdated ({daysSince(fuelData.updated_at)}d) — Call FBO to
              confirm
            </Text>
          </View>
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
    fontFamily: "Inter_600SemiBold",
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
    marginBottom: 4,
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
  },
  updatedAt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  staleWarning: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  staleText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#f59e0b",
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
