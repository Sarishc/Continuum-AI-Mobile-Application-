import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useHealthStore } from '../../store/healthStore';
import { HealthScoreRing } from '../../components/ui/HealthScoreRing';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { healthScore, insights } = useHealthStore();

  const activeInsights = insights.filter((i) => !i.dismissed).slice(0, 3);
  const greeting = getGreeting();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{user?.name ?? 'there'}</Text>
          </View>
          <Avatar name={user?.name} uri={undefined} size="md" />
        </View>

        {/* Health Score */}
        <Card style={styles.scoreCard} elevated>
          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreSectionLabel}>Health Score</Text>
              <Text style={styles.scoreDescription}>
                Based on your recent activity and vitals.
              </Text>
              <Badge
                label={healthScore >= 70 ? 'Good standing' : 'Needs attention'}
                variant={healthScore >= 70 ? 'accent' : 'warning'}
              />
            </View>
            <HealthScoreRing score={healthScore || 74} size={120} strokeWidth={9} />
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Entries this week" value="0" />
          <StatCard label="Active insights" value={String(activeInsights.length)} />
          <StatCard label="Days tracked" value="1" />
        </View>

        {/* Recent Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>
          {activeInsights.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                No insights yet. Start logging your health data to get personalized insights.
              </Text>
            </Card>
          ) : (
            activeInsights.map((insight) => (
              <Card key={insight.id} style={styles.insightItem}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightSummary} numberOfLines={2}>
                  {insight.summary}
                </Text>
              </Card>
            ))
          )}
        </View>

        {/* CTA */}
        <Card elevated style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>How are you feeling today?</Text>
          <Text style={styles.ctaSubtitle}>
            Log a symptom, vital, or note to keep your health timeline up to date.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing[4], gap: Spacing[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  greeting: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  scoreCard: { padding: Spacing[5] },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[4],
  },
  scoreLeft: { flex: 1, gap: Spacing[2] },
  scoreSectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreDescription: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  section: { gap: Spacing[3] },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  insightItem: { gap: Spacing[2] },
  insightTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  insightSummary: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ctaCard: {
    gap: Spacing[2],
    borderColor: 'rgba(56, 139, 253, 0.2)',
    borderWidth: 1,
  },
  ctaTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  ctaSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[1],
  },
  value: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
