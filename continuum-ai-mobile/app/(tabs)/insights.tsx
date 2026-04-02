import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHealthStore } from '../../store/healthStore';
import { InsightCard } from '../../components/ui/InsightCard';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/theme';
import type { Insight } from '../../types';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { insights, dismissInsight } = useHealthStore();
  const visible = insights.filter((i) => !i.dismissed);

  const renderItem = ({ item }: { item: Insight }) => (
    <InsightCard
      insight={item}
      onDismiss={() => dismissInsight(item.id)}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          {visible.length} active insight{visible.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptyDesc}>
              Continuum AI will surface patterns, risks, and recommendations as you log your health data.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
  listContent: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4] },
  separator: { height: Spacing[3] },
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
