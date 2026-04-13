import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeOut,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { hapticImpact } from '@/utils/haptics';
import Svg, { Path, Polyline } from 'react-native-svg';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { HealthScoreRing } from '../components/ui/HealthScoreRing';
import { LoadingPulse } from '../components/ui/LoadingPulse';
import { ProGate } from '../components/ui/ProGate';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
  fetchWeeklyBrief,
  generateShareText,
  WeeklyBriefData,
} from '../services/weeklyBrief';
import { track } from '../services/analytics';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing, BorderRadius } from '../constants/theme';

const { width: W } = Dimensions.get('window');

const SEVERITY_COLOR: Record<string, string> = {
  critical: Colors.critical,
  high:     Colors.caution,
  moderate: Colors.electric,
  low:      Colors.positive,
};

// ─── Loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Analyzing your week…',
  'Reviewing your insights…',
  'Generating your brief…',
  'Almost ready…',
];

// ─── Small icons ──────────────────────────────────────────────────────────────

function ShareIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        stroke={Colors.textSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="16 6 12 2 8 6"
        stroke={Colors.textSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 2v13"
        stroke={Colors.textSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return Colors.positive;
  if (s >= 60) return Colors.electric;
  if (s >= 40) return Colors.caution;
  return Colors.critical;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ msgIndex }: { msgIndex: number }) {
  return (
    <View style={s.skeletonWrap}>
      <LoadingPulse style={{ height: 100, borderRadius: 20, marginBottom: Spacing[3] }} />
      <View style={s.skeletonRow}>
        {[0, 1, 2].map((i) => (
          <LoadingPulse key={i} style={{ flex: 1, height: 72, borderRadius: 16 }} />
        ))}
      </View>
      <LoadingPulse style={{ height: 80, borderRadius: 16, marginTop: Spacing[3] }} />
      <LoadingPulse style={{ height: 120, borderRadius: 16, marginTop: Spacing[3] }} />
      <LoadingPulse style={{ height: 80, borderRadius: 16, marginTop: Spacing[3] }} />
      <Animated.Text
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        key={msgIndex}
        style={s.loadingMsg}
      >
        {LOADING_MESSAGES[msgIndex % LOADING_MESSAGES.length]}
      </Animated.Text>
    </View>
  );
}

// ─── Stat mini-card ───────────────────────────────────────────────────────────

function StatCard({
  value,
  valueColor,
  label,
  sub,
  subColor,
}: {
  value: string;
  valueColor?: string;
  label: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? (
        <Text style={[s.statSub, subColor ? { color: subColor } : null]}>{sub}</Text>
      ) : null}
    </View>
  );
}

// ─── Item row (improvements / attention) ─────────────────────────────────────

