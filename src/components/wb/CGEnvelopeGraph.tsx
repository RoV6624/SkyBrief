import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Rect,
  Polygon,
  Circle,
  Line,
  Text as SvgText,
  G,
} from "react-native-svg";
import { CloudCard } from "@/components/ui/CloudCard";
import type { AircraftType } from "@/lib/wb/aircraft-types";
import type { WBResult } from "@/lib/wb/calculations";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

interface CGEnvelopeGraphProps {
  aircraft: AircraftType;
  takeoff: WBResult;
  landing: WBResult | null;
  showLanding: boolean;
}

const W = 320;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

export function CGEnvelopeGraph({
  aircraft,
  takeoff,
  landing,
  showLanding,
}: CGEnvelopeGraphProps) {
  const { isDark, theme } = useTheme();
  const envelopePoints = aircraft.cgEnvelope;

  // Compute bounds from fwdCG and aftCG
  const allCGs = envelopePoints.flatMap((p) => [p.fwdCG, p.aftCG]);
  const allWeights = envelopePoints.map((p) => p.weight);
  const minCG = Math.min(...allCGs) - 1;
  const maxCG = Math.max(...allCGs) + 1;
  const minW = Math.min(...allWeights) - 50;
  const maxW = Math.max(...allWeights, aircraft.maxTakeoffWeight) + 100;

  const cgToX = (cg: number) =>
    PAD.left + ((cg - minCG) / (maxCG - minCG)) * plotW;
  const wtToY = (wt: number) =>
    PAD.top + plotH - ((wt - minW) / (maxW - minW)) * plotH;

  // Envelope polygon: trace fwd CG limits down, then aft CG limits back up
  const sortedByWeight = [...envelopePoints].sort((a, b) => a.weight - b.weight);
  const fwdPath = sortedByWeight.map((p) => `${cgToX(p.fwdCG)},${wtToY(p.weight)}`);
  const aftPath = [...sortedByWeight].reverse().map((p) => `${cgToX(p.aftCG)},${wtToY(p.weight)}`);
  const envelopeStr = [...fwdPath, ...aftPath].join(" ");

  // Grid lines
  const cgStep = (maxCG - minCG) / 5;
  const wtStep = (maxW - minW) / 5;
  const cgGridLines = Array.from({ length: 6 }, (_, i) => minCG + i * cgStep);
  const wtGridLines = Array.from({ length: 6 }, (_, i) => minW + i * wtStep);

  const toCGColor = takeoff.isCGInEnvelope ? colors.vfr : colors.ifr;
  const toLandColor =
    landing && !landing.isCGInEnvelope ? colors.ifr : colors.vfr;

  // Theme-aware text colors
  const axisTickColor = isDark ? "rgba(255,255,255,0.6)" : "#7cc4ff";
  const axisLabelColor = isDark ? theme.foreground : "#085696";

  const styles = StyleSheet.create({
    header: {
      marginBottom: 8,
    },
    headerText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: isDark ? theme.foreground : colors.stratus[700],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });

  return (
    <CloudCard>
      <View style={styles.header}>
        <Text style={styles.headerText}>CG Envelope</Text>
      </View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid */}
        {cgGridLines.map((cg, i) => (
          <G key={`cg-${i}`}>
            <Line
              x1={cgToX(cg)}
              y1={PAD.top}
              x2={cgToX(cg)}
              y2={H - PAD.bottom}
              stroke="rgba(12,140,233,0.08)"
              strokeWidth={1}
            />
            <SvgText
              x={cgToX(cg)}
              y={H - PAD.bottom + 14}
              fontSize={9}
              fontFamily="JetBrainsMono"
              fill={axisTickColor}
              textAnchor="middle"
            >
              {cg.toFixed(1)}
            </SvgText>
          </G>
        ))}
        {wtGridLines.map((wt, i) => (
          <G key={`wt-${i}`}>
            <Line
              x1={PAD.left}
              y1={wtToY(wt)}
              x2={W - PAD.right}
              y2={wtToY(wt)}
              stroke="rgba(12,140,233,0.08)"
              strokeWidth={1}
            />
            <SvgText
              x={PAD.left - 6}
              y={wtToY(wt) + 3}
              fontSize={9}
              fontFamily="JetBrainsMono"
              fill={axisTickColor}
              textAnchor="end"
            >
              {Math.round(wt)}
            </SvgText>
          </G>
        ))}

        {/* Axis labels */}
        <SvgText
          x={W / 2}
          y={H - 4}
          fontSize={10}
          fontFamily="Inter"
          fill={axisLabelColor}
          textAnchor="middle"
        >
          CG (inches aft of datum)
        </SvgText>
        <SvgText
          x={10}
          y={H / 2}
          fontSize={10}
          fontFamily="Inter"
          fill={axisLabelColor}
          textAnchor="middle"
          rotation={-90}
          originX={10}
          originY={H / 2}
        >
          Weight (lbs)
        </SvgText>

        {/* Max weight line */}
        <Line
          x1={PAD.left}
          y1={wtToY(aircraft.maxTakeoffWeight)}
          x2={W - PAD.right}
          y2={wtToY(aircraft.maxTakeoffWeight)}
          stroke="rgba(239,68,68,0.4)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <SvgText
          x={W - PAD.right}
          y={wtToY(aircraft.maxTakeoffWeight) - 4}
          fontSize={8}
          fontFamily="JetBrainsMono"
          fill={colors.ifr}
          textAnchor="end"
        >
          Max {aircraft.maxTakeoffWeight} lbs
        </SvgText>

        {/* Envelope */}
        <Polygon
          points={envelopeStr}
          fill="rgba(12,140,233,0.08)"
          stroke={colors.stratus[500]}
          strokeWidth={1.5}
        />

        {/* Takeoff dot */}
        <Circle
          cx={cgToX(takeoff.cg)}
          cy={wtToY(takeoff.totalWeight)}
          r={6}
          fill={toCGColor}
          stroke="#ffffff"
          strokeWidth={2}
        />
        <SvgText
          x={cgToX(takeoff.cg) + 10}
          y={wtToY(takeoff.totalWeight) + 4}
          fontSize={9}
          fontFamily="Inter"
          fill={toCGColor}
          fontWeight="bold"
        >
          T/O
        </SvgText>

        {/* Landing dot */}
        {showLanding && landing && (
          <>
            <Circle
              cx={cgToX(landing.cg)}
              cy={wtToY(landing.totalWeight)}
              r={5}
              fill={toLandColor}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <SvgText
              x={cgToX(landing.cg) + 10}
              y={wtToY(landing.totalWeight) + 4}
              fontSize={9}
              fontFamily="Inter"
              fill={toLandColor}
              fontWeight="bold"
            >
              LDG
            </SvgText>
          </>
        )}
      </Svg>
    </CloudCard>
  );
}
