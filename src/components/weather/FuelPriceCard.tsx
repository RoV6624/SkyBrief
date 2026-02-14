import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Fuel, X, BadgeCheck, Plus } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { useUserStore } from "@/stores/user-store";
import { colors } from "@/theme/tokens";
import { submitFuelPrice } from "@/services/firebase";
import { useFuelPrice } from "@/hooks/useFuelPrice";
import { daysSince } from "@/lib/utils/date-helpers";

interface FuelPriceCardProps {
  icao: string;
  uid: string | null;
}

export function FuelPriceCard({ icao, uid }: FuelPriceCardProps) {
  const { theme, isDark } = useTheme();
  const { scoutScore, incrementScoutScore } = useUserStore();

  const { data: fuelData, isLoading, refetch } = useFuelPrice(icao);
  const [showModal, setShowModal] = useState(false);

  const isStale =
    fuelData &&
    fuelData.source !== "api" &&
    fuelData.confidence === "low";

  return (
    <>
      <CloudCard>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Fuel size={16} color={colors.stratus[500]} strokeWidth={1.8} />
            <Text style={[styles.title, { color: theme.foreground }]}>
              100LL Fuel Price
            </Text>
          </View>
          <View style={styles.headerRight}>
            {scoutScore > 0 && (
              <View
                style={[
                  styles.scoutBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(16,185,129,0.1)",
                  },
                ]}
              >
                <BadgeCheck size={12} color={colors.alert.green} strokeWidth={2} />
                <Text style={[styles.scoutText, { color: colors.alert.green }]}>
                  {scoutScore}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowModal(true);
              }}
              style={({ pressed }) => [
                styles.plusButton,
                { borderColor: colors.stratus[500] },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Plus size={16} color={colors.stratus[500]} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Body */}
        {isLoading ? (
          <View style={styles.skeleton}>
            <ActivityIndicator size="small" color={colors.stratus[500]} />
            <Text style={[styles.skeletonText, { color: theme.mutedForeground }]}>
              Fetching price data...
            </Text>
          </View>
        ) : fuelData && !isStale ? (
          /* Fresh data */
          <View>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: theme.foreground }]}>
                ${fuelData.price_100ll.toFixed(2)}
                <Text style={[styles.priceUnit, { color: theme.mutedForeground }]}>
                  {" "}
                  /gal
                </Text>
              </Text>
            </View>
            {fuelData.fbo_name && (
              <Text style={[styles.fboName, { color: theme.mutedForeground }]}>
                {fuelData.fbo_name}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Text style={[styles.updatedAt, { color: theme.mutedForeground }]}>
                Updated {daysSince(fuelData.updated_at)} day
                {daysSince(fuelData.updated_at) !== 1 ? "s" : ""} ago
              </Text>
              {fuelData.source === "api" && (
                <View style={[styles.sourceBadge, styles.apiBadge]}>
                  <Text style={styles.sourceBadgeText}>API Data</Text>
                </View>
              )}
              {fuelData.source === "user" && (
                <View style={[styles.sourceBadge, styles.userBadge]}>
                  <Text style={styles.sourceBadgeText}>Community</Text>
                </View>
              )}
            </View>
            {fuelData.source === "merged" &&
              fuelData.api_data &&
              fuelData.user_data && (
                <View style={styles.mergedWarning}>
                  <Text style={styles.mergedTitle}>Price varies by source:</Text>
                  <Text style={[styles.mergedText, { color: theme.foreground }]}>
                    API: ${fuelData.api_data.price.toFixed(2)} • Community: $
                    {fuelData.user_data.price_100ll.toFixed(2)}
                  </Text>
                  <Text style={[styles.mergedSub, { color: theme.mutedForeground }]}>
                    Verify with FBO before fueling
                  </Text>
                </View>
              )}
          </View>
        ) : fuelData && isStale ? (
          /* Stale data */
          <View>
            <View style={styles.priceRow}>
              <Text
                style={[
                  styles.price,
                  { color: theme.mutedForeground, opacity: 0.6 },
                ]}
              >
                ${fuelData.price_100ll.toFixed(2)}
                <Text style={styles.priceUnit}> /gal</Text>
              </Text>
            </View>
            <View style={styles.staleWarning}>
              <Text style={styles.staleText}>
                Data outdated ({daysSince(fuelData.updated_at)}d) — Call FBO to confirm
              </Text>
            </View>
          </View>
        ) : (
          /* No data */
          <View style={styles.noData}>
            <Text style={[styles.noDataTitle, { color: theme.foreground }]}>
              No price on file
            </Text>
            <Text style={[styles.noDataSub, { color: theme.mutedForeground }]}>
              Be the first to report!
            </Text>
          </View>
        )}
      </CloudCard>

      {/* Update Price modal */}
      <UpdatePriceModal
        visible={showModal}
        icao={icao}
        uid={uid ?? ""}
        onClose={() => setShowModal(false)}
        onSaved={() => {
          setShowModal(false);
          incrementScoutScore();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          refetch();
        }}
      />
    </>
  );
}

