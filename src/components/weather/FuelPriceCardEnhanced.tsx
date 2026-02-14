import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Fuel, X, BadgeCheck, Plus, ThumbsUp, Flag, ChevronDown, ChevronUp } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { useUserStore } from "@/stores/user-store";
import { colors } from "@/theme/tokens";
import { submitFuelPriceReport, upvoteFuelReport, flagFuelReport } from "@/services/firebase";
import { useFuelPrice } from "@/hooks/useFuelPrice";
import {
  determineFreshness,
  getFreshnessColor,
  getTimeAgo,
  hasUserUpvoted,
  hasUserFlagged,
} from "@/lib/fuel/freshness";
import type { FuelPriceReport } from "@/lib/api/types";
import auth from "@react-native-firebase/auth";

interface FuelPriceCardProps {
  icao: string;
  uid: string | null;
}

export function FuelPriceCardEnhanced({ icao, uid }: FuelPriceCardProps) {
  const { theme, isDark } = useTheme();
  const { scoutScore, incrementScoutScore } = useUserStore();

  const { data: fuelData, isLoading, refetch } = useFuelPrice(icao);
  const [showModal, setShowModal] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);

  const reports = fuelData?.reports || [];
  const hasMultipleReports = reports.length > 1;
  const primaryReport = reports[0];

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
            {hasMultipleReports && (
              <View style={[styles.countBadge, { backgroundColor: colors.stratus[500] }]}>
                <Text style={styles.countText}>{reports.length}</Text>
              </View>
            )}
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
        ) : reports.length > 0 ? (
          <View>
            {/* Primary Report */}
            <ReportItem
              report={primaryReport}
              icao={icao}
              uid={uid}
              theme={theme}
              isDark={isDark}
              onInteraction={refetch}
            />

            {/* Show More / Show Less Button */}
            {hasMultipleReports && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAllReports(!showAllReports);
                }}
                style={styles.expandButton}
              >
                <Text style={[styles.expandText, { color: colors.stratus[500] }]}>
                  {showAllReports
                    ? "Show less"
                    : `Show ${reports.length - 1} more report${reports.length - 1 > 1 ? 's' : ''}`}
                </Text>
                {showAllReports ? (
                  <ChevronUp size={14} color={colors.stratus[500]} />
                ) : (
                  <ChevronDown size={14} color={colors.stratus[500]} />
                )}
              </Pressable>
            )}

            {/* Additional Reports */}
            {showAllReports && reports.slice(1).map((report) => (
              <View key={report.id} style={styles.additionalReport}>
                <ReportItem
                  report={report}
                  icao={icao}
                  uid={uid}
                  theme={theme}
                  isDark={isDark}
                  onInteraction={refetch}
                />
              </View>
            ))}
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

// ─── Report Item Component ─────────────────────────────────────────────────

interface ReportItemProps {
  report: FuelPriceReport;
  icao: string;
  uid: string | null;
  theme: any;
  isDark: boolean;
  onInteraction: () => void;
}

