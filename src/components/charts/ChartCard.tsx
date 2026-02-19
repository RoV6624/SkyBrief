import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { ExternalLink, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CloudCard } from '@/components/ui/CloudCard';
import type { ChartData } from '@/lib/charts/types';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/tokens';

interface ChartCardProps {
  chart: ChartData;
}

export function ChartCard({ chart }: ChartCardProps) {
  const { theme, isDark } = useTheme();

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Open chart URL in browser
    const canOpen = await Linking.canOpenURL(chart.imageUrl);
    if (canOpen) {
      await Linking.openURL(chart.imageUrl);
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <CloudCard>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            {chart.metadata.title}
          </Text>
          <ExternalLink
            size={14}
            color={isDark ? theme.mutedForeground : colors.stratus[400]}
          />
        </View>

        <Text style={[styles.description, { color: theme.mutedForeground }]}>
          {chart.metadata.description}
        </Text>

        {chart.metadata.altitude && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{chart.metadata.altitude}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Clock size={10} color={isDark ? theme.mutedForeground : colors.stratus[400]} />
          <Text style={[styles.updateText, { color: theme.mutedForeground }]}>
            Updates every {chart.metadata.updateIntervalMinutes / 60}h
          </Text>
        </View>
      </CloudCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    flex: 1,
  },
  description: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
    lineHeight: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(12,140,233,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_600SemiBold',
    color: colors.stratus[500],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});
