import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Share2 } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

// Expo Go deep link format
const EXPO_GO_LINK = "exp://u/rovel2004/sky-brief";

export function ShareAppQR() {
  const { theme, isDark } = useTheme();

  const copyLink = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(EXPO_GO_LINK);
    Alert.alert("Copied!", "Link copied to clipboard");
  };

  return (
    <Animated.View entering={FadeInDown.delay(100)}>
      <CloudCard>
        <View style={styles.header}>
          <Share2
            size={18}
            color={isDark ? theme.foreground : colors.stratus[500]}
          />
          <Text style={[styles.title, { color: theme.foreground }]}>
            Share with Friends
          </Text>
        </View>

        <Text
          style={[
            styles.subtitle,
            { color: isDark ? theme.mutedForeground : colors.stratus[600] },
          ]}
        >
          Friends can test SkyBrief for free using Expo Go
        </Text>

        <View style={styles.instructions}>
          <Text
            style={[
              styles.stepTitle,
              { color: isDark ? theme.foreground : colors.stratus[700] },
            ]}
          >
            How to install:
          </Text>
          <Text
            style={[
              styles.step,
              { color: isDark ? theme.mutedForeground : colors.stratus[600] },
            ]}
          >
            1. Download "Expo Go" (free) from the App Store
          </Text>
          <Text
            style={[
              styles.step,
              { color: isDark ? theme.mutedForeground : colors.stratus[600] },
            ]}
          >
            2. Open the link below or scan QR code
          </Text>
          <Text
            style={[
              styles.step,
              { color: isDark ? theme.mutedForeground : colors.stratus[600] },
            ]}
          >
            3. App opens instantly — no install needed!
          </Text>
        </View>

        <Pressable
          onPress={copyLink}
          style={({ pressed }) => [
            styles.linkButton,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(12,140,233,0.1)" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              styles.linkText,
              { color: isDark ? colors.stratus[300] : colors.stratus[600] },
            ]}
            numberOfLines={1}
          >
            {EXPO_GO_LINK}
          </Text>
          <Text
            style={[
              styles.copyHint,
              { color: isDark ? theme.mutedForeground : colors.stratus[400] },
            ]}
          >
            Tap to copy
          </Text>
        </Pressable>

        <View
          style={[
            styles.qrPlaceholder,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(12,140,233,0.05)",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(12,140,233,0.15)",
            },
          ]}
        >
          <Text
            style={[
              styles.qrText,
              { color: isDark ? theme.mutedForeground : colors.stratus[400] },
            ]}
          >
            QR Code
          </Text>
          <Text
            style={[
              styles.qrHint,
              { color: isDark ? theme.mutedForeground : colors.stratus[400] },
            ]}
          >
            Install react-native-qrcode-svg to generate QR code
          </Text>
        </View>

        <View
          style={[
            styles.note,
            {
              backgroundColor: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.1)",
              borderColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.25)",
            },
          ]}
        >
          <Text
            style={[
              styles.noteText,
              { color: isDark ? "#f59e0b" : "#92400e" },
            ]}
          >
            Note: This is a development preview. For production release, build
            with EAS and distribute via TestFlight or App Store.
          </Text>
        </View>
      </CloudCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  instructions: {
    gap: 6,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  step: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  linkButton: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
    marginBottom: 4,
  },
  copyHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  qrPlaceholder: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  qrText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  qrHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  note: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  noteText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },
});
