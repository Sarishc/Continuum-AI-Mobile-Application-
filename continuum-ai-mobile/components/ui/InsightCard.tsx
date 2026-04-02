import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import { SeverityBadge } from './SeverityBadge';
import { Badge } from './Badge';
import type { Insight } from '../../types';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onDismiss?: () => void;
}

const categoryLabels: Record<string, string> = {
  pattern: 'Pattern',
  risk: 'Risk',
  recommendation: 'Recommendation',
  correlation: 'Correlation',
  milestone: 'Milestone',
};

const categoryVariant: Record<string, 'primary' | 'warning' | 'critical' | 'accent' | 'purple'> = {
  pattern: 'primary',
  risk: 'critical',
  recommendation: 'accent',
  correlation: 'purple',
  milestone: 'accent',
};

export function InsightCard({ insight, onPress, onDismiss }: InsightCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.card}
    >
      <View style={styles.header}>
        <Badge
          label={categoryLabels[insight.category] ?? insight.category}
          variant={categoryVariant[insight.category] ?? 'muted'}
        />
        <SeverityBadge severity={insight.severity} />
      </View>

      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {insight.summary}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.confidence}>
          {Math.round(insight.confidence * 100)}% confidence
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  header: {
    flexDirection: 'row',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  title: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  summary: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[1],
  },
  confidence: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  dismiss: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
});
