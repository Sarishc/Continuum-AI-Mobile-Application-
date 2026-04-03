import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/theme';

// ─── Single shimmer skeleton ──────────────────────────────────────────────────

interface LoadingPulseProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function LoadingPulse({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: LoadingPulseProps) {
  const translateX = useSharedValue(-1.2);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1.2, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    // Use percentage-based translation by converting to a transform
    transform: [{ translateX: translateX.value * 150 }],
  }));

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.045)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ─── Loading card (multiple shimmer lines) ────────────────────────────────────

interface LoadingCardProps {
  lines?: number;
  style?: ViewStyle;
}

export function LoadingCard({ lines = 3, style }: LoadingCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.xl,
          borderWidth: 1,
          borderColor: Colors.rim,
          padding: Spacing[4],
          gap: Spacing[3],
        },
        style,
      ]}
    >
      <LoadingPulse height={14} width="60%" borderRadius={7} />
      {Array.from({ length: Math.max(lines - 1, 0) }).map((_, i) => (
        <LoadingPulse
          key={i}
          height={12}
          borderRadius={6}
          width={i === lines - 2 ? '40%' : '100%'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
});
