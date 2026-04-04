import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

const { width: W } = Dimensions.get('window');

const CARDS = [
  {
    label: 'HbA1c Elevation Detected',
    sublabel: 'Trending upward — review diet',
    border: Colors.critical,
    dot: Colors.critical,
    rotate: '-5deg',
    top: 0,
    zIndex: 1,
    delay: 0,
  },
  {
    label: 'Blood Pressure Pattern Found',
    sublabel: 'Mild hypertension risk flagged',
    border: Colors.caution,
    dot: Colors.caution,
    rotate: '-1.5deg',
    top: 44,
    zIndex: 2,
    delay: 120,
  },
  {
    label: 'All vitals normal today',
    sublabel: 'No concerns detected ✓',
    border: Colors.positive,
    dot: Colors.positive,
    rotate: '0deg',
    top: 88,
    zIndex: 3,
    delay: 240,
  },
];

const CARD_W = W * 0.78;

function InsightPreviewCard({
  label, sublabel, border, dot, rotate, top, zIndex, delay,
}: {
  label: string; sublabel: string; border: string; dot: string;
  rotate: string; top: number; zIndex: number; delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420).springify()}
      style={[
        styles.card,
        {
          borderLeftColor: border,
          transform: [{ rotate }],
          zIndex,
          top,
        },
      ]}
    >
      <View style={styles.cardInner}>
        <View style={[styles.cardDot, { backgroundColor: dot }]} />
        <View style={styles.cardBody}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardSub}>{sublabel}</Text>
        </View>
      </View>
      <View style={styles.cardBars}>
        <View style={[styles.cardBar, { width: '82%', backgroundColor: `${border}28` }]} />
        <View style={[styles.cardBar, { width: '55%', backgroundColor: `${border}18` }]} />
      </View>
    </Animated.View>
  );
}

export default function Step2() {
  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.obsidian, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Stacked cards */}
      <View style={styles.cardsArea}>
        {CARDS.map((c) => (
          <InsightPreviewCard key={c.label} {...c} />
        ))}
      </View>

      {/* Text block */}
      <Animated.View entering={FadeInUp.delay(460).duration(420)} style={styles.textBlock}>
        <Text style={styles.heading}>
          {'STAY AHEAD OF\n'}
          <Text style={{ color: Colors.electric }}>{'YOUR HEALTH.'}</Text>
        </Text>
        <Text style={styles.body}>
          Get proactive insights, track trends over time, and know when to act — before problems grow.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    overflow: 'hidden',
  },
  cardsArea: {
    flex: 1,
    width: CARD_W + 40,
    justifyContent: 'flex-end',
    paddingBottom: Spacing[6],
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing[4],
    gap: Spacing[2],
    // Glass shimmer effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardBody: { flex: 1, gap: 3 },
  cardLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  cardBars: { gap: Spacing[1], marginTop: 2 },
  cardBar: { height: 5, borderRadius: 3 },
  textBlock: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: Spacing[4],
    paddingBottom: Spacing[4],
  },
  heading: {
    fontSize: 34,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    lineHeight: 42,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 24,
    maxWidth: 300,
  },
});
