import React, { useState, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { format } from 'date-fns';

import { useAuthStore } from '../../store/authStore';
import { useHealth } from '../../hooks/useHealth';
import { useInsights } from '../../hooks/useInsights';

import { HealthScoreRing } from '../../components/ui/HealthScoreRing';
import { Avatar } from '../../components/ui/Avatar';
import { LoadingCard, LoadingPulse } from '../../components/ui/LoadingPulse';
import { UploadModal } from '../../components/ui/UploadModal';

import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import type { Insight, HealthEntry, DoctorRecommendation } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INSIGHT_CARD_WIDTH = 280;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function entryDotColor(type: HealthEntry['type']): string {
  switch (type) {
    case 'lab_result': return Colors.primary;
    case 'symptom':   return Colors.warning;
    case 'vital':     return Colors.accent;
    case 'medication':return Colors.purple;
    default:          return Colors.textMuted;
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

function urgencyColor(urgency: DoctorRecommendation['urgency']): string {
  switch (urgency) {
    case 'emergency': return Colors.critical;
    case 'urgent':    return Colors.critical;
    case 'soon':      return Colors.warning;
    default:          return Colors.primary;
  }
}

// ─── Small inline SVG icons ───────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UploadCloudIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 8L12 3L7 8"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 3V15" stroke="rgba(255,255,255,0.9)" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function StethoscopeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .2.3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="20" cy="10" r="2" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

// ─── Pulsing border for critical insight cards ────────────────────────────────

function PulsingBorder({ active }: { active: boolean }) {
  const opacity = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    if (!active) { opacity.value = 0; return; }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.65, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.critical,
  }));

  if (!active) return null;
  return <Animated.View pointerEvents="none" style={style} />;
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={sectionHeaderStyles.row}>
      <Text style={sectionHeaderStyles.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={sectionHeaderStyles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.lg, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  action: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.primary },
});

// ─── Health Score Card ────────────────────────────────────────────────────────

interface HealthScoreCardProps {
  score: number;
  conditionCount: number;
  medicationCount: number;
  insightCount: number;
  entryCount: number;
}

function HealthScoreCard({
  score,
  conditionCount,
  medicationCount,
  insightCount,
  entryCount,
}: HealthScoreCardProps) {
  return (
    <View style={scoreCardStyles.card}>
      <HealthScoreRing score={score} size={120} strokeWidth={9} />

      <View style={scoreCardStyles.right}>
        <Text style={scoreCardStyles.title}>Your Health Summary</Text>
        <Text style={scoreCardStyles.sub}>
          Based on {entryCount} health {entryCount === 1 ? 'entry' : 'entries'}
        </Text>

        <View style={scoreCardStyles.stats}>
          <StatRow
            dotColor={Colors.primary}
            label="Conditions tracked"
            value={String(conditionCount)}
          />
          <StatRow
            dotColor={Colors.purple}
            label="Medications"
            value={String(medicationCount)}
          />
          <StatRow
            dotColor={Colors.accent}
            label="Insights this week"
            value={String(insightCount)}
          />
        </View>
      </View>
    </View>
  );
}

function StatRow({ dotColor, label, value }: { dotColor: string; label: string; value: string }) {
  return (
    <View style={scoreCardStyles.statRow}>
      <View style={[scoreCardStyles.dot, { backgroundColor: dotColor }]} />
      <Text style={scoreCardStyles.statLabel}>{label}</Text>
      <Text style={scoreCardStyles.statValue}>{value}</Text>
    </View>
  );
}

const scoreCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  right: { flex: 1, gap: Spacing[2] },
  title: { fontSize: FontSize.md, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  sub: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary },
  stats: { gap: Spacing[2], marginTop: Spacing[1] },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: { flex: 1, fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary },
  statValue: { fontSize: FontSize.sm, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
});

// ─── Horizontal Insight Card (dashboard variant) ──────────────────────────────

