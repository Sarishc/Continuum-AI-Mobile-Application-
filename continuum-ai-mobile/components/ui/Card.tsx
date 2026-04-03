import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

type CardVariant = 'base' | 'elevated' | 'glass' | 'metric';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  accentColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
  // Legacy props kept for backward compatibility
  elevated?: boolean;
  noPadding?: boolean;
}

export function Card({
  children,
  variant,
  accentColor,
  style,
  onPress,
  elevated,
  noPadding,
}: CardProps) {
  // Resolve variant (support legacy `elevated` bool)
  const resolvedVariant: CardVariant = variant ?? (elevated ? 'elevated' : 'base');

  const inner = (
    <CardInner
      variant={resolvedVariant}
      accentColor={accentColor}
      noPadding={noPadding}
      style={style}
    >
      {children}
    </CardInner>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

function CardInner({
  children,
  variant,
  accentColor,
  noPadding,
  style,
}: {
  children: React.ReactNode;
  variant: CardVariant;
  accentColor?: string;
  noPadding?: boolean;
  style?: ViewStyle;
}) {
  const padding = noPadding ? 0 : 16;

  // ── GLASS ──────────────────────────────────────────────────────────────────
  if (variant === 'glass') {
    return (
      <View
        style={[
          styles.base,
          styles.glassBorder,
          { borderRadius: 20, overflow: 'hidden' },
          style,
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill]}
        />
        <View style={{ padding }}>{children}</View>
      </View>
    );
  }

  // ── METRIC ─────────────────────────────────────────────────────────────────
  if (variant === 'metric') {
    const barColor = accentColor ?? Colors.primary;
    return (
      <View style={[styles.elevated, styles.elevatedShadow, { borderRadius: 20, overflow: 'hidden' }, style]}>
        {/* Left accent bar */}
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor: barColor,
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
            },
          ]}
        />
        <View style={{ flex: 1, padding }}>{children}</View>
      </View>
    );
  }

  // ── ELEVATED ───────────────────────────────────────────────────────────────
  if (variant === 'elevated') {
    return (
      <View style={[styles.elevated, styles.elevatedShadow, { padding }, style]}>
        {children}
      </View>
    );
  }

  // ── BASE (default) ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.base, { padding }, style]}>
      {/* Top inner highlight */}
      <View style={styles.topHighlight} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#14161E',
    borderWidth: 1,
    borderColor: '#252838',
    borderRadius: 20,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    height: 1,
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    zIndex: 1,
    pointerEvents: 'none',
  } as ViewStyle,
  elevated: {
    backgroundColor: '#1A1D27',
    borderWidth: 1,
    borderColor: '#353852',
    borderRadius: 20,
    flexDirection: 'row',
  },
  elevatedShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
  glassBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
});
