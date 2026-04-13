import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { format } from 'date-fns';

import { useAuthStore } from '../../store/authStore';
import { useHealth, calculateStreak } from '../../hooks/useHealth';
import { useInsights } from '../../hooks/useInsights';
import { useHealthKit } from '../../hooks/useHealthKit';
import { isHealthKitAvailable } from '../../services/healthKitService';
import { useMedications } from '../../hooks/useMedications';
import { useFamily } from '../../hooks/useFamily';

import { UploadModal } from '../../components/ui/UploadModal';
import { HealthKitPermissionSheet } from '../../components/ui/HealthKitPermissionSheet';

import { Colors, GLASS_1 } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import type { FirestoreHealthEntry } from '../../services/firestoreService';
import { formatTimeAgo } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_W = Math.min(SCREEN_WIDTH, 430);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function getFirstName(name: string | undefined): string {
  if (!name) return 'there';
  return name.trim().split(' ')[0];
}

function entryTypeColor(type: string): string {
  switch (type) {
    case 'lab':     return Colors.primary;
    case 'symptom': return Colors.alert;
    case 'vitals':  return Colors.vital;
    case 'report':  return Colors.insight;
    default:        return Colors.textTertiary;
  }
}

function entryTypeLabel(type: string): string {
  const map: Record<string, string> = {
    lab:     'Lab Result',
    symptom: 'Symptom',
    vitals:  'Vital Sign',
    report:  'Report',
    note:    'Note',
  };
  return map[type] ?? type;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#30D158';
  if (score >= 60) return '#4C8DFF';
  if (score >= 40) return '#FF9F0A';
  return '#FF453A';
}

// ─── Hero Ring ────────────────────────────────────────────────────────────────

function HeroRing({ score }: { score: number }) {
  const SIZE = 180;
  const R = 80;
  const SW = 10;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circ = 2 * Math.PI * R;
  const color = scoreColor(score);
  const pct = Math.min(score / 100, 0.999);

  // Glowing dot at arc end
  const angleRad = pct * 2 * Math.PI - Math.PI / 2;
  const dotX = cx + R * Math.cos(angleRad);
  const dotY = cy + R * Math.sin(angleRad);

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        {/* 1. Ambient glow */}
        <Circle cx={cx} cy={cy} r={88} fill="none" stroke={color} strokeWidth={28} strokeOpacity={0.05} />
        {/* 2. Track arc */}
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        {/* 3. Score arc */}
        <Circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={[circ * pct, circ]}
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
        {/* 4. Glowing dot outer ring */}
        <Circle cx={dotX} cy={dotY} r={9} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} />
        {/* 4. Glowing dot core */}
        <Circle cx={dotX} cy={dotY} r={5} fill={color} />
      </Svg>

      {/* 5. Center content */}
      <View style={ringStyles.center} pointerEvents="none">
        <Text style={[ringStyles.score, { color }]}>{score}</Text>
        <Text style={ringStyles.outOf}>/100</Text>
        <Text style={ringStyles.label}>HEALTH SCORE</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 52,
    fontFamily: FontFamily.displayBold,
    lineHeight: 56,
  },
  outOf: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.30)',
    fontWeight: '400',
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
    letterSpacing: 2.5,
    marginTop: 6,
  },
});

// ─── Hero Subtitle rotator ────────────────────────────────────────────────────

const HERO_SUBTITLES = [
  'Based on {n} health entries',
  'Improving since last month ↑',
  '2 insights need attention',
];

function HeroSubtitle({ entryCount }: { entryCount: number }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HERO_SUBTITLES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const text = HERO_SUBTITLES[idx].replace('{n}', String(entryCount));

  return (
    <Text style={heroSubStyles.text}>{visible ? text : ''}</Text>
  );
}

const heroSubStyles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 10,
  },
});

// ─── Stat Pills Row ────────────────────────────────────────────────────────────

