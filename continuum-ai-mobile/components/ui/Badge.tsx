import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';

type BadgeVariant = 'primary' | 'accent' | 'warning' | 'critical' | 'purple' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: 'rgba(56, 139, 253, 0.15)', text: Colors.primary },
  accent: { bg: 'rgba(63, 185, 80, 0.15)', text: Colors.accent },
  warning: { bg: 'rgba(210, 153, 34, 0.15)', text: Colors.warning },
  critical: { bg: 'rgba(248, 81, 73, 0.15)', text: Colors.critical },
  purple: { bg: 'rgba(188, 140, 255, 0.15)', text: Colors.purple },
  muted: { bg: Colors.surfaceElevated, text: Colors.textSecondary },
};

export function Badge({ label, variant = 'muted', style }: BadgeProps) {
  const config = variantConfig[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        style,
      ]}
    >
      <Text style={[styles.label, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    letterSpacing: 0.3,
  },
});
