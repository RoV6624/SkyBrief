import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import { FileText, Copy, Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
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

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerText: {
      fontSize: 11,
      fontFamily: "SpaceGrotesk_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[700],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rawContainer: {
      marginTop: 12,
      borderRadius: 10,
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
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    copyText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[500],
    },
  });

  return (
    <Animated.View entering={FadeInDown.delay(300)}>
      <CloudCard style={{ padding: 16 }}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <FileText size={14} color={colors.stratus[500]} />
            <Text style={styles.headerText}>Raw METAR</Text>
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
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent",
                },
              ]}
            >
              <Text style={[styles.rawText, { color: isDark ? "#FFFFFF" : "#083f6e" }]}>
                {rawText}
              </Text>
            </View>
            <Pressable onPress={handleCopy} style={styles.copyBtn}>
              {copied ? (
                <Check size={14} color={colors.alert.green} />
              ) : (
                <Copy size={14} color={colors.stratus[500]} />
              )}
              <Text
                style={[
                  styles.copyText,
                  copied && { color: colors.alert.green },
                ]}
              >
                {copied ? "Copied!" : "Copy"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </CloudCard>
    </Animated.View>
  );
}