// ─── Update Modal ──────────────────────────────────────────────────────────────

interface UpdateModalProps {
  visible: boolean;
  icao: string;
  uid: string;
  onClose: () => void;
  onSaved: () => void;
}

function UpdatePriceModal({
  visible,
  icao,
  uid,
  onClose,
  onSaved,
}: UpdateModalProps) {
  const { theme } = useTheme();

  const [priceInput, setPriceInput] = useState("");
  const [fboInput, setFboInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset modal state when it becomes visible
  useEffect(() => {
    if (visible) {
      setPriceInput("");
      setFboInput("");
      setSaving(false);
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
    // Validate user is authenticated
    if (!uid || uid.trim() === "") {
      setError("You must be signed in to report prices.");
      return;
    }

    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0 || price >= 20) {
      setError("Enter a valid price between $0.01 and $19.99");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      await Promise.race([
        submitFuelPrice(icao, price, fboInput, uid),
        timeoutPromise,
      ]);

      setPriceInput("");
      setFboInput("");
      onSaved();
    } catch (err) {
      console.error("Failed to submit fuel price:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      if (errorMsg.includes("timeout")) {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError("Failed to save. Please try again or contact support.");
      }
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }}>
          <View
            style={[
              modalStyles.sheet,
              { backgroundColor: theme.card.bg },
            ]}
          >
            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: theme.foreground }]}>
                Report 100LL Price — {icao}
              </Text>
              <Pressable onPress={onClose} style={modalStyles.closeBtn}>
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>

            {/* Price input */}
            <Text style={[modalStyles.label, { color: theme.foreground }]}>
              Price per gallon
            </Text>
            <TextInput
              value={priceInput}
              onChangeText={(t) => {
                setPriceInput(t);
                setError(null);
              }}
              placeholder="$0.00"
              placeholderTextColor={theme.mutedForeground}
              keyboardType="decimal-pad"
              style={[
                modalStyles.input,
                {
                  color: theme.foreground,
                  borderColor: theme.card.border,
                  backgroundColor: theme.ghost.bg,
                },
              ]}
            />

            {/* FBO name input */}
            <Text
              style={[
                modalStyles.label,
                { color: theme.foreground, marginTop: 12 },
              ]}
            >
              FBO Name{" "}
              <Text style={{ color: theme.mutedForeground }}>(optional)</Text>
            </Text>
            <TextInput
              value={fboInput}
              onChangeText={setFboInput}
              placeholder="e.g. Signature Flight Support"
              placeholderTextColor={theme.mutedForeground}
              style={[
                modalStyles.input,
                {
                  color: theme.foreground,
                  borderColor: theme.card.border,
                  backgroundColor: theme.ghost.bg,
                },
              ]}
            />

            {/* Error */}
            {error && (
              <Text style={modalStyles.errorText}>{error}</Text>
            )}

            {/* Actions */}
            <View style={modalStyles.actions}>
              <Pressable
                onPress={onClose}
                style={[
                  modalStyles.cancelBtn,
                  { borderColor: theme.mutedForeground },
                ]}
              >
                <Text
                  style={[
                    modalStyles.cancelText,
                    { color: theme.mutedForeground },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[
                  modalStyles.saveBtn,
                  saving && { opacity: 0.6 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={modalStyles.saveText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoutText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  skeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  skeletonText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  priceRow: {
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontFamily: "JetBrainsMono_700Bold",
  },
  priceUnit: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  fboName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  updatedAt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  apiBadge: {
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  userBadge: {
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  sourceBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#3b82f6",
  },
  mergedWarning: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  mergedTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#f59e0b",
    marginBottom: 3,
  },
  mergedText: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_600SemiBold",
    marginBottom: 3,
  },
  mergedSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  staleWarning: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  staleText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#f59e0b",
  },
  noData: {
    paddingVertical: 8,
  },
  noDataTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  noDataSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.stratus[500],
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
});
