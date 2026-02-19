import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react-native";
import type { AlertCondition } from "@/lib/api/types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface AlertFeedProps {
  alerts: AlertCondition[];
}

function getSeverityConfig(isDark: boolean) {
  return {
    red: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.2)",
      Icon: ShieldAlert,
      iconColor: colors.alert.red,
      textColor: isDark ? "#fca5a5" : "#991b1b",
      accentColor: colors.alert.red,
    },
    amber: {
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
      Icon: AlertTriangle,
      iconColor: colors.alert.amber,
      textColor: isDark ? "#fcd34d" : "#92400e",
      accentColor: colors.alert.amber,
    },
    green: {
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.2)",
      Icon: ShieldCheck,
      iconColor: colors.alert.green,
      textColor: isDark ? "#86efac" : "#166534",
      accentColor: colors.alert.green,
    },
  };
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const { isDark } = useTheme();
  const severityConfig = getSeverityConfig(isDark);

  if (alerts.length === 0) {
    return (
      <View
        style={[
          styles.alertRow,
          {
            backgroundColor: severityConfig.green.bg,
            borderColor: severityConfig.green.border,
            borderLeftWidth: 4,
            borderLeftColor: severityConfig.green.accentColor,
          },
        ]}
      >
        <ShieldCheck size={14} color={colors.alert.green} />
        <Text style={[styles.alertTitle, { color: severityConfig.green.textColor }]}>
          All conditions within limits
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {alerts.map((alert, idx) => {
        const config = severityConfig[alert.severity];
        const { Icon } = config;
        return (
          <Animated.View
            key={alert.id}
            entering={FadeInLeft.delay(idx * 50)}
            style={[
              styles.alertRow,
              {
                backgroundColor: config.bg,
                borderColor: config.border,
                borderLeftWidth: 4,
                borderLeftColor: config.accentColor,
              },
            ]}
          >
            <Icon size={14} color={config.iconColor} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: config.textColor }]}>
                {alert.title}
              </Text>
              <Text
                style={[
                  styles.alertMessage,
                  { color: isDark ? "rgba(255,255,255,0.6)" : "#64748b" },
                ]}
              >
                {alert.message}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  alertContent: { flex: 1 },
  alertTitle: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  alertMessage: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 16,
  },
});
