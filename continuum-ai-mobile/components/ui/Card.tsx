import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../constants/colors';

// BlurView only on native — web uses a plain rgba fallback
let BlurView: React.ComponentType<{ intensity: number; tint: string; style?: any; children?: React.ReactNode }> | null = null;
if (Platform.OS !== 'web') {
  try {
    BlurView = require('expo-blur').BlurView;
  } catch {
    BlurView = null;
  }
}

type CardVariant = 'base' | 'elevated' | 'glass' | 'metric' | 'data';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  accentColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
  // Legacy props
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

  // ── GLASS (primary card type) ───────────────────────────────────────────────
  // Native: BlurView + rgba overlay
  // Web: rgba background only (BlurView unavailable on web)
  if (variant === 'glass') {
    if (BlurView && Platform.OS !== 'web') {
      return (
        <BlurView
          intensity={12}
          tint="dark"
          style={[styles.glassContainer, style]}
        >
          {/* rgba overlay on top of blur */}
          <View style={styles.glassOverlay} />
          {/* Top-edge inner highlight */}
          <View style={styles.glassHighlight} />
          <View style={{ padding }}>{children}</View>
        </BlurView>
      );
    }
    // Web fallback
    return (
      <View style={[styles.glassContainer, styles.glassWebFallback, style]}>
        <View style={styles.glassHighlight} />
        <View style={{ padding }}>{children}</View>
      </View>
    );
  }

  // ── DATA (large content blocks) ─────────────────────────────────────────────
  if (variant === 'data') {
    if (BlurView && Platform.OS !== 'web') {
      return (
        <BlurView intensity={8} tint="dark" style={[styles.dataContainer, style]}>
          <View style={styles.glassOverlayData} />
          <View style={styles.glassHighlight} />
          <View style={{ padding: noPadding ? 0 : 20 }}>{children}</View>
        </BlurView>
      );
    }
    return (
      <View style={[styles.dataContainer, styles.dataWebFallback, style]}>
        <View style={styles.glassHighlight} />
        <View style={{ padding: noPadding ? 0 : 20 }}>{children}</View>
      </View>
    );
  }

  // ── METRIC ──────────────────────────────────────────────────────────────────
  if (variant === 'metric') {
    const barColor = accentColor ?? Colors.primary;
    return (
      <View style={[styles.glassContainer, styles.glassWebFallback, { flexDirection: 'row' }, style]}>
        <View
          style={[
            styles.accentBar,
            { backgroundColor: barColor, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
          ]}
        />
        <View style={styles.glassHighlight} />
        <View style={{ flex: 1, padding }}>{children}</View>
      </View>
    );
  }

  // ── ELEVATED ────────────────────────────────────────────────────────────────
  if (variant === 'elevated') {
    return (
      <View style={[styles.elevatedContainer, style]}>
        <View style={styles.glassHighlight} />
        <View style={{ padding }}>{children}</View>
      </View>
    );
  }

  // ── BASE (default) ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.baseContainer, { padding }, style]}>
      <View style={styles.glassHighlight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Glass (primary) ──────────────────────────────────────────────────────────
  glassContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  glassWebFallback: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 1,
  } as ViewStyle,

  // ── Data ─────────────────────────────────────────────────────────────────────
  dataContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    overflow: 'hidden',
  },
  glassOverlayData: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  dataWebFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── Elevated ──────────────────────────────────────────────────────────────────
  elevatedContainer: {
    backgroundColor: Colors.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Base ─────────────────────────────────────────────────────────────────────
  baseContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Accent bar (metric) ───────────────────────────────────────────────────────
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
});
