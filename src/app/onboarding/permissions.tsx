import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import {
  MapPin,
  Bell,
  Check,
  CheckCircle,
} from "lucide-react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useMonitorStore } from "@/stores/monitor-store";

export default function PermissionsScreen() {
  const { completeOnboarding } = useAuthStore();
  const { setMinimumsEnabled } = useMonitorStore();
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  const handleLocationPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
    } catch {
      Alert.alert("Error", "Could not request location permission.");
    }
  };

  const handleNotificationPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifGranted(status === "granted");
      if (status === "granted") {
        // Schedule daily 8 AM briefing notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Your SkyBrief is ready",
            body: "Check your daily preflight weather briefing.",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 8,
            minute: 0,
          },
        });
      }
    } catch {
      Alert.alert("Error", "Could not request notification permission.");
    }
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMinimumsEnabled(true);
    await completeOnboarding();
  };

  return (
    <LinearGradient
      colors={["#1e90ff", "#87ceeb", "#e0efff"]}
      style={styles.container}
    >
      <View style={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.step}>
          <Text style={styles.stepText}>Step 4 of 4</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.title}>Permissions</Text>
          <Text style={styles.subtitle}>
            These help us deliver the best briefing experience
          </Text>
        </Animated.View>

        {/* Location */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Pressable
            onPress={handleLocationPermission}
            disabled={locationGranted}
            style={[
              styles.permCard,
              locationGranted && styles.permCardGranted,
            ]}
          >
            <View style={styles.permIcon}>
              {locationGranted ? (
                <CheckCircle size={24} color="#22c55e" />
              ) : (
                <MapPin size={24} color="#ffffff" />
              )}
            </View>
            <View style={styles.permContent}>
              <Text style={styles.permTitle}>Location</Text>
              <Text style={styles.permDesc}>
                Find nearby weather stations and display local METAR data
                automatically
              </Text>
            </View>
            {!locationGranted && (
              <View style={styles.enableBtn}>
                <Text style={styles.enableText}>Enable</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Pressable
            onPress={handleNotificationPermission}
            disabled={notifGranted}
            style={[
              styles.permCard,
              notifGranted && styles.permCardGranted,
            ]}
          >
            <View style={styles.permIcon}>
              {notifGranted ? (
                <CheckCircle size={24} color="#22c55e" />
              ) : (
                <Bell size={24} color="#ffffff" />
              )}
            </View>
            <View style={styles.permContent}>
              <Text style={styles.permTitle}>Notifications</Text>
              <Text style={styles.permDesc}>
                Get your daily 8 AM weather briefing and severe weather alerts
              </Text>
            </View>
            {!notifGranted && (
              <View style={styles.enableBtn}>
                <Text style={styles.enableText}>Enable</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Complete */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.footer}>
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.completeButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Check size={20} color="#1e90ff" strokeWidth={2.5} />
            <Text style={styles.completeText}>Start Briefing</Text>
          </Pressable>
          <Text style={styles.skipNote}>
            You can change these anytime in Settings
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  step: { marginBottom: 24 },
  stepText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 32,
  },
  permCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 18,
    marginBottom: 14,
  },
  permCardGranted: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  permIcon: { width: 32 },
  permContent: { flex: 1 },
  permTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  permDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  enableBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  enableText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  footer: { marginTop: "auto", paddingTop: 32 },
  completeButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  completeText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1e90ff",
  },
  skipNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 12,
  },
});
