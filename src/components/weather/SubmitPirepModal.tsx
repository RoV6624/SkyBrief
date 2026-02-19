import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  X,
  Send,
  CloudRain,
  Wind,
  Thermometer,
  AlertTriangle,
  Snowflake,
} from "lucide-react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";
import { useAuthStore } from "@/stores/auth-store";
import {
  submitPirep,
  formatPirepText,
  TURBULENCE_OPTIONS,
  ICING_OPTIONS,
  type PirepSubmission,
  type TurbulenceIntensity,
  type IcingIntensity,
} from "@/services/pirep-submit";

interface SubmitPirepModalProps {
  visible: boolean;
  onClose: () => void;
  station: string;
}

export function SubmitPirepModal({ visible, onClose, station }: SubmitPirepModalProps) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();

  const [altitude, setAltitude] = useState("");
  const [aircraftType, setAircraftType] = useState("");
  const [turbulence, setTurbulence] = useState<TurbulenceIntensity>("NEG");
  const [icing, setIcing] = useState<IcingIntensity>("NEG");
  const [temperature, setTemperature] = useState("");
  const [flightVis, setFlightVis] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const bgColor = isDark ? colors.stratus[900] : "#FFFFFF";
  const cardBg = isDark ? colors.stratus[800] : colors.stratus[50];
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[100];
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  const handleSubmit = useCallback(async () => {
    if (!altitude || !aircraftType) {
      Alert.alert("Missing Info", "Please enter altitude and aircraft type.");
      return;
    }

    const pirep: PirepSubmission = {
      nearestStation: station,
      altitude: parseInt(altitude, 10),
      aircraftType: aircraftType.toUpperCase(),
      turbulence: turbulence !== "NEG" ? turbulence : undefined,
      icing: icing !== "NEG" ? icing : undefined,
      temperature: temperature ? parseInt(temperature, 10) : undefined,
      flightVisibility: flightVis ? parseFloat(flightVis) : undefined,
      remarks: remarks || undefined,
    };

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const id = await submitPirep(pirep, user?.uid ?? "anonymous");

    setSubmitting(false);

    if (id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "PIREP Submitted",
        `Your pilot report near ${station} has been submitted.\n\n${formatPirepText(pirep)}`,
        [{ text: "OK", onPress: onClose }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Submission Failed", "Could not submit PIREP. Please try again.");
    }
  }, [altitude, aircraftType, turbulence, icing, temperature, flightVis, remarks, station, user, onClose]);

  const OptionRow = ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: Array<{ value: string; label: string }>;
    selected: string;
    onSelect: (v: any) => void;
  }) => (
    <View style={styles.optionRow}>
      <Text style={[styles.fieldLabel, { color: subColor }]}>{label}</Text>
      <View style={styles.optionChips}>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(opt.value);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.accent : inputBg,
                  borderColor: isActive ? colors.accent : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? "#FFFFFF" : textColor },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={24} color={textColor} />
          </Pressable>
          <Text style={[styles.title, { color: textColor }]}>Submit PIREP</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitBtn, { opacity: submitting ? 0.5 : 1 }]}
          >
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>
              {submitting ? "Sending..." : "Submit"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Station */}
          <View style={[styles.stationBadge, { backgroundColor: cardBg }]}>
            <Text style={[styles.stationLabel, { color: subColor }]}>Near</Text>
            <Text style={[styles.stationCode, { color: textColor }]}>{station}</Text>
          </View>

          {/* Required Fields */}
          <Text style={[styles.sectionTitle, { color: subColor }]}>REQUIRED</Text>

          <View style={[styles.fieldRow, { backgroundColor: cardBg, borderColor }]}>
            <CloudRain size={16} color={subColor} />
            <Text style={[styles.fieldLabel, { color: subColor }]}>Altitude (MSL)</Text>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
              value={altitude}
              onChangeText={setAltitude}
              placeholder="e.g. 5500"
              placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.fieldRow, { backgroundColor: cardBg, borderColor }]}>
            <Wind size={16} color={subColor} />
            <Text style={[styles.fieldLabel, { color: subColor }]}>Aircraft Type</Text>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
              value={aircraftType}
              onChangeText={setAircraftType}
              placeholder="e.g. C172"
              placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
              autoCapitalize="characters"
            />
          </View>

          {/* Turbulence */}
          <Text style={[styles.sectionTitle, { color: subColor }]}>CONDITIONS</Text>

          <OptionRow
            label="Turbulence"
            options={TURBULENCE_OPTIONS.slice(0, 5).map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            selected={turbulence}
            onSelect={setTurbulence}
          />

          <OptionRow
            label="Icing"
            options={ICING_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            selected={icing}
            onSelect={setIcing}
          />

          {/* Optional Fields */}
          <Text style={[styles.sectionTitle, { color: subColor }]}>OPTIONAL</Text>

          <View style={[styles.fieldRow, { backgroundColor: cardBg, borderColor }]}>
            <Thermometer size={16} color={subColor} />
            <Text style={[styles.fieldLabel, { color: subColor }]}>Temp (°C)</Text>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="e.g. -5"
              placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={[styles.fieldRow, { backgroundColor: cardBg, borderColor }]}>
            <AlertTriangle size={16} color={subColor} />
            <Text style={[styles.fieldLabel, { color: subColor }]}>Visibility (SM)</Text>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
              value={flightVis}
              onChangeText={setFlightVis}
              placeholder="e.g. 5"
              placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Remarks */}
          <View style={[styles.remarksBox, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.fieldLabel, { color: subColor }]}>Remarks</Text>
            <TextInput
              style={[styles.remarksInput, { color: textColor, backgroundColor: inputBg }]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Additional details..."
              placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontFamily: "SpaceGrotesk_700Bold" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFFFFF",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, maxWidth: 500, alignSelf: "center" as const, width: "100%" },
  stationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  stationLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stationCode: { fontSize: 20, fontFamily: "JetBrainsMono_700Bold" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_600SemiBold",
    letterSpacing: 1,
    marginTop: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  input: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_500Medium",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 100,
    textAlign: "right",
  },
  optionRow: { gap: 8 },
  optionChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold" },
  remarksBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  remarksInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 10,
    borderRadius: 8,
    minHeight: 70,
    textAlignVertical: "top",
  },
});
