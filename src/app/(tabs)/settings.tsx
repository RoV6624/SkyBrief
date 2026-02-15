import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Settings,
  User,
  Plane,
  Plus,
  ShieldCheck,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Key,
  Pencil,
  Trash2,
  Lock,
  ChevronDown,
  Fuel,
} from "lucide-react-native";

import { useAuthStore } from "@/stores/auth-store";
import { useUserStore } from "@/stores/user-store";
import { useMonitorStore } from "@/stores/monitor-store";
import { useThemeStore } from "@/stores/theme-store";
import { useTheme } from "@/theme/ThemeProvider";
import { useWBStore } from "@/stores/wb-store";
import { useSceneStore } from "@/stores/scene-store";
import { useDaylightStore } from "@/stores/daylight-store";
import { storage } from "@/services/storage";
import {
  AIRCRAFT_DATABASE,
  customProfileToAircraftType,
} from "@/lib/wb/aircraft-types";
import type { CustomAircraftProfile } from "@/lib/wb/aircraft-types";
import {
  firebaseSignOut,
  resetPassword,
  changePassword,
  deleteAccount,
  reauthenticateWithEmail,
  reauthenticateWithGoogle,
  safeCurrentUser,
} from "@/services/firebase";
import { CloudCard } from "@/components/ui/CloudCard";
import { CustomAircraftModal } from "@/components/aircraft/CustomAircraftModal";
import { DynamicSkyBackground } from "@/components/background/DynamicSkyBackground";
import { colors } from "@/theme/tokens";
import { getAirportData } from "@/services/airport-data";

