import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Mail, Lock, ArrowLeft, CloudSun, LogIn } from "lucide-react-native";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from "@/services/firebase";
import { useAuthStore } from "@/stores/auth-store";

function PasswordStrengthBar({ password }: { password: string }) {
  if (password.length === 0) return null;
  const color =
    password.length >= 8 ? "#22c55e" : password.length >= 6 ? "#f59e0b" : "#ef4444";
  const width = password.length >= 8 ? "100%" : password.length >= 6 ? "66%" : "33%";
  return (
    <View style={strengthStyles.track}>
      <View style={[strengthStyles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 6,
  },
  fill: {
    height: "100%",
    borderRadius: 1.5,
  },
});

export default function SignInScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
      await setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
    } catch (error: any) {
      Alert.alert(
        isSignUp ? "Sign Up Failed" : "Sign In Failed",
        error.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email first.");
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert("Password Reset", "Check your email for reset instructions.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not send reset email.");
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
          {/* Back button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>

          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logo}
          >
            <CloudSun size={36} color="#ffffff" strokeWidth={1.5} />
            <Text style={styles.logoText}>SkyBrief</Text>
          </Animated.View>

          {/* Segmented Auth Toggle */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.segmentContainer}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setIsSignUp(false);
              }}
              style={[styles.segmentBtn, !isSignUp && styles.segmentBtnActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  !isSignUp && styles.segmentTextActive,
                ]}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setIsSignUp(true);
              }}
              style={[styles.segmentBtn, isSignUp && styles.segmentBtnActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSignUp && styles.segmentTextActive,
                ]}
              >
                Create Account
              </Text>
            </Pressable>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={styles.title}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Sign up to get your personal briefing"
                : "Sign in to continue your preflight"}
            </Text>
          </Animated.View>

          {/* Email/Password Form */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.form}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <Mail size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            {/* Password */}
            <View>
              <View style={styles.inputContainer}>
                <Lock size={18} color="rgba(255,255,255,0.6)" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
              {isSignUp && <PasswordStrengthBar password={password} />}
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleEmailAuth}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#1e90ff" />
              ) : (
                <Text style={styles.submitText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Text>
              )}
            </Pressable>

            {/* Forgot password */}
            {!isSignUp && (
              <Pressable onPress={handleForgotPassword}>
                <Text style={styles.linkText}>Forgot Password?</Text>
              </Pressable>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
            >
              <LogIn size={18} color="#ffffff" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: 0,
    padding: 4,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    alignSelf: "center",
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  segmentText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.6)",
  },
  segmentTextActive: {
    color: "#1e90ff",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 24,
    textAlign: "center",
  },
  form: {
    gap: 14,
    width: "100%",
  },
  inputContainer: {
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
  submitButton: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#1e90ff",
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 14,
  },
  googleText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
});