const categoryLabels: Record<string, string> = {
  pattern: 'Pattern',
  risk: 'Risk',
  recommendation: 'Recommendation',
  correlation: 'Correlation',
  milestone: 'Milestone',
};

const categoryColors: Record<string, string> = {
  pattern: Colors.primary,
  risk: Colors.critical,
  recommendation: Colors.accent,
  correlation: Colors.purple,
  milestone: Colors.accent,
};

interface DashInsightCardProps {
  insight: Insight;
  onPress: () => void;
}

function DashInsightCard({ insight, onPress }: DashInsightCardProps) {
  const isCritical = insight.severity === 'critical' || insight.severity === 'high';
  const catColor = categoryColors[insight.category] ?? Colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[insightCardStyles.card, { width: INSIGHT_CARD_WIDTH }]}
    >
      <PulsingBorder active={isCritical} />

      <View style={insightCardStyles.catRow}>
        <View style={[insightCardStyles.catPill, { backgroundColor: `${catColor}22` }]}>
          <Text style={[insightCardStyles.catLabel, { color: catColor }]}>
            {categoryLabels[insight.category] ?? insight.category}
          </Text>
        </View>
        <Text style={insightCardStyles.confidence}>
          {Math.round(insight.confidence * 100)}%
        </Text>
      </View>

      <Text style={insightCardStyles.title} numberOfLines={2}>{insight.title}</Text>
      <Text style={insightCardStyles.summary} numberOfLines={3}>{insight.summary}</Text>

      <View style={[insightCardStyles.severityRow]}>
        <View style={[insightCardStyles.severityDot, { backgroundColor: urgencyColor(insight.severity as any) }]} />
        <Text style={[insightCardStyles.severityLabel, { color: urgencyColor(insight.severity as any) }]}>
          {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const insightCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[2],
    overflow: 'hidden',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  catLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium },
  confidence: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted },
  title: { fontSize: FontSize.md, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary, lineHeight: 21 },
  summary: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, lineHeight: 20, flex: 1 },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing[1] },
  severityDot: { width: 6, height: 6, borderRadius: 3 },
  severityLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium },
});

// ─── Quick Upload Card ────────────────────────────────────────────────────────

interface QuickUploadCardProps {
  onReport: () => void;
  onSymptom: () => void;
  onNote: () => void;
}

function QuickUploadCard({ onReport, onSymptom, onNote }: QuickUploadCardProps) {
  const pill = (label: string, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.75}
      style={uploadStyles.pill}
    >
      <Text style={uploadStyles.pillLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#388BFD', '#8957E5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={uploadStyles.card}
    >
      <View style={uploadStyles.left}>
        <Text style={uploadStyles.title}>Add Health Data</Text>
        <Text style={uploadStyles.sub}>
          Upload reports, describe symptoms, or add notes
        </Text>
        <View style={uploadStyles.pillRow}>
          {pill('📄 Report', onReport)}
          {pill('🩺 Symptom', onSymptom)}
          {pill('📝 Note', onNote)}
        </View>
      </View>
      <View style={uploadStyles.iconWrap}>
        <UploadCloudIcon />
      </View>
    </LinearGradient>
  );
}

const uploadStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  left: { flex: 1, gap: Spacing[2] },
  title: { fontSize: FontSize.lg, fontFamily: FontFamily.bodyBold, color: '#FFFFFF' },
  sub: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: 'rgba(255,255,255,0.72)', lineHeight: 20 },
  pillRow: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[1], flexWrap: 'wrap' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: '#FFFFFF' },
  iconWrap: { paddingLeft: Spacing[2] },
});

// ─── Timeline Entry Row ───────────────────────────────────────────────────────

interface TimelineRowProps {
  entry: HealthEntry;
  isLast: boolean;
  onPress: () => void;
}

