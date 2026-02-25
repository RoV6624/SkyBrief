import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { User, Plane, ChevronRight } from "lucide-react-native";
import { useUserStore } from "@/stores/user-store";
import { useAuthStore } from "@/stores/auth-store";
import { StepProgressBar, getOnboardingStepConfig } from "@/components/onboarding/StepProgressBar";

const EXPERIENCE_LEVELS = [
  { value: "student" as const, label: "Student Pilot", emoji: "📚" },
  { value: "private" as const, label: "Private Pilot", emoji: "🛩" },
  { value: "commercial" as const, label: "Commercial", emoji: "✈️" },
  { value: "atp" as const, label: "ATP", emoji: "🏅" },
  { value: "instructor" as const, label: "Instructor (CFI)", emoji: "🎓" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { setProfile, setHomeAirport, setExperienceLevel } = useUserStore();

  const [name, setName] = useState(user?.displayName || "");
  const [homeIcao, setHomeIcao] = useState("");
  const [experience, setExperience] = useState<
    "student" | "private" | "commercial" | "atp" | "instructor" | null
  >(null);

  const isValid =
    name.trim().length > 0 &&
    homeIcao.length >= 3 &&
    homeIcao.length <= 4 &&
    experience !== null;

  const handleNext = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfile(name.trim(), user?.email || "");
    setHomeAirport(homeIcao.toUpperCase());
    setExperienceLevel(experience!);
    if (experience === "student" || experience === "instructor") {
      router.push("/onboarding/join-school");
    } else {
      router.push("/onboarding/minimums");
    }
  };

  return (
    <LinearGradient
      colors={["#1e90ff", "#87ceeb", "#b0d4f1"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step indicator */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(100)}>
            <StepProgressBar
              currentStep={1}
              totalSteps={getOnboardingStepConfig(experience ?? "private").totalSteps}
              stepLabels={getOnboardingStepConfig(experience ?? "private").labels}
            />
          </Animated.View>

          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(200)}>
            <Text style={styles.title}>Pilot Profile</Text>
            <Text style={styles.subtitle}>
              Tell us about yourself so we can personalize your briefings
            </Text>
          </Animated.View>

          {/* Name */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(300)} style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputRow}>
              <User size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
              />
            </View>
          </Animated.View>

          {/* Home Airport */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(400)} style={styles.field}>
            <Text style={styles.label}>Home Airport (ICAO)</Text>
            <View
              style={[
                styles.inputRow,
                homeIcao.length >= 3 && { borderColor: "rgba(34,197,94,0.5)" },
              ]}
            >
              <Plane size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                value={homeIcao}
                onChangeText={(t) => setHomeIcao(t.toUpperCase())}
                placeholder="e.g. KJFK"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="characters"
                maxLength={4}
                style={[styles.input, { fontFamily: "JetBrainsMono_400Regular" }]}
              />
            </View>
            {homeIcao.length > 0 && homeIcao.length < 3 && (
              <Text style={styles.fieldHint}>Enter 3–4 character ICAO code</Text>
            )}
          </Animated.View>

          {/* Experience Level */}
          <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(500)} style={styles.field}>
            <Text style={styles.label}>Experience Level</Text>
            <View style={styles.expGrid}>
              {EXPERIENCE_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExperience(level.value);
                  }}
                  style={[
                    styles.expCard,
                    experience === level.value && styles.expCardActive,
                  ]}
                >
                  <Text style={styles.expEmoji}>{level.emoji}</Text>
                  <Text
                    style={[
                      styles.expLabel,
                      experience === level.value && styles.expLabelActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Next Button */}
          <View style={styles.footer}>
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.delay(600)}>
              <Pressable
                onPress={handleNext}
                disabled={!isValid}
                style={({ pressed }) => [
                  styles.nextButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  !isValid && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.nextText}>Next</Text>
                <ChevronRight size={20} color="#1e90ff" strokeWidth={2.5} />
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
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
  field: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  expGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  expCard: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  expCardActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "#ffffff",
  },
  expEmoji: { fontSize: 24 },
  expLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  expLabelActive: { color: "#ffffff" },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
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
