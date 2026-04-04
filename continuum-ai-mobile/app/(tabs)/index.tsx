import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { format, isThisWeek } from 'date-fns';

import { useAuthStore } from '../../store/authStore';
import { useHealth, calculateStreak } from '../../hooks/useHealth';
import { useInsights } from '../../hooks/useInsights';

import { HealthScoreRing } from '../../components/ui/HealthScoreRing';
import { LoadingCard, LoadingPulse } from '../../components/ui/LoadingPulse';
import { UploadModal } from '../../components/ui/UploadModal';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { InsightCard } from '../../components/ui/InsightCard';

import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing, Shadow } from '../../constants/theme';
import type { Insight, HealthEntry } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

function entryTypeColor(type: HealthEntry['type']): string {
  switch (type) {
    case 'lab_result': return Colors.electric;
    case 'symptom':    return Colors.caution;
    case 'vital':      return Colors.positive;
    case 'medication': return Colors.insight;
    default:           return Colors.textMuted;
  }
}

function entryTypeLabel(type: HealthEntry['type']): string {
  const map: Record<string, string> = {
    lab_result: 'Lab Result',
    symptom: 'Symptom',
    vital: 'Vital Sign',
    medication: 'Medication',
    appointment: 'Appointment',
    note: 'Note',
  };
  return map[type] ?? type;
}

// ─── Inline icons ─────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UploadIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={Colors.electric} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M17 8L12 3L7 8" stroke={Colors.electric} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3V15" stroke={Colors.electric} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function AskAIIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15C21 15.5 20.8 16 20.4 16.4C20 16.8 19.5 17 19 17H7L3 21V5C3 4.5 3.2 4 3.6 3.6C4 3.2 4.5 3 5 3H19C19.5 3 20 3.2 20.4 3.6C20.8 4 21 4.5 21 5V15Z"
        stroke={Colors.electric} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 8L8.5 6.5L9 8L10.5 8.5L9 9L8.5 10.5L8 9L6.5 8.5L8 8Z" stroke={Colors.electric} strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  );
}

function TimelineNavIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4V20" stroke={Colors.electric} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="2.5" stroke={Colors.electric} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="2.5" stroke={Colors.electric} strokeWidth={1.8} />
      <Circle cx="12" cy="17" r="2.5" stroke={Colors.electric} strokeWidth={1.8} />
    </Svg>
  );
}

// ─── Metric card (horizontal scroll) ─────────────────────────────────────────

interface MetricCardProps {
  value: string;
  valueColor: string;
  label: string;
  sub: string;
  onPress?: () => void;
}

