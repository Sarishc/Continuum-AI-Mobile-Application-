import React from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePredictions } from '@/hooks/usePredictions';
import { useInsights } from '@/hooks/useInsights';
import { TrendChart } from '@/components/ui/TrendChart';
import { formatTimeAgo } from '@/utils/formatters';

export default function TrendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRunning, lastRunTime, localTrends, runNow } = usePredictions();
  const { insights } = useInsights();

  const predictiveInsights = (insights ?? []).filter(
    (i) => i.category === 'Predictive'
  );

  const improvingCount = localTrends.filter((t) => t.trend === 'improving').length;
  const worseningCount = localTrends.filter((t) => t.trend === 'worsening').length;
  const stableCount = localTrends.filter((t) => t.trend === 'stable').length;

  const trajectory =
    localTrends.length === 0
      ? null
      : worseningCount > improvingCount
      ? { label: 'Attention needed ↓', color: '#FF453A' }
      : improvingCount > worseningCount
      ? { label: 'Positive ↑', color: '#30D158' }
      : { label: 'Mixed →', color: '#FF9F0A' };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <View style={styles.headerMid}>
            <Text style={styles.title}>Health Trends</Text>
            {lastRunTime && (
              <Text style={styles.lastRun}>Last analyzed {formatTimeAgo(lastRunTime)}</Text>
            )}
          </View>
          <Pressable
            onPress={runNow}
            disabled={isRunning}
            style={({ pressed }) => [styles.runBtn, (pressed || isRunning) && { opacity: 0.6 }]}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#4C8DFF" />
            ) : (
              <Text style={styles.runBtnText}>Analyze</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Trajectory summary card */}
        {localTrends.length > 0 && (
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.summaryCard}>
            <View style={styles.statsRow}>
              {[
                { count: improvingCount, label: 'Improving', color: '#30D158' },
                { count: stableCount,    label: 'Stable',    color: '#4C8DFF' },
                { count: worseningCount, label: 'Worsening', color: '#FF453A' },
              ].map((s) => (
                <View key={s.label} style={styles.statBox}>
                  <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {trajectory && (
              <View style={styles.trajectoryRow}>
                <Text style={styles.trajectoryPre}>Health trajectory: </Text>
                <Text style={[styles.trajectoryVal, { color: trajectory.color }]}>
                  {trajectory.label}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Trend charts */}
        <Text style={styles.sectionHeader}>TRACKED METRICS</Text>

        {localTrends.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Not enough data yet</Text>
            <Text style={styles.emptySub}>
              Add at least 2 health entries with the same metric to see trends.
            </Text>
          </Animated.View>
        ) : (
          localTrends.map((t, i) => (
            <Animated.View
              key={t.metric}
              entering={FadeInDown.delay(100 + i * 50).duration(300)}
              style={styles.chartWrap}
            >
              <TrendChart
                metric={t.metric}
                values={t.values}
                dates={t.dates}
                trend={t.trend}
                height={90}
              />
            </Animated.View>
          ))
        )}

        {/* Predictive AI insights */}
        <Text style={styles.sectionHeader}>PREDICTIONS</Text>

        {predictiveInsights.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🔮</Text>
            <Text style={styles.emptyTitle}>No predictions yet</Text>
            <Text style={styles.emptySub}>
              Run analysis to generate AI-powered health predictions based on your trends.
            </Text>
            <Pressable
              onPress={runNow}
              disabled={isRunning}
              style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.75 }]}
            >
              {isRunning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.analyzeBtnText}>Analyze Now</Text>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          predictiveInsights.map((ins, i) => (
            <Animated.View
              key={ins.id}
              entering={FadeInDown.delay(200 + i * 50).duration(300)}
              style={styles.predCard}
            >
              <View style={styles.predCardAccent} />
              <View style={styles.predCardBody}>
                <View style={styles.predMeta}>
                  <Text style={styles.predCategory}>🔮 Predictive</Text>
                  {(ins as any).timeframe && (
                    <Text style={styles.predTimeframe}>{(ins as any).timeframe}</Text>
                  )}
                </View>
                <Text style={styles.predText}>{ins.insightText}</Text>
                {(ins as any).recommendedAction && (
                  <Text style={styles.predAction}>→ {(ins as any).recommendedAction}</Text>
                )}
              </View>
            </Animated.View>
          ))
        )}

        {/* Running indicator */}
        {isRunning && (
          <View style={styles.runningRow}>
            <ActivityIndicator size="small" color="#4C8DFF" />
            <Text style={styles.runningText}>Analyzing your health trends…</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 8,
  },
  backBtn: { fontSize: 15, color: '#4C8DFF', width: 56 },
  headerMid: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  lastRun: { fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 1 },
  runBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(76,141,255,0.15)',
    borderRadius: 20, borderWidth: 0.5,
    borderColor: 'rgba(76,141,255,0.35)',
    minWidth: 70, alignItems: 'center',
  },
  runBtnText: { fontSize: 13, fontWeight: '600', color: '#4C8DFF' },
  summaryCard: {
    marginHorizontal: 20, marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statsRow: { flexDirection: 'row', marginBottom: 12, gap: 0 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  trajectoryRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  trajectoryPre: { fontSize: 13, color: 'rgba(255,255,255,0.40)' },
  trajectoryVal: { fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 1.3, paddingHorizontal: 20,
    paddingTop: 22, paddingBottom: 10,
  },
  chartWrap: { paddingHorizontal: 20 },
  emptyBox: {
    alignItems: 'center', paddingVertical: 32,
    paddingHorizontal: 28, marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  emptySub: {
    fontSize: 13, color: 'rgba(255,255,255,0.40)',
    textAlign: 'center', lineHeight: 20, marginBottom: 20,
  },
  analyzeBtn: {
    backgroundColor: '#4C8DFF', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 12, minWidth: 120,
    alignItems: 'center',
  },
  analyzeBtnText: { fontSize: 15, fontWeight: '600', color: 'white' },
  predCard: {
    marginHorizontal: 20, marginBottom: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(191,90,242,0.06)',
    borderRadius: 14, borderWidth: 0.5,
    borderColor: 'rgba(191,90,242,0.20)',
    overflow: 'hidden',
  },
  predCardAccent: {
    width: 3, backgroundColor: '#BF5AF2',
  },
  predCardBody: { flex: 1, padding: 14 },
  predMeta: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 6,
  },
  predCategory: { fontSize: 11, color: '#BF5AF2', fontWeight: '600' },
  predTimeframe: { fontSize: 11, color: 'rgba(255,255,255,0.30)' },
  predText: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20,
  },
  predAction: {
    fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6,
  },
  runningRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  runningText: {
    fontSize: 13, color: 'rgba(255,255,255,0.40)',
  },
});
