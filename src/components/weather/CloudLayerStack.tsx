import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Cloud } from "lucide-react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import type { MetarCloud } from "@/lib/api/types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface CloudLayerStackProps {
  clouds: MetarCloud[];
  ceiling: number | null;
}

const coverLabels: Record<string, string> = {
  CLR: "Clear",
  FEW: "Few",
  SCT: "Scattered",
  BKN: "Broken",
  OVC: "Overcast",
};

export function CloudLayerStack({ clouds, ceiling }: CloudLayerStackProps) {
  const { isDark } = useTheme();

  if (!clouds.length || (clouds.length === 1 && clouds[0].cover === "CLR")) {
    return (
      <Animated.View entering={FadeInDown.delay(200)}>
        <CloudCard>
          <View style={styles.header}>
            <Cloud size={14} color={colors.stratus[500]} />
            <Text
              style={[
                styles.headerText,
                { color: isDark ? "rgba(255,255,255,0.85)" : colors.stratus[700] },
              ]}
            >
              Sky Condition
            </Text>
          </View>
          <Text
            style={[styles.clearText, { color: isDark ? "#FFFFFF" : colors.stratus[800] }]}
          >
            Clear skies
          </Text>
        </CloudCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(200)}>
      <CloudCard>
        <View style={styles.header}>
          <Cloud size={14} color={colors.stratus[500]} />
          <Text
            style={[
              styles.headerText,
              { color: isDark ? "rgba(255,255,255,0.85)" : colors.stratus[700] },
            ]}
          >
            Cloud Layers
          </Text>
        </View>
        <View style={styles.layers}>
          {clouds.map((layer, idx) => {
            const isCeiling =
              ceiling !== null &&
              layer.base === ceiling &&
              (layer.cover === "BKN" || layer.cover === "OVC");
            return (
              <Animated.View
                key={`${layer.cover}-${layer.base}`}
                entering={FadeInDown.delay(250 + idx * 50)}
                style={[
                  styles.layer,
                  isCeiling && styles.ceilingLayer,
                ]}
              >
                <View style={styles.layerLeft}>
                  <View
                    style={[
                      styles.coverBadge,
                      isCeiling && styles.ceilingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.coverText,
                        isCeiling && styles.ceilingText,
                        !isCeiling && { color: isDark ? "#FFFFFF" : colors.stratus[700] },
                      ]}
                    >
                      {layer.cover}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.coverLabel,
                      { color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600] },
                    ]}
                  >
                    {coverLabels[layer.cover] || layer.cover}
                  </Text>
                </View>
                <View style={styles.layerRight}>
                  <Text
                    style={[
                      styles.altText,
                      isCeiling && styles.ceilingAltText,
                      !isCeiling && { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                    ]}
                  >
                    {layer.base.toLocaleString()} ft AGL
                  </Text>
                  {isCeiling && (
                    <Text style={styles.ceilingLabel}>CEILING</Text>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  layers: { gap: 6 },
  layer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(12,140,233,0.04)",
  },
  ceilingLayer: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  layerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coverBadge: {
    backgroundColor: "rgba(12,140,233,0.1)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ceilingBadge: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  coverText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_700Bold",
  },
  ceilingText: {
    color: colors.ifr,
  },
  coverLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  layerRight: {
    alignItems: "flex-end",
  },
  altText: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_600SemiBold",
  },
  ceilingAltText: {
    color: colors.ifr,
  },
  ceilingLabel: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: colors.ifr,
    letterSpacing: 1,
    marginTop: 2,
  },
});