export default function SettingsScreen() {
  const { user, signOut: authSignOut } = useAuthStore();
  const {
    pilotName,
    email,
    homeAirport,
    experienceLevel,
    defaultAircraft,
    setDefaultAircraft,
    customAircraft,
    addCustomAircraft,
    removeCustomAircraft,
    updateCustomAircraft,
  } = useUserStore();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingAircraft, setEditingAircraft] =
    useState<CustomAircraftProfile | null>(null);
  const { personalMinimums, setPersonalMinimum, minimumsEnabled, setMinimumsEnabled } =
    useMonitorStore();
  const { mode, setMode } = useThemeStore();
  const { isDark, theme } = useTheme();
  const { fuelUnit, toggleFuelUnit } = useWBStore();
  const { scene } = useSceneStore();
  const {
    settings: daylightSettings,
    setNightMinimumsEnabled,
    setNightCeiling,
    setNightVisibility,
    setCurrencyAlertsEnabled,
    setShowCurrencyMarker,
    setShowSunsetMarker,
  } = useDaylightStore();

  // ── Change Password state ──────────────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── Delete Account state ──────────────────────────────────────────────────
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Home Airport Display state ─────────────────────────────────────────────
  const [homeAirportName, setHomeAirportName] = useState<string>("");
  const [homeAirportAliases, setHomeAirportAliases] = useState<string[]>([]);

  // Fetch airport data when homeAirport changes
  useEffect(() => {
    if (homeAirport) {
      getAirportData(homeAirport).then(data => {
        if (data) {
          setHomeAirportName(data.name);
          setHomeAirportAliases(data.aliases);
        }
      });
    } else {
      setHomeAirportName("");
      setHomeAirportAliases([]);
    }
  }, [homeAirport]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await firebaseSignOut();
      authSignOut();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not sign out.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await deleteAccount();
              // Clear local storage and sign out
              storage.clearAll();
              authSignOut();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              if (error.code === "auth/requires-recent-login") {
                // Need re-authentication
                const currentUser = safeCurrentUser();
                const isGoogleUser = currentUser?.providerData?.some(
                  (p) => p.providerId === "google.com"
                );
                if (isGoogleUser) {
                  // Re-auth with Google then retry
                  try {
                    await reauthenticateWithGoogle();
                    await deleteAccount();
                    storage.clearAll();
                    authSignOut();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch (reAuthError: any) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert("Error", reAuthError.message || "Could not delete account.");
                  }
                } else {
                  // Prompt for password
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.prompt(
                    "Re-authenticate",
                    "Please enter your password to confirm account deletion.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Confirm",
                        style: "destructive",
                        onPress: async (password) => {
                          if (!password) return;
                          try {
                            await reauthenticateWithEmail(password);
                            await deleteAccount();
                            storage.clearAll();
                            authSignOut();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } catch (e: any) {
                            Alert.alert("Error", e.message || "Could not delete account.");
                          }
                        },
                      },
                    ],
                    "secure-text"
                  );
                }
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Error", error.message || "Could not delete account.");
              }
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userEmail = user?.email || email;
    if (!userEmail) {
      Alert.alert("Error", "No email found.");
      return;
    }
    try {
      await resetPassword(userEmail);
      Alert.alert("Success", "Password reset email sent.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not send reset email.");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setShowChangePassword(false);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect.");
      } else if (error.code === "auth/requires-recent-login") {
        setPasswordError(
          "Please sign out and sign back in before changing your password."
        );
      } else {
        setPasswordError(error.message || "Could not update password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const themeModes = [
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
    { value: "system" as const, label: "System", Icon: Monitor },
  ];

  // Dynamic style overrides for dark mode
  const dynamicColors = useMemo(() => ({
    sectionTitle: isDark ? theme.foreground : colors.stratus[700],
    profileLabel: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
    profileValue: isDark ? theme.foreground : colors.stratus[800],
    themeBtnText: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[400],
    themeBtnTextActive: isDark ? theme.foreground : colors.stratus[800],
    unitBtnText: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[500],
    unitBtnTextActive: isDark ? theme.foreground : colors.stratus[800],
    minimumLabel: isDark ? theme.foreground : colors.stratus[700],
    minimumValue: isDark ? theme.foreground : colors.stratus[800],
    borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(12,140,233,0.08)",
    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(12,140,233,0.1)",
  }), [isDark, theme]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <Settings size={22} color="#ffffff" strokeWidth={1.8} />
            <Text style={styles.title}>Settings</Text>
          </Animated.View>

          {/* Profile */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <User size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Profile</Text>
              </View>
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Name</Text>
                <Text style={[styles.profileValue, { color: dynamicColors.profileValue }]}>
                  {pilotName || user?.displayName || "—"}
                </Text>
              </View>
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Email</Text>
                <Text style={[styles.profileValue, { color: dynamicColors.profileValue }]}>
                  {email || user?.email || "—"}
                </Text>
              </View>
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Home Airport</Text>
                <View style={styles.homeAirportCol}>
                  <Text style={[styles.profileValueMono, { color: dynamicColors.profileValue }]}>
                    {homeAirport || "—"}
                  </Text>
                  {homeAirportAliases.length > 0 && (
                    <Text style={styles.homeAirportAlias}>
                      also: {homeAirportAliases.join(", ")}
                    </Text>
                  )}
                  {homeAirportName && (
                    <Text style={styles.homeAirportName}>
                      {homeAirportName}
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Experience</Text>
                <Text style={[styles.profileValue, { color: dynamicColors.profileValue }]}>
                  {experienceLevel.charAt(0).toUpperCase() +
                    experienceLevel.slice(1)}
                </Text>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Theme */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.gap}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <Moon size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Theme</Text>
              </View>
              <View style={styles.themeRow}>
                {themeModes.map((tm) => (
                  <Pressable
                    key={tm.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMode(tm.value);
                    }}
                    style={[
                      [styles.themeBtn, { borderColor: dynamicColors.borderColor }],
                      mode === tm.value && styles.themeBtnActive,
                    ]}
                  >
                    <tm.Icon
                      size={16}
                      color={
                        mode === tm.value
                          ? colors.stratus[800]
                          : colors.stratus[400]
                      }
                    />
                    <Text
                      style={[
                        styles.themeBtnText,
                        mode === tm.value && [styles.themeBtnTextActive, { color: dynamicColors.themeBtnTextActive }],
                      ]}
                    >
                      {tm.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </CloudCard>
          </Animated.View>

          {/* Units */}
          <Animated.View entering={FadeInDown.delay(125)} style={styles.gap}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <Fuel size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Units</Text>
              </View>
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Fuel Input</Text>
                <View style={styles.unitToggleRow}>
                  {(["gal", "lbs"] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => {
                        if (fuelUnit !== unit) {
                          Haptics.selectionAsync();
                          toggleFuelUnit();
                        }
                      }}
                      style={[
                        [styles.unitBtn, { borderColor: dynamicColors.borderColor }],
                        fuelUnit === unit && styles.unitBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitBtnText,
                          fuelUnit === unit && [styles.unitBtnTextActive, { color: dynamicColors.unitBtnTextActive }],
                        ]}
                      >
                        {unit === "gal" ? "Gallons" : "Pounds"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Default Aircraft */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.gap}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <Plane size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Default Aircraft</Text>
              </View>
              <View style={styles.acRow}>
                {AIRCRAFT_DATABASE.map((ac) => (
                  <Pressable
                    key={ac.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDefaultAircraft(ac.id);
                    }}
                    style={[
                      styles.acChip,
                      defaultAircraft === ac.id && styles.acChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.acChipText,
                        defaultAircraft === ac.id && styles.acChipTextActive,
                      ]}
                    >
                      {ac.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Aircraft with Edit / Delete */}
              {customAircraft.length > 0 && (
                <View style={styles.customAcList}>
                  {customAircraft.map((cp) => {
                    const ac = customProfileToAircraftType(cp);
                    return (
                      <View key={ac.id} style={styles.acChipRow}>
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            setDefaultAircraft(ac.id);
                          }}
                          style={[
                            styles.acChip,
                            styles.acChipCustom,
                            defaultAircraft === ac.id && styles.acChipActive,
                            { flex: 1 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.acChipText,
                              defaultAircraft === ac.id &&
                                styles.acChipTextActive,
                            ]}
                          >
                            {ac.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            setEditingAircraft(cp);
                            setShowCustomModal(true);
                          }}
                          hitSlop={8}
                          style={styles.acIconBtn}
                        >
                          <Pencil size={12} color={colors.stratus[500]} />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium
                            );
                            Alert.alert(
                              "Delete Aircraft",
                              `Remove "${ac.name}"?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => removeCustomAircraft(cp.id),
                                },
                              ]
                            );
                          }}
                          hitSlop={8}
                          style={styles.acIconBtn}
                        >
                          <Trash2 size={12} color={colors.alert.red} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add Aircraft button */}
              <View style={styles.acAddRow}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingAircraft(null);
                    setShowCustomModal(true);
                  }}
                  style={styles.acAddBtn}
                >
                  <Plus size={14} color={colors.stratus[500]} />
                  <Text style={styles.acAddText}>Add Custom Aircraft</Text>
                </Pressable>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Personal Minimums */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.gap}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Personal Minimums</Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMinimumsEnabled(!minimumsEnabled);
                  }}
                  style={[
                    styles.togglePill,
                    minimumsEnabled && styles.togglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      minimumsEnabled && styles.toggleTextActive,
                    ]}
                  >
                    {minimumsEnabled ? "ON" : "OFF"}
                  </Text>
                </Pressable>
              </View>
              {minimumsEnabled && (
                <View style={styles.minimumsGrid}>
                  {[
                    { key: "ceiling" as const, label: "Ceiling", unit: "ft", value: personalMinimums.ceiling },
                    { key: "visibility" as const, label: "Visibility", unit: "SM", value: personalMinimums.visibility },
                    { key: "crosswind" as const, label: "Crosswind", unit: "kts", value: personalMinimums.crosswind },
                    { key: "maxWind" as const, label: "Max Wind", unit: "kts", value: personalMinimums.maxWind },
                    { key: "maxGust" as const, label: "Max Gust", unit: "kts", value: personalMinimums.maxGust },
                  ].map((m) => (
                    <View key={m.key} style={styles.minimumItem}>
                      <Text style={[styles.minimumLabel, { color: dynamicColors.minimumLabel }]}>{m.label}</Text>
                      <View style={styles.minimumValueRow}>
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            const step =
                              m.key === "visibility"
                                ? 0.5
                                : m.key === "ceiling"
                                ? 100
                                : 1;
                            setPersonalMinimum(m.key, Math.max(0, m.value - step));
                          }}
                          style={styles.minusBtn}
                        >
                          <Text style={styles.btnText}>−</Text>
                        </Pressable>
                        <Text style={[styles.minimumValue, { color: dynamicColors.minimumValue }]}>
                          {m.value} {m.unit}
                        </Text>
                        <Pressable
                          onPress={() => {
                            Haptics.selectionAsync();
                            const step =
                              m.key === "visibility"
                                ? 0.5
                                : m.key === "ceiling"
                                ? 100
                                : 1;
                            setPersonalMinimum(m.key, m.value + step);
                          }}
                          style={styles.plusBtn}
                        >
                          <Text style={styles.btnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </CloudCard>
          </Animated.View>

          {/* Daylight & Night Operations */}
          <Animated.View entering={FadeInDown.delay(225)} style={styles.gap}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <Moon size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Daylight & Night Operations</Text>
              </View>

              {/* Night Minimums Toggle */}
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Night Minimums</Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setNightMinimumsEnabled(!daylightSettings.nightMinimumsEnabled);
                  }}
                  style={[
                    styles.togglePill,
                    daylightSettings.nightMinimumsEnabled && styles.togglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      daylightSettings.nightMinimumsEnabled && styles.toggleTextActive,
                    ]}
                  >
                    {daylightSettings.nightMinimumsEnabled ? "ON" : "OFF"}
                  </Text>
                </Pressable>
              </View>

              {/* Night Minimums Values */}
              {daylightSettings.nightMinimumsEnabled && (
                <View style={styles.minimumsGrid}>
                  {/* Night Ceiling */}
                  <View style={styles.minimumItem}>
                    <Text style={[styles.minimumLabel, { color: dynamicColors.minimumLabel }]}>Night Ceiling</Text>
                    <View style={styles.minimumValueRow}>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setNightCeiling(Math.max(500, daylightSettings.nightCeiling - 100));
                        }}
                        style={styles.minusBtn}
                      >
                        <Text style={styles.btnText}>−</Text>
                      </Pressable>
                      <Text style={[styles.minimumValue, { color: dynamicColors.minimumValue }]}>
                        {daylightSettings.nightCeiling} ft
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setNightCeiling(Math.min(3000, daylightSettings.nightCeiling + 100));
                        }}
                        style={styles.plusBtn}
                      >
                        <Text style={styles.btnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Night Visibility */}
                  <View style={styles.minimumItem}>
                    <Text style={[styles.minimumLabel, { color: dynamicColors.minimumLabel }]}>Night Visibility</Text>
                    <View style={styles.minimumValueRow}>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setNightVisibility(Math.max(3, daylightSettings.nightVisibility - 0.5));
                        }}
                        style={styles.minusBtn}
                      >
                        <Text style={styles.btnText}>−</Text>
                      </Pressable>
                      <Text style={[styles.minimumValue, { color: dynamicColors.minimumValue }]}>
                        {daylightSettings.nightVisibility} SM
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setNightVisibility(Math.min(10, daylightSettings.nightVisibility + 0.5));
                        }}
                        style={styles.plusBtn}
                      >
                        <Text style={styles.btnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Currency Alerts Toggle */}
              <View style={[styles.profileRow, { marginTop: 8 }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Currency Alerts</Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurrencyAlertsEnabled(!daylightSettings.currencyAlertsEnabled);
                  }}
                  style={[
                    styles.togglePill,
                    daylightSettings.currencyAlertsEnabled && styles.togglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      daylightSettings.currencyAlertsEnabled && styles.toggleTextActive,
                    ]}
                  >
                    {daylightSettings.currencyAlertsEnabled ? "ON" : "OFF"}
                  </Text>
                </Pressable>
              </View>

              {/* Show Currency Marker Toggle */}
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Show Currency Marker</Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowCurrencyMarker(!daylightSettings.showCurrencyMarker);
                  }}
                  style={[
                    styles.togglePill,
                    daylightSettings.showCurrencyMarker && styles.togglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      daylightSettings.showCurrencyMarker && styles.toggleTextActive,
                    ]}
                  >
                    {daylightSettings.showCurrencyMarker ? "ON" : "OFF"}
                  </Text>
                </Pressable>
              </View>

              {/* Show Sunset Marker Toggle */}
              <View style={[styles.profileRow, { borderBottomColor: dynamicColors.borderBottomColor }]}>
                <Text style={[styles.profileLabel, { color: dynamicColors.profileLabel }]}>Show Sunset Marker</Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowSunsetMarker(!daylightSettings.showSunsetMarker);
                  }}
                  style={[
                    styles.togglePill,
                    daylightSettings.showSunsetMarker && styles.togglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      daylightSettings.showSunsetMarker && styles.toggleTextActive,
                    ]}
                  >
                    {daylightSettings.showSunsetMarker ? "ON" : "OFF"}
                  </Text>
                </Pressable>
              </View>
            </CloudCard>
          </Animated.View>

          {/* Security */}
          <Animated.View entering={FadeInDown.delay(275)} style={styles.gap}>
            <CloudCard>
              <View style={styles.sectionHeader}>
                <Lock size={14} color={colors.stratus[500]} />
                <Text style={[styles.sectionTitle, { color: dynamicColors.sectionTitle }]}>Security</Text>
              </View>

              {/* Change Password toggle row */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowChangePassword(!showChangePassword);
                  setPasswordError(null);
                }}
                style={styles.actionRow}
              >
                <Key size={16} color={colors.stratus[500]} />
                <Text style={[styles.actionText, { flex: 1 }]}>
                  Change Password
                </Text>
                <ChevronDown
                  size={14}
                  color={colors.stratus[400]}
                  style={{
                    transform: [
                      { rotate: showChangePassword ? "180deg" : "0deg" },
                    ],
                  }}
                />
              </Pressable>

              {/* Inline Change Password form */}
              {showChangePassword && (
                <View style={styles.passwordForm}>
                  {(
                    [
                      {
                        label: "Current Password",
                        value: currentPassword,
                        setter: setCurrentPassword,
                      },
                      {
                        label: "New Password (min 8 chars)",
                        value: newPassword,
                        setter: setNewPassword,
                      },
                      {
                        label: "Confirm New Password",
                        value: confirmPassword,
                        setter: setConfirmPassword,
                      },
                    ] as const
                  ).map(({ label, value, setter }) => (
                    <View key={label} style={styles.passwordField}>
                      <Text style={styles.passwordLabel}>{label}</Text>
                      <TextInput
                        value={value}
                        onChangeText={setter}
                        secureTextEntry
                        autoCapitalize="none"
                        placeholder="••••••••"
                        placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
                        style={styles.passwordInput}
                      />
                    </View>
                  ))}
                  {passwordError ? (
                    <Text style={styles.passwordError}>{passwordError}</Text>
                  ) : null}
                  <Pressable
                    onPress={handleChangePassword}
                    disabled={passwordLoading}
                    style={[
                      styles.passwordSubmitBtn,
                      passwordLoading && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={styles.passwordSubmitText}>
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.securityDivider} />

              {/* Send Reset Email */}
              <Pressable onPress={handleResetPassword} style={styles.actionRow}>
                <Key size={16} color={colors.stratus[500]} />
                <Text style={styles.actionText}>Send Reset Email</Text>
              </Pressable>
            </CloudCard>
          </Animated.View>

          {/* Sign Out */}
          <Animated.View entering={FadeInDown.delay(325)} style={styles.gap}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <LogOut size={18} color={colors.alert.red} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </Animated.View>

          {/* Delete Account */}
          <Animated.View entering={FadeInDown.delay(350)} style={styles.gap}>
            <Pressable
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && { opacity: 0.8 },
                deleteLoading && { opacity: 0.6 },
              ]}
            >
              <Trash2 size={18} color={colors.alert.red} />
              <Text style={styles.deleteText}>
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </Text>
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      <CustomAircraftModal
        visible={showCustomModal}
        editProfile={editingAircraft}
        onClose={() => {
          setShowCustomModal(false);
          setEditingAircraft(null);
        }}
        onSave={(profile) => {
          if (editingAircraft) {
            updateCustomAircraft(profile);
          } else {
            addCustomAircraft(profile);
          }
          setEditingAircraft(null);
          setShowCustomModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, maxWidth: 500, width: "100%", alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gap: { marginTop: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[700],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(12,140,233,0.08)",
  },
  profileLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[600],
  },
  profileValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[800],
  },
  profileValueMono: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[800],
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.08)",
    paddingVertical: 10,
  },
  themeBtnActive: {
    backgroundColor: "rgba(12,140,233,0.12)",
    borderColor: colors.stratus[500],
  },
  themeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[400],
  },
  themeBtnTextActive: {
    color: colors.stratus[800],
    fontFamily: "Inter_700Bold",
  },
  unitToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.1)",
    backgroundColor: "rgba(12,140,233,0.04)",
  },
  unitBtnActive: {
    backgroundColor: "rgba(12,140,233,0.12)",
    borderColor: colors.stratus[500],
  },
  unitBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[500],
  },
  unitBtnTextActive: {
    fontFamily: "Inter_700Bold",
    color: colors.stratus[800],
  },
  acRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  acChip: {
    flex: 1,
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.08)",
    paddingVertical: 10,
    alignItems: "center",
  },
  acChipActive: {
    backgroundColor: "rgba(12,140,233,0.12)",
    borderColor: colors.stratus[500],
  },
  acChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[600],
  },
  acChipTextActive: {
    color: colors.stratus[800],
    fontFamily: "Inter_700Bold",
  },
  acChipCustom: {
    borderColor: "rgba(34,197,94,0.25)",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  customAcList: {
    marginTop: 8,
    gap: 6,
  },
  acChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  acIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
    backgroundColor: "rgba(12,140,233,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  acAddRow: {
    marginTop: 10,
  },
  acAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.15)",
    borderStyle: "dashed",
    paddingVertical: 10,
    backgroundColor: "rgba(12,140,233,0.04)",
  },
  acAddText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[500],
  },
  togglePill: {
    backgroundColor: "rgba(12,140,233,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  togglePillActive: {
    backgroundColor: colors.vfr,
  },
  toggleText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: colors.stratus[500],
  },
  toggleTextActive: {
    color: "#ffffff",
  },
  minimumsGrid: { gap: 10 },
  minimumItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  minimumLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[700],
  },
  minimumValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  minimumValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[800],
    minWidth: 60,
    textAlign: "center",
  },
  minusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(12,140,233,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(12,140,233,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: colors.stratus[600],
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.stratus[700],
  },
  passwordForm: {
    paddingTop: 12,
    gap: 10,
  },
  passwordField: {
    gap: 4,
  },
  passwordLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[600],
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  passwordInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.stratus[800],
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passwordError: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.alert.red,
    marginTop: 2,
  },
  passwordSubmitBtn: {
    backgroundColor: colors.stratus[500],
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 4,
  },
  passwordSubmitText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  securityDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(12,140,233,0.1)",
    marginVertical: 10,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.alert.red,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.1)",
    paddingVertical: 14,
  },
  deleteText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.alert.red,
  },
  homeAirportCol: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  homeAirportAlias: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.stratus[500],
    fontStyle: 'italic',
  },
  homeAirportName: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.stratus[600],
  },
});
