/**
 * Start Preflight Button
 *
 * Appears after the briefing checklist is complete. On press it captures
 * the current METAR as a snapshot and starts the preflight monitoring
 * session. Includes haptic feedback and an animated entrance.
 */

import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Radar, Shield } from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { usePreflightStore } from "@/stores/preflight-store";
import { requestNotificationPermissions } from "@/services/preflight-notifications";
import {
  registerBackgroundWeatherTask,
  getBackgroundFetchStatus,
} from "@/services/background-weather-task";
import type { NormalizedMetar } from "@/lib/api/types";

interface Props {
  station: string;
  metar: NormalizedMetar;
  disabled?: boolean;
}

export function StartPreflightButton({ station, metar, disabled }: Props) {
  const { isDark } = useTheme();
  const { isPreflightActive, startPreflight } = usePreflightStore();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = useCallback(async () => {
    if (disabled || isStarting || isPreflightActive) return;

    setIsStarting(true);

    try {
      // Haptic feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // Request notification permissions
      const permissionGranted = await requestNotificationPermissions();
      if (!permissionGranted) {
        Alert.alert(
          "Notifications Disabled",
          "Weather change alerts require notification permissions. You can enable them in Settings.",
          [
            { text: "Continue Anyway", onPress: () => beginMonitoring() },
            { text: "Cancel", style: "cancel" },
          ]
        );
        setIsStarting(false);
        return;
      }

      await beginMonitoring();
    } catch (error) {
      console.error("[StartPreflight] Failed to start:", error);
      Alert.alert(
        "Failed to Start",
        "Could not start preflight monitoring. Please try again."
      );
      setIsStarting(false);
    }
  }, [disabled, isStarting, isPreflightActive, station, metar]);

  const beginMonitoring = useCallback(async () => {
    // Capture snapshot and start session
    startPreflight(station, metar);

    // Register background task for when the app is backgrounded
    try {
      await registerBackgroundWeatherTask();
    } catch (err) {
      // Non-fatal — foreground polling still works
      console.warn("[StartPreflight] Background task registration failed:", err);
    }

    setIsStarting(false);
  }, [station, metar, startPreflight]);

  // Don't render if a preflight is already running
  if (isPreflightActive) return null;

  return (
    <Animated.View entering={FadeInDown.delay(300).springify()}>
      <Pressable
        onPress={handleStart}
        disabled={disabled || isStarting}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: disabled
              ? isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)"
              : colors.accent,
            opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Radar
              size={20}
              color={disabled ? (isDark ? "rgba(255,255,255,0.3)" : colors.stratus[400]) : "#FFFFFF"}
            />
          </View>
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: disabled
                    ? isDark
                      ? "rgba(255,255,255,0.3)"
                      : colors.stratus[400]
                    : "#FFFFFF",
                },
              ]}
            >
              {isStarting ? "Starting..." : "Start Preflight Monitor"}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: disabled
                    ? isDark
                      ? "rgba(255,255,255,0.15)"
                      : colors.stratus[300]
                    : "rgba(255,255,255,0.75)",
                },
              ]}
            >
              Track weather changes at {station} for 90 min
            </Text>
          </View>
          <Shield
            size={16}
            color={
              disabled
                ? isDark
                  ? "rgba(255,255,255,0.15)"
                  : colors.stratus[300]
                : "rgba(255,255,255,0.6)"
            }
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
