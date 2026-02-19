import { useEffect, useCallback, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/auth-store";
import { useUserStore } from "@/stores/user-store";
import { onAuthStateChanged } from "@/services/firebase";
import { trackAppOpen } from "@/services/analytics";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import "../global.css";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigator() {
  const { isDark } = useTheme();
  const { isAuthenticated, onboardingComplete, isLoading, setUser, setLoading } =
    useAuthStore();
  const hasHandledResetRef = useRef(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      // Check for force reset flag - ignore ONLY the first Firebase auth restore
      if (__DEV__ && (global as any).__FORCE_RESET__ && !hasHandledResetRef.current) {
        console.log("[DEV] Force reset active - ignoring initial Firebase auth restore");
        hasHandledResetRef.current = true; // Mark as handled
        setUser(null);
        // Clear the global flag so future sign-ins work
        (global as any).__FORCE_RESET__ = false;
        return;
      }

      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, [setUser, setLoading]);

  // Run home airport migration on app load
  useEffect(() => {
    useUserStore.getState().migrateHomeAirport();
  }, []);

  // Track app open for analytics
  useEffect(() => {
    if (isAuthenticated && !isLoading && useAuthStore.getState().user?.uid) {
      trackAppOpen(useAuthStore.getState().user!.uid);
    }
  }, [isAuthenticated, isLoading]);

  // Force navigation when auth state changes
  useEffect(() => {
    // Don't navigate while loading profile - prevents flash of onboarding screen
    if (isLoading) {
      console.log("[Auth] Loading profile, delaying navigation...");
      return;
    }

    // Check if we're on the right route - if not, navigate
    if (!isAuthenticated && segments[0] !== "auth") {
      console.log("[Auth] Navigating to auth screen");
      router.push("/auth" as any); // Type assertion for Expo Router compatibility
    } else if (isAuthenticated && !onboardingComplete && segments[0] !== "onboarding") {
      console.log("[Auth] Navigating to onboarding screen");
      router.push("/onboarding" as any); // Type assertion for Expo Router compatibility
    } else if (isAuthenticated && onboardingComplete && segments[0] !== "(tabs)" && segments[0] !== "admin" && segments[0] !== "xc-wizard" && segments[0] !== "instructor") {
      console.log("[Auth] Navigating to main app");
      router.push("/(tabs)" as any); // Type assertion for Expo Router compatibility
    }
  }, [isAuthenticated, onboardingComplete, isLoading, router, segments]);

  // Show nothing while loading profile to prevent screen flash
  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="auth" />
        ) : !onboardingComplete ? (
          <Stack.Screen name="onboarding" />
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="xc-wizard" options={{ presentation: "modal" }} />
            <Stack.Screen name="instructor" />
          </>
        )}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
