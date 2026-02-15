import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Plane, ChevronRight, Check } from "lucide-react-native";
import { useUserStore } from "@/stores/user-store";
import { AIRCRAFT_DATABASE } from "@/lib/wb/aircraft-types";

export default function AircraftScreen() {
  const router = useRouter();
  const { defaultAircraft, setDefaultAircraft } = useUserStore();

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/permissions");
  };

  return (
    <LinearGradient
      colors={["#1e90ff", "#87ceeb", "#e0efff"]}
      style={styles.container}
    >
      <View style={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.step}>
          <Text style={styles.stepText}>Step 3 of 4</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <View style={styles.headerRow}>
            <Plane size={24} color="#ffffff" />
            <Text style={styles.title}>Default Aircraft</Text>
          </View>
          <Text style={styles.subtitle}>
            Choose your primary aircraft for weight & balance calculations
          </Text>
        </Animated.View>

        {/* Aircraft Cards */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.cards}>
          {AIRCRAFT_DATABASE.map((ac, i) => {
            const isSelected = defaultAircraft === ac.id;
            return (
              <Animated.View
                key={ac.id}
                entering={FadeInDown.delay(350 + i * 100)}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDefaultAircraft(ac.id);
                  }}
                  style={[
                    styles.acCard,
                    isSelected && styles.acCardSelected,
                  ]}
                >
                  <View style={styles.acHeader}>
                    <View>
                      <Text
                        style={[
                          styles.acName,
                          isSelected && styles.acNameSelected,
                        ]}
                      >
                        {ac.name}
                      </Text>
                      <Text style={styles.acDetail}>
                        Empty: {ac.emptyWeight} lbs • Max: {ac.maxTakeoffWeight} lbs
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="#1e90ff" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <View style={styles.acStats}>
                    <View style={styles.acStat}>
                      <Text style={styles.acStatLabel}>Fuel Cap</Text>
                      <Text style={styles.acStatValue}>
                        {ac.fuelCapacity} gal
                      </Text>
                    </View>
                    <View style={styles.acStat}>
                      <Text style={styles.acStatLabel}>Stations</Text>
                      <Text style={styles.acStatValue}>
                        {ac.stations.length}
                      </Text>
                    </View>
                    <View style={styles.acStat}>
                      <Text style={styles.acStatLabel}>Fuel Arm</Text>
                      <Text style={styles.acStatValue}>{ac.fuelArm}"</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>

        <View style={styles.footer}>
          <Animated.View entering={FadeInDown.delay(600)}>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.nextText}>Next</Text>
              <ChevronRight size={20} color="#1e90ff" strokeWidth={2.5} />
            </Pressable>
          </Animated.View>
        </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 28,
  },
  cards: { gap: 14 },
  acCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 18,
  },
  acCardSelected: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "#ffffff",
  },
  acHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  acName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.9)",
  },
  acNameSelected: { color: "#ffffff" },
  acDetail: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  acStats: {
    flexDirection: "row",
    gap: 12,
  },
  acStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  acStatLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  acStatValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: "#ffffff",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
  },
  nextButton: {
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
  nextText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1e90ff",
  },
});
