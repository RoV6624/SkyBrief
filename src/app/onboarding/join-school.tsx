import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { School, ChevronRight, SkipForward, Check, ArrowLeft } from "lucide-react-native";
import { StepProgressBar, getOnboardingStepConfig } from "@/components/onboarding/StepProgressBar";
import { useTenantStore } from "@/stores/tenant-store";
import { useBriefingStore } from "@/stores/briefing-store";
import { useAuthStore } from "@/stores/auth-store";
import { useUserStore } from "@/stores/user-store";
import {
  findTenantByInviteCode,
  joinTenant,
  getTenantConfig,
} from "@/services/tenant-api";

export default function JoinSchoolScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setTenant } = useTenantStore();
  const { setLearningMode } = useBriefingStore();
  const { experienceLevel } = useUserStore();
  const stepConfig = getOnboardingStepConfig(experienceLevel);

  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"input" | "confirm">("input");
  const [school, setSchool] = useState<{ id: string; schoolName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await findTenantByInviteCode(code.trim());
    setLoading(false);

    if (result) {
      setSchool(result);
      setPhase("confirm");
    } else {
      setError("No school found with that code. Please check and try again.");
    }
  };

  const handleConfirm = async () => {
    if (!school || !user) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const joined = await joinTenant(user.uid, school.id);
    if (!joined) {
      setLoading(false);
      setError("Failed to join school. Please try again.");
      return;
    }

    const config = await getTenantConfig(school.id);
    setLoading(false);

    if (config) {
      setTenant(config);
    }

    // Auto-enable learning mode for students joining a school
    setLearningMode(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Instructors skip select-instructor step
    if (experienceLevel === "instructor") {
      router.push("/onboarding/minimums");
    } else {
      router.push("/onboarding/select-instructor");
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/minimums");
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
        <View style={styles.scroll}>
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color="#ffffff" />
          </Pressable>

          <Animated.View entering={FadeInDown.delay(100)}>
            <StepProgressBar
              currentStep={2}
              totalSteps={stepConfig.totalSteps}
              stepLabels={stepConfig.labels}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200)}>
            <View style={styles.headerRow}>
              <School size={24} color="#ffffff" />
              <Text style={styles.title}>Join Flight School</Text>
            </View>
            <Text style={styles.subtitle}>
              Enter the invite code from your flight school to connect your
              account. This is optional — you can always join later.
            </Text>
          </Animated.View>

          {phase === "input" ? (
            <Animated.View entering={FadeInDown.delay(300)}>
              {/* Code Input */}
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Invite Code</Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="e.g. SKY123"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="characters"
                  maxLength={6}
                  style={styles.codeInput}

                />
              </View>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              {/* Lookup Button */}
              <Pressable
                onPress={handleLookup}
                disabled={code.length < 6 || loading}
                style={({ pressed }) => [
                  styles.nextButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  (code.length < 6 || loading) && { opacity: 0.5 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#1e90ff" size="small" />
                ) : (
                  <>
                    <Text style={styles.nextText}>Find School</Text>
                    <ChevronRight size={20} color="#1e90ff" strokeWidth={2.5} />
                  </>
                )}
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100)}>
              {/* Confirm School */}
              <View style={styles.confirmCard}>
                <View style={styles.confirmIcon}>
                  <School size={32} color="#22c55e" />
                </View>
                <Text style={styles.confirmSchoolName}>
                  {school?.schoolName}
                </Text>
                <Text style={styles.confirmHint}>
                  Tap confirm to join this school
                </Text>
              </View>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <Pressable
                onPress={handleConfirm}
                disabled={loading}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  loading && { opacity: 0.5 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Check size={20} color="#ffffff" strokeWidth={2.5} />
                    <Text style={styles.confirmButtonText}>Confirm & Join</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setPhase("input");
                  setSchool(null);
                  setError("");
                }}
                style={styles.backLink}
              >
                <Text style={styles.backLinkText}>Try a different code</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Skip */}
          <View style={styles.footer}>
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <SkipForward size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.skipText}>Skip — I'll join later</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
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
    marginBottom: 32,
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 20,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  codeInput: {
    fontSize: 28,
    fontFamily: "JetBrainsMono_700Bold",
    color: "#ffffff",
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#fca5a5",
    textAlign: "center",
    marginBottom: 12,
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
  confirmCard: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34,197,94,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmSchoolName: {
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    textAlign: "center",
  },
  confirmHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  confirmButton: {
    backgroundColor: "#22c55e",
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
  confirmButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  backLink: {
    alignItems: "center",
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "underline",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 32,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
});
