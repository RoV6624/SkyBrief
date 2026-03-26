import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Crown, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { PurchasesPackage } from "react-native-purchases";

import { CloudCard } from "@/components/ui/CloudCard";
import { PremiumFeatureRow } from "@/components/premium/PremiumFeatureRow";
import { SubscriptionCard } from "@/components/premium/SubscriptionCard";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { useSceneStore } from "@/stores/scene-store";
import { useSubscriptionStore } from "@/stores/subscription-store";
import { getOfferings, purchasePackage, restorePurchases, PRODUCT_IDS } from "@/services/revenuecat";
import { colors } from "@/theme/tokens";

const FEATURES = [
  { name: "AI Weather Briefing", description: "Rule-based weather analysis and insights" },
  { name: "Full Go/No-Go Analysis", description: "FRAT + minimums + TAF trends integrated" },
  { name: "Route Planning", description: "Multi-waypoint briefing, map, NavLog" },
  { name: "Weight & Balance", description: "CG envelope, performance impact analysis" },
  { name: "XC Planning Wizard", description: "Guided cross-country flight planning" },
  { name: "Alert Feed", description: "SIGMETs, AIRMETs, and weather advisories" },
  { name: "Forecast Timeline", description: "Visual TAF timeline with trends" },
  { name: "Departure Window", description: "Best departure time recommendations" },
  { name: "NOTAMs & PIREPs", description: "Real pilot reports and notices" },
  { name: "Learning Mode", description: "Educational annotations on weather data" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const scene = useSceneStore((s) => s.scene);
  const syncFromCustomerInfo = useSubscriptionStore((s) => s.syncFromCustomerInfo);
  const reducedMotion = useReducedMotion();
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<{
    annual?: PurchasesPackage;
    monthly?: PurchasesPackage;
  }>({});

  // Fetch real pricing from RevenueCat offerings
  useEffect(() => {
    (async () => {
      try {
        const offering = await getOfferings();
        if (!offering) return;
        const annual = offering.availablePackages.find(
          (p) => p.product.identifier === PRODUCT_IDS.annual
        );
        const monthly = offering.availablePackages.find(
          (p) => p.product.identifier === PRODUCT_IDS.monthly
        );
        setPackages({ annual, monthly });
      } catch {
        // Offerings not available (simulator, no products configured) — use hardcoded fallback
      }
    })();
  }, []);

  const annualPrice = packages.annual?.product.priceString ?? "$39.99";
  const monthlyPrice = packages.monthly?.product.priceString ?? "$4.99";

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);

    try {
      const pkg = selectedPlan === "annual" ? packages.annual : packages.monthly;
      if (!pkg) {
        Alert.alert(
          "Store Unavailable",
          "Subscription products are not available right now. Please try again later."
        );
        setPurchasing(false);
        return;
      }

      const customerInfo = await purchasePackage(pkg);
      syncFromCustomerInfo(customerInfo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      // User cancelled — code 1 is PurchaseCancelledError
      if (e?.userCancelled || e?.code === "1") {
        // Dismissed gracefully, no alert needed
      } else {
        Alert.alert("Purchase Failed", e?.message ?? "Something went wrong. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);

    try {
      const customerInfo = await restorePurchases();
      syncFromCustomerInfo(customerInfo);

      const hasActive = "SkyBrief Pro" in customerInfo.entitlements.active;
      if (hasActive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Restored!", "Your subscription has been restored.");
        router.back();
      } else {
        Alert.alert("No Subscription Found", "We couldn't find an active subscription to restore.");
      }
    } catch (e: any) {
      Alert.alert("Restore Failed", e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Close Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.closeBtn}
          hitSlop={12}
        >
          <X size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(50).springify().damping(18)}
            style={styles.hero}
          >
            <View style={styles.crownCircle}>
              <Crown size={32} color={colors.premium.gold} />
            </View>
            <Text style={styles.heroTitle}>SkyBrief Pro</Text>
            <Text style={styles.heroSubtitle}>
              Full briefing power for serious pilots
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(150).springify().damping(18)}
          >
            <CloudCard style={styles.featuresCard}>
              {FEATURES.map((f, i) => (
                <Animated.View
                  key={f.name}
                  entering={reducedMotion ? undefined : FadeInDown.delay(200 + i * 40).springify().damping(18)}
                >
                  <PremiumFeatureRow name={f.name} description={f.description} />
                </Animated.View>
              ))}
            </CloudCard>
          </Animated.View>

          {/* Pricing Toggle */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(600).springify().damping(18)}
            style={styles.pricingRow}
          >
            <SubscriptionCard
              label="Annual"
              price={annualPrice}
              period="per year"
              savings="BEST VALUE"
              selected={selectedPlan === "annual"}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedPlan("annual");
              }}
            />
            <SubscriptionCard
              label="Monthly"
              price={monthlyPrice}
              period="per month"
              selected={selectedPlan === "monthly"}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedPlan("monthly");
              }}
            />
          </Animated.View>

          {/* CTA */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(700).springify().damping(18)}
            style={styles.ctaSection}
          >
            <Pressable
              onPress={handlePurchase}
              disabled={purchasing}
              style={[styles.ctaBtn, purchasing && { opacity: 0.7 }]}
            >
              <Text style={styles.ctaBtnText}>
                {purchasing ? "Processing..." : "Start 7-Day Free Trial"}
              </Text>
            </Pressable>
            <Text style={styles.trialNote}>
              {selectedPlan === "annual"
                ? `7 days free, then ${annualPrice}/year. Cancel anytime.`
                : `7 days free, then ${monthlyPrice}/month. Cancel anytime.`}
            </Text>
          </Animated.View>

          {/* Restore */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(750).springify().damping(18)}
            style={styles.restoreSection}
          >
            <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
              <Text style={styles.restoreText}>
                {restoring ? "Restoring..." : "Restore Purchases"}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Subscription Details & Legal Links */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.delay(800).springify().damping(18)}
            style={styles.legalSection}
          >
            <Text style={styles.legalDetails}>
              SkyBrief Pro is an auto-renewable subscription.{" "}
              {selectedPlan === "annual"
                ? `Annual plan: ${annualPrice}/year after 7-day free trial.`
                : `Monthly plan: ${monthlyPrice}/month after 7-day free trial.`}{" "}
              Payment will be charged to your Apple ID account at the confirmation of purchase.
              Subscription automatically renews unless it is canceled at least 24 hours before the
              end of the current period. You can manage and cancel your subscriptions in your
              App Store account settings.
            </Text>
            <View style={styles.legalLinks}>
              <Pressable onPress={() => Linking.openURL("https://rov6624.github.io/SkyBrief/terms.html")}>
                <Text style={styles.legalLinkText}>Terms of Use (EULA)</Text>
              </Pressable>
              <Text style={styles.legalDivider}>|</Text>
              <Pressable onPress={() => Linking.openURL("https://rov6624.github.io/SkyBrief/privacy.html")}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  hero: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    gap: 10,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212,168,83,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(212,168,83,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  featuresCard: {
    marginBottom: 20,
  },
  pricingRow: {
    flexDirection: "row",
    gap: 12,
  },
  ctaSection: {
    marginTop: 24,
    gap: 10,
    alignItems: "center",
  },
  ctaBtn: {
    width: "100%",
    backgroundColor: colors.premium.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: colors.premium.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaBtnText: {
    fontSize: 17,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  trialNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  restoreSection: {
    marginTop: 16,
    alignItems: "center",
  },
  restoreBtn: {
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  legalSection: {
    marginTop: 20,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  legalDetails: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 15,
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  legalLinkText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
  },
  legalDivider: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
});
