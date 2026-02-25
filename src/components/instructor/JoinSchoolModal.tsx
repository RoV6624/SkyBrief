import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, School } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { findTenantByInviteCode, joinTenant, getTenantConfig } from "@/services/tenant-api";

interface JoinSchoolModalProps {
  visible: boolean;
  onClose: () => void;
}

export function JoinSchoolModal({ visible, onClose }: JoinSchoolModalProps) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const { setTenant } = useTenantStore();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ id: string; schoolName: string } | null>(null);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[100];
  const cardBg = isDark ? colors.stratus[800] : "#FFFFFF";

  const handleLookup = async () => {
    if (code.length !== 6) {
      setError("Enter a 6-character invitation code");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await findTenantByInviteCode(code);
    setLoading(false);

    if (!result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Invalid invitation code. Please check and try again.");
      return;
    }

    setFound(result);
  };

  const handleJoin = async () => {
    if (!found || !user?.uid) return;

    setLoading(true);
    const success = await joinTenant(user.uid, found.id);

    if (!success) {
      setLoading(false);
      setError("Failed to join school. Please try again.");
      return;
    }

    // Load full tenant config into store
    const config = await getTenantConfig(found.id);
    setLoading(false);

    if (config) {
      setTenant(config);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAndClose();
  };

  const resetAndClose = () => {
    setCode("");
    setError(null);
    setFound(null);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdropPress} onPress={resetAndClose} />

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <School size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: textColor }]}>
              Join Flight School
            </Text>
            <Pressable onPress={resetAndClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={subColor} />
            </Pressable>
          </View>

          {!found ? (
            <>
              <Text style={[styles.cardDesc, { color: subColor }]}>
                Enter the 6-character invitation code from your school administrator.
              </Text>

              <TextInput
                style={[
                  styles.codeInput,
                  { color: textColor, backgroundColor: inputBg },
                ]}
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                  setError(null);
                }}
                placeholder="ABC123"
                placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                onPress={handleLookup}
                disabled={loading || code.length !== 6}
                style={[
                  styles.joinBtn,
                  { opacity: loading || code.length !== 6 ? 0.5 : 1 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.joinBtnText}>Look Up School</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.cardDesc, { color: subColor }]}>
                Join this school?
              </Text>

              <View style={[styles.schoolPreview, { backgroundColor: inputBg }]}>
                <Text style={[styles.schoolName, { color: textColor }]}>
                  {found.schoolName}
                </Text>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.confirmRow}>
                <Pressable
                  onPress={() => setFound(null)}
                  style={[styles.cancelBtn, { borderColor: isDark ? colors.stratus[600] : colors.stratus[200] }]}
                >
                  <Text style={[styles.cancelBtnText, { color: textColor }]}>Back</Text>
                </Pressable>
                <Pressable
                  onPress={handleJoin}
                  disabled={loading}
                  style={[styles.joinBtn, styles.confirmJoin, { opacity: loading ? 0.5 : 1 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.joinBtnText}>Join School</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "88%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
    flex: 1,
  },
  closeBtn: { padding: 4 },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  codeInput: {
    fontSize: 22,
    fontFamily: "JetBrainsMono_500Medium",
    textAlign: "center",
    letterSpacing: 6,
    paddingVertical: 14,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.alert.red,
  },
  joinBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  joinBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  schoolPreview: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  schoolName: {
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  confirmRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  confirmJoin: { flex: 1 },
});
