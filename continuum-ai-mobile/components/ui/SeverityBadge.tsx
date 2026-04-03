import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import type { SeverityLevel } from '../../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  style?: ViewStyle;
}

const severityConfig: Record<SeverityLevel, {
  label: string;
  color: string;
  bg: string;
  border: string;
  shadow: string;
}> = {
  critical: {
    label: 'Critical',
    color: Colors.critical,
    bg: Colors.criticalGlow,
    border: 'rgba(255,79,107,0.35)',
    shadow: Colors.critical,
  },
  high: {
    label: 'High',
    color: Colors.caution,
    bg: Colors.cautionGlow,
    border: 'rgba(255,181,71,0.35)',
    shadow: Colors.caution,
  },
  moderate: {
    label: 'Moderate',
    color: Colors.electric,
    bg: Colors.electricGlow,
    border: 'rgba(79,126,255,0.35)',
    shadow: Colors.electric,
  },
  low: {
    label: 'Low',
    color: Colors.positive,
    bg: Colors.positiveGlow,
    border: 'rgba(0,200,150,0.35)',
    shadow: Colors.positive,
  },
};

export function SeverityBadge({ severity, style }: SeverityBadgeProps) {
  const cfg = severityConfig[severity] ?? severityConfig.moderate;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
        Platform.OS === 'ios' && {
          shadowColor: cfg.shadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
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
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.displayMedium,
    letterSpacing: 0.2,
  },
});
