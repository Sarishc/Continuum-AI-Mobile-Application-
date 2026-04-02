import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { BorderRadius } from '../../constants/theme';

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
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulse,
        animatedStyle,
        { width: width as number, height, borderRadius },
        style,
      ]}
    />
  );
}

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
          borderRadius: BorderRadius.lg,
          padding: 16,
          gap: 10,
          borderWidth: 1,
          borderColor: Colors.border,
        },
        style,
      ]}
    >
      <LoadingPulse height={14} width="60%" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <LoadingPulse
          key={i}
          height={12}
          width={i === lines - 2 ? '40%' : '100%'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pulse: {
    backgroundColor: Colors.surfaceElevated,
  },
});
