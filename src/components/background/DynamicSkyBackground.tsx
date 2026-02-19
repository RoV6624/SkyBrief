import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, useWindowDimensions, AccessibilityInfo } from "react-native";
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

interface DynamicSkyBackgroundProps {
  scene: WeatherScene;
}

// ---------- Intensity lookup tables ----------

const RAIN_CONFIG = {
  light:    { count: 25, width: 1.5, height: 18, opMin: 0.35, opMax: 0.6, durMin: 900,  durMax: 1300 },
  moderate: { count: 50, width: 2,   height: 22, opMin: 0.5,  opMax: 0.8, durMin: 700,  durMax: 1100 },
  heavy:    { count: 80, width: 2.5, height: 28, opMin: 0.6,  opMax: 0.9, durMin: 500,  durMax: 900  },
} as const;

const SNOW_CONFIG = {
  light:    { count: 18, sizeMin: 2, sizeMax: 5, opMin: 0.5,  opMax: 0.8,  durMin: 5000, durMax: 8000, drift: 15 },
  moderate: { count: 35, sizeMin: 3, sizeMax: 6, opMin: 0.6,  opMax: 0.85, durMin: 4000, durMax: 7000, drift: 25 },
  heavy:    { count: 55, sizeMin: 3, sizeMax: 8, opMin: 0.7,  opMax: 0.95, durMin: 3000, durMax: 5500, drift: 30 },
} as const;

const HAIL_CONFIG = {
  light:    { count: 15 },
  moderate: { count: 30 },
  heavy:    { count: 50 },
} as const;

// ---------- Cloud components (unchanged) ----------

function CloudShape({
  x,
  y,
  size,
  opacity,
  speed,
  isNight,
  isTwilight,
  screenWidth,
}: {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  isNight: boolean;
  isTwilight: boolean;
  screenWidth: number;
}) {
  const translateX = useSharedValue(x);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(screenWidth + 100, {
          duration: speed * 1000,
          easing: Easing.linear,
        }),
        withTiming(-200, { duration: 0 })
      ),
      -1
    );
  }, [speed, translateX, screenWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const cloudWidth = 120 * size;
  const cloudHeight = 40 * size;
  const cloudColor = isTwilight
    ? `rgba(255,180,100,${opacity * 0.7})`
    : isNight
      ? `rgba(100,120,180,${opacity * 0.6})`
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

// ---------- Rain — intensity-driven drops with angle ----------

function RainDrop({
  delay: dropDelay,
  isNight,
  intensity,
  screenWidth,
  screenHeight,
}: {
  delay: number;
  isNight: boolean;
  intensity: "light" | "moderate" | "heavy";
  screenWidth: number;
  screenHeight: number;
}) {
  const cfg = RAIN_CONFIG[intensity];
  const y = useSharedValue(-30);
  const baseOpacity = cfg.opMin + Math.random() * (cfg.opMax - cfg.opMin);

  useEffect(() => {
    y.value = withDelay(
      dropDelay,
      withRepeat(
        withTiming(screenHeight + 30, {
          duration: cfg.durMin + Math.random() * (cfg.durMax - cfg.durMin),
          easing: Easing.linear,
        }),
        -1
      )
    );
  }, [y, dropDelay, screenHeight, cfg.durMin, cfg.durMax]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: "8deg" }],
  }));

  const dropColor = isNight
    ? `rgba(150,180,230,${baseOpacity})`
    : `rgba(180,210,255,${baseOpacity})`;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: Math.random() * screenWidth,
          width: cfg.width,
          height: cfg.height,
          backgroundColor: dropColor,
          borderRadius: cfg.width / 2,
        },
        style,
      ]}
    />
  );
}

// ---------- Snow — varied size per flake, intensity-driven drift ----------

