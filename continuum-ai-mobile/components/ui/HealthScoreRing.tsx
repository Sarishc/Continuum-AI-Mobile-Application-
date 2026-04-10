import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withSequence,
  withTiming,
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
  if (score >= 80) return Colors.positive;
  if (score >= 60) return Colors.electric;
  if (score >= 40) return Colors.caution;
  return Colors.critical;
}

export function HealthScoreRing({ score, size = 140, animated = true }: HealthScoreRingProps) {
  const strokeWidth = 10;
  const glowWidth = 22;
  const trackWidth = 3;

  // Layout uses the max strokeWidth to determine the ring's outer bounds
  const ringOffset = glowWidth / 2 + 2;
  const radius = (size - ringOffset * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const progress = useSharedValue(animated ? 0 : score / 100);

  useEffect(() => {
    if (!animated) {
      progress.value = score / 100;
      return;
    }
    // Overshoot slightly then settle — gives a "snapping in" feel
    progress.value = withSequence(
      withSpring(Math.min(score + 6, 100) / 100, {
        damping: 14,
        stiffness: 80,
        mass: 1,
      }),
      withTiming(score / 100, { duration: 300 }),
    );
  }, [score, animated]);

  const animatedScoreProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Rotating dashed outer ring (RN Animated for infinite rotation)
  const rotation = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    RNAnimated.loop(
      RNAnimated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, [animated]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const color = getScoreColor(score);
  const scoreInt = Math.round(score);

  // Build 12 dashes for the outer rotating ring
  const outerR = size / 2 - 3;
  const dashCount = 12;
  const dashLen = (2 * Math.PI * outerR) / dashCount / 2;
  const dashGap = (2 * Math.PI * outerR) / dashCount - dashLen;

  return (
    <View style={{ width: size, height: size }}>
      {/* Glow ring (behind everything) */}
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={glowWidth}
          fill="none"
          opacity={0.12}
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>

      {/* Track + Score rings */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.elevated}
          strokeWidth={trackWidth}
          fill="none"
        />
        {/* Animated score arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedScoreProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>

      {/* Rotating dashed outer ring */}
      <RNAnimated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: spin }] },
        ]}
        pointerEvents="none"
      >
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={outerR}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            opacity={0.25}
            strokeDasharray={`${dashLen} ${dashGap}`}
          />
        </Svg>
      </RNAnimated.View>

      {/* Center content */}
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreText, { color }]}>{scoreInt}</Text>
          <Text style={styles.outOf}>{'\u00A0'}/ 100</Text>
        </View>
        <Text style={styles.label}>HEALTH SCORE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 38,
    fontFamily: FontFamily.displayExtraBold,
    lineHeight: 42,
    letterSpacing: -1,
  },
  outOf: {
    fontSize: 14,
    fontFamily: FontFamily.displayRegular,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  label: {
    fontSize: 9,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
