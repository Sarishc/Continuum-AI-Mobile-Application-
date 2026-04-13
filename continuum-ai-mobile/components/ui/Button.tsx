import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '@/utils/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  SharedValue,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: object;
  leftIcon?: React.ReactNode;
}

// ── Loading dots ──────────────────────────────────────────────────────────────

function LoadingDots() {
  const dot1 = useSharedValue(1);
  const dot2 = useSharedValue(1);
  const dot3 = useSharedValue(1);

  React.useEffect(() => {
    const pulse = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.5, { duration: 300 }),
            withTiming(1, { duration: 300 }),
          ),
          -1,
          false,
        ),
      );
    };
    pulse(dot1, 0);
    pulse(dot2, 150);
    pulse(dot3, 300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ scale: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ scale: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ scale: dot3.value }] }));

  return (
    <View style={dotStyles.row}>
      <Animated.View style={[dotStyles.dot, s1]} />
      <Animated.View style={[dotStyles.dot, s2]} />
      <Animated.View style={[dotStyles.dot, s3]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
});

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isDisabled = disabled || loading;

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(0.85, { duration: 80 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 80 });
  }, []);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [isDisabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isDisabled ? 0.35 : opacity.value,
  }));

  const heights: Record<ButtonSize, number> = { sm: 44, md: 50, lg: 58 };
  const fontSizes: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 17 };
  const paddingH: Record<ButtonSize, number> = { sm: 16, md: 24, lg: 32 };

  const h = heights[size];
  const fs = fontSizes[size];
  const ph = paddingH[size];

  // ── PRIMARY (flat color, Apple style) ────────────────────────────────────────
  if (variant === 'primary') {
    return (
      <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[
            styles.base,
            styles.primary,
            { height: h, paddingHorizontal: ph },
          ]}
        >
          {leftIcon && !loading && <View style={styles.iconWrap}>{leftIcon}</View>}
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={[styles.primaryText, { fontSize: fs }, textStyle]}>{label}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── GHOST ────────────────────────────────────────────────────────────────────
  if (variant === 'ghost') {
    return (
      <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[styles.base, { height: h, paddingHorizontal: ph }]}
        >
          {leftIcon && !loading && <View style={styles.iconWrap}>{leftIcon}</View>}
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={[styles.ghostText, { fontSize: fs }, textStyle]}>{label}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── SECONDARY ────────────────────────────────────────────────────────────────
  if (variant === 'secondary') {
    return (
      <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[
            styles.base,
            styles.secondary,
            { height: h, paddingHorizontal: ph },
          ]}
        >
          {leftIcon && !loading && <View style={styles.iconWrap}>{leftIcon}</View>}
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={[styles.secondaryText, { fontSize: fs }, textStyle]}>{label}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── DANGER ───────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          styles.danger,
          { height: h, paddingHorizontal: ph },
        ]}
      >
        {leftIcon && !loading && <View style={styles.iconWrap}>{leftIcon}</View>}
        {loading ? (
          <LoadingDots />
        ) : (
          <Text style={[styles.primaryText, { fontSize: fs }, textStyle]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  iconWrap: {
    flexShrink: 0,
  },
  // Variants
  primary: {
    backgroundColor: Colors.primary,  // flat #4C8DFF — no gradient
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  danger: {
    backgroundColor: Colors.critical,
  },
  // Text
  primaryText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  secondaryText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  ghostText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: Colors.primary,
    letterSpacing: 0,
  },
});