function SnowFlake({
  delay: flakeDelay,
  intensity,
  flakeSize,
  screenWidth,
  screenHeight,
}: {
  delay: number;
  intensity: "light" | "moderate" | "heavy";
  flakeSize: number;
  screenWidth: number;
  screenHeight: number;
}) {
  const cfg = SNOW_CONFIG[intensity];
  const y = useSharedValue(-10);
  const x = useSharedValue(0);
  const baseOpacity = cfg.opMin + Math.random() * (cfg.opMax - cfg.opMin);

  useEffect(() => {
    y.value = withDelay(
      flakeDelay,
      withRepeat(
        withTiming(screenHeight + 10, {
          duration: cfg.durMin + Math.random() * (cfg.durMax - cfg.durMin),
          easing: Easing.linear,
        }),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(cfg.drift, { duration: 2000 + Math.random() * 1000 }),
        withTiming(-cfg.drift, { duration: 2000 + Math.random() * 1000 })
      ),
      -1
    );
  }, [y, x, flakeDelay, screenHeight, cfg.durMin, cfg.durMax, cfg.drift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: Math.random() * screenWidth,
          width: flakeSize,
          height: flakeSize,
          borderRadius: flakeSize / 2,
          backgroundColor: `rgba(255,255,255,${baseOpacity})`,
        },
        style,
      ]}
    />
  );
}

// ---------- Hail — fast-falling ice circles with subtle pulse ----------

function HailStone({
  delay: stoneDelay,
  isNight,
  screenWidth,
  screenHeight,
}: {
  delay: number;
  isNight: boolean;
  screenWidth: number;
  screenHeight: number;
}) {
  const stoneSize = 5 + Math.random() * 3; // 5-8px
  const baseOpacity = 0.7 + Math.random() * 0.3;
  const y = useSharedValue(-10);
  const scale = useSharedValue(1);

  useEffect(() => {
    y.value = withDelay(
      stoneDelay,
      withRepeat(
        withTiming(screenHeight + 10, {
          duration: 400 + Math.random() * 300, // 400-700ms — very fast
          easing: Easing.linear,
        }),
        -1
      )
    );
    // Subtle size pulse for ice-glinting effect
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 150 }),
        withTiming(0.9, { duration: 150 })
      ),
      -1
    );
  }, [y, scale, stoneDelay, screenHeight]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  const color = isNight
    ? `rgba(200,215,240,${baseOpacity})`
    : `rgba(220,235,255,${baseOpacity})`;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: Math.random() * screenWidth,
          width: stoneSize,
          height: stoneSize,
          borderRadius: stoneSize / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ---------- Fog wisps — slow horizontal drifting bands ----------

