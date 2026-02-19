import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { GraduationCap, ChevronDown, ChevronUp } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useBriefingStore } from "@/stores/briefing-store";
import type { WeatherAnnotation } from "@/lib/briefing/types";

interface Props {
  annotation: WeatherAnnotation;
}

/**
 * Learning mode annotation bubble.
 * Shows educational content when learning mode is enabled.
 */
export function LearningAnnotation({ annotation }: Props) {
  const { isDark } = useTheme();
  const learningMode = useBriefingStore((s) => s.learningMode);
  const [expanded, setExpanded] = useState(false);

  if (!learningMode) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(59,130,246,0.08)"
            : "rgba(59,130,246,0.05)",
          borderColor: isDark
            ? "rgba(59,130,246,0.2)"
            : "rgba(59,130,246,0.15)",
        },
      ]}
    >
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
      >
        <GraduationCap size={13} color={colors.mvfr} />
        <Text
          style={[
            styles.shortName,
            { color: isDark ? "rgba(255,255,255,0.8)" : colors.stratus[700] },
          ]}
        >
          {annotation.code} — {annotation.shortName}
        </Text>
        {expanded ? (
          <ChevronUp size={12} color={isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]} />
        ) : (
          <ChevronDown size={12} color={isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]} />
        )}
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.details}>
          <Text
            style={[
              styles.explanation,
              { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600] },
            ]}
          >
            {annotation.explanation}
          </Text>
          <View
            style={[
              styles.implicationBox,
              {
                backgroundColor: isDark
                  ? "rgba(212,168,83,0.08)"
                  : "rgba(212,168,83,0.06)",
                borderColor: isDark
                  ? "rgba(212,168,83,0.2)"
                  : "rgba(212,168,83,0.15)",
              },
            ]}
          >
            <Text
              style={[
                styles.implicationLabel,
                { color: colors.accent },
              ]}
            >
              PILOT IMPLICATION
            </Text>
            <Text
              style={[
                styles.implicationText,
                { color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[700] },
              ]}
            >
              {annotation.pilotImplication}
            </Text>
          </View>
          {annotation.acsReference && (
            <Text
              style={[
                styles.acsRef,
                { color: isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400] },
              ]}
            >
              ACS Reference: {annotation.acsReference}
            </Text>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

/**
 * Wrapper that conditionally renders learning annotations
 * around a weather component.
 */
export function WithLearningAnnotation({
  annotation,
  children,
}: {
  annotation: WeatherAnnotation | null;
  children: React.ReactNode;
}) {
  const learningMode = useBriefingStore((s) => s.learningMode);

  return (
    <View>
      {children}
      {learningMode && annotation && (
        <LearningAnnotation annotation={annotation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  shortName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  details: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },
  explanation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  implicationBox: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 8,
  },
  implicationLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  implicationText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  acsRef: {
    fontSize: 10,
    fontFamily: "JetBrainsMono_400Regular",
  },
});
