import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

const { width: W } = Dimensions.get('window');

const CARDS = [
  { label: 'HbA1c Elevation Detected',    border: Colors.warning, rotate: '-6deg', zIndex: 1, delay: 0 },
  { label: 'Blood Pressure Pattern Found', border: Colors.primary, rotate: '-2deg', zIndex: 2, delay: 100 },
  { label: 'All vitals normal today ✓',    border: Colors.accent,  rotate:  '0deg', zIndex: 3, delay: 200 },
];

function InsightPreviewCard({ label, borderColor, rotate, zIndex, delay }: {
  label: string; borderColor: string; rotate: string; zIndex: number; delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(380)}
      style={[styles.card, { borderLeftColor: borderColor, transform: [{ rotate }], zIndex }]}
    >
      <View style={[styles.cardDot, { backgroundColor: borderColor }]} />
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.cardBar} />
      <View style={[styles.cardBar, { width: '55%', opacity: 0.5 }]} />
    </Animated.View>
  );
}

export default function Step2() {
  return (
    <View style={styles.root}>
      {/* Stacked cards illustration */}
      <View style={styles.cardsArea}>
        {CARDS.map((c) => (
          <InsightPreviewCard
            key={c.label}
            label={c.label}
            borderColor={c.border}
            rotate={c.rotate}
            zIndex={c.zIndex}
            delay={c.delay}
          />
        ))}
      </View>

      <Animated.View entering={FadeInUp.delay(400).duration(380)} style={styles.textBlock}>
        <Text style={styles.heading}>{'Stay ahead of\nyour health.'}</Text>
        <Text style={styles.body}>
          Get proactive insights, track trends over time, and know when to act — before problems grow.
        </Text>
      </Animated.View>
    </View>
  );
}

const CARD_W = W * 0.72;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[6] },
  cardsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing[6],
    width: CARD_W + 40,
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  cardLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  cardBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, width: '80%' },
  textBlock: { flex: 1, alignItems: 'flex-start', justifyContent: 'flex-start', gap: Spacing[4], paddingBottom: Spacing[4] },
  heading: { fontSize: 36, fontFamily: FontFamily.display, color: Colors.textPrimary, lineHeight: 44 },
  body: { fontSize: FontSize.md, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, lineHeight: 24, maxWidth: 300 },
});
