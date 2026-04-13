import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { useInsights } from '../../hooks/useInsights';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import type { FirestoreInsight } from '../../services/firestoreService';
import { ConsultationRequestSheet } from '../../components/ui/ConsultationRequestSheet';

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: Colors.critical,
  high:     Colors.alert,
  moderate: Colors.primary,
  low:      Colors.vital,
};

const SEV_BG: Record<string, string> = {
  critical: 'rgba(255,69,58,0.04)',
  high:     'rgba(255,159,10,0.04)',
  moderate: 'rgba(76,141,255,0.04)',
  low:      'rgba(48,209,88,0.04)',
};

// ─── SVG Shield icon ──────────────────────────────────────────────────────────

function ShieldIcon({ status }: { status: 'clear' | 'warning' | 'critical' }) {
  const color = status === 'clear' ? Colors.vital : status === 'warning' ? Colors.alert : Colors.critical;
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 4L6 10V20C6 28.5 12.5 36.2 20 38C27.5 36.2 34 28.5 34 20V10L20 4Z"
        fill={`${color}20`}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {status === 'clear' && (
        <Path d="M14 20L18 24L26 16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {status === 'warning' && (
        <>
          <Path d="M20 14V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Circle cx="20" cy="26" r="1.5" fill={color} />
        </>
      )}
      {status === 'critical' && (
        <Path d="M15 15L25 25M25 15L15 25" stroke={color} strokeWidth={2} strokeLinecap="round" />
      )}
    </Svg>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const W = 80;
  const H = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={W} height={H}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  critical: number;
  high: number;
  unread: number;
  total: number;
  lastChecked: string;
  sparkValues: number[];
}

function SummaryCard({ critical, high, unread, total, lastChecked, sparkValues }: SummaryCardProps) {
  const hasCritical = critical > 0;
  const hasWarning = high > 0;
  const status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'clear';
  const statusColor = hasCritical ? Colors.critical : hasWarning ? Colors.alert : Colors.vital;

  // Pulse animation for critical
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (hasCritical) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900 }),
          withTiming(1, { duration: 900 })
        ),
        -1,
        false
      );
    }
  }, [hasCritical]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const statusText = hasCritical
    ? `${critical} critical alert${critical > 1 ? 's' : ''}`
    : hasWarning
    ? `${high} need attention`
    : 'All clear';

  const subText = hasCritical
    ? 'Review your critical insights below'
    : hasWarning
    ? 'Review your insights below'
    : 'Keep tracking your health';

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={summaryStyles.card}>
      <View style={summaryStyles.left}>
        <Animated.View style={hasCritical ? pulseStyle : undefined}>
          <ShieldIcon status={status} />
        </Animated.View>
        <View style={summaryStyles.textCol}>
          <Text style={[summaryStyles.statusText, { color: statusColor }]}>{statusText}</Text>
          <Text style={summaryStyles.subText}>{subText}</Text>
          <Text style={summaryStyles.lastChecked}>Last checked {lastChecked}</Text>
        </View>
      </View>
      <Sparkline values={sparkValues} color={statusColor} />
    </Animated.View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    height: 72,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
  },
  lastChecked: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'predictive', label: '🔮 Predictive' },
  { id: 'critical',   label: 'Critical' },
  { id: 'high',       label: 'High' },
  { id: 'moderate',   label: 'Moderate' },
  { id: 'low',        label: 'Low' },
];

// ─── Insight card ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: FirestoreInsight;
  onDismiss?: () => void;
  onGetDoctorOpinion?: (id: string, text: string, severity: string) => void;
}

const EXPAND_HEIGHT = 160;

