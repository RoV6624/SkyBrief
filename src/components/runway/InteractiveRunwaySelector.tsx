import { useMemo, useRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Line,
  G,
  Text as SvgText,
  Rect,
} from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

// ── Stable module-level helpers (recognized as worklets by Babel plugin) ──
function snapToGrid(deg: number): number {
  "worklet";
  const s = Math.round(deg / 10) * 10;
  // Runway designators go 01-36; snap 0 → 360, keep 360 as 360
  if (s <= 0) return 360;
  if (s >= 360) return 360;
  return s;
}

function calcHeading(x: number, y: number, center: number): number {
  "worklet";
  const dx = x - center;
  const dy = y - center;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle <= 0) angle += 360;
  if (angle > 360) angle -= 360;
  return angle;
}

// ── Stable module-level JS-thread haptic callbacks ────────────────────────
// These are plain named functions — runOnJS wraps them once at module level.
function hapticTick() {
  Haptics.selectionAsync();
}

function hapticEnd() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// Animated SVG circle for glow effect
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface InteractiveRunwaySelectorProps {
  heading: number; // Current heading (0-360)
  onHeadingChange: (heading: number) => void;
}

export function InteractiveRunwaySelector({
  heading,
  onHeadingChange,
}: InteractiveRunwaySelectorProps) {
  const { isDark } = useTheme();

  // ── Dimensions ─────────────────────────────────────────────
  const SIZE = 160;
  const CENTER = SIZE / 2; // 80
  const RADIUS = 58; // main circle ring
  const TICK_INNER = 53; // tick inner end
  const ICON_R = 64; // runway icon orbit radius
  const LABEL_R = 73; // cardinal letter radius (safely inside 160px: 80 - 7 margin)

  // ── SharedValues (live on UI thread) ───────────────────────
  const isDragging = useSharedValue(false);
  const lastSnap = useSharedValue(heading);

  // ── SharedValue bridge for heading callback ─────────────────
  // Reanimated 4 (react-native-worklets): pre-wrapped runOnJS results AND
  // addListener both require the UI runtime — neither can be called from JS.
  // Instead: write heading to a SharedValue on the UI thread, then observe it
  // with useAnimatedReaction (runs on the UI thread) and call runOnJS inline.
  // stableCallback is stable (useCallback + empty deps) so it's safe to capture
  // in the useAnimatedReaction worklet closure; it reads the latest prop via ref.
  const onHeadingChangeRef = useRef(onHeadingChange);
  onHeadingChangeRef.current = onHeadingChange;

  const stableCallback = useCallback((h: number) => {
    onHeadingChangeRef.current(h);
  }, []); // intentionally empty — reads ref at call time

  const headingOutput = useSharedValue(heading);

  useAnimatedReaction(
    () => headingOutput.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(stableCallback)(current); // inline runOnJS — not pre-wrapped
      }
    }
  );

  // ── Pan Gesture ────────────────────────────────────────────
  // runOnJS(hapticTick)() called INLINE inside the worklet body is the correct
  // Reanimated 4 pattern — the runOnJS call happens at worklet execution time
  // (on the UI thread) rather than at closure-serialization time.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          "worklet";
          isDragging.value = true;
          runOnJS(hapticTick)();
        })
        .onUpdate((e) => {
          "worklet";
          // NaN guard: pointer exactly at center → atan2(0,0) is undefined, skip
          const dx = e.x - CENTER;
          const dy = e.y - CENTER;
          if (dx === 0 && dy === 0) return;
          const raw = calcHeading(e.x, e.y, CENTER);
          const snapped = snapToGrid(raw);
          if (snapped !== lastSnap.value) {
            lastSnap.value = snapped;
            runOnJS(hapticTick)();
          }
          headingOutput.value = snapped; // SharedValue update — no JS call needed
        })
        .onEnd(() => {
          "worklet";
          isDragging.value = false;
          runOnJS(hapticEnd)();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // gesture is stable for the lifetime of this component instance
  );

  // ── Glow animation ─────────────────────────────────────────
  const glowAnimProps = useAnimatedProps(() => ({
    opacity: isDragging.value ? 0.25 : 0,
  }));

  // ── Runway icon position on orbit ──────────────────────────
  const angleRad = ((heading - 90) * Math.PI) / 180;
  const iconX = CENTER + ICON_R * Math.cos(angleRad);
  const iconY = CENTER + ICON_R * Math.sin(angleRad);

  // ── Runway number from heading ──────────────────────────────
  const rwyNum = Math.round(heading / 10);
  const rwyDisplay = rwyNum === 0 ? "36" : rwyNum.toString().padStart(2, "0");

  // ── Tick marks ────────────────────────────────────────────
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const isMajor = deg % 90 === 0;
    const a = ((deg - 90) * Math.PI) / 180;
    const outerR = isMajor ? RADIUS + 6 : RADIUS + 3;
    ticks.push(
      <Line
        key={`t${deg}`}
        x1={CENTER + outerR * Math.cos(a)}
        y1={CENTER + outerR * Math.sin(a)}
        x2={CENTER + TICK_INNER * Math.cos(a)}
        y2={CENTER + TICK_INNER * Math.sin(a)}
        stroke={isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)"}
        strokeWidth={isMajor ? 1.5 : 0.8}
      />
    );
  }

  // ── Cardinal labels ────────────────────────────────────────
  const cardinals = [
    { deg: 0, label: "N" },
    { deg: 90, label: "E" },
    { deg: 180, label: "S" },
    { deg: 270, label: "W" },
  ];

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.svgWrap, { width: SIZE, height: SIZE }]}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Outer ring */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)"}
              strokeWidth={1.5}
            />

            {/* Tick marks */}
            {ticks}

            {/* Cardinal letters */}
            {cardinals.map(({ deg, label }) => {
              const a = ((deg - 90) * Math.PI) / 180;
              return (
                <SvgText
                  key={label}
                  x={CENTER + LABEL_R * Math.cos(a)}
                  y={CENTER + LABEL_R * Math.sin(a) + 5}
                  fontSize={11}
                  fontFamily="Inter"
                  fontWeight="700"
                  fill={isDark ? "rgba(255,255,255,0.9)" : colors.stratus[600]}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}

            {/* Center heading number (SVG text — inherently centered) */}
            <SvgText
              x={CENTER}
              y={CENTER - 4}
              fontSize={20}
              fontFamily="JetBrainsMono"
              fontWeight="700"
              fill={isDark ? "#FFFFFF" : colors.stratus[800]}
              textAnchor="middle"
            >
              {heading.toString().padStart(3, "0")}°
            </SvgText>

            {/* Center runway label */}
            <SvgText
              x={CENTER}
              y={CENTER + 16}
              fontSize={9}
              fontFamily="Inter"
              fontWeight="500"
              fill={isDark ? "rgba(255,255,255,0.55)" : colors.stratus[500]}
              textAnchor="middle"
            >
              {`RWY ${rwyDisplay}`}
            </SvgText>

            {/* Runway icon on orbit */}
            <G rotation={heading} origin={`${iconX},${iconY}`}>
              <Rect
                x={iconX - 2.5}
                y={iconY - 9}
                width={5}
                height={18}
                rx={1.5}
                fill={isDark ? "#FFFFFF" : colors.stratus[500]}
                opacity={0.9}
              />
            </G>

            {/* Glow circle (animated opacity via shared value) */}
            <AnimatedCircle
              cx={iconX}
              cy={iconY}
              r={13}
              fill={colors.stratus[400]}
              animatedProps={glowAnimProps}
            />
          </Svg>
        </View>
      </GestureDetector>

      <Text
        style={[
          styles.hint,
          { color: isDark ? "rgba(255,255,255,0.4)" : colors.stratus[400] },
        ]}
      >
        Drag to set runway heading
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  svgWrap: {
    overflow: "hidden",
  },
  hint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
