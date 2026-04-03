import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated as RNAnimated,
  LayoutAnimation,
  UIManager,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { format, isToday, isYesterday, subDays, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInsights } from '../../hooks/useInsights';
import { SeverityBadge } from '../../components/ui/SeverityBadge';
import { SpecialistDetailSheet } from '../../components/ui/SpecialistDetailSheet';
import { UploadModal } from '../../components/ui/UploadModal';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';
import type { Insight, SeverityLevel, SpecialistRecommendation } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type SeverityFilter = 'all' | SeverityLevel;
type CategoryFilter = 'all' | string;

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'moderate', 'low'];

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: Colors.critical,
  high: Colors.caution,
  moderate: Colors.electric,
  low: Colors.positive,
};

const BANNER_GRADIENT: Record<SeverityLevel | 'none', [string, string]> = {
  critical: Colors.gradientCritical,
  high: Colors.gradientCaution,
  moderate: Colors.gradientElectric,
  low: Colors.gradientPositive,
  none: Colors.gradientPositive,
};

const CATEGORIES = ['All Categories', 'Cardiovascular', 'Metabolic', 'Medication', 'Lifestyle', 'Preventive', 'General'];

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
};

// ─── Why it matters copy ──────────────────────────────────────────────────────

type SeverityKey = 'critical' | 'high' | 'moderate' | 'low';

const WHY_IT_MATTERS: Record<string, Partial<Record<SeverityKey, string>>> = {
  Metabolic: {
    critical: 'Severe metabolic disruption can affect multiple organ systems simultaneously. This level of dysregulation warrants immediate clinical evaluation to prevent irreversible damage.',
    high: 'Metabolic imbalances can compound over time and affect cardiovascular, renal, and neurological systems. Early intervention significantly improves long-term outcomes.',
    moderate: 'Metabolic patterns at this level are important to monitor and address before they progress to a more serious state.',
    low: 'This is an early indicator worth tracking. Lifestyle adjustments now can prevent escalation.',
  },
  Cardiovascular: {
    critical: 'Cardiovascular events can escalate quickly. This pattern in your data warrants prompt medical evaluation to prevent serious complications.',
    high: 'Sustained cardiovascular strain increases the risk of hypertensive events and cardiac complications. Early intervention is important.',
    moderate: 'This cardiovascular pattern warrants monitoring and a conversation with your doctor at your next visit.',
    low: 'A low-level cardiovascular signal — worth tracking as part of your overall health picture.',
  },
  Medication: {
    high: 'Medication adherence and timing are critical to treatment efficacy. Deviations can significantly affect therapeutic outcomes.',
    moderate: 'Following your medication regimen closely ensures you get the intended benefits and minimises side effect risk.',
    low: 'A minor medication note to keep in mind. No immediate action required.',
  },
  Lifestyle: {
    high: 'Lifestyle factors at this severity level are actively impacting measurable health outcomes in your data.',
    moderate: 'Lifestyle adjustments can have a meaningful impact on your health trajectory.',
    low: 'Small, consistent lifestyle improvements compound over time into significant health gains.',
  },
  Preventive: {
    high: 'Preventive care at this level is time-sensitive — delays can allow conditions to progress undetected.',
    moderate: 'Preventive screenings are most effective when done on schedule. This item is approaching its recommended timeframe.',
    low: 'Staying current with preventive care helps detect conditions early, when treatment is most effective.',
  },
  General: {
    high: 'This pattern requires attention. Discuss it with your doctor soon.',
    moderate: 'Worth reviewing at your next appointment.',
    low: 'A general health note to keep in mind.',
  },
};

function getWhyItMatters(category: string | undefined, severity: SeverityLevel): string {
  const cat = category ?? 'General';
  return (
    WHY_IT_MATTERS[cat]?.[severity as SeverityKey] ??
    WHY_IT_MATTERS.General[severity as SeverityKey] ??
    'This insight is based on patterns detected in your health data.'
  );
}

// ─── Recommended action copy ──────────────────────────────────────────────────

