import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { useHealthStore } from '../../store/healthStore';
import { useHealth } from '../../hooks/useHealth';
import { SeverityBadge } from '../../components/ui/SeverityBadge';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';
import type { HealthEntry, HealthEntryType, StructuredData } from '../../types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | HealthEntryType;

interface FilterChip {
  key: FilterType;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'lab_result', label: 'Labs' },
  { key: 'symptom', label: 'Symptoms' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'medication', label: 'Medications' },
  { key: 'vital', label: 'Vitals' },
  { key: 'note', label: 'Notes' },
];

// ─── Entry type config ────────────────────────────────────────────────────────

interface EntryTypeConfig {
  color: string;
  bg: string;
  label: string;
}

const ENTRY_TYPE_CONFIG: Record<HealthEntryType, EntryTypeConfig> = {
  lab_result: {
    color: Colors.electric,
    bg: Colors.electricMist,
    label: 'Lab Result',
  },
  symptom: {
    color: Colors.caution,
    bg: Colors.cautionGlow,
    label: 'Symptom',
  },
  appointment: {
    color: Colors.insight,
    bg: Colors.insightGlow,
    label: 'Appointment',
  },
  medication: {
    color: Colors.positive,
    bg: Colors.positiveGlow,
    label: 'Medication',
  },
  vital: {
    color: '#FF9F47',
    bg: 'rgba(255,159,71,0.12)',
    label: 'Vital',
  },
  note: {
    color: Colors.textTertiary,
    bg: 'rgba(92,99,132,0.12)',
    label: 'Note',
  },
};

// ─── Date group helpers ───────────────────────────────────────────────────────

function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return format(date, 'EEEE');
  if (isThisMonth(date)) return format(date, 'MMMM d');
  return format(date, 'MMMM d, yyyy');
}

interface DateGroup {
  label: string;
  entries: HealthEntry[];
}