function TimelineRow({ entry, isLast, onPress }: TimelineRowProps) {
  const dotColor = entryDotColor(entry.type);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={timelineStyles.row}>
      <View style={timelineStyles.trackCol}>
        <View style={[timelineStyles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={timelineStyles.line} />}
      </View>
      <View style={timelineStyles.content}>
        <Text style={timelineStyles.date}>
          {format(new Date(entry.recordedAt), 'MMM d, h:mm a')}
        </Text>
        <View style={timelineStyles.titleRow}>
          <View style={timelineStyles.titleLeft}>
            <Text style={timelineStyles.typeLabel}>{entryTypeLabel(entry.type)}</Text>
            <Text style={timelineStyles.title} numberOfLines={1}>{entry.title}</Text>
          </View>
          <ChevronRightIcon />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const timelineStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  trackCol: { width: 16, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 16 },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4, marginBottom: -4 },
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    gap: 2,
  },
  date: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  titleLeft: { flex: 1, gap: 1 },
  typeLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: FontSize.md, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
});

// ─── Doctor Recommendation Card ───────────────────────────────────────────────

function DoctorRecCard({ rec }: { rec: DoctorRecommendation }) {
  const accentColor = urgencyColor(rec.urgency);

  return (
    <View style={[docStyles.card, { borderLeftColor: accentColor }]}>
      <View style={docStyles.header}>
        <View style={[docStyles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
          <StethoscopeIcon color={accentColor} />
        </View>
        <View style={docStyles.headerText}>
          <Text style={docStyles.recLabel}>Recommended Specialist</Text>
          <Text style={docStyles.specialty}>{rec.specialty}</Text>
        </View>
      </View>
      <Text style={docStyles.reason} numberOfLines={2}>{rec.reason}</Text>
      <View style={docStyles.footer}>
        <Text style={docStyles.urgencyTag}>
          {rec.urgency.charAt(0).toUpperCase() + rec.urgency.slice(1)}
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={docStyles.learnMore}>Learn more →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const docStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  iconWrap: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  recLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  specialty: { fontSize: FontSize.lg, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  reason: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urgencyTag: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium, color: Colors.textMuted },
  learnMore: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.primary },
});

// ─── Loading skeleton for dashboard ──────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <View style={{ gap: Spacing[5] }}>
      {/* Score card skeleton */}
      <LoadingCard style={{ height: 140 }} lines={4} />
      {/* Insights skeleton */}
      <View style={{ gap: Spacing[3] }}>
        <LoadingPulse height={20} width={120} />
        <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
          <LoadingCard style={{ width: INSIGHT_CARD_WIDTH, height: 120 }} lines={3} />
          <LoadingCard style={{ width: INSIGHT_CARD_WIDTH, height: 120 }} lines={3} />
        </View>
      </View>
      {/* Timeline skeleton */}
      <View style={{ gap: Spacing[3] }}>
        <LoadingPulse height={20} width={140} />
        {[0, 1, 2].map((i) => (
          <LoadingCard key={i} style={{ height: 68 }} lines={2} />
        ))}
      </View>
    </View>
  );
}

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
    doctorRecommendations,
    isLoading: insightsLoading,
    isRefetching: insightsRefetching,
    refetchAll: refetchInsights,
  } = useInsights();

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadInitialMode, setUploadInitialMode] = useState<'document' | 'symptom' | 'note'>('document');

  const isLoading = healthLoading || insightsLoading;
  const isRefreshing = healthRefetching || insightsRefetching;

  const onRefresh = useCallback(() => {
    refetchHealth();
    refetchInsights();
  }, [refetchHealth, refetchInsights]);

  const openUpload = useCallback((mode: 'document' | 'symptom' | 'note') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploadInitialMode(mode);
    setUploadModalVisible(true);
  }, []);

  const handleNavigateToChat = useCallback(() => {
    router.push('/(tabs)/chat');
  }, [router]);

  // Derived counts
  const conditionCount = healthProfile?.conditions?.length ?? 0;
  const medicationCount = healthProfile?.medications?.length ?? 0;
  const insightCount = insights.length;
  const recentTimeline = timeline.slice(0, 4);
  const recentInsights = insights.slice(0, 5);
  const topDoctorRec = doctorRecommendations[0] ?? null;

  const todayLabel = format(new Date(), 'EEEE, MMMM d');

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── A. Header ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name ?? 'there'}</Text>
            <Text style={styles.dateLabel}>{todayLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Avatar name={user?.name} size="md" />
          </TouchableOpacity>
        </Animated.View>

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <View style={styles.sections}>
            {/* ── B. Health Score Card ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)}>
              <HealthScoreCard
                score={healthScore || 0}
                conditionCount={conditionCount}
                medicationCount={medicationCount}
                insightCount={insightCount}
                entryCount={timeline.length}
              />
            </Animated.View>

            {/* ── C. Insights ───────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
              <SectionHeader
                title="Insights"
                action="See all →"
                onAction={() => router.push('/(tabs)/insights')}
              />
              {recentInsights.length === 0 ? (
                <View style={styles.emptyInsights}>
                  <LinearGradient
                    colors={Colors.gradientPurple}
                    style={styles.emptyInsightIcon}
                  >
                    <Text style={styles.emptyInsightEmoji}>✓</Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.emptyInsightTitle}>All clear</Text>
                    <Text style={styles.emptyInsightSub}>No new health insights</Text>
                  </View>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.insightScroll}
                  decelerationRate="fast"
                  snapToInterval={INSIGHT_CARD_WIDTH + Spacing[3]}
                  snapToAlignment="start"
                >
                  {recentInsights.map((insight) => (
                    <DashInsightCard
                      key={insight.id}
                      insight={insight}
                      onPress={() => router.push('/(tabs)/insights')}
                    />
                  ))}
                </ScrollView>
              )}
            </Animated.View>

            {/* ── D. Quick Upload Card ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(240).duration(400)}>
              <QuickUploadCard
                onReport={() => openUpload('document')}
                onSymptom={() => openUpload('symptom')}
                onNote={() => openUpload('note')}
              />
            </Animated.View>

            {/* ── E. Recent Timeline ────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.section}>
              <SectionHeader
                title="Recent Activity"
                action="View all →"
                onAction={() => router.push('/(tabs)/timeline')}
              />
              {recentTimeline.length === 0 ? (
                <View style={styles.emptyTimeline}>
                  <Text style={styles.emptyTimelineText}>
                    No entries yet. Add your first health data above.
                  </Text>
                </View>
              ) : (
                <View style={styles.timelineList}>
                  {recentTimeline.map((entry, idx) => (
                    <TimelineRow
                      key={entry.id}
                      entry={entry}
                      isLast={idx === recentTimeline.length - 1}
                      onPress={() => router.push('/(tabs)/timeline')}
                    />
                  ))}
                </View>
              )}
            </Animated.View>

            {/* ── F. Doctor Recommendation (conditional) ────────────────── */}
            {topDoctorRec && (
              <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                <DoctorRecCard rec={topDoctorRec} />
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Upload Modal ────────────────────────────────────────────────── */}
      <UploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onNavigateToChat={handleNavigateToChat}
      />
    </View>
  );
}

// ─── Root styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  scrollContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[5],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: { gap: 2 },
  greeting: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  dateLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Sections wrapper
  sections: { gap: Spacing[5] },
  section: { gap: Spacing[3] },

  // Insights scroll
  insightScroll: { gap: Spacing[3], paddingRight: Spacing[4] },

  // Empty states
  emptyInsights: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  emptyInsightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInsightEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: FontFamily.bodyBold,
  },
  emptyInsightTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  emptyInsightSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  emptyTimeline: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  emptyTimelineText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  timelineList: { gap: 0 },
});
