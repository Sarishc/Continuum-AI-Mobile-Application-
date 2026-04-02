import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealthStore } from '../../store/healthStore';
import { SeverityBadge } from '../../components/ui/SeverityBadge';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { timeline } = useHealthStore();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>Your health history</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {timeline.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyDesc}>
              Start logging symptoms, vitals, and notes to build your health timeline.
            </Text>
          </View>
        ) : (
          timeline.map((entry, index) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.timelineColumn}>
                <View style={styles.dot} />
                {index < timeline.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryType}>{entry.type}</Text>
                  {entry.severity && <SeverityBadge severity={entry.severity} />}
                </View>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                {entry.description && (
                  <Text style={styles.entryDesc} numberOfLines={2}>
                    {entry.description}
                  </Text>
                )}
                <Text style={styles.entryDate}>
                  {new Date(entry.recordedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4] },
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
  entryRow: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[3] },
  timelineColumn: { alignItems: 'center', width: 16 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  entryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    gap: Spacing[1],
    marginBottom: Spacing[1],
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  entryType: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  entryTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  entryDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  entryDate: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: Spacing[1],
  },
});
