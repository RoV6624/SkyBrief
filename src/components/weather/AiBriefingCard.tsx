import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Brain, AlertTriangle, CheckCircle, XCircle, Volume2, VolumeX } from "lucide-react-native";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { CloudCard } from "@/components/ui/CloudCard";
import { SeverityBadge } from "@/components/ui/Badge";
import type { AiBriefing } from "@/lib/api/types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface AiBriefingCardProps {
  briefing: AiBriefing;
}

const recIcons = {
  FAVORABLE: CheckCircle,
  CAUTION: AlertTriangle,
  UNFAVORABLE: XCircle,
};

const recColors = {
  FAVORABLE: "green" as const,
  CAUTION: "amber" as const,
  UNFAVORABLE: "red" as const,
};

export function AiBriefingCard({ briefing }: AiBriefingCardProps) {
  const { isDark } = useTheme();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const RecIcon = recIcons[briefing.recommendation];
  const severity = recColors[briefing.recommendation];
  const sevColor =
    severity === "green"
      ? colors.alert.green
      : severity === "amber"
      ? colors.alert.amber
      : colors.alert.red;

  const handleVoiceBriefing = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    const hazardText =
      briefing.hazards.length > 0
        ? ` Hazards: ${briefing.hazards.join(". ")}.`
        : "";
    const text = `${briefing.summary}${hazardText} Recommendation: ${briefing.recommendation}.`;

    setIsSpeaking(true);
    Speech.speak(text, {
      language: "en-US",
      rate: 0.95,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [briefing, isSpeaking]);

  return (
    <Animated.View entering={FadeInDown.delay(350)}>
      <CloudCard>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Brain size={14} color={colors.accent} />
            <Text
              style={[
                styles.headerText,
                { color: colors.accent },
              ]}
            >
              AI Briefing
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={handleVoiceBriefing}
              hitSlop={8}
              style={[
                styles.voiceBtn,
                isSpeaking && { backgroundColor: `${colors.accent}22` },
              ]}
            >
              {isSpeaking ? (
                <VolumeX size={14} color={colors.accent} />
              ) : (
                <Volume2 size={14} color={colors.accent} />
              )}
            </Pressable>
            <SeverityBadge severity={severity} label={briefing.recommendation} />
          </View>
        </View>

        {/* Summary */}
        <View>
          <Text style={[styles.summary, { color: isDark ? "#FFFFFF" : "#083f6e" }]}>
            {briefing.summary}
          </Text>
          {/* Confidence - moved directly under summary */}
          <Text style={styles.confidence}>
            Confidence: {briefing.confidence}
          </Text>
        </View>

        {/* Hazards */}
        {briefing.hazards.length > 0 && (
          <View style={styles.hazards}>
            <Text
              style={[
                styles.hazardsTitle,
                { color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600] },
              ]}
            >
              Hazards
            </Text>
            {briefing.hazards.map((hazard, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(400 + i * 50)}
                style={styles.hazardRow}
              >
                <AlertTriangle size={12} color={sevColor} />
                <Text
                  style={[
                    styles.hazardText,
                    { color: isDark ? "#FFFFFF" : colors.stratus[800] },
                  ]}
                >
                  {hazard}
                </Text>
              </Animated.View>
            ))}
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voiceBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 6,
  },
  confidence: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[400],
    marginBottom: 14,
  },
  hazards: {
    gap: 6,
    marginTop: 0,
  },
  hazardsTitle: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hazardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  hazardText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
});