function FogWisp({
  yPercent,
  isNight,
  screenWidth,
  screenHeight,
  index,
}: {
  yPercent: number;
  isNight: boolean;
  screenWidth: number;
  screenHeight: number;
  index: number;
}) {
  const wispWidth = screenWidth * 1.5;
  const wispHeight = 40 + Math.random() * 40; // 40-80px
  const translateX = useSharedValue(-wispWidth * 0.3 - index * 60);

  useEffect(() => {
    const cycleDuration = (30 + index * 7) * 1000; // 30-51s staggered
    translateX.value = withRepeat(
      withSequence(
        withTiming(screenWidth * 0.3, {
          duration: cycleDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(-wispWidth * 0.3, {
          duration: cycleDuration,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1
    );
  }, [translateX, screenWidth, wispWidth, index]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const color = isNight
    ? "rgba(80,100,130,0.15)"
    : "rgba(200,210,225,0.12)";

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: yPercent * screenHeight,
          width: wispWidth,
          height: wispHeight,
          borderRadius: wispHeight / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ---------- Lightning flash ----------

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

// ---------- Mist overlay — fog-aware density ----------

function MistOverlay({ isNight, isFog }: { isNight: boolean; isFog: boolean }) {
  const opacityLow = isFog ? 0.25 : 0.15;
  const opacityHigh = isFog ? 0.45 : 0.35;
  const opacity = useSharedValue(opacityLow);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(opacityHigh, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(opacityLow, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [opacity, opacityLow, opacityHigh]);

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

// ---------- Star field (three-tier: bright static, glowing pulse, small twinkle) ----------

/** Tier 1 — Bright static hero stars: large, high-opacity, no animation */
function BrightStar({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ffffff",
        // Soft glow halo
        shadowColor: "#ffffff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: size,
      }}
    />
  );
}

/** Tier 2 — Glowing pulse stars: medium size, animate scale + opacity for a breathing glow */
function GlowingStar({ star }: { star: { x: number; y: number; size: number; delay: number; dur: number } }) {
  const pulse = useSharedValue(0.6);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    pulse.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: star.dur, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: star.dur, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
    scale.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: star.dur, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: star.dur, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
  }, [pulse, scale, star.delay, star.dur]);

  const style = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: star.x - star.size / 2,
          top: star.y - star.size / 2,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: "#ffffff",
          shadowColor: "#c8d0ff",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: star.size * 1.5,
        },
        style,
      ]}
    />
  );
}

/** Tier 3 — Small twinkling stars: tiny, subtle opacity flicker */
function TwinklingStar({ star }: { star: { x: number; y: number; size: number; opacity: number; twinkleDelay: number; twinkleDur: number } }) {
  const twinkle = useSharedValue(1);

  useEffect(() => {
    twinkle.value = withDelay(
      star.twinkleDelay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: star.twinkleDur, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: star.twinkleDur, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
  }, [twinkle, star.twinkleDelay, star.twinkleDur]);

  const style = useAnimatedStyle(() => ({
    opacity: star.opacity * twinkle.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: "#ffffff",
          shadowColor: "#d0d8ff",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: star.size * 2,
        },
        style,
      ]}
    />
  );
}

function StarField({ screenWidth, screenHeight, dimFactor = 1 }: { screenWidth: number; screenHeight: number; dimFactor?: number }) {
  // Tier 1: bright static hero stars (8-12 prominent ones)
  const brightStars = useMemo(
    () =>
      Array.from({ length: Math.round(10 * dimFactor) }, () => ({
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight * 0.6,
        size: 2.5 + Math.random() * 2, // 2.5-4.5px
      })),
    [screenWidth, screenHeight, dimFactor]
  );

  // Tier 2: glowing pulse stars (15-20 medium ones with breathing glow)
  const glowingStars = useMemo(
    () =>
      Array.from({ length: Math.round(18 * dimFactor) }, () => ({
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight * 0.65,
        size: 2 + Math.random() * 1.5, // 2-3.5px
        delay: Math.random() * 5000,
        dur: 2000 + Math.random() * 3000, // 2-5s breathing cycle
      })),
    [screenWidth, screenHeight, dimFactor]
  );

  // Tier 3: small dim twinkling stars (40-50 background scatter)
  const smallStars = useMemo(
    () =>
      Array.from({ length: Math.round(45 * dimFactor) }, () => ({
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight * 0.7,
        size: 1 + Math.random() * 1.5, // 1-2.5px
        opacity: (0.35 + Math.random() * 0.4) * dimFactor,
        twinkleDelay: Math.random() * 6000,
        twinkleDur: 1500 + Math.random() * 3000,
      })),
    [screenWidth, screenHeight, dimFactor]
  );

  return (
    <>
      {smallStars.map((star, i) => (
        <TwinklingStar key={`ts-${i}`} star={star} />
      ))}
      {glowingStars.map((star, i) => (
        <GlowingStar key={`gs-${i}`} star={star} />
      ))}
      {brightStars.map((star, i) => (
        <BrightStar key={`bs-${i}`} x={star.x} y={star.y} size={star.size} />
      ))}
    </>
  );
}

// ---------- Shooting star ----------

function ShootingStar({ screenWidth, screenHeight }: { screenWidth: number; screenHeight: number }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const shoot = () => {
      const startX = Math.random() * screenWidth * 0.6;
      const startY = Math.random() * screenHeight * 0.35;
      const dist = 80 + Math.random() * 70;

      translateX.value = startX;
      translateY.value = startY;
      opacity.value = 0;

      opacity.value = withSequence(
        withTiming(0.9, { duration: 80 }),
        withTiming(0.9, { duration: 200 }),
        withTiming(0, { duration: 150 }),
      );
      translateX.value = withTiming(startX + dist, {
        duration: 430,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(startY + dist * 0.6, {
        duration: 430,
        easing: Easing.out(Easing.ease),
      });

      timeoutId = setTimeout(shoot, 8000 + Math.random() * 17000);
    };

    timeoutId = setTimeout(shoot, 3000 + Math.random() * 7000);
    return () => clearTimeout(timeoutId);
  }, [translateX, translateY, opacity, screenWidth, screenHeight]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: "35deg" },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 30,
          height: 1.5,
          borderRadius: 1,
          backgroundColor: "#ffffff",
        },
        style,
      ]}
    />
  );
}

