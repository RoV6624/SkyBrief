import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Scale, Fuel, ArrowRightLeft, Save, Trash2, Plus } from "lucide-react-native";
import { useWBStore } from "@/stores/wb-store";
import { useUserStore } from "@/stores/user-store";
import { AIRCRAFT_DATABASE, customProfileToAircraftType } from "@/lib/wb/aircraft-types";
import type { CustomAircraftProfile } from "@/lib/wb/aircraft-types";
import { CustomAircraftModal } from "@/components/aircraft/CustomAircraftModal";
import type { WBResult } from "@/lib/wb/calculations";
import { CloudCard } from "@/components/ui/CloudCard";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface WeightBalanceFormProps {
  result: WBResult;
}

export function WeightBalanceForm({ result }: WeightBalanceFormProps) {
  const { isDark, theme } = useTheme();
  const {
    aircraft,
    setAircraft,
    stationWeights,
    setStationWeight,
    fuelGallons,
    setFuelGallons,
    fuelUnit,
    toggleFuelUnit,
    estimatedFuelBurn,
    setEstimatedFuelBurn,
    showLanding,
    setShowLanding,
    customEmptyWeight,
    customEmptyArm,
    setCustomEmptyWeight,
    setCustomEmptyArm,
    savedProfiles,
    saveCurrentAircraft,
    loadSavedProfile,
    deleteSavedProfile,
  } = useWBStore();

  const { customAircraft, addCustomAircraft } = useUserStore();
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const effectiveEmptyWeight = customEmptyWeight ?? aircraft.emptyWeight;
  const effectiveEmptyArm = customEmptyArm ?? aircraft.emptyArm;
  const effectiveEmptyMoment = effectiveEmptyWeight * effectiveEmptyArm;

  // Dynamic styles based on theme
  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 14,
    },
    headerText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[700],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    field: { marginBottom: 12 },
    label: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
      marginBottom: 6,
    },
    acRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    acChip: {
      backgroundColor: "rgba(12,140,233,0.06)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "rgba(12,140,233,0.1)",
    },
    acChipActive: {
      backgroundColor: "rgba(12,140,233,0.12)",
      borderColor: colors.stratus[500],
    },
    acChipText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
    },
    acChipTextActive: {
      color: isDark ? theme.foreground : colors.stratus[800],
      fontFamily: "Inter_700Bold",
    },
    acChipCustom: {
      borderColor: "rgba(34,197,94,0.25)",
      backgroundColor: "rgba(34,197,94,0.06)",
    },
    acAddBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(12,140,233,0.15)",
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(12,140,233,0.04)",
    },
    savedSection: {
      marginBottom: 12,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(12,140,233,0.1)",
    },
    savedLabel: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
      marginBottom: 6,
    },
    savedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    savedChip: {
      flex: 1,
      backgroundColor: "rgba(34,197,94,0.08)",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.2)",
    },
    savedChipText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: isDark ? "rgba(255,255,255,0.8)" : colors.stratus[700],
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(12,140,233,0.12)",
      paddingBottom: 6,
      marginBottom: 4,
    },
    th: {
      fontSize: 9,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.6)" : colors.stratus[600],
      textTransform: "uppercase",
      textAlign: "right",
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(12,140,233,0.06)",
    },
    td: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: isDark ? "rgba(255,255,255,0.8)" : colors.stratus[700],
    },
    tdMono: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[800],
      textAlign: "right",
    },
    tdDim: {
      fontSize: 11,
      fontFamily: "JetBrainsMono_400Regular",
      color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
      textAlign: "right",
    },
    input: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[800],
      backgroundColor: "rgba(12,140,233,0.04)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(12,140,233,0.08)",
      paddingHorizontal: 8,
      paddingVertical: 6,
      textAlign: "right",
    },
    fuelLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    unitToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "rgba(12,140,233,0.08)",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 4,
    },
    unitText: {
      fontSize: 9,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderTopWidth: 2,
      borderTopColor: "rgba(12,140,233,0.2)",
      marginTop: 6,
    },
    totalLabel: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: isDark ? theme.foreground : colors.stratus[900],
    },
    totalValue: {
      fontSize: 13,
      fontFamily: "JetBrainsMono_700Bold",
      color: isDark ? theme.foreground : colors.stratus[900],
      textAlign: "right",
    },
    totalValueDim: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.8)" : colors.stratus[700],
      textAlign: "right",
    },
    zfwRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
    },
    zfwLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
    },
    zfwValue: {
      fontSize: 11,
      fontFamily: "JetBrainsMono_400Regular",
      color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
      textAlign: "right",
    },
    saveSection: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(12,140,233,0.1)",
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: "rgba(12,140,233,0.06)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "rgba(12,140,233,0.12)",
    },
    saveBtnText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
    },
    saveInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    saveConfirmBtn: {
      backgroundColor: colors.stratus[500],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    saveConfirmText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: "#ffffff",
    },
    cancelText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.stratus[400],
    },
    landingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(12,140,233,0.12)",
    },
    checkbox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    checkboxInner: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.stratus[300],
    },
    checkboxChecked: {
      backgroundColor: colors.stratus[500],
      borderColor: colors.stratus[500],
    },
    checkboxLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
    },
    burnInput: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    burnLabel: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      color: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
    },
  });

  const handleSave = () => {
    if (saveName.trim().length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveCurrentAircraft(saveName.trim());
    setSaveName("");
    setShowSaveInput(false);
  };

  return (
    <CloudCard>
      <View style={styles.header}>
        <Scale size={14} color={colors.stratus[500]} />
        <Text style={styles.headerText}>Weight & Balance</Text>
      </View>

      {/* Aircraft Selector */}
      <View style={styles.field}>
        <Text style={styles.label}>Aircraft</Text>
        <View style={styles.acRow}>
          {AIRCRAFT_DATABASE.map((ac) => (
            <Pressable
              key={ac.id}
              onPress={() => {
                Haptics.selectionAsync();
                setAircraft(ac);
              }}
              style={[
                styles.acChip,
                aircraft.id === ac.id && styles.acChipActive,
              ]}
            >
              <Text
                style={[
                  styles.acChipText,
                  aircraft.id === ac.id && styles.acChipTextActive,
                ]}
              >
                {ac.name}
              </Text>
            </Pressable>
          ))}
          {customAircraft.map((cp) => {
            const ac = customProfileToAircraftType(cp);
            return (
              <Pressable
                key={ac.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAircraft(ac);
                }}
                style={[
                  styles.acChip,
                  styles.acChipCustom,
                  aircraft.id === ac.id && styles.acChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.acChipText,
                    aircraft.id === ac.id && styles.acChipTextActive,
                  ]}
                >
                  {ac.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCustomModal(true);
            }}
            style={styles.acAddBtn}
          >
            <Plus size={14} color={colors.stratus[500]} />
          </Pressable>
        </View>
      </View>

      {/* Saved Aircraft Profiles */}
      {savedProfiles.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.savedLabel}>Saved Aircraft</Text>
          {savedProfiles.map((profile, idx) => (
            <View key={idx} style={styles.savedRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  loadSavedProfile(idx);
                }}
                style={styles.savedChip}
              >
                <Text style={styles.savedChipText}>
                  {profile.customName} ({profile.emptyWeight} lbs)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  deleteSavedProfile(idx);
                }}
                hitSlop={8}
              >
                <Trash2 size={12} color={colors.alert.red} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 1.5 }]}>Item</Text>
        <Text style={[styles.th, { flex: 1 }]}>Weight</Text>
        <Text style={[styles.th, { flex: 0.7 }]}>Arm</Text>
        <Text style={[styles.th, { flex: 1.2 }]}>Moment</Text>
      </View>

      {/* Empty Aircraft — editable weight + arm */}
      <View style={styles.tableRow}>
        <Text style={[styles.td, { flex: 1.5 }]}>Empty</Text>
        <View style={{ flex: 1 }}>
          <TextInput
            value={String(effectiveEmptyWeight)}
            onChangeText={(t) => {
              const val = Number(t) || 0;
              setCustomEmptyWeight(val > 0 ? val : null);
            }}
            keyboardType="decimal-pad"
            placeholder={String(aircraft.emptyWeight)}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 0.7 }}>
          <TextInput
            value={String(effectiveEmptyArm)}
            onChangeText={(t) => {
              const val = Number(t) || 0;
              setCustomEmptyArm(val > 0 ? val : null);
            }}
            keyboardType="decimal-pad"
            placeholder={String(aircraft.emptyArm)}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
            style={[styles.input, { fontSize: 10 }]}
          />
        </View>
        <Text style={[styles.tdDim, { flex: 1.2 }]}>
          {Math.round(effectiveEmptyMoment).toLocaleString()}
        </Text>
      </View>

      {/* Stations */}
      {aircraft.stations.map((station, idx) => (
        <View key={station.name} style={styles.tableRow}>
          <Text style={[styles.td, { flex: 1.5 }]}>{station.name}</Text>
          <View style={{ flex: 1 }}>
            <TextInput
              value={stationWeights[idx] ? String(stationWeights[idx]) : ""}
              onChangeText={(t) => setStationWeight(idx, Number(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
              style={styles.input}
            />
          </View>
          <Text style={[styles.tdDim, { flex: 0.7 }]}>{station.arm}</Text>
          <Text style={[styles.tdDim, { flex: 1.2 }]}>
            {((stationWeights[idx] || 0) * station.arm).toLocaleString()}
          </Text>
        </View>
      ))}

      {/* Fuel */}
      <View style={styles.tableRow}>
        <View style={[styles.fuelLabel, { flex: 1.5 }]}>
          <Fuel size={12} color={colors.stratus[500]} />
          <Text style={styles.td}>Fuel</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFuelUnit();
            }}
            style={styles.unitToggle}
          >
            <ArrowRightLeft size={10} color={colors.stratus[500]} />
            <Text style={styles.unitText}>{fuelUnit.toUpperCase()}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            value={fuelGallons ? String(fuelGallons) : ""}
            onChangeText={(t) => setFuelGallons(Number(t) || 0)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
            style={styles.input}
          />
        </View>
        <Text style={[styles.tdDim, { flex: 0.7 }]}>{aircraft.fuelArm}</Text>
        <Text style={[styles.tdDim, { flex: 1.2 }]}>
          {(
            (fuelUnit === "gal"
              ? fuelGallons * aircraft.fuelWeightPerGal
              : fuelGallons) * aircraft.fuelArm
          ).toLocaleString()}
        </Text>
      </View>

      {/* Totals */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { flex: 1.5 }]}>Total</Text>
        <Text style={[styles.totalValue, { flex: 1 }]}>
          {Math.round(result.totalWeight)}
        </Text>
        <Text style={[styles.totalValueDim, { flex: 0.7 }]}>
          {result.cg.toFixed(1)}
        </Text>
        <Text style={[styles.totalValueDim, { flex: 1.2 }]}>
          {Math.round(result.totalMoment).toLocaleString()}
        </Text>
      </View>

      {/* ZFW */}
      <View style={styles.zfwRow}>
        <Text style={[styles.zfwLabel, { flex: 1.5 }]}>ZFW</Text>
        <Text style={[styles.zfwValue, { flex: 1 }]}>
          {Math.round(result.zfw)}
        </Text>
      </View>

      {/* Save Aircraft Button */}
      <View style={styles.saveSection}>
        {!showSaveInput ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSaveInput(true);
            }}
            style={styles.saveBtn}
          >
            <Save size={12} color={colors.stratus[500]} />
            <Text style={styles.saveBtnText}>Save Aircraft</Text>
          </Pressable>
        ) : (
          <View style={styles.saveInputRow}>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder="e.g. N12345"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
              autoCapitalize="characters"
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable onPress={handleSave} style={styles.saveConfirmBtn}>
              <Text style={styles.saveConfirmText}>Save</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowSaveInput(false)}
              hitSlop={8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Landing CG toggle */}
      <View style={styles.landingRow}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowLanding(!showLanding);
          }}
          style={styles.checkbox}
        >
          <View
            style={[
              styles.checkboxInner,
              showLanding && styles.checkboxChecked,
            ]}
          />
          <Text style={styles.checkboxLabel}>Show Landing CG</Text>
        </Pressable>
        {showLanding && (
          <View style={styles.burnInput}>
            <Text style={styles.burnLabel}>Burn (gal):</Text>
            <TextInput
              value={estimatedFuelBurn ? String(estimatedFuelBurn) : ""}
              onChangeText={(t) => setEstimatedFuelBurn(Number(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
              style={[styles.input, { width: 50 }]}
            />
          </View>
        )}
      </View>
      <CustomAircraftModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSave={(profile: CustomAircraftProfile) => {
          addCustomAircraft(profile);
          setAircraft(customProfileToAircraftType(profile));
          setShowCustomModal(false);
        }}
      />
    </CloudCard>
  );
}