function MetricCard({ value, valueColor, label, sub, onPress }: MetricCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={metricStyles.card}
    >
      <Text style={[metricStyles.value, { color: valueColor }]}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={metricStyles.sub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: Colors.elevated,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.rim,
    padding: Spacing[4],
    gap: 4,
  },
  value: {
    fontSize: 36,
    fontFamily: FontFamily.displayExtraBold,
    letterSpacing: -1,
    lineHeight: 40,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  sub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

// ─── Quick action tile ────────────────────────────────────────────────────────

interface QuickTileProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function QuickTile({ icon, label, onPress }: QuickTileProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.75}
      style={tileStyles.tile}
    >
      <View style={tileStyles.iconWrap}>{icon}</View>
      <Text style={tileStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.rim,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[2],
    minHeight: 80,
    justifyContent: 'center',
  },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

// ─── Recent activity row ──────────────────────────────────────────────────────

function ActivityRow({ entry, isLast }: { entry: HealthEntry; isLast: boolean }) {
  const dotColor = entryTypeColor(entry.type);
  return (
    <View style={activityStyles.row}>
      <View style={activityStyles.track}>
        <View style={[activityStyles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={activityStyles.line} />}
      </View>
      <View style={[activityStyles.content, !isLast && activityStyles.contentBorder]}>
        <View style={activityStyles.contentInner}>
          <Text style={activityStyles.date}>
            {format(new Date(entry.recordedAt), 'MMM d, h:mm a')}
          </Text>
          <View style={activityStyles.titleRow}>
            <Text style={activityStyles.typeLabel}>{entryTypeLabel(entry.type)}</Text>
            <Text style={activityStyles.title} numberOfLines={1}>{entry.title}</Text>
          </View>
        </View>
        <View style={[activityStyles.typePill, { backgroundColor: `${dotColor}15`, borderColor: `${dotColor}30` }]}>
          <Text style={[activityStyles.typePillText, { color: dotColor }]}>{entryTypeLabel(entry.type)}</Text>
        </View>
      </View>
    </View>
  );
}

const activityStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, minHeight: 52 },
  track: { width: 20, alignItems: 'center', paddingTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 1.5, flex: 1, backgroundColor: Colors.rim, marginTop: 4 },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    gap: 8,
  },
  contentBorder: { borderBottomWidth: 1, borderBottomColor: Colors.rim },
  contentInner: { flex: 1, gap: 2 },
  date: { fontSize: 11, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted },
  titleRow: { gap: 1 },
  typeLabel: { fontSize: 10, fontFamily: FontFamily.bodyMedium, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: FontSize.md, fontFamily: FontFamily.displayMedium, color: Colors.textPrimary },
  typePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  typePillText: { fontSize: 10, fontFamily: FontFamily.bodySemiBold },
});

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <View style={{ gap: Spacing[6] }}>
      <LoadingPulse height={200} borderRadius={BorderRadius['2xl']} />
      <View style={{ gap: Spacing[3] }}>
        <LoadingPulse height={20} width="40%" borderRadius={10} />
        <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
          <LoadingCard style={{ flex: 1, height: 100 }} lines={2} />
          <LoadingCard style={{ flex: 1, height: 100 }} lines={2} />
          <LoadingCard style={{ flex: 1, height: 100 }} lines={2} />
        </View>
      </View>
      <View style={{ gap: Spacing[3] }}>
        <LoadingPulse height={20} width="50%" borderRadius={10} />
        {[0, 1, 2].map((i) => (
          <LoadingCard key={i} style={{ height: 68 }} lines={2} />
        ))}
      </View>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function InitialsAvatar({ name }: { name?: string }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  return (
    <View style={avatarStyles.wrap}>
      <Text style={avatarStyles.text}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rimActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
});

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    healthProfile,
    healthScore,
    timeline,
    isLoading: healthLoading,
    isRefetching: healthRefetching,
    refetchAll: refetchHealth,
  } = useHealth();

  const {
    insights,
    isLoading: insightsLoading,
    isRefetching: insightsRefetching,
    refetchAll: refetchInsights,
    unreadCount,
  } = useInsights();

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [showBriefCard, setShowBriefCard] = useState(false);

  const isLoading = healthLoading || insightsLoading;
  const isRefreshing = healthRefetching || insightsRefetching;

  // Show weekly brief card on Sundays or if not viewed this week
  useEffect(() => {
    const check = async () => {
      const isSunday = new Date().getDay() === 0;
      const lastBriefDate = await AsyncStorage.getItem('last_brief_viewed');
      const viewedThisWeek = lastBriefDate
        ? isThisWeek(new Date(lastBriefDate), { weekStartsOn: 0 })
        : false;
      setShowBriefCard(isSunday || !viewedThisWeek);
    };
    check().catch(() => setShowBriefCard(false));
  }, []);

  const onRefresh = useCallback(() => {
    refetchHealth();
    refetchInsights();
  }, [refetchHealth, refetchInsights]);

  const conditionCount = healthProfile?.conditions?.length ?? 0;
  const medicationCount = healthProfile?.medications?.length ?? 0;
  const recentTimeline = timeline.slice(0, 4);
  const topInsights = insights.slice(0, 3);
  const todayLabel = format(new Date(), 'EEEE, MMMM d');

  const scoreColor =
    (healthScore ?? 0) >= 80 ? Colors.positive
    : (healthScore ?? 0) >= 60 ? Colors.electric
    : (healthScore ?? 0) >= 40 ? Colors.caution
    : Colors.critical;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.electric}
            colors={[Colors.electric]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>
              {(user?.name ?? 'there').split(' ')[0].toUpperCase()}
            </Text>
            <Text style={styles.dateLabel}>{todayLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <InitialsAvatar name={user?.name} />
          </TouchableOpacity>
        </Animated.View>

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <View style={styles.sections}>
            {/* ── Hero: Health Score ────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)}>
              <View style={styles.heroSection}>
                <HealthScoreRing score={healthScore ?? 0} size={160} />
                <Text style={styles.heroSub}>
                  Based on {timeline.length} health {timeline.length === 1 ? 'entry' : 'entries'}
                </Text>

                {/* Stat chips */}
                <View style={styles.statChipsRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipNum}>{conditionCount}</Text>
                    <Text style={styles.statChipLabel}>Conditions</Text>
                  </View>
                  <View style={[styles.statChip, styles.statChipMid]}>
                    <Text style={styles.statChipNum}>{medicationCount}</Text>
                    <Text style={styles.statChipLabel}>Medications</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={[styles.statChipNum, { color: Colors.electric }]}>{unreadCount ?? insights.length}</Text>
                    <Text style={styles.statChipLabel}>Insights</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* ── Live Metrics Row ──────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(140).duration(400)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricsScroll}
              >
                <MetricCard
                  value={(healthScore ?? 0) >= 70 ? 'LOW' : (healthScore ?? 0) >= 40 ? 'MED' : 'HIGH'}
                  valueColor={(healthScore ?? 0) >= 70 ? Colors.positive : (healthScore ?? 0) >= 40 ? Colors.caution : Colors.critical}
                  label="Risk Level"
                  sub="Stable this week"
                />
                <MetricCard
                  value={String(insights.filter((i) => i.severity === 'critical' || i.severity === 'high').length)}
                  valueColor={Colors.caution}
                  label="Active Alerts"
                  sub="Tap to review"
                  onPress={() => router.push('/(tabs)/insights')}
                />
                <MetricCard
                  value={String(calculateStreak(timeline))}
                  valueColor={Colors.electric}
                  label="Day Streak"
                  sub={calculateStreak(timeline) > 0 ? '🔥 Keep it up' : 'Start today'}
                />
                <MetricCard
                  value={timeline.length > 0 ? 'Today' : 'None'}
                  valueColor={Colors.positive}
                  label="Last Entry"
                  sub={timeline[0]?.title ?? 'Add your first entry'}
                />
              </ScrollView>
            </Animated.View>

            {/* ── Quick Actions ─────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.quickRow}>
              <QuickTile
                icon={<UploadIcon />}
                label="Upload"
                onPress={() => setUploadModalVisible(true)}
              />
              <QuickTile
                icon={<AskAIIcon />}
                label="Ask AI"
                onPress={() => router.push('/(tabs)/chat')}
              />
              <QuickTile
                icon={<TimelineNavIcon />}
                label="Timeline"
                onPress={() => router.push('/(tabs)/timeline')}
              />
            </Animated.View>

            {/* ── Weekly Brief card ─────────────────────────────────────── */}
            {showBriefCard && (
              <Animated.View entering={FadeInDown.delay(240).duration(400)}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.briefCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/weekly-brief' as any);
                    AsyncStorage.setItem('last_brief_viewed', new Date().toISOString());
                    setShowBriefCard(false);
                  }}
                >
                  <LinearGradient
                    colors={['#1a1d27', '#0f1117']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.briefCardGradient}
                  >
                    <View style={styles.briefCardLeft}>
                      <Text style={styles.briefCardLabel}>WEEKLY BRIEF</Text>
                      <Text style={styles.briefCardTitle}>
                        {'Your health summary\nfor this week'}
                      </Text>
                      <Text style={styles.briefCardCta}>Tap to view →</Text>
                    </View>
                    <Text style={styles.briefCardEmoji}>📊</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── Top Insights ──────────────────────────────────────────── */}
            {topInsights.length > 0 && (
              <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.section}>
                <SectionHeader
                  title="INSIGHTS"
                  rightAction={{ label: 'See all', onPress: () => router.push('/(tabs)/insights') }}
                />
                {topInsights.map((insight, idx) => (
                  <Animated.View
                    key={insight.id}
                    entering={FadeInUp.delay(idx * 80).duration(350)}
                  >
                    <InsightCard
                      insight={insight}
                      healthCategory={insight.healthCategory}
                      confidence={Math.round((insight.confidence ?? 0.8) * 100)}
                      timeAgo={formatTimeAgo(insight.createdAt)}
                      onPress={() => router.push('/(tabs)/insights')}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* ── Recent Activity ───────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(340).duration(400)} style={styles.section}>
              <SectionHeader
                title="RECENT ACTIVITY"
                rightAction={{ label: 'View all', onPress: () => router.push('/(tabs)/timeline') }}
              />
              {recentTimeline.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <Text style={styles.emptyText}>
                    No entries yet. Add your first health data above.
                  </Text>
                </View>
              ) : (
                <View style={styles.activityList}>
                  {recentTimeline.map((entry, idx) => (
                    <ActivityRow
                      key={entry.id}
                      entry={entry}
                      isLast={idx === recentTimeline.length - 1}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          </View>
        )}
      </ScrollView>

      <UploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onNavigateToChat={() => router.push('/(tabs)/chat')}
      />
    </View>
  );
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  // Weekly brief card
  briefCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79,126,255,0.4)',
  },
  briefCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  briefCardLeft: { gap: 4, flex: 1 },
  briefCardLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
    letterSpacing: 2,
  },
  briefCardTitle: {
    fontSize: 16,
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginTop: 2,
  },
  briefCardCta: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  briefCardEmoji: {
    fontSize: 32,
    marginLeft: Spacing[4],
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[6],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: { gap: 2 },
  greeting: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textTertiary,
    letterSpacing: 2,
  },
  name: {
    fontSize: 36,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 40,
  },
  dateLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Sections
  sections: { gap: Spacing[6] },
  section: { gap: Spacing[3] },

  // Hero
  heroSection: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[4],
  },
  heroSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: -Spacing[1],
  },
  statChipsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  statChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.rim,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
    gap: 2,
  },
  statChipMid: {
    borderColor: 'rgba(79,126,255,0.2)',
    backgroundColor: Colors.electricMist,
  },
  statChipNum: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  statChipLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },

  // Metrics
  metricsScroll: {
    gap: Spacing[3],
    paddingRight: Spacing[4],
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },

  // Activity
  activityList: {},
  emptyActivity: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.rim,
    padding: Spacing[4],
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