// ---------- Static cloud shapes for reduced motion ----------

function StaticCloudShape({
  x,
  y,
  size,
  opacity,
  isNight,
  isTwilight,
}: {
  x: number;
  y: number;
  size: number;
  opacity: number;
  isNight: boolean;
  isTwilight: boolean;
}) {
  const cloudWidth = 120 * size;
  const cloudHeight = 40 * size;
  const cloudColor = isTwilight
    ? `rgba(255,180,100,${opacity * 0.7})`
    : isNight
      ? `rgba(100,120,180,${opacity * 0.6})`
      : `rgba(255,255,255,${opacity})`;

  return (
    <View
      style={{
        position: "absolute",
        top: y,
        left: x,
      }}
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
    </View>
  );
}

// ---------- Fog wisp Y positions ----------

const FOG_WISP_POSITIONS = [0.2, 0.4, 0.55, 0.7];

// ---------- Gradient location helpers ----------

/** Weighted locations — dark zone persists longer at top, lightening accelerates toward bottom */
function gradientLocations(stops: number): [number, number, ...number[]] | null {
  if (stops === 4) return [0, 0.35, 0.7, 1.0];
  if (stops === 5) return [0, 0.25, 0.5, 0.75, 1.0];
  return null; // 3 stops: even distribution is fine
}

// ---------- Main component ----------

