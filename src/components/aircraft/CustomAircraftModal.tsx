import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import type { CustomAircraftProfile } from "@/lib/wb/aircraft-types";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface CustomAircraftModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (profile: CustomAircraftProfile) => void;
  editProfile?: CustomAircraftProfile | null;
}

interface FieldState {
  nickname: string;
  emptyWeight: string;
  emptyArm: string;
  maxGrossWeight: string;
  cruiseTAS: string;
  fuelBurnGPH: string;
}

const INITIAL: FieldState = {
  nickname: "",
  emptyWeight: "",
  emptyArm: "",
  maxGrossWeight: "",
  cruiseTAS: "",
  fuelBurnGPH: "",
};

const FIELDS: Array<{
  key: keyof FieldState;
  label: string;
  placeholder: string;
  numeric: boolean;
}> = [
  { key: "nickname",      label: "Nickname / N-Number",    placeholder: "e.g. N12345",  numeric: false },
  { key: "emptyWeight",   label: "Empty Weight (lbs)",     placeholder: "e.g. 1680",    numeric: true  },
  { key: "emptyArm",      label: "Empty Arm (in)",         placeholder: "e.g. 40.5",    numeric: true  },
  { key: "maxGrossWeight",label: "Max Gross Weight (lbs)", placeholder: "e.g. 2550",    numeric: true  },
  { key: "cruiseTAS",     label: "Cruise TAS (kts)",       placeholder: "e.g. 122",     numeric: true  },
  { key: "fuelBurnGPH",   label: "Fuel Burn (GPH)",        placeholder: "e.g. 8.4",     numeric: true  },
];

export function CustomAircraftModal({
  visible,
  onClose,
  onSave,
  editProfile,
}: CustomAircraftModalProps) {
  const { isDark } = useTheme();
  const [fields, setFields] = useState<FieldState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FieldState, string>>>({});

  // Pre-fill fields when opening in edit mode; reset when closing
  useEffect(() => {
    if (visible && editProfile) {
      setFields({
        nickname: editProfile.nickname,
        emptyWeight: String(editProfile.emptyWeight),
        emptyArm: String(editProfile.emptyArm),
        maxGrossWeight: String(editProfile.maxGrossWeight),
        cruiseTAS: String(editProfile.cruiseTAS),
        fuelBurnGPH: String(editProfile.fuelBurnGPH),
      });
    } else if (!visible) {
      setFields(INITIAL);
      setErrors({});
    }
  }, [visible, editProfile]);

  const update = (key: keyof FieldState, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FieldState, string>> = {};
    if (!fields.nickname.trim()) {
      newErrors.nickname = "Required";
    }
    const numericKeys: Array<keyof FieldState> = [
      "emptyWeight", "emptyArm", "maxGrossWeight", "cruiseTAS", "fuelBurnGPH",
    ];
    for (const key of numericKeys) {
      const val = parseFloat(fields[key]);
      if (isNaN(val) || val <= 0) {
        newErrors[key] = "Must be a positive number";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const profile: CustomAircraftProfile = {
      id: editProfile?.id ?? `custom-${Date.now()}`,
      nickname: fields.nickname.trim(),
      emptyWeight:    parseFloat(fields.emptyWeight),
      emptyArm:       parseFloat(fields.emptyArm),
      maxGrossWeight: parseFloat(fields.maxGrossWeight),
      cruiseTAS:      parseFloat(fields.cruiseTAS),
      fuelBurnGPH:    parseFloat(fields.fuelBurnGPH),
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(profile);
    setFields(INITIAL);
    setErrors({});
  };

  const handleClose = () => {
    setFields(INITIAL);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {editProfile ? "Edit Aircraft" : "Add Custom Aircraft"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
              <X size={20} color={colors.stratus[600]} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {FIELDS.map(({ key, label, placeholder, numeric }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  value={fields[key]}
                  onChangeText={(t) => update(key, t)}
                  placeholder={placeholder}
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(8,63,110,0.3)"}
                  keyboardType={numeric ? "decimal-pad" : "default"}
                  autoCapitalize={numeric ? "none" : "characters"}
                  style={[styles.input, !!errors[key] && styles.inputError]}
                />
                {errors[key] ? (
                  <Text style={styles.errorText}>{errors[key]}</Text>
                ) : null}
              </View>
            ))}

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                CG envelope is not included for custom aircraft. The W&B chart shows a simplified range only. Always verify with your aircraft's POH before flight.
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={handleClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.saveText}>
                  {editProfile ? "Save Changes" : "Add Aircraft"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.bottomPad} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#f8faff",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(12,140,233,0.12)",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.stratus[800],
  },
  closeBtn: { padding: 4 },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldGroup: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[600],
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: colors.stratus[800],
    backgroundColor: "rgba(12,140,233,0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: colors.ifr,
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  errorText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: colors.ifr,
    marginTop: 4,
  },
  disclaimer: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    padding: 12,
    marginBottom: 20,
    marginTop: 6,
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#92400e",
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "rgba(12,140,233,0.06)",
    borderWidth: 1,
    borderColor: "rgba(12,140,233,0.1)",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.stratus[600],
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.stratus[500],
    alignItems: "center",
  },
  saveText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  bottomPad: { height: 40 },
});
