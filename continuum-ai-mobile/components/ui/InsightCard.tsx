import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import type { Insight } from '../../types';

// ─── Severity config ──────────────────────────────────────────────────────────

type SeverityKey = 'critical' | 'high' | 'moderate' | 'low';

const severityAccent: Record<SeverityKey, string> = {
  critical: Colors.critical,
  high: Colors.caution,
  moderate: Colors.electric,
  low: Colors.positive,
};

// ─── Unread pulsing dot ───────────────────────────────────────────────────────

function UnreadDot() {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.parallel([
        RNAnimated.sequence([
          RNAnimated.timing(scale, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          RNAnimated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        RNAnimated.sequence([
          RNAnimated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          RNAnimated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <RNAnimated.View
      style={[
        styles.unreadDot,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── InsightCard ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onDismiss?: () => void;
  healthCategory?: string;
  confidence?: number;
  timeAgo?: string;
}

export function InsightCard({
  insight,
  onPress,
  onDismiss,
  healthCategory,
  confidence,
  timeAgo,
}: InsightCardProps) {
  const severity = (insight.severity as SeverityKey) ?? 'moderate';
  const accentColor = severityAccent[severity] ?? Colors.electric;
  const isUnread = !insight.is_read;
  const confidenceVal = confidence ?? Math.round((insight.confidence ?? 0.8) * 100);
  const categoryLabel = (healthCategory ?? insight.category ?? 'insight').toUpperCase();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.card}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Unread indicator */}
      {isUnread && (
        <View style={styles.unreadWrap} pointerEvents="none">
          <UnreadDot />
        </View>
      )}

      <View style={styles.content}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.categoryRow}>
            <View style={[styles.severityDot, { backgroundColor: accentColor }]} />
            <Text style={styles.categoryLabel}>{categoryLabel}</Text>
          </View>
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>{confidenceVal}% confident</Text>
          </View>
        </View>

        {/* Insight text */}
        <Text style={styles.title} numberOfLines={3}>{insight.title}</Text>
        {insight.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{insight.summary}</Text>
        ) : null}

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <Text style={styles.timeAgo}>{timeAgo ?? '—'}</Text>
          <Text style={styles.viewDetails}>View details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.elevated,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.rim,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  unreadWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.electric,
  },
  content: {
    flex: 1,
    padding: Spacing[4],
    gap: Spacing[2],
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  confidencePill: {
    backgroundColor: Colors.electricMist,
    borderWidth: 1,
    borderColor: Colors.electricGlow,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
  },

  // Middle
  title: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  summary: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  viewDetails: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
  },
});