interface StatPillsRowProps {
  conditionsCount: number;
  medicationsCount: number;
  insightsCount: number;
}

function StatPillsRow({ conditionsCount, medicationsCount, insightsCount }: StatPillsRowProps) {
  const pills = [
    { label: `${conditionsCount} Conditions`, dot: '#4C8DFF' },
    { label: `${medicationsCount} Medications`, dot: '#30D158' },
    { label: `${insightsCount} Insights`, dot: '#BF5AF2' },
  ];
  return (
    <View style={pillStyles.row}>
      {pills.map((p) => (
        <View key={p.label} style={pillStyles.pill}>
          <View style={[pillStyles.dot, { backgroundColor: p.dot }]} />
          <Text style={pillStyles.text}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

const pillStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '400',
  },
});

// ─── Quick Action SVG Icons ───────────────────────────────────────────────────

function UploadIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 8L12 3L7 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3V15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M19 3L19.5 5L21.5 5.5L19.5 6L19 8L18.5 6L16.5 5.5L18.5 5L19 3Z"
        stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

function TimelineIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4V20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="7" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="13" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="12" cy="19" r="2.5" stroke={color} strokeWidth={1.8} />
      <Path d="M14.5 7H18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9.5 13H6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ReportIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6C5.5 2 5 2.2 4.6 2.6C4.2 3 4 3.5 4 4V20C4 20.5 4.2 21 4.6 21.4C5 21.8 5.5 22 6 22H18C18.5 22 19 21.8 19.4 21.4C19.8 21 20 20.5 20 20V8L14 2Z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2V8H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 13H16M8 17H13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Quick Tile ────────────────────────────────────────────────────────────────

interface QuickTileProps {
  icon: React.ReactNode;
  color: string;
  label: string;
  onPress: () => void;
}

function QuickTile({ icon, color, label, onPress }: QuickTileProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={[
        tileStyles.tile,
        pressed && { transform: [{ scale: 0.96 }], backgroundColor: 'rgba(76,141,255,0.08)' },
      ]}
    >
      <View style={[tileStyles.iconWrap, { backgroundColor: `${color}24` }]}>
        {icon}
      </View>
      <View style={tileStyles.bottom}>
        <Text style={tileStyles.label}>{label}</Text>
        <Text style={tileStyles.arrow}>→</Text>
      </View>
    </Pressable>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    width: '47.5%',
    height: 88,
    ...GLASS_1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  arrow: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.20)',
  },
});

// ─── Insight Preview Card ─────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: Colors.critical,
  high: Colors.alert,
  moderate: Colors.primary,
  low: Colors.vital,
};

interface InsightPreviewCardProps {
  summary: string;
  severity: string;
  category: string;
  timeAgo: string;
  isUnread: boolean;
  confidenceScore?: number;
  onPress: () => void;
}

