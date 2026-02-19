import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Line, Polygon, G, Text as SvgText } from "react-native-svg";

import { colors } from "@/theme/tokens";

/** Calculate headwind/crosswind components for a given runway and wind */
function calculateRunwayWind(
  runwayHeading: number,
  windDirection: number | "VRB",
  windSpeed: number
) {
  if (windDirection === "VRB" || windSpeed === 0) {
    return { headwindComponent: 0, crosswindComponent: 0, windDirection: 0 };
  }
  const windDir = typeof windDirection === "number" ? windDirection : 0;
  const angleDiff = ((windDir - runwayHeading + 360) % 360) * (Math.PI / 180);
  const headwind = Math.round(windSpeed * Math.cos(angleDiff));
  const crosswind = Math.round(windSpeed * Math.sin(angleDiff));
  return { headwindComponent: headwind, crosswindComponent: crosswind, windDirection: windDir };
}
import { useTheme } from "@/theme/ThemeProvider";
import { InteractiveRunwaySelector } from "./InteractiveRunwaySelector";

interface RunwayVisualizerProps {
  runwayHeading: number; // 0-360
  windDirection: number | "VRB"; // 0-360 or variable
  windSpeed: number; // knots
  onHeadingChange?: (heading: number) => void;
}

export function RunwayVisualizer({
  runwayHeading,
  windDirection,
  windSpeed,
  onHeadingChange,
}: RunwayVisualizerProps) {
  const { isDark } = useTheme();

  // ── Wind diagram dimensions (compact square) ───────────────
  const W = 160;
  const H = 160;
  const cX = W / 2; // 80
  const cY = H / 2; // 80
  const rwyLen = 90;
  const rwyWid = 14;

  const runwayData = calculateRunwayWind(runwayHeading, windDirection, windSpeed);

  // Runway numbers
  const rwyNum1Raw = Math.round(runwayHeading / 10);
  const rwyNum1 = rwyNum1Raw === 0 ? 36 : rwyNum1Raw;
  const rwyNum2Raw = (rwyNum1 + 18) % 36;
  const rwyNum2 = rwyNum2Raw === 0 ? 36 : rwyNum2Raw;

  // Wind arrow: originates from center, points OUTWARD toward where wind is GOING.
  // Length scales with wind speed: 10px at 1kt → 65px at 25+ kts.
  const arrowLength = windSpeed > 0 ? Math.min((windSpeed / 25) * 65, 65) : 0;
  const arrowTipY = cY - arrowLength; // tip is above center in un-rotated local coords

  // Component colors — thresholds 10/15 kt per pilot requirement
  const absX = Math.abs(runwayData.crosswindComponent);
  const arrowColor = absX > 15 ? colors.ifr : absX > 10 ? colors.mvfr : colors.vfr;
  const xColor     = absX > 15 ? colors.ifr : absX > 10 ? colors.mvfr : colors.vfr;
  const hColor = runwayData.headwindComponent >= 0 ? colors.vfr : colors.ifr;

  // "5R" = 5 kt crosswind component from the right side of the runway
  const crossLabel =
    runwayData.crosswindComponent > 0
      ? `${runwayData.crosswindComponent} kt R`
      : runwayData.crosswindComponent < 0
      ? `${Math.abs(runwayData.crosswindComponent)} kt L`
      : "0 kt";

  const headLabel = `${runwayData.headwindComponent >= 0 ? "+" : ""}${runwayData.headwindComponent} kt`;

  return (
    <View style={styles.root}>
      {/* ── Row: dial + wind diagram side by side ── */}
      <View style={styles.row}>
        {/* Left: Interactive dial (always shown) */}
        <InteractiveRunwaySelector
          heading={runwayHeading}
          onHeadingChange={onHeadingChange ?? (() => {})}
        />

        {/* Right: Wind diagram */}
        <View style={styles.diagramWrap}>
          {windDirection === "VRB" ? (
            <View style={styles.vrbBox}>
              <Text style={[styles.vrbText, { color: colors.mvfr }]}>
                Variable{"\n"}Winds
              </Text>
            </View>
          ) : (
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              {/* Runway */}
              <G rotation={runwayHeading} origin={`${cX},${cY}`}>
                <Rect
                  x={cX - rwyWid / 2}
                  y={cY - rwyLen / 2}
                  width={rwyWid}
                  height={rwyLen}
                  fill={isDark ? "rgba(110,110,120,0.45)" : "rgba(90,90,100,0.3)"}
                  stroke={isDark ? "rgba(210,210,220,0.55)" : "rgba(70,70,80,0.5)"}
                  strokeWidth={1.5}
                />
                {/* Centerline */}
                <Line
                  x1={cX} y1={cY - rwyLen / 2 + 8}
                  x2={cX} y2={cY - 6}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                />
                <Line
                  x1={cX} y1={cY + 6}
                  x2={cX} y2={cY + rwyLen / 2 - 8}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                />
                {/* Runway numbers */}
                <SvgText
                  x={cX}
                  y={cY - rwyLen / 2 + 13}
                  fontSize={9}
                  fill="#ffffff"
                  fontFamily="JetBrainsMono"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {rwyNum1.toString().padStart(2, "0")}
                </SvgText>
                <SvgText
                  x={cX}
                  y={cY + rwyLen / 2 - 4}
                  fontSize={9}
                  fill="#ffffff"
                  fontFamily="JetBrainsMono"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {rwyNum2.toString().padStart(2, "0")}
                </SvgText>
              </G>

              {/* Wind arrow — originates from center, points OUTWARD toward where wind is GOING.
                   Rotation = windDirection + 180 reverses the FROM→TO direction.
                   e.g. wind FROM 270° (west) blows toward 090° (east): 270+180=450→90°. */}
              {windSpeed > 0 && (
                <G
                  rotation={runwayData.windDirection + 180}
                  origin={`${cX},${cY}`}
                >
                  {/* Shaft: from center upward to tip */}
                  <Line
                    x1={cX} y1={cY}
                    x2={cX} y2={arrowTipY}
                    stroke={arrowColor}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                  {/* Arrowhead: points outward away from center */}
                  <Polygon
                    points={`${cX},${arrowTipY - 8} ${cX - 5},${arrowTipY + 1} ${cX + 5},${arrowTipY + 1}`}
                    fill={arrowColor}
                  />
                  {/* "12kts @ 270°" label with dark background rect */}
                  <Rect
                    x={cX - 24} y={arrowTipY - 22}
                    width={48} height={14} rx={3}
                    fill="rgba(0,0,0,0.55)"
                  />
                  <SvgText
                    x={cX}
                    y={arrowTipY - 12}
                    fontSize={8}
                    fontFamily="JetBrainsMono"
                    fontWeight="700"
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    {`${windSpeed}kts @ ${runwayData.windDirection}°`}
                  </SvgText>
                </G>
              )}
            </Svg>
          )}
        </View>
      </View>

      {/* ── Wind component badges (below row) ── */}
      <View style={styles.badges}>
        <View
          style={[
            styles.badge,
            { backgroundColor: `${xColor}18`, borderColor: `${xColor}45` },
          ]}
        >
          <Text
            style={[
              styles.badgeLabel,
              { color: isDark ? "rgba(255,255,255,0.65)" : colors.stratus[600] },
            ]}
          >
            CROSSWIND
          </Text>
          {/* R = from the right, L = from the left */}
          <Text style={[styles.badgeValue, { color: xColor }]}>{crossLabel}</Text>
        </View>

        <View
          style={[
            styles.badge,
            { backgroundColor: `${hColor}18`, borderColor: `${hColor}45` },
          ]}
        >
          <Text
            style={[
              styles.badgeLabel,
              { color: isDark ? "rgba(255,255,255,0.65)" : colors.stratus[600] },
            ]}
          >
            {runwayData.headwindComponent >= 0 ? "HEADWIND" : "TAILWIND"}
          </Text>
          <Text style={[styles.badgeValue, { color: hColor }]}>{headLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  diagramWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  vrbBox: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  vrbText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
  badges: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  badgeValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_700Bold",
  },
});
