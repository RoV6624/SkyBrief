import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react-native";
import type { AlertCondition } from "@/lib/api/types";
import { colors } from "@/theme/tokens";

interface AlertFeedProps {
  alerts: AlertCondition[];
}

const severityConfig = {
  red: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    Icon: ShieldAlert,
    iconColor: colors.alert.red,
    textColor: "#991b1b",
  },
  amber: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    Icon: AlertTriangle,
    iconColor: colors.alert.amber,
    textColor: "#92400e",
  },
  green: {
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    Icon: ShieldCheck,
    iconColor: colors.alert.green,
    textColor: "#166534",
  },
};

export function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <View
        style={[
          styles.alertRow,
          {
            backgroundColor: severityConfig.green.bg,
            borderColor: severityConfig.green.border,
          },
        ]}
      >
        <ShieldCheck size={14} color={colors.alert.green} />
        <Text style={[styles.alertTitle, { color: "#166534" }]}>
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
              { backgroundColor: config.bg, borderColor: config.border },
            ]}
          >
            <Icon size={14} color={config.iconColor} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: config.textColor }]}>
                {alert.title}
              </Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
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
    fontFamily: "Inter_600SemiBold",
  },
  alertMessage: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },
});