function InsightPreviewCard({ summary, severity, category, timeAgo, isUnread, confidenceScore, onPress }: InsightPreviewCardProps) {
  const accentColor = SEVERITY_COLORS[severity] ?? Colors.primary;
  const conf = confidenceScore !== undefined ? Math.round(confidenceScore * 100) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={insightStyles.outer}>
      {/* Left accent */}
      <View style={[insightStyles.accent, { backgroundColor: accentColor }]} />
      <View style={insightStyles.inner}>
        {/* Top row */}
        <View style={insightStyles.topRow}>
          <View style={[insightStyles.catPill, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[insightStyles.catText, { color: accentColor }]}>
              {category.toUpperCase()}
            </Text>
          </View>
          <View style={insightStyles.topRight}>
            <Text style={insightStyles.timeAgo}>{timeAgo}</Text>
            {isUnread && <View style={insightStyles.unreadDot} />}
          </View>
        </View>
        {/* Summary */}
        <Text style={insightStyles.summary} numberOfLines={2}>{summary}</Text>
        {/* Footer */}
        <View style={insightStyles.footer}>
          {conf !== null ? (
            <View style={insightStyles.confPill}>
              <Text style={insightStyles.confText}>{conf}% confident</Text>
            </View>
          ) : <View />}
          <Text style={insightStyles.detailsLink}>Details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const insightStyles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    ...GLASS_1,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  inner: {
    flex: 1,
    padding: 16,
    gap: 8,
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
    color: Colors.textPrimary,
    lineHeight: 22,
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 2,
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
});

// ─── Recent Activity Row ──────────────────────────────────────────────────────

function RecentActivityRow({ entry, isLast }: { entry: FirestoreHealthEntry; isLast: boolean }) {
  const typeColor = entryTypeColor(entry.entryType);
  return (
    <View style={activityStyles.row}>
      {/* Left track */}
      <View style={activityStyles.track}>
        <View style={[activityStyles.dot, { backgroundColor: typeColor }]} />
        {!isLast && <View style={activityStyles.line} />}
      </View>
      {/* Content */}
      <View style={[activityStyles.content, { paddingBottom: isLast ? 0 : 16 }]}>
        <View style={activityStyles.contentRow}>
          <View style={{ flex: 1 }}>
            <Text style={[activityStyles.typeLabel, { color: typeColor }]}>
              {entryTypeLabel(entry.entryType).toUpperCase()}
            </Text>
            <Text style={activityStyles.title} numberOfLines={1}>{entry.title}</Text>
          </View>
          <Text style={[activityStyles.chevron, { color: `${typeColor}50` }]}>›</Text>
        </View>
        {!isLast && <View style={activityStyles.sep} />}
      </View>
    </View>
  );
}

const activityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  track: {
    width: 8,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    height: 52,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '300',
  },
  sep: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

// ─── Family Widget ────────────────────────────────────────────────────────────

function FamilyWidget() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { familyGroup, memberSummaries } = useFamily();

  if (!familyGroup) return null;

  const otherActives = familyGroup.members.filter(
    (m) => m.status === 'active' && m.userId !== user?.id
  );
  if (otherActives.length === 0) return null;

  const hasAlert = Array.from(memberSummaries.values()).some(
    (s) => (s?.unreadInsights ?? 0) > 0
  );

  return (
    <Animated.View entering={FadeInUp.delay(270).duration(350)}>
      <Pressable
        onPress={() => router.push('/family' as any)}
        style={({ pressed }) => [styles.familyWidget, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.familyWidgetRow}>
          <Text style={styles.familyWidgetTitle}>Family</Text>
          {hasAlert && (
            <View style={styles.familyAlertBadge}>
              <Text style={styles.familyAlertText}>⚠ Needs attention</Text>
            </View>
          )}
        </View>

        {/* Overlapping avatars */}
        <View style={styles.familyAvatarRow}>
          {otherActives.slice(0, 4).map((member, i) => {
            const s = memberSummaries.get(member.userId);
            const alert = (s?.unreadInsights ?? 0) > 0;
            return (
              <View
                key={member.userId}
                style={[
                  styles.familyAvatar,
                  {
                    backgroundColor: member.avatarColor + '25',
                    borderColor: alert ? '#FF9F0A' : '#080808',
                    marginLeft: i === 0 ? 0 : -10,
                    zIndex: 10 - i,
                  },
                ]}
              >
                <Text style={[styles.familyAvatarText, { color: member.avatarColor }]}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
                {alert && <View style={styles.familyAlertDot} />}
              </View>
            );
          })}
          {otherActives.length > 4 && (
            <View style={[styles.familyAvatar, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: '#080808', marginLeft: -10 }]}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>+{otherActives.length - 4}</Text>
            </View>
          )}
        </View>

        <Text style={styles.familyWidgetSub}>Tap to view family health →</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Medication Widget ────────────────────────────────────────────────────────

function MedicationWidget() {
  const router = useRouter();
  const { schedules, todaysLogs } = useMedications();

  if (schedules.length === 0) return null;

  const todayTotal = schedules.reduce((s, m) => s + m.times.length, 0);
  const todayTaken = todaysLogs.filter((l) => l.status === 'taken').length;
  const allDone = todayTotal > 0 && todayTaken === todayTotal;

  return (
    <Animated.View entering={FadeInUp.delay(260).duration(350)}>
      <Pressable
        onPress={() => router.push('/(tabs)/medications' as any)}
        style={({ pressed }) => [
          styles.medWidget,
          allDone && styles.medWidgetDone,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.medWidgetRow}>
          <Text style={styles.medWidgetTitle}>Today's Medications</Text>
          <Text style={[styles.medWidgetCount, allDone && styles.medWidgetCountDone]}>
            {todayTaken}/{todayTotal} taken
          </Text>
        </View>
        {/* Progress bar */}
        <View style={styles.medWidgetBar}>
          <View
            style={[
              styles.medWidgetBarFill,
              {
                width: `${todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 0}%`,
                backgroundColor: allDone ? '#30D158' : '#4C8DFF',
              },
            ]}
          />
        </View>
        {/* Pill tags */}
        <View style={styles.medWidgetTags}>
          {schedules.slice(0, 3).map((med, i) => (
            <View key={i} style={[styles.medTag, { borderColor: med.color + '35', backgroundColor: med.color + '15' }]}>
              <View style={[styles.medTagDot, { backgroundColor: med.color }]} />
              <Text style={[styles.medTagText, { color: med.color }]}>{med.medicationName}</Text>
            </View>
          ))}
          {schedules.length > 3 && (
            <Text style={styles.medTagMore}>+{schedules.length - 3} more</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { healthProfile, timeline, healthScore, isLoading, isRefetching, refetchAll } = useHealth();
  const { insights } = useInsights();
  const { isAvailable, hasPermission, isSyncing, lastSyncTime, syncHealthData } = useHealthKit();

  const [uploadVisible, setUploadVisible] = useState(false);
  const [showHealthKitSheet, setShowHealthKitSheet] = useState(false);

  const firstName = getFirstName(user?.name);
  const streak = useMemo(() => calculateStreak(timeline), [timeline]);
  const topInsights = useMemo(() => insights.slice(0, 2), [insights]);
  const recentEntries = useMemo(() => timeline.slice(0, 3), [timeline]);
  const unreadCount = useMemo(() => insights.filter((i) => !i.isRead).length, [insights]);

  // Stat pill counts from real Firestore data
  const conditionsCount = healthProfile?.conditions?.length ?? 0;
  const medicationsCount = (healthProfile?.medications as any[])?.length ?? 0;
  const insightsCount = insights.length;

  const handleRefresh = useCallback(() => refetchAll(), [refetchAll]);
  const tabBarHeight = 49 + Math.max(insets.bottom, 0);

  // Health score: show 0 for new users with no data
  const displayScore = healthScore ?? 0;
  const isNewUser = !isLoading && timeline.length === 0 && insights.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 32 }]}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS !== 'web'}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </Animated.View>

        {/* ── Hero Score Section ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(80).duration(400)} style={styles.heroSection}>
          {isLoading ? (
            <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'center' }} />
          ) : displayScore === 0 ? (
            <View style={styles.noScoreContainer}>
              <Text style={styles.noScoreValue}>—</Text>
              <Text style={styles.noScoreLabel}>Add health data to calculate your score</Text>
            </View>
          ) : (
            <HeroRing score={displayScore} />
          )}
          <HeroSubtitle entryCount={timeline.length} />
          <StatPillsRow
            conditionsCount={conditionsCount}
            medicationsCount={medicationsCount}
            insightsCount={insightsCount}
          />
        </Animated.View>

        {/* ── Thin separator ──────────────────────────────────────────────── */}
        <View style={styles.separator} />

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).duration(350)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.tileGrid}>
            <QuickTile
              icon={<UploadIcon color="#4C8DFF" />}
              color="#4C8DFF"
              label="Upload"
              onPress={() => setUploadVisible(true)}
            />
            <QuickTile
              icon={<SparkleIcon color="#BF5AF2" />}
              color="#BF5AF2"
              label="Ask AI"
              onPress={() => router.push('/(tabs)/chat' as any)}
            />
            <QuickTile
              icon={<TimelineIcon color="#30D158" />}
              color="#30D158"
              label="Timeline"
              onPress={() => router.push('/(tabs)/timeline' as any)}
            />
            <QuickTile
              icon={<ReportIcon color="#FF9F0A" />}
              color="#FF9F0A"
              label="Report"
              onPress={() => router.push('/report-card' as any)}
            />
          </View>
        </Animated.View>

        {/* ── Apple Health Connect Card ────────────────────────────────── */}
        {isAvailable && !hasPermission && (
          <Animated.View entering={FadeInUp.delay(240).duration(350)}>
            <Pressable
              onPress={() => setShowHealthKitSheet(true)}
              style={styles.hkConnectCard}
            >
              <View style={styles.hkIconWrap}>
                <Text style={{ fontSize: 20 }}>❤️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hkCardTitle}>Connect Apple Health</Text>
                <Text style={styles.hkCardSub}>Sync glucose, heart rate, steps & more</Text>
              </View>
              <Text style={styles.hkConnectLink}>Connect →</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Web / Android fallback banner */}
        {!isHealthKitAvailable() && (
          <Animated.View entering={FadeInUp.delay(240).duration(350)}>
            <View style={styles.hkWebCard}>
              <Text style={{ fontSize: 22 }}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hkWebTitle}>Apple Health available on iPhone</Text>
                <Text style={styles.hkWebSub}>Download Continuum on iOS to sync health data</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Syncing indicator */}
        {isAvailable && hasPermission && isSyncing && (
          <View style={styles.hkSyncRow}>
            <ActivityIndicator size="small" color="#4C8DFF" />
            <Text style={styles.hkSyncText}>Syncing Apple Health...</Text>
          </View>
        )}

        {/* Last sync time */}
        {isAvailable && hasPermission && lastSyncTime && !isSyncing && (
          <Pressable onPress={syncHealthData} style={styles.hkLastSyncRow}>
            <Text style={{ fontSize: 12 }}>❤️</Text>
            <Text style={styles.hkLastSyncText}>
              Apple Health synced {formatTimeAgo(lastSyncTime)} · Tap to refresh
            </Text>
          </Pressable>
        )}

        {/* ── Medication Widget ─────────────────────────────────────────────── */}
        <MedicationWidget />

        {/* ── Family Widget ─────────────────────────────────────────────────── */}
        <FamilyWidget />

        {/* ── Empty state for new users ────────────────────────────────────── */}
        {isNewUser && (
          <Animated.View entering={FadeInUp.delay(280).duration(350)} style={styles.sectionGap}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyWave}>👋</Text>
              <Text style={styles.emptyTitle}>Welcome to Continuum</Text>
              <Text style={styles.emptySub}>
                Upload your first health report or describe your symptoms to get started.
              </Text>
              <Pressable
                onPress={() => setUploadVisible(true)}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Add Health Data</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* ── Insights Preview ────────────────────────────────────────────── */}
        {!isNewUser && topInsights.length > 0 && (
          <Animated.View entering={FadeInUp.delay(280).duration(350)} style={styles.sectionGap}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Insights</Text>
              <View style={styles.insightsHeaderRight}>
                {unreadCount > 0 && (
                  <View style={styles.unreadPill}>
                    <Text style={styles.unreadPillText}>{unreadCount} unread</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/insights' as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
            </View>
            {topInsights.map((insight) => (
              <InsightPreviewCard
                key={insight.id}
                summary={insight.insightText}
                severity={insight.severity}
                category={insight.category}
                timeAgo={format(new Date(insight.createdAt), 'MMM d')}
                isUnread={!insight.isRead}
                confidenceScore={insight.confidenceScore}
                onPress={() => router.push('/(tabs)/insights' as any)}
              />
            ))}
          </Animated.View>
        )}

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        {recentEntries.length > 0 && (
          <Animated.View entering={FadeInUp.delay(360).duration(350)} style={styles.sectionGap}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/timeline' as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityList}>
              {recentEntries.map((entry, i) => (
                <RecentActivityRow
                  key={entry.id}
                  entry={entry}
                  isLast={i === recentEntries.length - 1}
                />
              ))}
            </View>
          </Animated.View>
        )}

      </ScrollView>

      <UploadModal visible={uploadVisible} onClose={() => setUploadVisible(false)} />
      <HealthKitPermissionSheet
        visible={showHealthKitSheet}
        onClose={() => setShowHealthKitSheet(false)}
        onGranted={() => {
          // Permission was granted — sync happens inside the hook automatically
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    gap: 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.50)',
  },
  name: {
    fontSize: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76,141,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(76,141,255,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4C8DFF',
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },

  // Separator
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 24,
    marginVertical: 16,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  insightsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadPill: {
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unreadPillText: {
    fontSize: 11,
    color: Colors.alert,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 15,
    color: Colors.primary,
  },

  // Tile grid
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },

  // Section gap
  sectionGap: {
    marginTop: 24,
  },

  // Activity
  activityList: {
    paddingHorizontal: 24,
  },

  // New user empty state
  emptyCard: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: 'rgba(76,141,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(76,141,255,0.25)',
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyWave: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#4C8DFF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },

  // No score state
  noScoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noScoreValue: {
    fontSize: 72,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.20)',
    lineHeight: 80,
  },
  noScoreLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 220,
  },

  // HealthKit cards
  hkConnectCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    padding: 16,
    backgroundColor: 'rgba(255,45,85,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,45,85,0.25)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hkIconWrap: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hkCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  hkCardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  hkConnectLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C8DFF',
  },
  hkWebCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hkWebTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.60)',
  },
  hkWebSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.30)',
    marginTop: 2,
  },
  hkSyncRow: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hkSyncText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
  },
  hkLastSyncRow: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hkLastSyncText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.30)',
  },
  // ─── Medication Widget ──────────────────────────────────────────────────────
  medWidget: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  medWidgetDone: {
    borderColor: 'rgba(48,209,88,0.25)',
  },
  medWidgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medWidgetTitle: {
    fontSize: 15, fontWeight: '600', color: '#FFFFFF',
  },
  medWidgetCount: {
    fontSize: 13, color: 'rgba(255,255,255,0.40)',
  },
  medWidgetCountDone: {
    color: '#30D158',
  },
  medWidgetBar: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 10,
  },
  medWidgetBarFill: {
    height: '100%', borderRadius: 2,
  },
  medWidgetTags: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  medTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 0.5,
  },
  medTagDot: {
    width: 5, height: 5, borderRadius: 2.5,
  },
  medTagText: {
    fontSize: 11, fontWeight: '500',
  },
  medTagMore: {
    fontSize: 11, color: 'rgba(255,255,255,0.30)',
    alignSelf: 'center',
  },
  // ─── Family Widget ──────────────────────────────────────────────────────────
  familyWidget: {
    marginHorizontal: 20, marginTop: 16, marginBottom: 4,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  familyWidgetRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  familyWidgetTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  familyAlertBadge: {
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 0.5, borderColor: 'rgba(255,159,10,0.30)',
  },
  familyAlertText: { fontSize: 11, color: '#FF9F0A', fontWeight: '500' },
  familyAvatarRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  familyAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  familyAvatarText: { fontSize: 15, fontWeight: '700' },
  familyAlertDot: {
    position: 'absolute', top: 0, right: 0,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#FF9F0A',
    borderWidth: 1.5, borderColor: '#080808',
  },
  familyWidgetSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.30)',
  },
});