function BriefItem({
  title,
  detail,
  type,
  severity,
}: {
  title: string;
  detail: string;
  type: 'improvement' | 'attention';
  severity?: string;
}) {
  const bgColor =
    type === 'improvement'
      ? Colors.positiveGlow
      : Colors.criticalGlow;
  const iconChar = type === 'improvement' ? '✓' : '!';
  const iconColor =
    type === 'improvement'
      ? Colors.positive
      : severity
      ? SEVERITY_COLOR[severity] ?? Colors.caution
      : Colors.caution;

  return (
    <View style={s.briefItem}>
      <View style={[s.briefItemIcon, { backgroundColor: bgColor }]}>
        <Text style={[s.briefItemIconText, { color: iconColor }]}>{iconChar}</Text>
      </View>
      <View style={s.briefItemText}>
        <Text style={s.briefItemTitle}>{title}</Text>
        <Text style={s.briefItemDetail}>{detail}</Text>
      </View>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function BriefSectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeeklyBriefScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro } = useSubscriptionStore();

  const [brief, setBrief] = useState<WeeklyBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => i + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const loadBrief = async () => {
    setLoading(true);
    setBrief(null);
    const data = await fetchWeeklyBrief();
    setBrief(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBrief();
    track('weekly_brief_viewed');
  }, []);

  const handleShare = () => {
    if (!brief) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: generateShareText(brief),
      title: 'My Weekly Health Brief',
    });
  };

  const deltaSign = brief && brief.scoreDelta > 0 ? '+' : '';
  const deltaColor =
    !brief
      ? Colors.textMuted
      : brief.scoreDelta > 0
      ? Colors.positive
      : brief.scoreDelta < 0
      ? Colors.critical
      : Colors.electric;

  const deltaLabel =
    !brief
      ? ''
      : brief.scoreDelta > 0
      ? '↑ Improving'
      : brief.scoreDelta < 0
      ? '↓ Declining'
      : '→ Stable';

  const deltaCardBg =
    !brief
      ? Colors.electricMist
      : brief.scoreDelta > 0
      ? Colors.positiveGlow
      : brief.scoreDelta < 0
      ? Colors.criticalGlow
      : Colors.electricMist;

  const deltaCardBorder =
    !brief
      ? Colors.electric
      : brief.scoreDelta > 0
      ? Colors.positive
      : brief.scoreDelta < 0
      ? Colors.critical
      : Colors.electric;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AnimatedBackground />

      {/* ── Top row: close + share ── */}
      <View style={s.topRow}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={s.closeX}>×</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={handleShare}
          hitSlop={12}
          disabled={!brief}
        >
          <ShareIcon />
        </TouchableOpacity>
      </View>

      {/* ── Brief header ── */}
      <Animated.View entering={FadeInDown.delay(0).duration(350)} style={s.header}>
        <Text style={s.headerLabel}>WEEKLY BRIEF</Text>
        <Text style={s.weekLabel}>
          {brief?.weekLabel ?? ''}
        </Text>
        <Text style={s.headerSub}>Generated by AI · Sunday morning</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingSkeleton msgIndex={msgIndex} />
        ) : brief ? (
          <>
            {/* ── Health score change card ── */}
            <Animated.View entering={FadeInDown.delay(60).duration(380)}>
              <View style={s.scoreCard}>
                {/* Left */}
                <View style={s.scoreLeft}>
                  <Text style={s.scoreCardLabel}>HEALTH SCORE</Text>
                  <View style={s.scoreRow}>
                    <Text style={s.scorePrev}>{brief.previousScore}</Text>
                    <Text style={s.scoreArrow}>→</Text>
                    <Text style={[s.scoreCurrent, { color: scoreColor(brief.currentScore) }]}>
                      {brief.currentScore}
                    </Text>
                  </View>
                  {/* Delta pill */}
                  <View style={[s.deltaPill, { backgroundColor: deltaCardBg, borderColor: deltaCardBorder }]}>
                    <Text style={[s.deltaPillText, { color: deltaColor }]}>
                      {deltaSign}{brief.scoreDelta} pts
                    </Text>
                    <Text style={[s.deltaLabel, { color: deltaColor }]}>
                      {deltaLabel}
                    </Text>
                  </View>
                </View>
                {/* Right — score ring */}
                <View style={s.scoreRight}>
                  <HealthScoreRing score={brief.currentScore} size={80} />
                </View>
              </View>
            </Animated.View>

            {/* ── This week stats ── */}
            <Animated.View entering={FadeInDown.delay(120).duration(380)} style={s.statsRow}>
              <StatCard
                value={String(brief.entriesThisWeek)}
                label="entries logged"
                sub="this week"
              />
              <StatCard
                value={String(brief.newInsightsCount)}
                label="new insights"
                sub={brief.worstSeverity !== 'low' ? `1 ${brief.worstSeverity}` : 'none critical'}
                subColor={SEVERITY_COLOR[brief.worstSeverity] ?? Colors.textMuted}
              />
              <StatCard
                value={String(brief.currentStreak)}
                valueColor={Colors.electric}
                label="day streak"
                sub={brief.currentStreak >= 3 ? '🔥' : 'keep going'}
              />
            </Animated.View>

            {/* ── What improved ── */}
            {brief.improvements.length > 0 && (
              <Animated.View entering={FadeInDown.delay(160).duration(380)} style={s.section}>
                <BriefSectionHeader title="WHAT IMPROVED" />
                {brief.improvements.slice(0, 3).map((item, i) => (
                  <BriefItem
                    key={i}
                    title={item.title}
                    detail={item.detail}
                    type="improvement"
                  />
                ))}
              </Animated.View>
            )}

            {/* ── Needs attention ── */}
            {brief.attentionItems.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200).duration(380)} style={s.section}>
                <BriefSectionHeader title="NEEDS ATTENTION" />
                {brief.attentionItems.slice(0, 2).map((item, i) => (
                  <BriefItem
                    key={i}
                    title={item.title}
                    detail={item.detail}
                    type="attention"
                    severity={item.severity}
                  />
                ))}
              </Animated.View>
            )}

            {/* ── AI Insight of the week (Pro gate) ── */}
            <Animated.View entering={FadeInDown.delay(240).duration(380)} style={s.section}>
              <BriefSectionHeader title="AI INSIGHT OF THE WEEK" />
              <ProGate feature="ai_mode" style={s.aiInsightGate}>
                <View style={s.aiInsightCard}>
                  <Text style={s.aiInsightBadge}>✨ AI INSIGHT OF THE WEEK</Text>
                  <Text style={s.aiInsightText}>{brief.aiInsight}</Text>
                </View>
              </ProGate>
            </Animated.View>

            {/* ── Actionable tip ── */}
            <Animated.View entering={FadeInDown.delay(280).duration(380)} style={s.section}>
              <BriefSectionHeader title="THIS WEEK'S TIP" />
              <View style={s.tipCard}>
                <Text style={s.tipText}>{brief.actionableTip}</Text>
              </View>
            </Animated.View>

            {/* ── Next steps ── */}
            <Animated.View entering={FadeInDown.delay(320).duration(380)} style={s.section}>
              <BriefSectionHeader title="YOUR NEXT STEPS" />
              {brief.nextSteps.map((step, i) => (
                <View key={i} style={s.nextStepRow}>
                  <View style={s.stepNumber}>
                    <Text style={s.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </Animated.View>

            {/* ── Health Trajectory (trends) ── */}
            {brief.trendSummary && (
              <Animated.View entering={FadeInDown.delay(335).duration(380)} style={s.section}>
                <BriefSectionHeader title="HEALTH TRAJECTORY" />
                <View style={s.trajectoryCard}>
                  <View style={s.trajRow}>
                    {[
                      { count: brief.trendSummary.improving, label: 'Improving', color: '#30D158' },
                      { count: brief.trendSummary.stable,    label: 'Stable',    color: '#4C8DFF' },
                      { count: brief.trendSummary.worsening, label: 'Attention', color: '#FF453A' },
                    ].map((stat) => (
                      <View key={stat.label} style={s.trajStat}>
                        <Text style={[s.trajCount, { color: stat.color }]}>{stat.count}</Text>
                        <Text style={s.trajLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                  {brief.trendSummary.topTrend && (
                    <View style={s.trajTopTrend}>
                      <Text style={s.trajTopTrendLabel}>Best trend: </Text>
                      <Text style={[s.trajTopTrendValue, { color: '#30D158' }]}>
                        {brief.trendSummary.topTrend.metric} ↓{Math.abs(brief.trendSummary.topTrend.changePercent)}%
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ── Generate Report Card ── */}
            <Animated.View entering={FadeInUp.delay(340).duration(380)} style={s.reportCardWrap}>
              <TouchableOpacity
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/report-card');
                }}
                activeOpacity={0.8}
                style={s.reportCardBtn}
              >
                <LinearGradient
                  colors={Colors.gradientElectric}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.reportCardGradient}
                >
                  <Text style={s.reportCardText}>📊  GENERATE REPORT CARD</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Regenerate ── */}
            <Animated.View entering={FadeInUp.delay(360).duration(380)} style={s.regenerateWrap}>
              <TouchableOpacity
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  loadBrief();
                }}
                style={s.regenerateBtn}
                activeOpacity={0.7}
              >
                <Text style={s.regenerateText}>GENERATE NEW BRIEF</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.obsidian,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 22,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginTop: -2,
  },

  // Header
  header: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[4],
    gap: Spacing[1],
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
    letterSpacing: 2.5,
  },
  weekLabel: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[4],
  },

  // Loading skeleton
  skeletonWrap: { gap: Spacing[3] },
  skeletonRow: { flexDirection: 'row', gap: Spacing[2] },
  loadingMsg: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing[4],
  },

  // Score card
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  scoreLeft: { flex: 1, gap: Spacing[2] },
  scoreCardLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textTertiary,
    letterSpacing: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  scorePrev: {
    fontSize: 28,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textMuted,
  },
  scoreArrow: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  scoreCurrent: {
    fontSize: 42,
    fontFamily: FontFamily.displayExtraBold,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  deltaPillText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayBold,
  },
  deltaLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
  },
  scoreRight: { width: 80, alignItems: 'center' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    height: 80,
    justifyContent: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  statSub: {
    fontSize: 9,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },

  // Sections
  section: { gap: Spacing[2] },
  sectionHeader: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing[1],
  },

  // Brief items
  briefItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingVertical: 4,
  },
  briefItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  briefItemIconText: {
    fontSize: 14,
    fontFamily: FontFamily.displayBold,
  },
  briefItemText: { flex: 1, gap: 2 },
  briefItemTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textPrimary,
  },
  briefItemDetail: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // AI insight
  aiInsightGate: { minHeight: 100 },
  aiInsightCard: {
    backgroundColor: 'rgba(79,126,255,0.06)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.electric,
    borderWidth: 1,
    borderColor: Colors.electric,
    borderRadius: BorderRadius.md,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  aiInsightBadge: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.electric,
    letterSpacing: 1.5,
  },
  aiInsightText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    lineHeight: 24,
  },

  // Tip card
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  tipText: {
    fontSize: 16,
    fontFamily: FontFamily.displayMedium,
    color: Colors.textPrimary,
    lineHeight: 26,
  },

  // Next steps
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingVertical: 4,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.electricMist,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.electric,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Trajectory card
  trajectoryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  trajRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12,
  },
  trajStat: { alignItems: 'center' },
  trajCount: { fontSize: 28, fontWeight: '700' },
  trajLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  trajTopTrend: {
    flexDirection: 'row',
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  trajTopTrendLabel: { fontSize: 13, color: Colors.textSecondary },
  trajTopTrendValue: { fontSize: 13, fontWeight: '600' },

  // Report Card CTA
  reportCardWrap: { paddingTop: Spacing[4] },
  reportCardBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  reportCardGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCardText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Regenerate
  regenerateWrap: { alignItems: 'center', paddingTop: Spacing[2] },
  regenerateBtn: {
    borderWidth: 1,
    borderColor: Colors.electric,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[6],
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  regenerateText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
    letterSpacing: 1,
  },
});