export function DynamicSkyBackground({ scene }: DynamicSkyBackgroundProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  const intensity = scene.precipIntensity ?? "moderate";
  const isFog = scene.isFog ?? false;
  const isNight = scene.isNight ?? false;
  const isTwilight = scene.isTwilight ?? false;
  const showStars = isNight;
  const starDimFactor = scene.precipitation !== "none" ? 0.4
    : scene.cloudLayers.length > 4 ? 0.5
    : 1;

  // Compute counts from intensity lookup tables
  const rainCount = scene.precipitation === "rain" ? RAIN_CONFIG[intensity].count : 0;
  const snowCount = scene.precipitation === "snow" ? SNOW_CONFIG[intensity].count : 0;
  const hailCount = scene.precipitation === "hail" ? HAIL_CONFIG[intensity].count : 0;

  // Pre-generate random snow flake sizes (stable per render)
  const snowSizes = useMemo(() => {
    if (snowCount === 0) return [];
    const cfg = SNOW_CONFIG[intensity];
    return Array.from({ length: snowCount }, () =>
      cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)
    );
  }, [snowCount, intensity]);

  // Reduced motion: show static gradient + static clouds only
  if (reduceMotion) {
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]} pointerEvents="none">
        <LinearGradient
          colors={scene.gradient}
          locations={gradientLocations(scene.gradient.length)}
          style={StyleSheet.absoluteFill}
        />
        {/* Static stars for nights — bright heroes + dim scatter */}
        {showStars && (
          <>
            {/* Bright hero stars */}
            {Array.from({ length: Math.round(8 * starDimFactor) }, (_, i) => {
              const s = 2.5 + (i % 3);
              return (
                <View
                  key={`static-bright-${i}`}
                  style={{
                    position: "absolute",
                    left: (i * 53 + 30) % screenWidth,
                    top: (i * 67 + 15) % (screenHeight * 0.55),
                    width: s,
                    height: s,
                    borderRadius: s / 2,
                    backgroundColor: "#ffffff",
                    shadowColor: "#ffffff",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: s,
                  }}
                />
              );
            })}
            {/* Dim scatter stars */}
            {Array.from({ length: Math.round(30 * starDimFactor) }, (_, i) => (
              <View
                key={`static-star-${i}`}
                style={{
                  position: "absolute",
                  left: (i * 27 + 13) % screenWidth,
                  top: (i * 41 + 7) % (screenHeight * 0.6),
                  width: 1 + (i % 2),
                  height: 1 + (i % 2),
                  borderRadius: 1,
                  backgroundColor: `rgba(255,255,255,${(0.3 + (i % 5) * 0.12) * starDimFactor})`,
                  shadowColor: "#d0d8ff",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 2 + (i % 2),
                }}
              />
            ))}
          </>
        )}
        {/* Static cloud shapes */}
        {scene.cloudLayers.map((cloud, i) => (
          <StaticCloudShape
            key={`static-cloud-${i}`}
            x={50 + i * 100}
            y={(cloud.y / 100) * screenHeight}
            size={cloud.size}
            opacity={cloud.opacity}
            isNight={isNight}
            isTwilight={isTwilight}
          />
        ))}
        {/* Static mist/fog overlay */}
        {(scene.precipitation === "mist" || isFog) && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isNight
                  ? `rgba(30,40,60,${isFog ? 0.3 : 0.2})`
                  : `rgba(200,210,220,${isFog ? 0.3 : 0.2})`,
              },
            ]}
          />
        )}
        {/* Static hail dots */}
        {scene.precipitation === "hail" &&
          Array.from({ length: 8 }, (_, i) => {
            const dotSize = 5 + (i % 3);
            return (
              <View
                key={`static-hail-${i}`}
                style={{
                  position: "absolute",
                  left: (i * 47 + 20) % screenWidth,
                  top: (i * 83 + 30) % screenHeight,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: `rgba(220,235,255,${0.7 + (i % 3) * 0.1})`,
                }}
              />
            );
          })}
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]} pointerEvents="none">
      <LinearGradient
        colors={scene.gradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars for nights */}
      {showStars && <StarField screenWidth={screenWidth} screenHeight={screenHeight} dimFactor={starDimFactor} />}

      {/* Shooting stars */}
      {isNight && !reduceMotion && <ShootingStar screenWidth={screenWidth} screenHeight={screenHeight} />}

      {/* Cloud layers */}
      {scene.cloudLayers.map((cloud, i) => (
        <CloudShape
          key={`cloud-${i}`}
          x={-200 + Math.random() * screenWidth}
          y={(cloud.y / 100) * screenHeight}
          size={cloud.size}
          opacity={cloud.opacity}
          speed={cloud.speed}
          isNight={isNight}
          isTwilight={isTwilight}
          screenWidth={screenWidth}
        />
      ))}

      {/* Rain */}
      {rainCount > 0 &&
        Array.from({ length: rainCount }, (_, i) => (
          <RainDrop
            key={`rain-${i}`}
            delay={i * 30}
            isNight={isNight}
            intensity={intensity}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        ))}

      {/* Snow */}
      {snowCount > 0 &&
        Array.from({ length: snowCount }, (_, i) => (
          <SnowFlake
            key={`snow-${i}`}
            delay={i * 150}
            intensity={intensity}
            flakeSize={snowSizes[i]}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        ))}

      {/* Hail */}
      {hailCount > 0 &&
        Array.from({ length: hailCount }, (_, i) => (
          <HailStone
            key={`hail-${i}`}
            delay={i * 40}
            isNight={isNight}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        ))}

      {/* Mist overlay (for mist, fog, and haze) */}
      {(scene.precipitation === "mist" || isFog) && (
        <MistOverlay isNight={isNight} isFog={isFog} />
      )}

      {/* Fog wisps — only for true fog (FG) */}
      {isFog &&
        FOG_WISP_POSITIONS.map((yPct, i) => (
          <FogWisp
            key={`fog-wisp-${i}`}
            yPercent={yPct}
            isNight={isNight}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            index={i}
          />
        ))}

      {/* Lightning */}
      {scene.lightning && <LightningFlash />}
    </View>
  );
}
