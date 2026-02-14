import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  ClipPath,
  G,
  LinearGradient,
  Stop,
  Circle,
} from "react-native-svg";
import { getSunInfo } from "@/lib/minimums/night-vfr";
import { useTheme } from "@/theme/ThemeProvider";
import type { DaylightSettings } from "@/stores/daylight-store";

interface DaylightTimelineProps {
  lat: number;
  lon: number;
  date?: Date;
  settings?: DaylightSettings;
}

const BAR_W = 320;
const BAR_H = 24;
const TICK_LEN = 18;
const LABEL_OFFSET = 16;
const SVG_H = BAR_H + TICK_LEN + LABEL_OFFSET + 6;

const C_NIGHT = "#0d1b2a";
const C_TWILIGHT = "#ff8c42";
const C_DAY = "#87ceeb";
const C_CURRENCY = "#ff6b35";

function minsFromLocalMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function toX(d: Date): number {
  return Math.min(Math.max((minsFromLocalMidnight(d) / 1440) * BAR_W, 0), BAR_W);
}

// Generate deterministic star positions for night sections
function generateStars(
  section: { start: number; end: number },
  count: number
): Array<{ x: number; y: number; radius: number; opacity: number }> {
  const stars = [];
  const width = section.end - section.start;

  // Only add stars if section is wide enough (> 20px)
  if (width < 20) return [];

  for (let i = 0; i < count; i++) {
    // Deterministic spacing to avoid re-render position changes
    const x = section.start + (width / (count + 1)) * (i + 1) + ((i % 3) * 2 - 2);
    const y = 4 + ((i % 3) * 6); // Vary y position (4, 10, 16)

    stars.push({
      x,
      y,
      radius: 1 + (i % 2) * 0.5, // Alternate between 1px and 1.5px
      opacity: 0.4 + ((i % 4) * 0.1), // Vary opacity: 0.4, 0.5, 0.6, 0.7
    });
  }

  return stars;
}

