import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, Line } from 'react-native-svg';
import { HealthScoreRing } from './HealthScoreRing';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportCardData {
  userName: string;
  healthScore: number;
  previousScore: number;
  scoreDelta: number;
  conditions: string[];
  entriesCount: number;
  streakDays: number;
  topInsight: string;
  topInsightSeverity: string;
  improvements: string[];
  generatedDate: string;
  isPro: boolean;
}

interface ReportCardProps {
  data: ReportCardData;
  animated?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return Colors.positive;
  if (s >= 60) return Colors.electric;
  if (s >= 40) return Colors.caution;
  return Colors.critical;
}

function severityColor(sev: string): string {
  switch (sev) {
    case 'critical': return Colors.critical;
    case 'high':     return Colors.caution;
    case 'moderate': return Colors.electric;
    default:         return Colors.positive;
  }
}

// ─── Grid lines decorative element ───────────────────────────────────────────

function GridLines() {
  const lines = [];
  for (let i = 0; i < 12; i++) {
    lines.push(
      <Line
        key={i}
        x1="0"
        y1={i * 40}
        x2="390"
        y2={i * 40}
        stroke={Colors.border}
        strokeWidth="0.6"
        opacity="0.4"
      />
    );
  }
  return (
    <View style={rc.gridWrap} pointerEvents="none">
      <Svg width={390} height={480}>{lines}</Svg>
    </View>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

export const ReportCard = forwardRef<View, ReportCardProps>(
  function ReportCard({ data, animated = true }, ref) {
    const {
      userName,
      healthScore,
      previousScore,
      scoreDelta,
      conditions,
      entriesCount,
      streakDays,
      topInsight,
      topInsightSeverity,
      improvements,
      generatedDate,
      isPro,
    } = data;

    const truncatedInsight =
      topInsight.length > 100 ? topInsight.slice(0, 100) + '…' : topInsight;

    const deltaSign = scoreDelta > 0 ? '+' : '';
    const deltaColor =
      scoreDelta > 0 ? Colors.positive : scoreDelta < 0 ? Colors.critical : Colors.electric;
    const deltaText =
      scoreDelta > 0
        ? `↑ ${deltaSign}${scoreDelta} pts from last period`
        : scoreDelta < 0
        ? `↓ ${scoreDelta} pts from last period`
        : '→ Stable';

    return (
      <View ref={ref} style={rc.card} collapsable={false}>
        {/* ── Decorative circles ── */}
        <View style={rc.decorTop} pointerEvents="none">
          <Svg width={500} height={500}>
            <SvgCircle cx={450} cy={50} r={250} fill="none" stroke={Colors.electric} strokeWidth={1} opacity={0.08} />
          </Svg>
        </View>
        <View style={rc.decorBottom} pointerEvents="none">
          <Svg width={300} height={300}>
            <SvgCircle cx={0} cy={300} r={150} fill="none" stroke={Colors.electric} strokeWidth={1} opacity={0.05} />
          </Svg>
        </View>

        {/* ── Grid lines (bottom 40%) ── */}
        <GridLines />

        {/* ── Header ── */}
        <View style={rc.header}>
          {/* Monogram + brand */}
          <View style={rc.brandRow}>
            <LinearGradient
              colors={Colors.gradientElectric}
              style={rc.monogram}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={rc.monogramText}>C</Text>
            </LinearGradient>
            <Text style={rc.brandName}>CONTINUUM AI</Text>
          </View>

          {/* Label */}
          <Text style={rc.reportLabel}>HEALTH REPORT</Text>

          {/* User name */}
          <Text style={rc.userName}>{userName}'s</Text>

          {/* Date */}
          <Text style={rc.generatedDate}>Generated {generatedDate}</Text>
        </View>

        {/* ── Score section ── */}
        <View style={rc.scoreSection}>
          <View style={rc.scoreLeft}>
            <Text style={rc.scoreSectionLabel}>HEALTH SCORE</Text>
            <Text style={[rc.scoreNumber, { color: scoreColor(healthScore) }]}>
              {healthScore}
            </Text>
            <Text style={[rc.scoreDelta, { color: deltaColor }]}>{deltaText}</Text>
          </View>
          <View style={rc.scoreRight}>
            <HealthScoreRing score={healthScore} size={96} animated={animated} />
          </View>
        </View>

        {/* ── Metric tiles ── */}
        <View style={rc.metricsRow}>
          {[
            { value: String(entriesCount), label: 'ENTRIES' },
            { value: String(streakDays),   label: 'DAY STREAK' },
            { value: String(conditions.length), label: 'CONDITIONS' },
          ].map(({ value, label }) => (
            <View key={label} style={rc.metricTile}>
              <Text style={rc.metricValue}>{value}</Text>
              <Text style={rc.metricLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Conditions ── */}
        {conditions.length > 0 && (
          <View style={rc.conditionsSection}>
            <Text style={rc.sectionMeta}>TRACKING</Text>
            <View style={rc.pillsRow}>
              {conditions.map((c) => (
                <View key={c} style={rc.conditionPill}>
                  <Text style={rc.conditionPillText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Top insight ── */}
        <View style={rc.insightSection}>
          <View style={[rc.insightCard, { borderLeftColor: severityColor(topInsightSeverity) }]}>
            <Text style={rc.sectionMeta}>TOP INSIGHT</Text>
            <Text style={rc.insightText}>{truncatedInsight}</Text>
          </View>
        </View>

        {/* ── Improvements ── */}
        {improvements.length > 0 && (
          <View style={rc.improvementsSection}>
            <Text style={rc.sectionMeta}>THIS PERIOD</Text>
            {improvements.slice(0, 3).map((item, i) => (
              <View key={i} style={rc.improvementRow}>
                <View style={rc.checkCircle}>
                  <Text style={rc.checkMark}>✓</Text>
                </View>
                <Text style={rc.improvementText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={rc.footer}>
          <View style={rc.footerLeft}>
            <Text style={rc.footerUrl}>continuum-health.app</Text>
            <Text style={rc.footerTagline}>Your personal health intelligence</Text>
          </View>
          <View style={[rc.tierBadge, isPro ? rc.tierBadgePro : rc.tierBadgeFree]}>
            <Text style={[rc.tierBadgeText, isPro ? rc.tierBadgeTextPro : null]}>
              {isPro ? 'PRO' : 'FREE'}
            </Text>
          </View>
        </View>
      </View>
    );
  }
);

// ─── Styles — all fixed px values for capture consistency ────────────────────

const rc = StyleSheet.create({
  card: {
    width: 390,
    backgroundColor: Colors.obsidian,
    overflow: 'hidden',
    paddingBottom: 0,
  },

  // Decorative
  decorTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 500,
    height: 500,
    zIndex: 0,
  },
  decorBottom: {
    position: 'absolute',
    bottom: 80,
    left: -60,
    width: 300,
    height: 300,
    zIndex: 0,
  },
  gridWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 480,
    zIndex: 0,
  },

  // Header
  header: {
    paddingTop: 32,
    paddingHorizontal: 28,
    paddingBottom: 0,
    zIndex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monogram: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 20,
    fontFamily: FontFamily.displayExtraBold,
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  reportLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
    letterSpacing: 3,
    marginTop: 28,
  },
  userName: {
    fontSize: 34,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginTop: 8,
    lineHeight: 38,
  },
  generatedDate: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Score section
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginHorizontal: 24,
    marginTop: 24,
    padding: 20,
    zIndex: 1,
  },
  scoreLeft: { flex: 1, gap: 6 },
  scoreSectionLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textTertiary,
    letterSpacing: 2,
  },
  scoreNumber: {
    fontSize: 72,
    fontFamily: FontFamily.displayExtraBold,
    lineHeight: 76,
    letterSpacing: -2,
  },
  scoreDelta: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    lineHeight: 18,
  },
  scoreRight: { width: 110, alignItems: 'center' },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 16,
    zIndex: 1,
  },
  metricTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  metricValue: {
    fontSize: 26,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  // Conditions
  conditionsSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 8,
    zIndex: 1,
  },
  sectionMeta: {
    fontSize: 9,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textTertiary,
    letterSpacing: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionPill: {
    backgroundColor: Colors.electricMist,
    borderWidth: 1,
    borderColor: Colors.electric,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  conditionPillText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
  },

  // Insight
  insightSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    zIndex: 1,
  },
  insightCard: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  insightText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  // Improvements
  improvementsSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 6,
    zIndex: 1,
  },
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.positiveGlow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkMark: {
    fontSize: 10,
    color: Colors.positive,
    fontFamily: FontFamily.displayBold,
  },
  improvementText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 32,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    zIndex: 1,
  },
  footerLeft: { gap: 3 },
  footerUrl: {
    fontSize: 11,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  footerTagline: {
    fontSize: 10,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tierBadgePro: { backgroundColor: Colors.electric },
  tierBadgeFree: { backgroundColor: Colors.border },
  tierBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.displayBold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  tierBadgeTextPro: { color: '#FFFFFF' },
});