function groupByDate(entries: HealthEntry[]): DateGroup[] {
  const groups: Map<string, HealthEntry[]> = new Map();
  for (const entry of entries) {
    const label = getDateGroupLabel(entry.recordedAt);
    const existing = groups.get(label) ?? [];
    existing.push(entry);
    groups.set(label, existing);
  }
  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LabIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3H15M9 3V13L5 19H19L15 13V3M9 3H15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SymptomIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AppointmentIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth={1.8} />
      <Path d="M3 9H21M8 2V6M16 2V6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function MedicationIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.5 6H6.5C4.567 6 3 7.567 3 9.5V14.5C3 16.433 4.567 18 6.5 18H10.5C12.433 18 14 16.433 14 14.5V9.5C14 7.567 12.433 6 10.5 6Z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M3 12H14" stroke={color} strokeWidth={1.8} />
      <Path
        d="M17.5 6L21 9.5L17.5 13M21 9.5H14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function VitalIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12H6L9 5L12 19L15 9L18 14H21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NoteIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 5 9 3 12 3C15 3 15 5 15 5M9 5H15M9 12H15M9 16H13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChevronDownIcon({ color, flipped }: { color: string; flipped: boolean }) {
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

function EntryIcon({ type, color }: { type: HealthEntryType; color: string }) {
  switch (type) {
    case 'lab_result':  return <LabIcon color={color} />;
    case 'symptom':     return <SymptomIcon color={color} />;
    case 'appointment': return <AppointmentIcon color={color} />;
    case 'medication':  return <MedicationIcon color={color} />;
    case 'vital':       return <VitalIcon color={color} />;
    case 'note':        return <NoteIcon color={color} />;
    default:            return <NoteIcon color={color} />;
  }
}

// ─── Structured data panel ────────────────────────────────────────────────────

function StructuredDataPanel({ data }: { data: StructuredData }) {
  return (
    <View style={styles.structuredPanel}>
      {data.summary ? (
        <Text style={styles.structuredSummary}>{data.summary}</Text>
      ) : null}

      {data.lab_values && Object.keys(data.lab_values).length > 0 ? (
        <View style={styles.structuredSection}>
          <Text style={styles.structuredSectionLabel}>LAB VALUES</Text>
          <View style={styles.labGrid}>
            {Object.entries(data.lab_values).map(([key, val]) => (
              <View key={key} style={styles.labCell}>
                <Text style={styles.labKey}>{key}</Text>
                <Text style={styles.labVal}>{val}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {data.conditions && data.conditions.length > 0 ? (
        <View style={styles.structuredSection}>
          <Text style={styles.structuredSectionLabel}>CONDITIONS</Text>
          <View style={styles.tagRow}>
            {data.conditions.map((c) => (
              <View key={c} style={[styles.tag, { backgroundColor: 'rgba(56, 139, 253, 0.1)' }]}>
                <Text style={[styles.tagText, { color: Colors.primary }]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {data.symptoms && data.symptoms.length > 0 ? (
        <View style={styles.structuredSection}>
          <Text style={styles.structuredSectionLabel}>SYMPTOMS</Text>
          <View style={styles.tagRow}>
            {data.symptoms.map((s) => (
              <View key={s} style={[styles.tag, { backgroundColor: 'rgba(210, 153, 34, 0.1)' }]}>
                <Text style={[styles.tagText, { color: Colors.warning }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {data.medications && data.medications.length > 0 ? (
        <View style={styles.structuredSection}>
          <Text style={styles.structuredSectionLabel}>MEDICATIONS</Text>
          {data.medications.map((m, i) => (
            <View key={i} style={styles.medRow}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medDetail}>{m.dosage} · {m.frequency}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.risk_flags && data.risk_flags.length > 0 ? (
        <View style={styles.structuredSection}>
          <Text style={[styles.structuredSectionLabel, { color: Colors.warning }]}>RISK FLAGS</Text>
          {data.risk_flags.map((flag, i) => (
            <View key={i} style={styles.riskRow}>
              <View style={styles.riskDot} />
              <Text style={styles.riskText}>{flag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.source_file ? (
        <View style={styles.sourceRow}>
          <Text style={styles.sourceText}>Source: {data.source_file}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: HealthEntry;
  isLast: boolean;
}

function EntryCard({ entry, isLast }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = ENTRY_TYPE_CONFIG[entry.type];
  const hasStructured = !!entry.structuredData;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  const timeLabel = format(new Date(entry.recordedAt), 'h:mm a');

  return (
    <View style={styles.entryRow}>
      {/* Timeline column */}
      <View style={styles.timelineCol}>
        <View style={[styles.entryIconWrap, { backgroundColor: typeConfig.bg }]}>
          <EntryIcon type={entry.type} color={typeConfig.color} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Card */}
      <View style={[styles.card, expanded && styles.cardExpanded]}>
        <TouchableOpacity
          onPress={hasStructured ? toggleExpand : undefined}
          activeOpacity={hasStructured ? 0.75 : 1}
          style={styles.cardTouchable}
        >
          {/* Type pill + severity */}
          <View style={styles.cardTopRow}>
            <View style={[styles.typePill, { backgroundColor: typeConfig.bg }]}>
              <Text style={[styles.typePillText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>
            <View style={styles.cardTopRight}>
              {entry.severity && <SeverityBadge severity={entry.severity} />}
              {hasStructured && (
                <ChevronDownIcon color={Colors.textMuted} flipped={expanded} />
              )}
            </View>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle}>{entry.title}</Text>

          {/* Value + unit */}
          {entry.value !== undefined ? (
            <Text style={styles.cardValue}>
              {entry.value}
              {entry.unit ? <Text style={styles.cardUnit}> {entry.unit}</Text> : null}
            </Text>
          ) : null}

          {/* Description */}
          {entry.description ? (
            <Text style={styles.cardDesc} numberOfLines={expanded ? undefined : 2}>
              {entry.description}
            </Text>
          ) : null}

          {/* Tags */}
          {entry.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {entry.tags.map((tag) => (
                <View key={tag} style={styles.entryTag}>
                  <Text style={styles.entryTagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Time */}
          <Text style={styles.cardTime}>{timeLabel}</Text>
        </TouchableOpacity>

        {/* Expanded structured data */}
        {expanded && entry.structuredData ? (
          <StructuredDataPanel data={entry.structuredData} />
        ) : null}
      </View>
    </View>
  );
}

// ─── Date group header ────────────────────────────────────────────────────────

function DateGroupHeader({ label }: { label: string }) {
  return (
    <View style={styles.dateGroupRow}>
      <View style={styles.dateGroupLine} />
      <Text style={styles.dateGroupLabel}>{label}</Text>
      <View style={styles.dateGroupLine} />
    </View>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

interface FilterChipsProps {
  active: FilterType;
  onChange: (f: FilterType) => void;
}

function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersContent}
      style={styles.filtersScroll}
    >
      {FILTERS.map((f) => {
        const isActive = f.key === active;
        const typeConfig = f.key !== 'all' ? ENTRY_TYPE_CONFIG[f.key] : null;
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => onChange(f.key)}
            activeOpacity={0.75}
            style={[
              styles.filterChip,
              isActive && styles.filterChipActive,
              isActive && typeConfig && { borderColor: typeConfig.color, backgroundColor: typeConfig.bg },
              isActive && !typeConfig && { borderColor: Colors.primary, backgroundColor: 'rgba(56,139,253,0.1)' },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive && typeConfig && { color: typeConfig.color },
                isActive && !typeConfig && { color: Colors.primary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {filtered ? 'No entries of this type' : 'No health entries yet'}
      </Text>
      <Text style={styles.emptyDesc}>
        {filtered
          ? 'Try selecting a different filter or add new entries.'
          : 'Start logging your symptoms, vitals, and notes to build your health timeline.'}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { timeline } = useHealthStore();
  const { refetchAll, isRefetching } = useHealth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return timeline;
    return timeline.filter((e) => e.type === activeFilter);
  }, [timeline, activeFilter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const handleRefresh = useCallback(() => {
    refetchAll();
  }, [refetchAll]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Timeline</Text>
          <Text style={styles.headerSub}>
            {timeline.length} {timeline.length === 1 ? 'entry' : 'entries'} recorded
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <FilterChips active={activeFilter} onChange={setActiveFilter} />

      {/* Timeline list */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {groups.length === 0 ? (
          <EmptyState filtered={activeFilter !== 'all'} />
        ) : (
          groups.map((group, gi) => (
            <View key={group.label}>
              <DateGroupHeader label={group.label} />
              {group.entries.map((entry, ei) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  isLast={gi === groups.length - 1 && ei === group.entries.length - 1}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    lineHeight: 34,
  },
  headerSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  // ── Filters
  filtersScroll: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersContent: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },

  // ── Scroll
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },

  // ── Date group
  dateGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
    marginTop: Spacing[2],
    gap: Spacing[3],
  },
  dateGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dateGroupLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Entry row + timeline
  entryRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  timelineCol: {
    alignItems: 'center',
    width: 32,
  },
  entryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
    borderRadius: 1,
  },

  // ── Card
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[1],
  },
  cardExpanded: {
    borderColor: Colors.borderActive,
  },
  cardTouchable: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  typePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  typePillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  cardValue: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  cardUnit: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  cardDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  entryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  entryTagText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  cardTime: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ── Structured data panel
  structuredPanel: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing[3],
    gap: Spacing[4],
    backgroundColor: Colors.surfaceElevated,
  },
  structuredSummary: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  structuredSection: {
    gap: Spacing[2],
  },
  structuredSectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  labGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  labCell: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    minWidth: 100,
  },
  labKey: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  labVal: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
  },
  medRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: 2,
  },
  medName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  medDetail: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginTop: 5,
    flexShrink: 0,
  },
  riskText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sourceRow: {
    paddingTop: Spacing[1],
  },
  sourceText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // ── Empty
  empty: {
    paddingTop: Spacing[12],
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[8],
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