export function DaylightTimeline({ lat, lon, date, settings }: DaylightTimelineProps) {
  const { theme } = useTheme();
  const checkDate = date ?? new Date();

  const info = useMemo(
    () => getSunInfo(lat, lon, checkDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lon, checkDate.toDateString()]
  );

  const xs = {
    twilightStart: toX(info.civilTwilightStartDate),
    sunrise: toX(info.sunriseDate),
    sunset: toX(info.sunsetDate),
    currency: toX(info.currencyNightDate),
    twilightEnd: toX(info.civilTwilightEndDate),
    now: toX(checkDate),
  };

  // Ordered segments filling the bar left-to-right
  const segments: [number, number, string][] = [
    [0, xs.twilightStart, C_NIGHT],
    [xs.twilightStart, xs.sunrise, C_TWILIGHT],
    [xs.sunrise, xs.sunset, C_DAY],
    [xs.sunset, xs.currency, C_CURRENCY],
    [xs.currency, xs.twilightEnd, C_TWILIGHT],
    [xs.twilightEnd, BAR_W, C_NIGHT],
  ];

  // Tick marks for named events (conditionally shown based on settings)
  // Only show NOW to prevent overlap - other times shown in legend and time chips
  const ticks: { x: number; label: string; color: string }[] = [
    { x: xs.now, label: "NOW", color: "#ffffff" },
  ];

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, { color: theme.foreground }]}>
          Daylight &amp; Night Currency
        </Text>
        <Text style={[styles.zulu, { color: theme.mutedForeground }]}>
          {info.sunrise} – {info.sunset}
        </Text>
      </View>

      <Svg
        width={BAR_W}
        height={SVG_H}
        style={styles.svg}
        aria-label={`Daylight timeline showing sunrise at ${info.sunrise}Z, sunset at ${info.sunset}Z, and night currency period`}
      >
        <Defs>
          <ClipPath id="roundedBar">
            <Rect x={0} y={0} width={BAR_W} height={BAR_H} rx={6} ry={6} />
          </ClipPath>

          {/* Smooth gradient: Night → Twilight → Day → Twilight → Night */}
          <LinearGradient id="daylightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {/* Night (start of day) */}
            <Stop offset="0%" stopColor="#0d1b2a" />
            <Stop offset={`${(xs.twilightStart / BAR_W) * 100}%`} stopColor="#0d1b2a" />

            {/* Night → Morning Twilight transition (smooth blend) */}
            <Stop offset={`${((xs.twilightStart + 2) / BAR_W) * 100}%`} stopColor="#ff8c42" />

            {/* Morning twilight (orange) */}
            <Stop offset={`${((xs.sunrise - 2) / BAR_W) * 100}%`} stopColor="#ff8c42" />

            {/* Morning Twilight → Day transition (smooth blend) */}
            <Stop offset={`${((xs.sunrise + 2) / BAR_W) * 100}%`} stopColor="#87ceeb" />

            {/* Day (light blue) */}
            <Stop offset={`${((xs.sunset - 2) / BAR_W) * 100}%`} stopColor="#87ceeb" />

            {/* Day → Evening Twilight transition (smooth blend) */}
            <Stop offset={`${((xs.sunset + 2) / BAR_W) * 100}%`} stopColor="#ff8c42" />

            {/* Evening twilight (orange) */}
            <Stop offset={`${((xs.twilightEnd - 2) / BAR_W) * 100}%`} stopColor="#ff8c42" />

            {/* Evening Twilight → Night transition (smooth blend) */}
            <Stop offset={`${((xs.twilightEnd + 2) / BAR_W) * 100}%`} stopColor="#0d1b2a" />

            {/* Night (end of day) */}
            <Stop offset="100%" stopColor="#0d1b2a" />
          </LinearGradient>
        </Defs>

        {/* Gradient-filled bar */}
        <G clipPath="url(#roundedBar)">
          <Rect
            x={0}
            y={0}
            width={BAR_W}
            height={BAR_H}
            fill="url(#daylightGradient)"
          />

          {/* Stars in night sections */}
          {generateStars({ start: 0, end: xs.twilightStart }, 8).map((star, i) => (
            <Circle
              key={`star-morning-${i}`}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill="#ffffff"
              opacity={star.opacity}
            />
          ))}
          {generateStars({ start: xs.twilightEnd, end: BAR_W }, 8).map((star, i) => (
            <Circle
              key={`star-evening-${i}`}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill="#ffffff"
              opacity={star.opacity}
            />
          ))}
        </G>

        {/* Tick marks and labels below the bar */}
        {ticks.map(({ x, label, color }) => (
          <React.Fragment key={label}>
            <Line
              x1={x}
              y1={BAR_H}
              x2={x}
              y2={BAR_H + TICK_LEN}
              stroke={color}
              strokeWidth={3}
            />
            {/* Background rectangle for better readability */}
            <Rect
              x={x - (label.length * 5.5)}
              y={BAR_H + TICK_LEN + LABEL_OFFSET - 11}
              width={label.length * 11}
              height={16}
              fill="rgba(0, 0, 0, 0.75)"
              rx={3}
            />
            <SvgText
              x={x}
              y={BAR_H + TICK_LEN + LABEL_OFFSET + 1}
              textAnchor="middle"
              fill={color}
              fontSize={11}
              fontWeight="700"
            >
              {label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>

      {/* Legend row */}
      <View style={styles.legend}>
        <LegendItem color={C_NIGHT} label="Night" muted={theme.mutedForeground} />
        <LegendItem color={C_TWILIGHT} label="Twilight" muted={theme.mutedForeground} />
        <LegendItem color={C_DAY} label="Daylight" muted={theme.mutedForeground} />
        <LegendItem color={C_CURRENCY} label="Landing Currency" muted={theme.mutedForeground} />
      </View>

      {/* Key times row */}
      <View style={styles.timesRow}>
        <TimeChip
          label="Night Logging"
          value={info.logbookNight}
          color="#8ab4f8"
          textColor={theme.foreground}
          mutedColor={theme.mutedForeground}
        />
        <TimeChip
          label="Night Landings"
          value={info.currencyNight}
          color="#ff6b35"
          textColor={theme.foreground}
          mutedColor={theme.mutedForeground}
        />
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  muted,
}: {
  color: string;
  label: string;
  muted: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

function TimeChip({
  label,
  value,
  color,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  color: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.chipLabel, { color: mutedColor }]}>{label}</Text>
        <Text style={[styles.chipValue, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  zulu: {
    fontSize: 11,
    fontFamily: "JetBrainsMono_400Regular",
  },
  svg: {
    alignSelf: "center",
  },
  legend: {
    flexDirection: "row",
    gap: 18,
    marginTop: 6,
    alignSelf: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  timesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.15)",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  chipValue: {
    fontSize: 13,
    fontFamily: "JetBrainsMono_700Bold",
    marginTop: 1,
  },
});
