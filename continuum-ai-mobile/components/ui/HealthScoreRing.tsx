import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedReaction,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HealthScoreRingProps {
  score: number;
  size?: number;
  animated?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return Colors.vital;
  if (score >= 60) return Colors.primary;
  if (score >= 40) return Colors.alert;
  return Colors.critical;
}

// Orbit chip data
const ORBIT_CHIPS = [
  { icon: '❤️', angle: 320 },  // right
  { icon: '💊', angle: 200 },  // lower-left
  { icon: '⚡', angle: 80 },   // upper-left
] as const;

interface OrbitChipProps {
  icon: string;
  value: string;
  label: string;
  angle: number;
  cx: number;
  cy: number;
  orbitRadius: number;
  visible: boolean;
}

function OrbitChip({ icon, value, label, angle, cx, cy, orbitRadius, visible }: OrbitChipProps) {
  const rad = (angle * Math.PI) / 180;
  const x = cx + orbitRadius * Math.cos(rad);
  const y = cy + orbitRadius * Math.sin(rad);

  if (!visible) return null;

  return (
    <View
      style={[
        chipStyles.chip,
        {
          position: 'absolute',
          left: x - 26,
          top: y - 20,
        },
      ]}
    >
      <Text style={chipStyles.icon}>{icon}</Text>
      <Text style={chipStyles.value}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    width: 52,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  icon: {
    fontSize: 12,
    lineHeight: 14,
  },
  value: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textSecondary,
    lineHeight: 12,
  },
});

export function HealthScoreRing({
  score,
  size = 160,
  animated = true,
}: HealthScoreRingProps) {
  const strokeWidth = 12;
  const trackWidth = 3;

  // Ring geometry
  const padding = strokeWidth / 2 + 2;
  const radius = (size - padding * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const color = getScoreColor(score);
  const gradientId = `scoreGrad-${score}`;

  // Animated progress (0 → score/100 with spring overshoot)
  const progress = useSharedValue(animated ? 0 : score / 100);

  // Count-up displayed number
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const [chipsVisible, setChipsVisible] = useState(!animated);

  const setDisplay = (v: number) => {
    setDisplayScore(Math.round(v * score));
  };
  const showChips = () => setChipsVisible(true);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(current);
    },
    [score]
  );

  useEffect(() => {
    if (!animated) {
      progress.value = score / 100;
      return;
    }

    // Overshoot to score+4% then settle
    const overshoot = Math.min((score + 4) / 100, 1);
    progress.value = withSequence(
      withSpring(overshoot, { damping: 14, stiffness: 80, mass: 1 }),
      withTiming(score / 100, { duration: 280, easing: Easing.out(Easing.ease) })
    );

    // Show orbit chips after ring finishes
    const timer = setTimeout(() => showChips(), 1400);
    return () => clearTimeout(timer);
  }, [score, animated]);

  // Animated arc props
  const animatedArcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Glowing endpoint dot position (end of arc)
  const animatedDotProps = useAnimatedProps(() => {
    const angle = -Math.PI / 2 + 2 * Math.PI * progress.value;
    return {
      cx: cx + radius * Math.cos(angle),
      cy: cy + radius * Math.sin(angle),
    };
  });

  // Orbit chip values — pulled from HealthStore externally via props or defaults
  const orbitRadius = size / 2 + 28;

  return (
    <View style={{ width: size + 56, height: size + 56, alignItems: 'center', justifyContent: 'center' }}>
      {/* Orbit chips — positioned relative to ring center */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' } as any]}>
        <View style={{ width: size, height: size, position: 'relative' }}>
          {ORBIT_CHIPS.map((chip, i) => (
            <OrbitChip
              key={i}
              icon={chip.icon}
              value={i === 0 ? '72' : i === 1 ? '2' : '5'}
              label={i === 0 ? 'BPM' : i === 1 ? 'meds' : 'days'}
              angle={chip.angle}
              cx={size / 2}
              cy={size / 2}
              orbitRadius={size / 2 + 28}
              visible={chipsVisible}
            />
          ))}
        </View>
      </View>

      {/* Ring SVG */}
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </LinearGradient>
        </Defs>

        {/* Ambient glow ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={20}
          fill="none"
          opacity={0.06}
        />

        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={trackWidth}
          fill="none"
        />

        {/* Animated score arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedArcProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
        />

        {/* Glowing endpoint dot — opacity baked into animatedProps */}
        <AnimatedCircle
          r={6}
          fill={color}
          animatedProps={animatedDotProps}
        />
        {/* Dot glow (larger, lower opacity) */}
        <AnimatedCircle
          r={10}
          fill={color}
          opacity={0.3}
          animatedProps={animatedDotProps}
        />
      </Svg>

      {/* Center content */}
      <View style={[StyleSheet.absoluteFill, centerStyles.center, { pointerEvents: 'none' } as any]}>
        <View style={centerStyles.scoreRow}>
          <Text style={[centerStyles.scoreNumber, { color }]}>{displayScore}</Text>
          <Text style={centerStyles.outOf}>{'\u00A0'}/ 100</Text>
        </View>
        <Text style={centerStyles.label}>HEALTH SCORE</Text>
      </View>
    </View>
  );
}

const centerStyles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 52,
    fontFamily: FontFamily.brand,
    letterSpacing: -2,
    lineHeight: 56,
  },
  outOf: {
    fontSize: 16,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
    lineHeight: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
