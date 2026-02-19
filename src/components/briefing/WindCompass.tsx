import React from "react";
import Svg, {
  Circle,
  Line,
  G,
  Text as SvgText,
  Polygon,
} from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

interface WindCompassProps {
  direction: number | "VRB";
  speed: number;
  size?: number;
}

export function WindCompass({ direction, speed, size = 120 }: WindCompassProps) {
  const { isDark } = useTheme();

  const CENTER = size / 2;
  const RADIUS = size * 0.4; // 48 at size 120
  const TICK_INNER = RADIUS - 4;
  const LABEL_R = RADIUS + 12;

  const isVRB = direction === "VRB";

  // Tick marks every 10 degrees
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const isMajor = deg % 90 === 0;
    const a = ((deg - 90) * Math.PI) / 180;
    const outerR = isMajor ? RADIUS + 5 : RADIUS + 2;
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

  // Cardinal labels
  const cardinals = [
    { deg: 0, label: "N" },
    { deg: 90, label: "E" },
    { deg: 180, label: "S" },
    { deg: 270, label: "W" },
  ];

  // Wind arrow: points FROM where wind is coming from (rotated by direction)
  // Arrow length scales with speed
  const arrowLength = speed > 0 ? Math.min((speed / 30) * (RADIUS - 6), RADIUS - 6) : 0;
  const arrowTipY = CENTER - arrowLength;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
            y={CENTER + LABEL_R * Math.sin(a) + 4}
            fontSize={10}
            fontFamily="Inter"
            fontWeight="700"
            fill={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}

      {isVRB ? (
        /* VRB case: show "VRB" text in center, no arrow */
        <SvgText
          x={CENTER}
          y={CENTER + 5}
          fontSize={14}
          fontFamily="JetBrainsMono"
          fontWeight="700"
          fill={isDark ? "#FFFFFF" : "#083f6e"}
          textAnchor="middle"
        >
          VRB
        </SvgText>
      ) : (
        <>
          {/* Wind arrow — rotated to wind direction (FROM) */}
          {speed > 0 && (
            <G rotation={direction} origin={`${CENTER},${CENTER}`}>
              {/* Shaft: from center outward */}
              <Line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER}
                y2={arrowTipY}
                stroke="#FFFFFF"
                strokeWidth={2}
                strokeLinecap="round"
              />
              {/* Arrowhead */}
              <Polygon
                points={`${CENTER},${arrowTipY - 6} ${CENTER - 4},${arrowTipY + 2} ${CENTER + 4},${arrowTipY + 2}`}
                fill="#FFFFFF"
              />
            </G>
          )}

          {/* Center: direction text */}
          <SvgText
            x={CENTER}
            y={CENTER + 5}
            fontSize={12}
            fontFamily="JetBrainsMono"
            fontWeight="700"
            fill={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)"}
            textAnchor="middle"
          >
            {`${String(direction).padStart(3, "0")}°`}
          </SvgText>
        </>
      )}
    </Svg>
  );
}
