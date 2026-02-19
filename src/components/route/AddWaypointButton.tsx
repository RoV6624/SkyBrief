import { Text, Pressable, StyleSheet } from "react-native";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

interface AddWaypointButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function AddWaypointButton({ onPress, disabled }: AddWaypointButtonProps) {
  const { isDark } = useTheme();

  const borderColor = isDark
    ? "rgba(255,255,255,0.12)"
    : "rgba(12,140,233,0.2)";
  const textColor = isDark ? "rgba(255,255,255,0.5)" : colors.stratus[500];

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { borderColor, opacity: pressed ? 0.7 : disabled ? 0.4 : 1 },
      ]}
    >
      <Plus size={16} color={textColor} strokeWidth={2} />
      <Text style={[styles.text, { color: textColor }]}>Add Waypoint</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
  },
  text: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
