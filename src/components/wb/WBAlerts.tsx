import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react-native";
import type { WBResult } from "@/lib/wb/calculations";
import type { DensityAltSeverity } from "@/lib/wb/performance";
import { colors } from "@/theme/tokens";

interface WBAlert {
  id: string;
  severity: "red" | "amber" | "green";
  title: string;
  message: string;
}

interface WBAlertsProps {
  takeoff: WBResult;
  landing: WBResult | null;
  showLanding: boolean;
  densityAlt: number;
  densityAltSeverity: DensityAltSeverity;
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

export function WBAlerts({
  takeoff,
  landing,
  showLanding,
  densityAlt,
  densityAltSeverity,
}: WBAlertsProps) {
  const alerts: WBAlert[] = [];

  if (takeoff.isOverweight) {
    alerts.push({
      id: "overweight-to",
      severity: "red",
      title: "Over Max Takeoff Weight",
      message: `Total weight ${Math.round(takeoff.totalWeight)} lbs exceeds maximum.`,
    });
  }

  if (!takeoff.isCGInEnvelope) {
    const cgDir = takeoff.cg > takeoff.aftLimit ? "aft" : "forward";
    alerts.push({
      id: "cg-out-to",
      severity: "red",
      title: `CG ${cgDir === "aft" ? "Aft" : "Forward"} of Limit`,
      message: `CG ${takeoff.cg.toFixed(1)}" is ${cgDir} of limit.`,
    });
  }

  if (showLanding && landing) {
    if (landing.isOverweight) {
      alerts.push({
        id: "overweight-ldg",
        severity: "red",
        title: "Over Max Landing Weight",
        message: `Landing weight ${Math.round(landing.totalWeight)} lbs exceeds maximum.`,
      });
    }
    if (!landing.isCGInEnvelope) {
      alerts.push({
        id: "cg-out-ldg",
        severity: "red",
        title: "Landing CG Out of Envelope",
        message: `Landing CG ${landing.cg.toFixed(1)}" is out of limits.`,
      });
    }
  }

  if (densityAltSeverity === "warning") {
    alerts.push({
      id: "da-warning",
      severity: "red",
      title: "High Density Altitude",
      message: `DA ${densityAlt.toLocaleString()} ft — significant performance degradation.`,
    });
  } else if (densityAltSeverity === "caution") {
    alerts.push({
      id: "da-caution",
      severity: "amber",
      title: "Elevated Density Altitude",
      message: `DA ${densityAlt.toLocaleString()} ft — reduced performance.`,
    });
  }

  // Haptic feedback on W&B status
  useEffect(() => {
    const hasRed = alerts.some((a) => a.severity === "red");
    if (takeoff.totalWeight > 0) {
      if (hasRed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [takeoff.isOverweight, takeoff.isCGInEnvelope]);

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
          Weight & balance within limits
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
  },
});
