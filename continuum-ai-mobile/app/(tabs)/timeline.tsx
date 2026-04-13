import React, {
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { format, isToday, isYesterday } from 'date-fns';
import { useHealth } from '../../hooks/useHealth';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import type { FirestoreHealthEntry } from '../../services/firestoreService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entryColor(type: string): string {
  switch (type) {
    case 'lab':   return Colors.primary;
    case 'symptom':   return Colors.alert;
    case 'vitals':    return Colors.vital;
    case 'report':    return Colors.insight;
    default:          return Colors.textTertiary;
  }
}

function entryLabel(type: string): string {
  const m: Record<string, string> = {
    lab:     'LAB',
    symptom: 'SYMPTOM',
    vitals:  'VITAL',
    report:  'REPORT',
    note:    'NOTE',
  };
  return m[type] ?? type.toUpperCase();
}

function entryIcon(type: string, color: string) {
  switch (type) {
    case 'lab_result':
      return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M9 3H15M9 3V14L4.5 20.5C4 21.2 4.5 22 5.4 22H18.6C19.5 22 20 21.2 19.5 20.5L15 14V3M9 3H15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'vital':
      return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M22 12H18L15 21L9 3L6 12H2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'medication':
      return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M10.5 3.5L3.5 10.5C2 12 2 14.5 3.5 16L8 20.5C9.5 22 12 22 13.5 20.5L20.5 13.5C22 12 22 9.5 20.5 8L16 3.5C14.5 2 12 2 10.5 3.5Z" stroke={color} strokeWidth={1.8} />
          <Path d="M7 12L17 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    case 'symptom':
      return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
          <Path d="M12 8V12L14 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    default:
      return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
          <Path d="M12 8V14M12 17V16.9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
  }
}