const RECOMMENDED_ACTION: Record<SeverityLevel, { title: string; sub: string }> = {
  critical: {
    title: 'Seek Medical Attention',
    sub: 'Contact your doctor today or visit urgent care if symptoms are severe.',
  },
  high: {
    title: 'Schedule an Appointment',
    sub: 'Book a follow-up with your doctor within the next 1–2 weeks.',
  },
  moderate: {
    title: 'Monitor and Track',
    sub: 'Keep logging your symptoms and review at your next scheduled visit.',
  },
  low: {
    title: 'Stay Informed',
    sub: 'This is a low-priority item. Continue healthy habits and monitor over time.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function worstSeverity(insights: Insight[]): SeverityLevel | 'none' {
  for (const s of SEVERITY_ORDER) {
    if (insights.some((i) => i.severity === s)) return s;
  }
  return 'none';
}

function sortInsights(list: Insight[]): Insight[] {
  return [...list].sort((a, b) => {
    const ai = SEVERITY_ORDER.indexOf(a.severity);
    const bi = SEVERITY_ORDER.indexOf(b.severity);
    if (ai !== bi) return ai - bi;
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });
}

function countBySeverity(insights: Insight[]): Record<SeverityLevel, number> {
  return {
    critical: insights.filter((i) => i.severity === 'critical').length,
    high: insights.filter((i) => i.severity === 'high').length,
    moderate: insights.filter((i) => i.severity === 'moderate').length,
    low: insights.filter((i) => i.severity === 'low').length,
  };
}

// ─── Chart data ───────────────────────────────────────────────────────────────

interface BarDatum {
  label: string;
  count: number;
  color: string;
}

function buildChartData(insights: Insight[]): BarDatum[] {
  const result: BarDatum[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(subDays(new Date(), i));
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayInsights = insights.filter((ins) =>
      ins.generatedAt.startsWith(dayStr)
    );
    const worst = worstSeverity(dayInsights);
    const color =
      worst === 'none' ? Colors.border : SEVERITY_COLOR[worst as SeverityLevel];
    result.push({
      label: format(day, 'MMM d'),
      count: dayInsights.length,
      color,
    });
  }
  return result;
}


// ─── Icons ────────────────────────────────────────────────────────────────────

function ShieldCheckIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Path
        d="M40 8L14 20V38C14 52.4 25.2 66 40 70C54.8 66 66 52.4 66 38V20L40 8Z"
        fill="rgba(63, 185, 80, 0.12)"
        stroke={Colors.accent}
        strokeWidth={2}
      />
      <Path
        d="M28 40L36 48L52 32"
        stroke={Colors.accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 4L44 40H4L24 4Z"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M24 18V28" stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx="24" cy="34" r="1.5" fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
      <Path d="M24 21V34" stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx="24" cy="15" r="1.5" fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

function CheckAllIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
      <Path d="M14 24L21 31L34 18" stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronIcon({ flipped, color }: { flipped: boolean; color: string }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: flipped ? '180deg' : '0deg' }] }}
    >
      <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ActionIcon({ severity }: { severity: SeverityLevel }) {
  const color = SEVERITY_COLOR[severity];
  switch (severity) {
    case 'critical':
    case 'high':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L2 7V12C2 16.55 6.84 20.74 12 22C17.16 20.74 22 16.55 22 12V7L12 2Z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path d="M12 8V12M12 16H12.01" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'moderate':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M9 12H15M12 9V15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    default:
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
          <Path d="M12 8V12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx="12" cy="16" r="0.5" fill={color} stroke={color} strokeWidth={1} />
        </Svg>
      );
  }
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 90;

