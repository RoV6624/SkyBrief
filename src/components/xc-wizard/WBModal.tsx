/**
 * Full-screen Weight & Balance modal for the XC Wizard.
 *
 * Wraps the existing WeightBalanceForm + CGEnvelopeGraph components.
 * Reads/writes useWBStore directly — changes auto-reflect on the
 * planning card when the modal is dismissed.
 */

import { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { WeightBalanceForm } from "@/components/wb/WeightBalanceForm";
import { CGEnvelopeGraph } from "@/components/wb/CGEnvelopeGraph";
import { useWBStore } from "@/stores/wb-store";
import { calcTotalWB, calcLandingWB } from "@/lib/wb/calculations";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface WBModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WBModal({ visible, onClose }: WBModalProps) {
  const { theme, isDark } = useTheme();
  const {
    aircraft,
    stationWeights,
    fuelGallons,
    fuelUnit,
    customEmptyWeight,
    customEmptyArm,
    estimatedFuelBurn,
    showLanding,
  } = useWBStore();

  const wbResult = useMemo(
    () =>
      calcTotalWB(
        aircraft,
        stationWeights,
        fuelGallons,
        fuelUnit,
        customEmptyWeight,
        customEmptyArm
      ),
    [aircraft, stationWeights, fuelGallons, fuelUnit, customEmptyWeight, customEmptyArm]
  );

  const landingResult = useMemo(
    () =>
      showLanding && estimatedFuelBurn > 0
        ? calcLandingWB(wbResult, estimatedFuelBurn, aircraft)
        : null,
    [wbResult, estimatedFuelBurn, showLanding, aircraft]
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={styles.blurOverlay}>
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.card.border }]}>
            <Text style={[styles.title, { color: theme.foreground }]}>
              Weight & Balance
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.doneBtn}
              accessibilityLabel="Done editing weight and balance"
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInDown.duration(250)}>
              <WeightBalanceForm result={wbResult} />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(250).delay(80)}>
              <CGEnvelopeGraph
                aircraft={aircraft}
                takeoff={wbResult}
                landing={landingResult}
                showLanding={showLanding}
              />
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Bottom Done button — always visible */}
          <View style={[styles.bottomBar, { borderTopColor: theme.card.border }]}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={styles.bottomDoneBtn}
              accessibilityLabel="Done editing weight and balance"
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  doneBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  doneBtnText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomDoneBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
