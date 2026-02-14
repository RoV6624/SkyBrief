import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import {
  CloudSun,
  Navigation,
  Scale,
  Map,
  Settings,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

export default function TabLayout() {
  const { theme, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBar.active,
        tabBarInactiveTintColor: theme.tabBar.inactive,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.tabBar.border,
          backgroundColor: Platform.OS === "ios" ? "transparent" : theme.tabBar.bg,
          elevation: 0,
          zIndex: 10,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Briefing",
          tabBarIcon: ({ color, size }) => (
            <CloudSun size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: "Route",
          tabBarIcon: ({ color, size }) => (
            <Navigation size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="wb"
        options={{
          title: "W&B",
          tabBarIcon: ({ color, size }) => (
            <Scale size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: "Charts",
          tabBarIcon: ({ color, size }) => (
            <Map size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
