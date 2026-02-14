import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import type { WeatherScene } from "@/lib/weather/scene-mapper";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface DynamicSkyBackgroundProps {
  scene: WeatherScene;
}

// Animated cloud shape with continuous drift loop
function CloudShape({
  x,
  y,
  size,
  opacity,
  speed,
  isNight,
}: {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  isNight: boolean;
}) {
  const translateX = useSharedValue(x);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH + 100, {
          duration: speed * 1000,
          easing: Easing.linear,
        }),
        withTiming(-200, { duration: 0 })
      ),
      -1
    );
  }, [speed, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const cloudWidth = 120 * size;
  const cloudHeight = 40 * size;
  // Night clouds are darker/grayish, day clouds are white
  const cloudColor = isNight
    ? `rgba(120,140,170,${opacity * 0.6})`
    : `rgba(255,255,255,${opacity})`;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: y,
          opacity: 1,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: cloudWidth,
          height: cloudHeight,
          borderRadius: cloudHeight / 2,
          backgroundColor: cloudColor,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: cloudWidth * 0.2,
          top: -cloudHeight * 0.4,
          width: cloudWidth * 0.5,
          height: cloudWidth * 0.5,
          borderRadius: cloudWidth * 0.25,
          backgroundColor: cloudColor,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: cloudWidth * 0.45,
          top: -cloudHeight * 0.6,
          width: cloudWidth * 0.4,
          height: cloudWidth * 0.4,
          borderRadius: cloudWidth * 0.2,
          backgroundColor: cloudColor,
        }}
      />
    </Animated.View>
  );
}

// Rain drop with continuous fall animation
function RainDrop({ delay: dropDelay, isNight }: { delay: number; isNight: boolean }) {
  const y = useSharedValue(-20);
  const baseOpacity = 0.3 + Math.random() * 0.4;

  useEffect(() => {
    y.value = withDelay(
      dropDelay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 20, {
          duration: 800 + Math.random() * 400,
          easing: Easing.linear,
        }),
        -1
      )
    );
  }, [y, dropDelay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  const dropColor = isNight
    ? `rgba(60,80,120,${baseOpacity})`
    : `rgba(100,150,200,${baseOpacity})`;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: Math.random() * SCREEN_WIDTH,
          width: 1.5,
          height: 16,
          backgroundColor: dropColor,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

// Snow flake with drift animation
function SnowFlake({ delay: flakeDelay }: { delay: number }) {
  const y = useSharedValue(-10);
  const x = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      flakeDelay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 10, {
          duration: 4000 + Math.random() * 3000,
          easing: Easing.linear,
        }),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 2000 }),
        withTiming(-20, { duration: 2000 })
      ),
      -1
    );
  }, [y, x, flakeDelay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: Math.random() * SCREEN_WIDTH,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.7)",
        },
        style,
      ]}
    />
  );
}

// Lightning flash effect
function LightningFlash() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const flash = () => {
      opacity.value = withSequence(
        withTiming(0.6, { duration: 50 }),
        withTiming(0, { duration: 100 }),
        withDelay(200, withTiming(0.3, { duration: 50 })),
        withTiming(0, { duration: 150 })
      );
      setTimeout(flash, 3000 + Math.random() * 7000);
    };
    const timeout = setTimeout(flash, 2000);
    return () => clearTimeout(timeout);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#ffffff" },
        style,
      ]}
    />
  );
}

// Mist overlay with breathing animation
function MistOverlay({ isNight }: { isNight: boolean }) {
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const mistColor = isNight
    ? "rgba(30,40,60,0.8)"
    : "rgba(200,210,220,0.8)";

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: mistColor },
        style,
      ]}
    />
  );
}

// Star field for clear nights — twinkling dots
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT * 0.6,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    []
  );

  const twinkle = useSharedValue(1);

  useEffect(() => {
    twinkle.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [twinkle]);

  const twinkleStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
  }));

  return (
    <>
      {stars.map((star, i) => (
        <Animated.View
          key={`star-${i}`}
          style={[
            {
              position: "absolute",
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: `rgba(255,255,255,${star.opacity})`,
            },
            i % 3 === 0 ? twinkleStyle : undefined,
          ]}
        />
      ))}
    </>
  );
}

export function DynamicSkyBackground({ scene }: DynamicSkyBackgroundProps) {
  const rainDrops = scene.precipitation === "rain" ? 30 : 0;
  const snowFlakes = scene.precipitation === "snow" ? 20 : 0;
  const isNight = scene.isNight ?? false;
  const showStars =
    isNight && scene.precipitation === "none" && scene.cloudLayers.length <= 2;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]} pointerEvents="none">
      <LinearGradient
        colors={scene.gradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars for clear nights */}
      {showStars && <StarField />}

      {/* Cloud layers */}
      {scene.cloudLayers.map((cloud, i) => (
        <CloudShape
          key={`cloud-${i}`}
          x={-200 + Math.random() * SCREEN_WIDTH}
          y={(cloud.y / 100) * SCREEN_HEIGHT}
          size={cloud.size}
          opacity={cloud.opacity}
          speed={cloud.speed}
          isNight={isNight}
        />
      ))}

      {/* Rain */}
      {rainDrops > 0 &&
        Array.from({ length: rainDrops }, (_, i) => (
          <RainDrop key={`rain-${i}`} delay={i * 60} isNight={isNight} />
        ))}

      {/* Snow */}
      {snowFlakes > 0 &&
        Array.from({ length: snowFlakes }, (_, i) => (
          <SnowFlake key={`snow-${i}`} delay={i * 200} />
        ))}

      {/* Mist */}
      {scene.precipitation === "mist" && <MistOverlay isNight={isNight} />}

      {/* Lightning */}
      {scene.lightning && <LightningFlash />}
    </View>
  );
}
