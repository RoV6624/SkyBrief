import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
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

  const aircraftGroups = useMemo(() => {
    const groups: { label: string; items: { ac: (typeof AIRCRAFT_DATABASE)[0]; shortName: string }[] }[] = [];
    const groupMap: Record<string, (typeof groups)[0]> = {};
    for (const ac of AIRCRAFT_DATABASE) {
      let label: string;
      let shortName: string;
      if (ac.name.startsWith("Cessna ")) { label = "CESSNA"; shortName = ac.name.replace("Cessna ", ""); }
      else if (ac.name.startsWith("Piper ")) { label = "PIPER"; shortName = ac.name.replace("Piper ", ""); }
      else { label = "OTHER"; shortName = ac.name.replace(/^(Diamond|Cirrus|Beechcraft) /, ""); }
      if (!groupMap[label]) { groupMap[label] = { label, items: [] }; groups.push(groupMap[label]); }
      groupMap[label].items.push({ ac, shortName });
    }
    return groups;
  }, []);

  const effectiveEmptyWeight = customEmptyWeight ?? aircraft.emptyWeight;
  const effectiveEmptyArm = customEmptyArm ?? aircraft.emptyArm;
  const effectiveEmptyMoment = effectiveEmptyWeight * effectiveEmptyArm;

  // Theme-dependent dynamic colors
  const dc = {
    fg: isDark ? theme.foreground : colors.stratus[800],
    fgStrong: isDark ? theme.foreground : colors.stratus[900],
    fgDim: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
    fgMuted: isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500],
    fgSubtle: isDark ? "rgba(255,255,255,0.8)" : colors.stratus[700],
    header: isDark ? theme.foreground : colors.stratus[700],
    placeholder: isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)",
    chipText: isDark ? "rgba(255,255,255,0.7)" : colors.stratus[600],
    chipActiveText: isDark ? theme.foreground : colors.stratus[800],
  };

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
        <Text style={[styles.headerText, { color: dc.header }]}>Weight & Balance</Text>
      </View>

      {/* Aircraft Selector */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: dc.fgDim }]}>Aircraft</Text>
        {aircraftGroups.map((group) => (
          <View key={group.label} style={styles.acGroup}>
            <Text style={[styles.acGroupLabel, { color: dc.fgMuted }]}>{group.label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.acScrollContent}
            >
              {group.items.map(({ ac, shortName }) => (
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
                  accessibilityLabel={`Select ${ac.name}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.acChipText,
                      { color: dc.chipText },
                      aircraft.id === ac.id && [styles.acChipTextActive, { color: dc.chipActiveText }],
                    ]}
                  >
                    {shortName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
        {customAircraft.length > 0 && (
          <View style={styles.acGroup}>
            <Text style={[styles.acGroupLabel, { color: dc.fgMuted }]}>CUSTOM</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.acScrollContent}
            >
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
                    accessibilityLabel={`Select custom aircraft ${ac.name}`}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.acChipText,
                        { color: dc.chipText },
                        aircraft.id === ac.id && [styles.acChipTextActive, { color: dc.chipActiveText }],
                      ]}
                    >
                      {ac.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCustomModal(true);
          }}
          style={styles.acAddBtn}
          accessibilityLabel="Add custom aircraft"
          accessibilityRole="button"
        >
          <Plus size={14} color={colors.stratus[500]} />
        </Pressable>
      </View>

      {/* Saved Aircraft Profiles */}
      {savedProfiles.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={[styles.savedLabel, { color: dc.fgDim }]}>Saved Aircraft</Text>
          {savedProfiles.map((profile, idx) => (
            <View key={idx} style={styles.savedRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  loadSavedProfile(idx);
                }}
                style={styles.savedChip}
              >
                <Text style={[styles.savedChipText, { color: dc.fgSubtle }]}>
                  {profile.customName} ({profile.emptyWeight} lbs)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  deleteSavedProfile(idx);
                }}
                hitSlop={8}
                accessibilityLabel={`Delete ${profile.customName}`}
                accessibilityRole="button"
              >
                <Trash2 size={12} color={colors.alert.red} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 1.5, color: dc.fgMuted }]}>Item</Text>
        <Text style={[styles.th, { flex: 1, color: dc.fgMuted }]}>Weight</Text>
        <Text style={[styles.th, { flex: 0.7, color: dc.fgMuted }]}>Arm</Text>
        <Text style={[styles.th, { flex: 1.2, color: dc.fgMuted }]}>Moment</Text>
      </View>

      {/* Empty Aircraft — editable weight + arm */}
      <View style={styles.tableRow}>
        <Text style={[styles.td, { flex: 1.5, color: dc.fgSubtle }]}>Empty</Text>
        <View style={{ flex: 1 }}>
          <TextInput
            value={String(effectiveEmptyWeight)}
            onChangeText={(t) => {
              const val = Number(t) || 0;
              setCustomEmptyWeight(val > 0 ? val : null);
            }}
            keyboardType="decimal-pad"
            placeholder={String(aircraft.emptyWeight)}
            placeholderTextColor={dc.placeholder}
            style={[styles.input, { color: dc.fg }]}
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
            placeholderTextColor={dc.placeholder}
            style={[styles.input, styles.inputSmall, { color: dc.fg }]}
          />
        </View>
        <Text style={[styles.tdDim, { flex: 1.2, color: dc.fgMuted }]}>
          {Math.round(effectiveEmptyMoment).toLocaleString()}
        </Text>
      </View>

      {/* Stations */}
      {aircraft.stations.map((station, idx) => (
        <View key={station.name} style={styles.tableRow}>
          <Text style={[styles.td, { flex: 1.5, color: dc.fgSubtle }]}>{station.name}</Text>
          <View style={{ flex: 1 }}>
            <TextInput
              value={stationWeights[idx] ? String(stationWeights[idx]) : ""}
              onChangeText={(t) => setStationWeight(idx, Number(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={dc.placeholder}
              style={[styles.input, { color: dc.fg }]}
            />
          </View>
          <Text style={[styles.tdDim, { flex: 0.7, color: dc.fgMuted }]}>{station.arm}</Text>
          <Text style={[styles.tdDim, { flex: 1.2, color: dc.fgMuted }]}>
            {((stationWeights[idx] || 0) * station.arm).toLocaleString()}
          </Text>
        </View>
      ))}

      {/* Fuel */}
      <View style={styles.tableRow}>
        <View style={[styles.fuelLabel, { flex: 1.5 }]}>
          <Fuel size={12} color={colors.stratus[500]} />
          <Text style={[styles.td, { color: dc.fgSubtle }]}>Fuel</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFuelUnit();
            }}
            style={styles.unitToggle}
            accessibilityLabel={`Switch fuel unit to ${fuelUnit === "gal" ? "pounds" : "gallons"}`}
            accessibilityRole="button"
          >
            <ArrowRightLeft size={10} color={colors.stratus[500]} />
            <Text style={[styles.unitText, { color: dc.fgDim }]}>{fuelUnit.toUpperCase()}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            value={fuelGallons ? String(fuelGallons) : ""}
            onChangeText={(t) => setFuelGallons(Number(t) || 0)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={dc.placeholder}
            style={[styles.input, { color: dc.fg }]}
          />
        </View>
        <Text style={[styles.tdDim, { flex: 0.7, color: dc.fgMuted }]}>{aircraft.fuelArm}</Text>
        <Text style={[styles.tdDim, { flex: 1.2, color: dc.fgMuted }]}>
          {(
            (fuelUnit === "gal"
              ? fuelGallons * aircraft.fuelWeightPerGal
              : fuelGallons) * aircraft.fuelArm
          ).toLocaleString()}
        </Text>
      </View>

      {/* Totals */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { flex: 1.5, color: dc.fgStrong }]}>Total</Text>
        <Text style={[styles.totalValue, { flex: 1, color: dc.fgStrong }]}>
          {Math.round(result.totalWeight)}
        </Text>
        <Text style={[styles.totalValueDim, { flex: 0.7, color: dc.fgSubtle }]}>
          {result.cg.toFixed(1)}
        </Text>
        <Text style={[styles.totalValueDim, { flex: 1.2, color: dc.fgSubtle }]}>
          {Math.round(result.totalMoment).toLocaleString()}
        </Text>
      </View>

      {/* ZFW */}
      <View style={styles.zfwRow}>
        <Text style={[styles.zfwLabel, { flex: 1.5, color: dc.fgMuted }]}>ZFW</Text>
        <Text style={[styles.zfwValue, { flex: 1, color: dc.fgMuted }]}>
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
            accessibilityLabel="Save aircraft profile"
            accessibilityRole="button"
          >
            <Save size={12} color={colors.stratus[500]} />
            <Text style={[styles.saveBtnText, { color: dc.fgDim }]}>Save Aircraft</Text>
          </Pressable>
        ) : (
          <View style={styles.saveInputRow}>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder="e.g. N12345"
              placeholderTextColor={dc.placeholder}
              autoCapitalize="characters"
              style={[styles.input, { flex: 1, color: dc.fg }]}
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
          accessibilityLabel={showLanding ? "Hide landing CG" : "Show landing CG"}
          accessibilityRole="checkbox"
        >
          <View
            style={[
              styles.checkboxInner,
              showLanding && styles.checkboxChecked,
            ]}
          />
          <Text style={[styles.checkboxLabel, { color: dc.fgDim }]}>Show Landing CG</Text>
        </Pressable>
        {showLanding && (
          <View style={styles.burnInput}>
            <Text style={[styles.burnLabel, { color: dc.fgMuted }]}>Burn (gal):</Text>
            <TextInput
              value={estimatedFuelBurn ? String(estimatedFuelBurn) : ""}
              onChangeText={(t) => setEstimatedFuelBurn(Number(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={dc.placeholder}
              style={[styles.input, { width: 50, color: dc.fg }]}
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  headerText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  field: { marginBottom: 12 },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  acGroup: { marginBottom: 8 },
  acGroupLabel: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  acScrollContent: { flexDirection: "row", gap: 8, paddingRight: 16 },
  acChip: {
    backgroundColor: "rgba(12,140,233,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.1)",
    minHeight: 44,
    justifyContent: "center",
  },
  acChipActive: {
    backgroundColor: "rgba(12,140,233,0.12)",
    borderColor: colors.stratus[500],
  },
  acChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  acChipTextActive: {
    fontFamily: "Inter_700Bold",
  },
  acChipCustom: {
    borderColor: "rgba(34,197,94,0.25)",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  acAddBtn: {
    width: 44,
    height: 44,
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
    minHeight: 44,
    justifyContent: "center",
  },
  savedChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(12,140,233,0.12)",
    paddingBottom: 6,
    marginBottom: 4,
  },
  th: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
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
  },
  tdDim: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
    textAlign: "right",
  },
  input: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "right",
  },
  inputSmall: {
    fontSize: 10,
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
    minHeight: 44,
  },
  unitText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
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
  },
  totalValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_700Bold",
    textAlign: "right",
  },
  totalValueDim: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
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
  },
  zfwValue: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
    minHeight: 44,
  },
  saveBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
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
    minHeight: 44,
    justifyContent: "center",
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
    minHeight: 44,
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
  },
  burnInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  burnLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  tdMono: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_600SemiBold",
    textAlign: "right",
  },
});