function InsightCard({ insight, onDismiss, onGetDoctorOpinion }: InsightCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const expandH = useSharedValue(0);
  const chevronRot = useSharedValue(0);
  const measuredH = useRef(EXPAND_HEIGHT);

  const sevColor = insight.category === 'Predictive'
    ? '#BF5AF2'
    : SEV_COLOR[insight.severity] ?? Colors.primary;
  const bgTint = SEV_BG[insight.severity] ?? 'transparent';
  const category = insight.category ?? 'Health';
  const timeAgo = format(new Date(insight.createdAt), 'MMM d');
  const isUnread = !insight.isRead;
  const isCritical = insight.severity === 'critical' || insight.severity === 'high';

  // Heartbeat for critical
  const accent = useSharedValue(0.6);
  useEffect(() => {
    if (isCritical) {
      accent.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.6, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [isCritical]);
  const accentStyle = useAnimatedStyle(() => ({ opacity: accent.value }));

  const expandedContainerStyle = useAnimatedStyle(() => ({
    height: expandH.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevronRot.value, [0, 1], [0, 180])}deg` }],
  }));

  const handlePress = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    expandH.value = withSpring(next ? measuredH.current : 0, { damping: 22, stiffness: 280 });
    chevronRot.value = withSpring(next ? 1 : 0, { damping: 22, stiffness: 280 });
  }, [expanded]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[icStyles.outer, { backgroundColor: bgTint }]}
    >
      {/* Left accent bar with heartbeat */}
      <Animated.View style={[icStyles.accent, { backgroundColor: sevColor }, isCritical && accentStyle]} />

      <View style={icStyles.inner}>
        {/* Top zone */}
        <View style={icStyles.topRow}>
          <View style={[icStyles.catPill, { backgroundColor: `${sevColor}18` }]}>
            <Text style={[icStyles.catText, { color: sevColor }]}>
              {category.toUpperCase()}
            </Text>
          </View>
          <View style={icStyles.topRight}>
            <Text style={icStyles.timeAgo}>{timeAgo}</Text>
            {isUnread && <View style={icStyles.unreadDot} />}
            <Animated.Text style={[icStyles.chevron, chevronStyle]}>⌄</Animated.Text>
          </View>
        </View>

        {/* Middle zone — summary */}
        <Text style={icStyles.summary} numberOfLines={expanded ? undefined : 2}>
          {insight.insightText}
        </Text>

        {/* Bottom zone */}
        <View style={icStyles.bottomRow}>
          <View style={icStyles.confPill}>
            <Text style={icStyles.confText}>
              {insight.confidenceScore !== undefined
                ? `${Math.round(insight.confidenceScore * 100)}% confidence`
                : 'high confidence'}
            </Text>
          </View>
          <Text style={icStyles.detailsLink}>Details →</Text>
        </View>

        {/* Animated expanded section */}
        <Animated.View style={expandedContainerStyle}>
          <View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) {
                measuredH.current = h;
                if (expanded) expandH.value = h;
              }
            }}
            style={icStyles.expandedSection}
          >
            {insight.specialist && (
              <View style={icStyles.actionRow}>
                <View style={[icStyles.actionIcon, { backgroundColor: `${sevColor}18` }]}>
                  <Text style={{ fontSize: 14 }}>
                    {insight.severity === 'critical' ? '🚨' : insight.severity === 'high' ? '⚠️' : '💡'}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={icStyles.actionText}>
                    {`Consider seeing a ${insight.specialist.type}`}
                  </Text>
                  {!!insight.specialist.reason && (
                    <Text style={icStyles.actionSub}>{insight.specialist.reason}</Text>
                  )}
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[icStyles.actionBtn, { borderColor: sevColor }]}
              onPress={() => {
                onDismiss?.();
                router.push('/(tabs)/chat');
              }}
            >
              <Text style={[icStyles.actionBtnText, { color: sevColor }]}>Ask AI About This</Text>
            </TouchableOpacity>

            {/* Predictive timeframe badge */}
            {insight.category === 'Predictive' && (insight as any).timeframe && (
              <View style={icStyles.predTimeframeRow}>
                <Text style={icStyles.predTimeframeText}>
                  🔮 Prediction · {(insight as any).timeframe}
                </Text>
              </View>
            )}

            {/* Get Doctor's Opinion — shown for medium/high/critical severity */}
            {(insight.severity === 'high' ||
              insight.severity === 'critical' ||
              insight.severity === 'medium') && onGetDoctorOpinion && (
              <Pressable
                onPress={() =>
                  onGetDoctorOpinion(insight.id, insight.insightText, insight.severity)
                }
                style={({ pressed }) => [icStyles.doctorBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ fontSize: 22 }}>👩‍⚕️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={icStyles.doctorBtnTitle}>Get a Doctor's Opinion</Text>
                  <Text style={icStyles.doctorBtnSub}>Board-certified physician review · $29</Text>
                </View>
                <Text style={icStyles.doctorBtnArrow}>→</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const icStyles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  inner: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  catText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  summary: {
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  confPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
  },
  detailsLink: {
    fontSize: 13,
    color: Colors.primary,
  },
  chevron: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  expandedSection: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    gap: 10,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  expandedText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionText: {
    fontSize: 15,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  actionSub: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  doctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: 4,
  },
  doctorBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  doctorBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
  },
  doctorBtnArrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C8DFF',
  },
  predTimeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(191,90,242,0.15)',
  },
  predTimeframeText: {
    fontSize: 12,
    color: 'rgba(191,90,242,0.65)',
  },
});

// ─── Insights Screen ──────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { insights, isLoading, unreadCount, dismissInsight, markAllRead, refetchAll: refetchInsights } = useInsights();
  const [activeFilter, setActiveFilter] = useState('all');
  const [consultationInsight, setConsultationInsight] = useState<{
    id: string;
    text: string;
    severity: string;
  } | null>(null);

  const tabBarH = 49 + Math.max(insets.bottom, 0);
  const isRefetching = false; // refetchAll is not async here

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return insights;
    if (activeFilter === 'predictive') return insights.filter((i) => i.category === 'Predictive');
    return insights.filter((i) => i.severity === activeFilter);
  }, [insights, activeFilter]);

  const criticalCount = useMemo(() => insights.filter((i) => i.severity === 'critical').length, [insights]);
  const highCount = useMemo(() => insights.filter((i) => i.severity === 'high').length, [insights]);

  const sparkValues = useMemo(() => [3, 5, 4, 7, 5, 6, insights.length], [insights.length]);

  const lastChecked = insights.length > 0
    ? format(new Date(Math.max(...insights.map((i) => new Date(i.createdAt).getTime()))), 'h:mm a')
    : 'N/A';

  const headerSubtitle = unreadCount > 0 ? `${unreadCount} unread` : 'All read';

  const headerSubColor = criticalCount > 0
    ? Colors.critical
    : unreadCount > 0
    ? Colors.alert
    : Colors.vital;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: tabBarH + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchInsights}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
          <View>
            <Text style={styles.title}>Insights</Text>
            <Text style={[styles.subtitle, { color: headerSubColor }]}>{headerSubtitle}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/trends' as any)}
              style={styles.trendsBtn}
            >
              <Text style={styles.trendsBtnText}>📈 Trends</Text>
            </Pressable>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Loading state */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                entering={FadeIn.delay(i * 60).duration(300)}
                style={styles.skeleton}
              />
            ))}
          </View>
        ) : insights.length === 0 ? (
          /* Empty state */
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.emptyContainer}>
            <ShieldIcon status="clear" />
            <Text style={styles.emptyTitle}>You're all clear</Text>
            <Text style={styles.emptySub}>
              Add health data to generate personalized AI insights.
            </Text>
          </Animated.View>
        ) : (
          <>
            {/* Summary card */}
            <View style={{ marginTop: 16 }}>
              <SummaryCard
                critical={criticalCount}
                high={highCount}
                unread={unreadCount}
                total={insights.length}
                lastChecked={lastChecked}
                sparkValues={sparkValues}
              />
            </View>

            {/* Filter chips */}
            <Animated.View entering={FadeInDown.delay(80).duration(280)} style={{ marginTop: 16 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {FILTERS.map((f) => {
                  const active = activeFilter === f.id;
                  const fColor = SEV_COLOR[f.id] ?? Colors.primary;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setActiveFilter(f.id)}
                      style={[styles.chip, active && { backgroundColor: fColor, borderColor: fColor }]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, active && { color: '#FFF', fontWeight: '600' }]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* Insight cards */}
            <Animated.View entering={FadeInDown.delay(140).duration(280)} style={{ marginTop: 16 }}>
              {filtered.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No insights match this filter.</Text>
                  <Text style={styles.emptySub}>Try selecting a different severity.</Text>
                </View>
              ) : (
                filtered.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onDismiss={() => dismissInsight(insight.id)}
                    onGetDoctorOpinion={(id, text, severity) =>
                      setConsultationInsight({ id, text, severity })
                    }
                  />
                ))
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>

      <ConsultationRequestSheet
        visible={consultationInsight !== null}
        onClose={() => setConsultationInsight(null)}
        insightId={consultationInsight?.id ?? ''}
        insightText={consultationInsight?.text ?? ''}
        severity={consultationInsight?.severity ?? 'medium'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    gap: 0,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 34,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    marginTop: 2,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: 4,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  trendsBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(76,141,255,0.10)',
    borderRadius: 999, borderWidth: 0.5,
    borderColor: 'rgba(76,141,255,0.25)',
    marginTop: 4,
  },
  trendsBtnText: {
    fontSize: 13, fontWeight: '500', color: '#4C8DFF',
  },
  chipsRow: {
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 100,
    height: 30,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  loadingContainer: {
    marginTop: 24,
    gap: 10,
    paddingHorizontal: 20,
  },
  skeleton: {
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