function AnimatedBar({ datum, maxCount, index }: { datum: BarDatum; maxCount: number; index: number }) {
  const heightRatio = useSharedValue(0);
  const targetRatio = maxCount > 0 ? datum.count / maxCount : 0;

  useEffect(() => {
    heightRatio.value = withDelay(
      index * 80,
      withTiming(targetRatio, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    height: heightRatio.value * CHART_HEIGHT,
    borderRadius: 4,
    backgroundColor: datum.count === 0 ? Colors.surfaceElevated : datum.color,
    minHeight: datum.count === 0 ? 4 : 0,
  }));

  return (
    <View style={chartStyles.barCol}>
      <View style={chartStyles.barTrack}>
        <Animated.View style={[chartStyles.bar, barStyle]} />
      </View>
      <Text style={chartStyles.barLabel}>{datum.label.split(' ')[1]}</Text>
      <Text style={chartStyles.barMonth}>{datum.label.split(' ')[0]}</Text>
    </View>
  );
}

function TrendChart({ insights }: { insights: Insight[] }) {
  const data = useMemo(() => buildChartData(insights), [insights]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={chartStyles.wrapper}>
      <View style={chartStyles.header}>
        <Text style={chartStyles.title}>Insights Over Time</Text>
        <Text style={chartStyles.sub}>Past 7 days</Text>
      </View>
      <View style={chartStyles.chart}>
        {data.map((datum, i) => (
          <AnimatedBar key={datum.label} datum={datum} maxCount={maxCount} index={i} />
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 32,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    width: '100%',
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    paddingHorizontal: 3,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
  },
  barMonth: {
    fontSize: 9,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    opacity: 0.6,
  },
});


// ─── Summary banner ───────────────────────────────────────────────────────────

function SummaryBanner({ insights }: { insights: Insight[] }) {
  const worst = worstSeverity(insights);
  const gradient = BANNER_GRADIENT[worst];
  const activeCount = insights.filter((i) => i.severity === 'critical' || i.severity === 'high').length;

  const shimmerX = useSharedValue(-SCREEN_WIDTH);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(SCREEN_WIDTH * 2, { duration: 900, easing: Easing.ease }),
        withDelay(3100, withTiming(-SCREEN_WIDTH, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: '20deg' }],
  }));

  let icon = <CheckAllIcon />;
  if (worst === 'critical' || worst === 'high') icon = <AlertIcon />;
  else if (worst === 'moderate') icon = <InfoIcon />;

  let titleText = 'Health Looks Good';
  let subText = 'No new health concerns detected.';
  if (worst !== 'none' && worst !== 'low') {
    const urgentCount = activeCount;
    titleText = `${insights.length} Active Alert${insights.length !== 1 ? 's' : ''}`;
    if (worst === 'critical') subText = 'Immediate attention recommended.';
    else if (worst === 'high') subText = 'Follow up with your doctor soon.';
    else subText = 'Worth monitoring closely.';
  } else if (worst === 'low') {
    titleText = `${insights.length} Insight${insights.length !== 1 ? 's' : ''}`;
    subText = 'Low-priority items to review.';
  }

  return (
    <View style={bannerStyles.wrapper}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={bannerStyles.gradient}
      >
        {/* Shimmer overlay */}
        <Animated.View style={[bannerStyles.shimmer, shimmerStyle]} />

        <View style={bannerStyles.content}>
          <View style={bannerStyles.iconWrap}>{icon}</View>
          <View style={bannerStyles.textBlock}>
            <Text style={bannerStyles.title}>{titleText}</Text>
            <Text style={bannerStyles.sub}>{subText}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    padding: Spacing[4],
  },
  shimmer: {
    position: 'absolute',
    top: -40,
    width: 60,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  iconWrap: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, gap: 4 },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  sub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
});

// ─── Filter rows ──────────────────────────────────────────────────────────────

interface SeverityFilterRowProps {
  active: SeverityFilter;
  counts: Record<SeverityLevel, number>;
  onChange: (s: SeverityFilter) => void;
}

