import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

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
    const pulse = (sv: Animated.SharedValue<number>, delay: number) => {
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textPrimary },
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
  const isSecondaryPressed = useSharedValue(0);

  const isDisabled = disabled || loading;

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 300 });
    if (variant === 'secondary') isSecondaryPressed.value = withTiming(1, { duration: 80 });
  }, [variant]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 300 });
    if (variant === 'secondary') isSecondaryPressed.value = withTiming(0, { duration: 80 });
  }, [variant]);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [isDisabled, onPress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const secondaryBgStyle = useAnimatedStyle(() => ({
    backgroundColor: isSecondaryPressed.value === 1
      ? Colors.primaryMist
      : 'transparent',
    borderColor: isSecondaryPressed.value === 1
      ? Colors.primaryBright
      : Colors.rim,
  }));

  const heights: Record<ButtonSize, number> = { sm: 44, md: 52, lg: 60 };
  const fontSizes: Record<ButtonSize, number> = { sm: FontSize.sm, md: FontSize.md, lg: FontSize.lg };
  const paddingH: Record<ButtonSize, number> = { sm: 16, md: 24, lg: 32 };

  const h = heights[size];
  const fs = fontSizes[size];
  const ph = paddingH[size];

  // ── PRIMARY ─────────────────────────────────────────────────────────────────
  if (variant === 'primary') {
    return (
      <Animated.View
        style={[
          animatedContainerStyle,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabledOpacity,
          style,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[styles.base, { height: h, borderRadius: 9999 }]}
        >
          <LinearGradient
            colors={['#4F7EFF', '#3560E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: 9999 },
            ]}
          />
          <View
            style={[
              styles.content,
              { paddingHorizontal: ph },
              !isDisabled && Platform.OS === 'ios' && styles.electricShadow,
            ]}
          >
            {leftIcon && !loading && (
              <View style={styles.iconWrap}>{leftIcon}</View>
            )}
            {loading ? (
              <LoadingDots />
            ) : (
              <Text style={[styles.primaryText, { fontSize: fs }, textStyle]}>
                {label}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // ── GHOST ───────────────────────────────────────────────────────────────────
  if (variant === 'ghost') {
    return (
      <Animated.View
        style={[animatedContainerStyle, fullWidth && styles.fullWidth, isDisabled && styles.disabledOpacity, style]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[styles.base, { height: h, paddingHorizontal: ph }]}
        >
          {leftIcon && !loading && (
            <View style={styles.iconWrap}>{leftIcon}</View>
          )}
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={[styles.ghostText, { fontSize: fs }, textStyle]}>{label}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── SECONDARY & DANGER ──────────────────────────────────────────────────────
  const isDanger = variant === 'danger';

  return (
    <Animated.View
      style={[animatedContainerStyle, fullWidth && styles.fullWidth, isDisabled && styles.disabledOpacity, style]}
    >
      <Animated.View
        style={[
          styles.base,
          { height: h, borderRadius: 9999, borderWidth: 1, overflow: 'hidden' },
          isDanger
            ? { backgroundColor: Colors.critical, borderColor: Colors.critical }
            : secondaryBgStyle,
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[styles.content, { paddingHorizontal: ph }]}
        >
          {leftIcon && !loading && (
            <View style={styles.iconWrap}>{leftIcon}</View>
          )}
          {loading ? (
            <LoadingDots />
          ) : (
            <Text
              style={[
                isDanger ? styles.primaryText : styles.secondaryText,
                { fontSize: fs },
                textStyle,
              ]}
            >
              {label}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    alignSelf: 'stretch',
  },
  fullWidth: {
    width: '100%',
  },
  disabledOpacity: {
    opacity: 0.35,
  },
  iconWrap: {
    flexShrink: 0,
  },
  primaryText: {
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  secondaryText: {
    fontFamily: FontFamily.displayMedium,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  ghostText: {
    fontFamily: FontFamily.displayMedium,
    color: Colors.primary,
    letterSpacing: 0.2,
    textDecorationLine: 'none',
  },
  electricShadow: {
    shadowColor: '#4F7EFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  } as ViewStyle,
});
