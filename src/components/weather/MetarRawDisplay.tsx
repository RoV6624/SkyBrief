import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import { FileText, Copy, Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { colors, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface MetarRawDisplayProps {
  rawText: string;
}

export function MetarRawDisplay({ rawText }: MetarRawDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isDark, theme } = useTheme();

  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View entering={FadeInDown.delay(300)}>
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
          borderRadius: radii.cloud,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
          style={styles.header}
          accessibilityLabel={expanded ? "Collapse raw METAR" : "Expand raw METAR"}
          accessibilityRole="button"
        >
          <View style={styles.headerLeft}>
            <FileText size={14} color={colors.stratus[500]} />
            <Text style={[styles.headerText, { color: isDark ? theme.foreground : colors.stratus[700] }]}>
              Raw METAR
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={16} color={colors.stratus[400]} />
          ) : (
            <ChevronDown size={16} color={colors.stratus[400]} />
          )}
        </Pressable>

        {expanded && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <View
              style={[
                styles.rawContainer,
                {
                  backgroundColor: isDark ? "rgba(30,30,35,0.7)" : "#f0f7ff",
                },
              ]}
            >
              <Text style={[styles.rawText, { color: isDark ? "#FFFFFF" : "#083f6e" }]}>
                {rawText}
              </Text>
            </View>
            <Pressable
              onPress={handleCopy}
              style={styles.copyBtn}
              accessibilityLabel={copied ? "Copied to clipboard" : "Copy raw METAR text"}
              accessibilityRole="button"
            >
              {copied ? (
                <Check size={14} color={colors.alert.green} />
              ) : (
                <Copy size={14} color={colors.stratus[500]} />
              )}
              <Text
                style={[
                  styles.copyText,
                  { color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[500] },
                  copied && { color: colors.alert.green },
                ]}
              >
                {copied ? "Copied!" : "Copy"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rawContainer: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
  },
  rawText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    lineHeight: 18,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  copyText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