function dateGroupLabel(date: Date): string {
  if (isToday(date)) return 'TODAY';
  if (isYesterday(date)) return 'YESTERDAY';
  return format(date, 'MMMM d').toUpperCase();
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return format(date, 'h:mm a');
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { id: 'all',     label: 'All' },
  { id: 'lab',     label: 'Labs' },
  { id: 'vitals',  label: 'Vitals' },
  { id: 'symptom', label: 'Symptoms' },
  { id: 'report',  label: 'Reports' },
  { id: 'note',    label: 'Notes' },
];

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  isFirst,
  onDelete,
}: {
  entry: FirestoreHealthEntry;
  isFirst: boolean;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const color = entryColor(entry.entryType);

  const handleAskAI = useCallback(() => {
    const date = format(new Date(entry.createdAt), 'MMM d');
    const summary = entry.structuredData?.summary ?? entry.rawText ?? '';
    const context = `Tell me about my ${entry.title} from ${date}${summary ? ': ' + summary.slice(0, 200) : ''}`;
    // Store pending context in healthStore
    const { useHealthStore } = require('../../store/healthStore');
    useHealthStore.getState().setPendingChatContext(context);
    router.push('/(tabs)/chat' as any);
  }, [entry, router]);

  return (
    <View style={cardStyles.rowContainer}>
      {/* Left track */}
      <View style={cardStyles.track}>
        <View style={[cardStyles.node, { backgroundColor: color }]}>
          {isFirst && <View style={[cardStyles.nodePulse, { borderColor: color }]} />}
        </View>
        <View style={cardStyles.trackLine} />
      </View>

      {/* Card */}
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.82}
        style={[cardStyles.card, expanded && cardStyles.cardExpanded]}
      >
        {/* Left icon circle */}
        <View style={[cardStyles.iconCircle, { backgroundColor: `${color}18` }]}>
          {entryIcon(entry.entryType, color)}
        </View>

        {/* Middle content */}
        <View style={cardStyles.middle}>
          <Text style={[cardStyles.typeLabel, { color }]}>{entryLabel(entry.entryType)}</Text>
          <Text style={cardStyles.title} numberOfLines={expanded ? undefined : 1}>{entry.title}</Text>

          {/* Apple Health source badge */}
          {(entry.structuredData as any)?.source === 'apple_health' && (
            <View style={cardStyles.hkBadge}>
              <Text style={cardStyles.hkBadgeIcon}>❤️</Text>
              <Text style={cardStyles.hkBadgeText}>Apple Health</Text>
            </View>
          )}

          {!!entry.structuredData?.summary && (
            <Text style={cardStyles.summary} numberOfLines={expanded ? undefined : 1}>{entry.structuredData.summary}</Text>
          )}

          {/* Expanded detail */}
          {expanded && entry.structuredData && (
            <View style={cardStyles.expandedSection}>
              {Object.entries(entry.structuredData.labValues ?? {})
                .slice(0, 6)
                .map(([key, val], i) => (
                  <View key={key} style={[cardStyles.dataRow, i % 2 === 1 && cardStyles.dataRowAlt]}>
                    <Text style={cardStyles.dataKey}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={[cardStyles.dataVal, { color }]}>{String(val)}</Text>
                  </View>
                ))}
              <View style={cardStyles.expandedBtns}>
                <TouchableOpacity
                  style={[cardStyles.askAIBtn, { borderColor: color, flex: 1 }]}
                  onPress={handleAskAI}
                  activeOpacity={0.8}
                >
                  <Text style={[cardStyles.askAIText, { color }]}>Ask AI About This</Text>
                </TouchableOpacity>
                {onDelete && (
                  <TouchableOpacity
                    style={cardStyles.deleteBtn}
                    onPress={() => onDelete(entry.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={cardStyles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Right */}
        <View style={cardStyles.right}>
          <Text style={cardStyles.time}>{formatTimeAgo(new Date(entry.createdAt))}</Text>
          <Text style={cardStyles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
    marginBottom: 12,
  },
  track: {
    width: 10,
    alignItems: 'center',
    paddingTop: 12,
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  nodePulse: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    top: -4,
    left: -4,
    opacity: 0.4,
  },
  trackLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardExpanded: {
    borderColor: 'rgba(255,255,255,0.16)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  summary: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
  },
  chevron: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  hkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  hkBadgeIcon: {
    fontSize: 10,
  },
  hkBadgeText: {
    fontSize: 11,
    color: '#FF2D55',
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: 10,
    gap: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dataRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dataKey: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  dataVal: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  askAIBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  askAIText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  expandedBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.40)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    color: Colors.critical,
    fontFamily: FontFamily.bodyMedium,
  },
});

// ─── Timeline Screen ──────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { timeline, isLoading, isRefetching, refetchAll, removeEntry } = useHealth();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const tabBarH = 49 + Math.max(insets.bottom, 0);

  const handleDelete = useCallback(async (entryId: string) => {
    try {
      await removeEntry(entryId);
    } catch { /* ignore */ }
  }, [removeEntry]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = timeline;
    if (activeFilter !== 'all') {
      list = list.filter((e) => e.entryType === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.structuredData?.summary ?? e.rawText ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [timeline, activeFilter, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; entries: FirestoreHealthEntry[] }[] = [];
    const seen = new Map<string, number>();
    filtered.forEach((entry) => {
      const d = new Date(entry.createdAt);
      const key = format(d, 'yyyy-MM-dd');
      const label = dateGroupLabel(d);
      if (!seen.has(key)) {
        seen.set(key, groups.length);
        groups.push({ label, entries: [] });
      }
      groups[seen.get(key)!].entries.push(entry);
    });
    return groups;
  }, [filtered]);

  const labCount = useMemo(() => timeline.filter((e) => e.entryType === 'lab').length, [timeline]);
  const highPriorityCount = useMemo(() => {
    return timeline.filter((e) => (e.structuredData?.riskFlags?.length ?? 0) > 0).length;
  }, [timeline]);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: tabBarH + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
          <Text style={styles.title}>Timeline</Text>
          <Text style={styles.subtitle}>{timeline.length} health records</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(60).duration(280)} style={styles.statsRow}>
          {[
            { num: String(timeline.length), label: 'Total' },
            { num: String(labCount), label: 'Lab Results' },
            { num: String(highPriorityCount), label: 'High Priority' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statNum}>{stat.num}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Search bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(280)} style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Circle cx="11" cy="11" r="8" stroke={Colors.textTertiary} strokeWidth={1.8} />
              <Path d="M21 21L16.65 16.65" stroke={Colors.textTertiary} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              placeholder="Search records…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
              selectionColor="#4C8DFF"
              keyboardAppearance="dark"
            />
          </View>
        </Animated.View>

        {/* Filter chips */}
        <Animated.View entering={FadeInDown.delay(140).duration(280)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {FILTER_OPTIONS.map((opt) => {
              const active = activeFilter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setActiveFilter(opt.id)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Timeline entries */}
        {isLoading ? (
          <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.entries}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </Animated.View>
        ) : timeline.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Your health story starts here</Text>
            <Text style={styles.emptySub}>Upload a health report or add a note to start your timeline.</Text>
          </Animated.View>
        ) : grouped.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.empty}>
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptySub}>Try a different filter or add a health record.</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.entries}>
            {grouped.map((group, gi) => (
              <View key={group.label}>
                {/* Date group header */}
                <Text style={styles.groupLabel}>{group.label}</Text>
                {/* Entry track */}
                <View style={styles.groupEntries}>
                  {group.entries.map((entry, i) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      isFirst={gi === 0 && i === 0}
                      onDelete={handleDelete}
                    />
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
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
    paddingBottom: 4,
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
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 2,
    textAlign: 'center',
  },
  searchWrap: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    height: 38,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  chipsScroll: {
    marginTop: 12,
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
  chipActive: {
    backgroundColor: '#4C8DFF',
    borderColor: '#4C8DFF',
  },
  chipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  entries: {
    marginTop: 20,
    gap: 0,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.0,
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingLeft: 24,
    marginTop: 8,
  },
  groupEntries: {
    paddingLeft: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 4,
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
    paddingHorizontal: 32,
  },
  skeletonCard: {
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 20,
  },
});
