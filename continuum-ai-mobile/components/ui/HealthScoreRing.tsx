import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HealthScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return Colors.accent;
  if (score >= 60) return Colors.primary;
  if (score >= 40) return Colors.warning;
  return Colors.critical;
}

export function HealthScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
}: HealthScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const color = getScoreColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceElevated}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Text style={[styles.scoreText, { color }]}>{score}</Text>
          <Text style={styles.label}>Health Score</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: FontSize['4xl'],
    fontFamily: FontFamily.display,
    lineHeight: 42,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
