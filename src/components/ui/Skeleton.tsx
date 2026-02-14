import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmer.value, [0, 1], [-200, 200]),
      },
    ],
  }));

  return (
    <View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "rgba(12,140,233,0.08)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[
            "rgba(12,140,233,0.0)",
            "rgba(12,140,233,0.12)",
            "rgba(12,140,233,0.0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <Skeleton width={100} height={24} />
        <Skeleton width={50} height={20} borderRadius={999} />
      </View>
      <View style={skeletonStyles.body}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: {
    gap: 8,
  },
});