function SeverityFilterRow({ active, counts, onChange }: SeverityFilterRowProps) {
  const chips: { key: SeverityFilter; label: string; color?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical', color: Colors.critical },
    { key: 'high', label: 'High', color: Colors.caution },
    { key: 'moderate', label: 'Moderate', color: Colors.electric },
    { key: 'low', label: 'Low', color: Colors.positive },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.row}
    >
      {chips.map((chip) => {
        const count = chip.key !== 'all' ? counts[chip.key as SeverityLevel] : null;
        if (chip.key !== 'all' && count === 0) return null;
        const isActive = chip.key === active;
        const bg = isActive && chip.color ? `${chip.color}22` : undefined;
        return (
          <TouchableOpacity
            key={chip.key}
            onPress={() => onChange(chip.key)}
            activeOpacity={0.75}
            style={[
              filterStyles.chip,
              isActive && filterStyles.chipActive,
              isActive && chip.color ? { borderColor: chip.color, backgroundColor: bg } : null,
              isActive && !chip.color ? filterStyles.chipAllActive : null,
            ]}
          >
            <Text
              style={[
                filterStyles.chipText,
                isActive && chip.color ? { color: chip.color } : null,
                isActive && !chip.color ? { color: Colors.primary } : null,
              ]}
            >
              {chip.label}
              {count !== null ? ` (${count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface CategoryFilterRowProps {
  active: CategoryFilter;
  onChange: (c: CategoryFilter) => void;
}

function CategoryFilterRow({ active, onChange }: CategoryFilterRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.categoryRow}
    >
      {CATEGORIES.map((cat) => {
        const key: CategoryFilter = cat === 'All Categories' ? 'all' : cat;
        const isActive = key === active;
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onChange(key)}
            activeOpacity={0.75}
            style={[
              filterStyles.catChip,
              isActive && filterStyles.catChipActive,
            ]}
          >
            <Text style={[filterStyles.catChipText, isActive && filterStyles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary },
  chipAllActive: { backgroundColor: 'rgba(56,139,253,0.1)', borderColor: Colors.primary },
  chipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  categoryRow: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catChipActive: {
    borderColor: Colors.insight,
    backgroundColor: Colors.insightGlow,
  },
  catChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  catChipTextActive: { color: Colors.insight },
});


// ─── Insight card ─────────────────────────────────────────────────────────────

interface InsightCardItemProps {
  insight: Insight;
  index: number;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
}

function InsightCardItem({ insight, index, markRead, dismiss }: InsightCardItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [specialistOpen, setSpecialistOpen] = useState(false);
  const severityColor = SEVERITY_COLOR[insight.severity];
  const isPulse = insight.severity === 'critical' || insight.severity === 'high';

  // Pulsing left border for critical/high
  const pulseAnim = useRef(new RNAnimated.Value(0.65)).current;
  useEffect(() => {
    if (!isPulse) return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 0.65, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPulse]);

  // Auto-mark read after 2s when expanded
  useEffect(() => {
    if (expanded && !insight.is_read) {
      const timer = setTimeout(() => markRead(insight.id), 2000);
      return () => clearTimeout(timer);
    }
  }, [expanded, insight.is_read]);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  const dateLabel = (() => {
    const d = new Date(insight.generatedAt);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  })();

  const action = RECOMMENDED_ACTION[insight.severity];

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(340)} style={cardStyles.outer}>
      {/* Pulsing left border */}
      <RNAnimated.View
        style={[
          cardStyles.leftBorder,
          { backgroundColor: severityColor, opacity: isPulse ? pulseAnim : 1 },
        ]}
      />

      <View style={[cardStyles.card, expanded && cardStyles.cardExpanded]}>
        {/* ── Collapsed / header area ─────────────────────── */}
        <TouchableOpacity onPress={toggleExpand} activeOpacity={0.85} style={cardStyles.touch}>
          {/* Row 1: severity + timestamp + unread dot */}
          <View style={cardStyles.row1}>
            <SeverityBadge severity={insight.severity} />
            <View style={cardStyles.row1Right}>
              <Text style={cardStyles.dateText}>{dateLabel}</Text>
              {!insight.is_read && (
                <Animated.View exiting={FadeOut.duration(300)} style={cardStyles.unreadDot} />
              )}
            </View>
          </View>

          {/* Row 2: category + confidence */}
          <View style={cardStyles.row2}>
            {insight.healthCategory ? (
              <View style={cardStyles.catPill}>
                <Text style={cardStyles.catPillText}>{insight.healthCategory}</Text>
              </View>
            ) : null}
            <Text style={cardStyles.confidenceText}>
              {Math.round(insight.confidence * 100)}% confidence
            </Text>
          </View>

          {/* Row 3: insight text */}
          <Text style={cardStyles.summaryText} numberOfLines={expanded ? undefined : 2}>
            {insight.summary}
          </Text>

          {/* Row 4: action hint */}
          <Text style={cardStyles.actionHint} numberOfLines={1}>
            → {action.title}
          </Text>

          {/* Bottom row */}
          <View style={cardStyles.bottomRow}>
            <Text style={cardStyles.tapHint}>Tap to {expanded ? 'collapse' : 'expand'}</Text>
            <View style={cardStyles.bottomRight}>
              {insight.specialist ? (
                <Text style={cardStyles.specialistHint}>👨‍⚕️ Specialist suggested</Text>
              ) : null}
              <ChevronIcon flipped={expanded} color={Colors.textMuted} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Expanded body ──────────────────────────────── */}
        {expanded ? (
          <View style={cardStyles.expandedBody}>
            <View style={cardStyles.divider} />

            {/* Why this matters */}
            <View style={cardStyles.section}>
              <Text style={cardStyles.sectionLabel}>WHY THIS MATTERS</Text>
              <Text style={cardStyles.bodyText}>
                {getWhyItMatters(insight.healthCategory, insight.severity)}
              </Text>
            </View>

            {/* Recommended action */}
            <View style={cardStyles.section}>
              <Text style={cardStyles.sectionLabel}>RECOMMENDED ACTION</Text>
              <View style={cardStyles.actionRow}>
                <ActionIcon severity={insight.severity} />
                <View style={cardStyles.actionText}>
                  <Text style={cardStyles.actionTitle}>{action.title}</Text>
                  <Text style={cardStyles.actionSub}>{action.sub}</Text>
                </View>
              </View>
            </View>

            {/* Related data */}
            {insight.relatedEntryIds.length > 0 ? (
              <View style={cardStyles.section}>
                <Text style={cardStyles.sectionLabel}>RELATED DATA</Text>
                <View style={cardStyles.relatedRow}>
                  {insight.relatedEntryIds.map((eid) => (
                    <TouchableOpacity
                      key={eid}
                      style={cardStyles.relatedPill}
                      onPress={() => router.push('/(tabs)/timeline' as any)}
                    >
                      <Text style={cardStyles.relatedPillText}>Lab Entry · {dateLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Specialist recommendation */}
            {insight.specialist ? (
              <View style={cardStyles.section}>
                <Text style={cardStyles.sectionLabel}>SPECIALIST RECOMMENDATION</Text>
                <TouchableOpacity
                  style={cardStyles.specialistCard}
                  onPress={() => setSpecialistOpen(true)}
                  activeOpacity={0.8}
                >
                  <View style={cardStyles.specialistLeft}>
                    <Text style={cardStyles.specialistType}>{insight.specialist.type}</Text>
                    <Text style={cardStyles.specialistReason} numberOfLines={2}>
                      {insight.specialist.reason}
                    </Text>
                  </View>
                  <View
                    style={[
                      cardStyles.urgencyBadge,
                      { backgroundColor: `${SEVERITY_COLOR[insight.severity]}18` },
                    ]}
                  >
                    <Text
                      style={[cardStyles.urgencyText, { color: SEVERITY_COLOR[insight.severity] }]}
                    >
                      {insight.specialist.urgency}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Action buttons */}
            <View style={cardStyles.actionBtns}>
              <TouchableOpacity
                style={cardStyles.askAiBtn}
                onPress={() => router.push('/(tabs)/chat' as any)}
                activeOpacity={0.8}
              >
                <Text style={cardStyles.askAiBtnText}>Ask AI</Text>
              </TouchableOpacity>

              {insight.is_read ? (
                <View style={cardStyles.resolvedBtn}>
                  <Text style={cardStyles.resolvedBtnText}>Resolved ✓</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={cardStyles.markReadBtn}
                  onPress={() => markRead(insight.id)}
                  activeOpacity={0.8}
                >
                  <Text style={cardStyles.markReadBtnText}>Mark as Read</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}
      </View>

      <SpecialistDetailSheet
        visible={specialistOpen}
        specialist={insight.specialist ?? null}
        onClose={() => setSpecialistOpen(false)}
      />
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    marginBottom: Spacing[3],
  },
  leftBorder: {
    width: 4,
    borderRadius: 4,
    marginRight: Spacing[2],
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: Colors.borderActive,
  },
  touch: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row1Right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  dateText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(188,140,255,0.1)',
  },
  catPillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.purple,
  },
  confidenceText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  summaryText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  actionHint: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  tapHint: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  specialistHint: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.purple,
  },
  expandedBody: {
    gap: Spacing[4],
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: -Spacing[3],
  },
  section: { gap: Spacing[2] },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  bodyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    padding: Spacing[3],
  },
  actionText: { flex: 1, gap: 4 },
  actionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  actionSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  relatedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  relatedPill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    backgroundColor: 'rgba(56,139,253,0.08)',
  },
  relatedPillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  specialistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    gap: Spacing[3],
  },
  specialistLeft: { flex: 1, gap: 3 },
  specialistType: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  specialistReason: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  urgencyText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    textTransform: 'capitalize',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  askAiBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askAiBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  markReadBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: '#FFFFFF',
  },
  resolvedBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.accent,
  },
});


// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyAllClear({ onAddData }: { onAddData: () => void }) {
  return (
    <View style={emptyStyles.root}>
      <ShieldCheckIcon />
      <Text style={emptyStyles.title}>You're all clear</Text>
      <Text style={emptyStyles.desc}>
        No health insights detected. Keep tracking your health data to get personalised recommendations.
      </Text>
      <TouchableOpacity onPress={onAddData} activeOpacity={0.85} style={emptyStyles.btnWrap}>
        <LinearGradient
          colors={Colors.gradientElectric}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={emptyStyles.btn}
        >
          <Text style={emptyStyles.btnText}>Add Health Data</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function EmptyFiltered({ onClear }: { onClear: () => void }) {
  return (
    <View style={emptyStyles.filteredRoot}>
      <Text style={emptyStyles.filteredTitle}>No insights match this filter</Text>
      <TouchableOpacity onPress={onClear}>
        <Text style={emptyStyles.clearLink}>Clear filters</Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  root: {
    paddingTop: Spacing[12],
    alignItems: 'center',
    gap: Spacing[4],
    paddingHorizontal: Spacing[8],
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  btnWrap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing[2],
    alignSelf: 'stretch',
  },
  btn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  btnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
  },
  filteredRoot: {
    paddingTop: Spacing[8],
    alignItems: 'center',
    gap: Spacing[3],
  },
  filteredTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  clearLink: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { insights, unreadCount, markRead, markAllRead, dismiss, refetchAll, isRefetching } =
    useInsights();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const counts = useMemo(() => countBySeverity(insights), [insights]);

  const filtered = useMemo(() => {
    let list = insights;
    if (severityFilter !== 'all') list = list.filter((i) => i.severity === severityFilter);
    if (categoryFilter !== 'all') list = list.filter((i) => i.healthCategory === categoryFilter);
    return sortInsights(list);
  }, [insights, severityFilter, categoryFilter]);

  const isFiltered = severityFilter !== 'all' || categoryFilter !== 'all';

  const handleMarkAllRead = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllRead();
  }, [markAllRead]);

  const clearFilters = useCallback(() => {
    setSeverityFilter('all');
    setCategoryFilter('all');
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Insights</Text>
          {unreadCount > 0 ? (
            <Text style={[styles.headerSub, { color: Colors.critical }]}>
              {unreadCount} unread
            </Text>
          ) : (
            <Text style={[styles.headerSub, { color: Colors.accent }]}>All caught up</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <SeverityFilterRow active={severityFilter} counts={counts} onChange={setSeverityFilter} />
      <CategoryFilterRow active={categoryFilter} onChange={setCategoryFilter} />

      {/* Main scroll */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {insights.length === 0 ? (
          <EmptyAllClear onAddData={() => setUploadOpen(true)} />
        ) : filtered.length === 0 ? (
          <EmptyFiltered onClear={clearFilters} />
        ) : (
          <>
            {/* Summary banner */}
            <SummaryBanner insights={insights} />

            {/* Trend chart */}
            <View style={styles.chartWrap}>
              <TrendChart insights={insights} />
            </View>

            {/* Cards */}
            {filtered.map((insight, i) => (
              <InsightCardItem
                key={insight.id}
                insight={insight}
                index={i}
                markRead={markRead}
                dismiss={dismiss}
              />
            ))}
          </>
        )}
      </ScrollView>

      <UploadModal visible={uploadOpen} onClose={() => setUploadOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    marginTop: 2,
  },
  markAllBtn: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  scroll: {
    paddingTop: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  chartWrap: {
    marginBottom: Spacing[2],
  },
});

