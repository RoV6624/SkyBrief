import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Map } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

import { useUserStore } from '@/stores/user-store';
import { getAirportData } from '@/services/airport-data';
import { useWeatherCharts } from '@/hooks/useWeatherCharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { CloudCard } from '@/components/ui/CloudCard';
import { DynamicSkyBackground } from '@/components/background/DynamicSkyBackground';
import { useSceneStore } from '@/stores/scene-store';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/tokens';

export default function ChartsScreen() {
  const { theme, isDark } = useTheme();
  const { scene } = useSceneStore();
  const queryClient = useQueryClient();
  const { homeAirport } = useUserStore();

  const [airportCoords, setAirportCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load home airport coordinates
  useEffect(() => {
    async function loadCoords() {
      if (!homeAirport) {
        setAirportCoords(null);
        return;
      }

      const airport = await getAirportData(homeAirport);
      if (airport) {
        setAirportCoords({
          lat: airport.latitude_deg,
          lon: airport.longitude_deg,
        });
      }
    }

    loadCoords();
  }, [homeAirport]);

  // Fetch charts
  const {
    data: charts = [],
    isLoading,
    refetch,
  } = useWeatherCharts(
    airportCoords?.lat ?? null,
    airportCoords?.lon ?? null
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['weather-charts'] });
    await refetch();
    setRefreshing(false);
  }, [queryClient, refetch]);

  return (
    <View style={styles.container}>
      <DynamicSkyBackground scene={scene} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
            <View style={styles.titleRow}>
              <Map size={24} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.title}>Weather Charts</Text>
            </View>
            <Text style={styles.subtitle}>
              {homeAirport ? `Regional charts for ${homeAirport}` : 'Set home airport in Settings'}
            </Text>
          </Animated.View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.grid}>
              {[1, 2, 3, 4].map((i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(i * 50)}
                  style={styles.gridItem}
                >
                  <CloudCard>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonText} />
                    <View style={styles.skeletonText} />
                  </CloudCard>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Chart Grid */}
          {!isLoading && charts.length > 0 && (
            <View style={styles.grid}>
              {charts.map((chart, index) => (
                <Animated.View
                  key={chart.id}
                  entering={FadeInDown.delay(index * 50)}
                  style={styles.gridItem}
                >
                  <ChartCard chart={chart} />
                </Animated.View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {!isLoading && !homeAirport && (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <CloudCard>
                <View style={styles.emptyContent}>
                  <Map size={48} color={isDark ? theme.mutedForeground : colors.stratus[300]} />
                  <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
                    No Home Airport Set
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
                    Set your home airport in Settings to view regional weather charts
                  </Text>
                </View>
              </CloudCard>
            </Animated.View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, zIndex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, maxWidth: 500, width: "100%", alignSelf: "center" },
  header: {
    paddingTop: 12,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%', // 2-column layout with gap
  },
  emptyState: {
    paddingTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  // Loading skeleton styles
  skeletonTitle: {
    height: 16,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonText: {
    height: 12,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    marginBottom: 4,
  },
});