function ReportItem({ report, icao, uid, theme, isDark, onInteraction }: ReportItemProps) {
  const [upvoting, setUpvoting] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const freshness = determineFreshness(report.reported_at);
  const freshnessColor = getFreshnessColor(freshness);
  const timeAgo = getTimeAgo(report.reported_at);

  const hasUpvoted = uid ? hasUserUpvoted(report, uid) : false;
  const hasFlagged = uid ? hasUserFlagged(report, uid) : false;

  const handleUpvote = async () => {
    if (!uid || upvoting || hasUpvoted) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUpvoting(true);
    try {
      await upvoteFuelReport(icao, report.id, uid);
      onInteraction();
    } catch (error) {
      console.error("Failed to upvote:", error);
    } finally {
      setUpvoting(false);
    }
  };

  const handleFlag = async () => {
    if (!uid || flagging || hasFlagged) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFlagging(true);
    try {
      await flagFuelReport(icao, report.id, uid);
      onInteraction();
    } catch (error) {
      console.error("Failed to flag:", error);
    } finally {
      setFlagging(false);
    }
  };

  return (
    <View>
      {/* Price with Freshness Indicator */}
      <View style={styles.priceRow}>
        <View style={[styles.freshnessIndicator, { backgroundColor: freshnessColor }]} />
        <Text style={[styles.price, { color: theme.foreground }]}>
          ${report.price_100ll.toFixed(2)}
          <Text style={[styles.priceUnit, { color: theme.mutedForeground }]}> /gal</Text>
        </Text>
      </View>

      {/* FBO Name */}
      {report.fbo_name && (
        <Text style={[styles.fboName, { color: theme.mutedForeground }]}>
          {report.fbo_name}
        </Text>
      )}

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <Text style={[styles.timeAgo, { color: theme.mutedForeground }]}>
          {timeAgo}
        </Text>
        <View style={[styles.freshnessBadge, { backgroundColor: `${freshnessColor}20` }]}>
          <Text style={[styles.freshnessText, { color: freshnessColor }]}>
            {freshness}
          </Text>
        </View>
      </View>

      {/* Interaction Row */}
      {uid && (
        <View style={styles.interactionRow}>
          {/* Upvote Button */}
          <Pressable
            onPress={handleUpvote}
            disabled={upvoting || hasUpvoted}
            style={({ pressed }) => [
              styles.interactionButton,
              hasUpvoted && styles.interactionButtonActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            {upvoting ? (
              <ActivityIndicator size="small" color={colors.stratus[500]} />
            ) : (
              <>
                <ThumbsUp
                  size={13}
                  color={hasUpvoted ? colors.alert.green : theme.mutedForeground}
                  strokeWidth={2}
                  fill={hasUpvoted ? colors.alert.green : "none"}
                />
                <Text
                  style={[
                    styles.interactionText,
                    { color: hasUpvoted ? colors.alert.green : theme.mutedForeground },
                  ]}
                >
                  {report.upvotes > 0 ? report.upvotes : "Verify"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Flag Button */}
          <Pressable
            onPress={handleFlag}
            disabled={flagging || hasFlagged}
            style={({ pressed }) => [
              styles.interactionButton,
              hasFlagged && styles.interactionButtonActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            {flagging ? (
              <ActivityIndicator size="small" color={colors.alert.amber} />
            ) : (
              <>
                <Flag
                  size={13}
                  color={hasFlagged ? colors.alert.amber : theme.mutedForeground}
                  strokeWidth={2}
                  fill={hasFlagged ? colors.alert.amber : "none"}
                />
                <Text
                  style={[
                    styles.interactionText,
                    { color: hasFlagged ? colors.alert.amber : theme.mutedForeground },
                  ]}
                >
                  {report.flags > 0 ? report.flags : "Outdated"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Update Modal ──────────────────────────────────────────────────────────

interface UpdateModalProps {
  visible: boolean;
  icao: string;
  uid: string;
  onClose: () => void;
  onSaved: () => void;
}

function UpdatePriceModal({ visible, icao, uid, onClose, onSaved }: UpdateModalProps) {
  const { theme } = useTheme();

  const [priceInput, setPriceInput] = useState("");
  const [fboInput, setFboInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPriceInput("");
      setFboInput("");
      setSaving(false);
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
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
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      await Promise.race([
        submitFuelPriceReport(icao, price, fboInput, uid),
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
          <View style={[modalStyles.sheet, { backgroundColor: theme.card.bg }]}>
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: theme.foreground }]}>
                Report 100LL Price — {icao}
              </Text>
              <Pressable onPress={onClose} style={modalStyles.closeBtn}>
                <X size={20} color={theme.mutedForeground} />
              </Pressable>
            </View>

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

            <Text
              style={[
                modalStyles.label,
                { color: theme.foreground, marginTop: 12 },
              ]}
            >
              FBO Name <Text style={{ color: theme.mutedForeground }}>(optional)</Text>
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

            {error && <Text style={modalStyles.errorText}>{error}</Text>}

            <View style={modalStyles.actions}>
              <Pressable
                onPress={onClose}
                style={[modalStyles.cancelBtn, { borderColor: theme.mutedForeground }]}
              >
                <Text style={[modalStyles.cancelText, { color: theme.mutedForeground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[modalStyles.saveBtn, saving && { opacity: 0.6 }]}
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
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  freshnessIndicator: {
    width: 4,
    height: 28,
    borderRadius: 2,
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
    marginLeft: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  freshnessBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freshnessText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  interactionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginLeft: 12,
  },
  interactionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  interactionButtonActive: {
    borderColor: "transparent",
    backgroundColor: "rgba(16,185,129,0.1)",
  },
  interactionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
  },
  expandText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  additionalReport: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
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
