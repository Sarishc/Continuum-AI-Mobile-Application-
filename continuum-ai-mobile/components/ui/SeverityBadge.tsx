import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import type { SeverityLevel } from '../../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  style?: ViewStyle;
}

const severityConfig: Record<SeverityLevel, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: Colors.accent, bg: 'rgba(63, 185, 80, 0.12)' },
  moderate: { label: 'Moderate', color: Colors.warning, bg: 'rgba(210, 153, 34, 0.12)' },
  high: { label: 'High', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.12)' },
  critical: { label: 'Critical', color: Colors.critical, bg: 'rgba(248, 81, 73, 0.12)' },
};

export function SeverityBadge({ severity, style }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    letterSpacing: 0.3,
  },
});
