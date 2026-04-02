import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Shadow } from '../../constants/theme';

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
  textStyle?: TextStyle;
}

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
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: 16 },
    md: { height: 48, paddingHorizontal: 24 },
    lg: { height: 56, paddingHorizontal: 32 },
  }[size];

  const textSizes = {
    sm: FontSize.sm,
    md: FontSize.md,
    lg: FontSize.lg,
  }[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[
          styles.base,
          sizeStyles,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          Shadow.blue,
          style,
        ]}
      >
        <LinearGradient
          colors={Colors.gradientBlue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: BorderRadius.md }]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textPrimary} size="small" />
          ) : (
            <Text style={[styles.text, { fontSize: textSizes }, textStyle]}>
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle = {
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger,
  }[variant];

  const variantTextStyle = {
    secondary: styles.secondaryText,
    ghost: styles.ghostText,
    danger: styles.dangerText,
  }[variant];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        sizeStyles,
        variantStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <Text
          style={[styles.text, variantTextStyle, { fontSize: textSizes }, textStyle]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bodySemiBold,
    letterSpacing: 0.2,
  },
  secondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.textPrimary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.critical,
  },
  dangerText: {
    color: Colors.textPrimary,
  },
});
