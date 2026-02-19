import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, Pencil } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

interface RouteResultsHeaderProps {
  onBack: () => void;
  onEdit: () => void;
}

export function RouteResultsHeader({
  onBack,
  onEdit,
}: RouteResultsHeaderProps) {
  const { theme, isDark } = useTheme();

  const textColor = isDark ? "#ffffff" : colors.stratus[800];
  const mutedColor = isDark ? theme.mutedForeground : colors.stratus[600];

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onBack();
        }}
        style={styles.backButton}
        hitSlop={12}
      >
        <ChevronLeft size={20} color={textColor} strokeWidth={2} />
        <Text style={[styles.backText, { color: textColor }]}>Flight</Text>
      </Pressable>

      <Text style={[styles.title, { color: textColor }]}>Route & NavLog</Text>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onEdit();
        }}
        style={styles.editButton}
        hitSlop={12}
      >
        <Pencil size={14} color={mutedColor} strokeWidth={2} />
        <Text style={[styles.editText, { color: mutedColor }]}>Edit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  title: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
