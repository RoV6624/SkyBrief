import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Users, ChevronRight, SkipForward, Check } from "lucide-react-native";
import { StepProgressBar } from "@/components/onboarding/StepProgressBar";
import { useAuthStore } from "@/stores/auth-store";
import { useUserStore } from "@/stores/user-store";
import { useTenantStore } from "@/stores/tenant-store";
import { getSchoolInstructors, assignInstructor } from "@/services/tenant-api";

const STUDENT_LABELS = ["Profile", "School", "Instructor", "Minimums", "Aircraft", "Permissions"];

interface InstructorInfo {
  uid: string;
  name: string;
  role: string;
}

export default function SelectInstructorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setAssignedInstructor } = useUserStore();
  const { tenantId } = useTenantStore();

  const [instructors, setInstructors] = useState<InstructorInfo[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantId) {
      getSchoolInstructors(tenantId).then((data) => {
        setInstructors(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const selected = instructors.find((i) => i.uid === selectedUid);

  const handleNext = async () => {
    if (!selectedUid || !selected || !user) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await assignInstructor(user.uid, selectedUid, selected.name);
    setAssignedInstructor(selectedUid, selected.name);

    setSaving(false);
    router.push("/onboarding/minimums");
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <StepProgressBar
            currentStep={3}
            totalSteps={6}
            stepLabels={STUDENT_LABELS}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <View style={styles.headerRow}>
            <Users size={24} color="#ffffff" />
            <Text style={styles.title}>Select Instructor</Text>
          </View>
          <Text style={styles.subtitle}>
            Choose your assigned flight instructor. You can change this later in
            Settings.
          </Text>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ffffff" size="large" />
          </View>
        ) : instructors.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
            <Users size={40} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>
              No instructors found at this school yet.
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.list}>
            {instructors.map((inst, i) => {
              const isSelected = selectedUid === inst.uid;
              return (
                <Animated.View
                  key={inst.uid}
                  entering={FadeInDown.delay(350 + i * 60)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedUid(inst.uid);
                    }}
                    style={[
                      styles.instructorCard,
                      isSelected && styles.instructorCardSelected,
                    ]}
                  >
                    <View style={styles.instructorInfo}>
                      <View
                        style={[
                          styles.avatar,
                          isSelected && styles.avatarSelected,
                        ]}
                      >
                        <Text style={styles.avatarText}>
                          {inst.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.instructorName,
                            isSelected && styles.instructorNameSelected,
                          ]}
                        >
                          {inst.name}
                        </Text>
                        <Text style={styles.instructorRole}>
                          {inst.role === "school_admin"
                            ? "School Admin"
                            : "Instructor"}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="#1e90ff" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* Next / Skip */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleNext}
            disabled={!selectedUid || saving}
            style={({ pressed }) => [
              styles.nextButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              (!selectedUid || saving) && { opacity: 0.5 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#1e90ff" size="small" />
            ) : (
              <>
                <Text style={styles.nextText}>Next</Text>
                <ChevronRight size={20} color="#1e90ff" strokeWidth={2.5} />
              </>
            )}
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <SkipForward size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.skipText}>Choose later</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  list: { gap: 10 },
  instructorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 16,
  },
  instructorCardSelected: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "#ffffff",
  },
  instructorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSelected: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
  },
  instructorName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.9)",
  },
  instructorNameSelected: {
    color: "#ffffff",
  },
  instructorRole: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 32,
    gap: 12,
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
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
});
