import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mountain, TrendingUp, TrendingDown, Plane } from 'lucide-react-native';
import { CloudCard } from '@/components/ui/CloudCard';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/tokens';
import {
  SpaceGrotesk_700Bold,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';

interface PerformanceImpactCardProps {
  densityAlt: number;
  severity: 'normal' | 'caution' | 'warning';
  takeoffRoll: {
    standard: number;
    actual: number;
    increase: number;
    increasePercent: number;
  };
  climbRate: {
    standard: number;
    actual: number;
    increase: number;
    increasePercent: number;
  };
  runway: {
    isAdequate: boolean;
    margin: number;
    marginPercent: number;
    label: 'SUFFICIENT' | 'MARGINAL' | 'INSUFFICIENT';
  } | null;
  warnings: string[];
  advisory: string;
}

export function PerformanceImpactCard({
  densityAlt,
  severity,
  takeoffRoll,
  climbRate,
  runway,
  warnings,
  advisory,
}: PerformanceImpactCardProps) {
  const { isDark } = useTheme();

  const severityColor =
    severity === 'normal'
      ? colors.alert.green
      : severity === 'caution'
        ? colors.alert.amber
        : colors.alert.red;

  const runwayColor =
    runway?.label === 'SUFFICIENT'
      ? colors.alert.green
      : runway?.label === 'MARGINAL'
        ? colors.alert.amber
        : colors.alert.red;

  return (
    <CloudCard>
      <Animated.View entering={FadeInDown.duration(400)}>
        {/* Header */}
        <View style={styles.header}>
          <Mountain
            size={18}
            color={isDark ? colors.stratus[500] : colors.stratus[800]}
          />
          <Text
            style={[
              styles.headerLabel,
              { color: isDark ? colors.stratus[500] : colors.stratus[800] },
            ]}
          >
            DENSITY ALTITUDE PERFORMANCE
          </Text>
        </View>

        {/* Density Altitude Value */}
        <View style={styles.daContainer}>
          <Text
            style={[
              styles.daValue,
              { color: severityColor, fontFamily: 'SpaceGrotesk_700Bold' },
            ]}
          >
            {densityAlt.toLocaleString()}
          </Text>
          <Text
            style={[
              styles.daUnit,
              { color: isDark ? colors.stratus[500] : colors.stratus[800] },
            ]}
          >
            ft
          </Text>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricsContainer}>
          {/* Takeoff Roll */}
          <View
            style={[
              styles.metricBox,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.03)',
              },
            ]}
          >
            <View style={styles.metricHeader}>
              <Plane
                size={14}
                color={isDark ? colors.stratus[500] : colors.stratus[800]}
              />
              <Text
                style={[
                  styles.metricLabel,
                  { color: isDark ? colors.stratus[500] : colors.stratus[800] },
                ]}
              >
                Takeoff Roll
              </Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                {
                  color: isDark ? '#FFFFFF' : '#000000',
                  fontFamily: 'JetBrainsMono_600SemiBold',
                },
              ]}
            >
              {takeoffRoll.actual.toLocaleString()} ft
            </Text>
            <Text
              style={[
                styles.metricChange,
                { color: colors.alert.red, fontFamily: 'Inter_500Medium' },
              ]}
            >
              +{takeoffRoll.increase.toLocaleString()} ft (+
              {takeoffRoll.increasePercent.toFixed(1)}%)
            </Text>
          </View>

          {/* Climb Rate */}
          <View
            style={[
              styles.metricBox,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.03)',
              },
            ]}
          >
            <View style={styles.metricHeader}>
              <TrendingDown
                size={14}
                color={isDark ? colors.stratus[500] : colors.stratus[800]}
              />
              <Text
                style={[
                  styles.metricLabel,
                  { color: isDark ? colors.stratus[500] : colors.stratus[800] },
                ]}
              >
                Climb Rate
              </Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                {
                  color: isDark ? '#FFFFFF' : '#000000',
                  fontFamily: 'JetBrainsMono_600SemiBold',
                },
              ]}
            >
              {climbRate.actual.toLocaleString()} fpm
            </Text>
            <Text
              style={[
                styles.metricChange,
                { color: colors.alert.red, fontFamily: 'Inter_500Medium' },
              ]}
            >
              -{climbRate.increase.toLocaleString()} fpm (-
              {climbRate.increasePercent.toFixed(1)}%)
            </Text>
          </View>
        </View>

        {/* Runway Adequacy */}
        {runway && (
          <View style={styles.runwayContainer}>
            <View style={styles.runwayHeader}>
              <Text
                style={[
                  styles.runwayLabel,
                  { color: runwayColor, fontFamily: 'SpaceGrotesk_600SemiBold' },
                ]}
              >
                {runway.label}
              </Text>
              <Text
                style={[
                  styles.runwayMargin,
                  { color: isDark ? colors.stratus[500] : colors.stratus[800] },
                ]}
              >
                Margin: {runway.margin >= 0 ? '+' : ''}
                {runway.margin.toLocaleString()} ft ({runway.marginPercent >= 0 ? '+' : ''}
                {runway.marginPercent.toFixed(1)}%)
              </Text>
            </View>
            <View
              style={[
                styles.runwayBar,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <View
                style={[
                  styles.runwayBarFill,
                  {
                    backgroundColor: runwayColor,
                    width: `${Math.min(Math.max(runway.marginPercent + 50, 0), 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            {warnings.map((warning, index) => (
              <View key={index} style={styles.warningRow}>
                <View style={[styles.warningDot, { backgroundColor: colors.alert.red }]} />
                <Text
                  style={[
                    styles.warningText,
                    { color: colors.alert.red, fontFamily: 'Inter_500Medium' },
                  ]}
                >
                  {warning}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Advisory */}
        <View
          style={[
            styles.advisoryContainer,
            {
              backgroundColor: isDark
                ? 'rgba(12, 140, 233, 0.1)'
                : 'rgba(12, 140, 233, 0.08)',
              borderLeftColor: colors.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.advisoryText,
              {
                color: isDark ? colors.stratus[500] : colors.stratus[800],
                fontFamily: 'Inter_400Regular',
              },
            ]}
          >
            {advisory}
          </Text>
        </View>
      </Animated.View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    letterSpacing: 0.5,
  },
  daContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  daValue: {
    fontSize: 48,
    lineHeight: 52,
  },
  daUnit: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
  },
  runwayContainer: {
    marginBottom: 16,
  },
  runwayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  runwayLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  runwayMargin: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  runwayBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  runwayBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  advisoryContainer: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  advisoryText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
