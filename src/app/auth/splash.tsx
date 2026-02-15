import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { CloudSun, ChevronRight } from "lucide-react-native";

export default function SplashScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/auth/sign-in");
  };

  return (
    <LinearGradient
      colors={["#1e90ff", "#87ceeb", "#e0efff"]}
      style={styles.container}
    >
      {/* Logo */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.logoContainer}
      >
        <View style={styles.iconCircle}>
          <CloudSun size={48} color="#ffffff" strokeWidth={1.5} />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.titleContainer}
      >
        <Text style={styles.title}>SkyBrief</Text>
        <Text style={styles.subtitle}>
          Your AI-powered preflight weather briefing
        </Text>
      </Animated.View>

      {/* Features */}
      <Animated.View
        entering={FadeInUp.delay(600)}
        style={styles.features}
      >
        {[
          "Real-time METAR & TAF data",
          "Smart alert monitoring",
          "Weight & balance calculator",
          "Route weather briefing",
        ].map((feature, i) => (
          <Animated.View
            key={feature}
            entering={FadeInUp.delay(700 + i * 100)}
            style={styles.featureRow}
          >
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{feature}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* CTA Button */}
      <Animated.View
        entering={FadeInUp.delay(1100).springify()}
        style={styles.ctaContainer}
      >
        <Pressable
          onPress={handleGetStarted}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <ChevronRight size={20} color="#1e90ff" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },
  features: {
    width: "100%",
    maxWidth: 500,
    marginBottom: 48,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  ctaContainer: {
    width: "100%",
    maxWidth: 500,
  },
  ctaButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1e90ff",
  },
});
