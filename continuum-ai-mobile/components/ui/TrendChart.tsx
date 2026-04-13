import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path, Defs, LinearGradient as SvgGradient,
  Stop, Circle,
} from 'react-native-svg';
import { formatTimeAgo } from '@/utils/formatters';

interface Props {
  metric: string;
  values: number[];
  dates: string[];
  trend: 'improving' | 'worsening' | 'stable';
  unit?: string;
  height?: number;
}

const CHART_W = 280;
const PAD = 16;

const TREND_COLOR: Record<Props['trend'], string> = {
  improving: '#30D158',
  worsening: '#FF453A',
  stable:    '#4C8DFF',
};

const TREND_ARROW: Record<Props['trend'], string> = {
  improving: '↑',
  worsening: '↓',
  stable:    '→',
};

export function TrendChart({ metric, values, dates, trend, unit = '', height = 80 }: Props) {
  const color = TREND_COLOR[trend];
  const arrow = TREND_ARROW[trend];

  const { pathD, fillD, points } = useMemo(() => {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const usableW = CHART_W - PAD * 2;
    const usableH = height - PAD * 2;

    const pts = values.map((v, i) => ({
      x: PAD + (i / Math.max(values.length - 1, 1)) * usableW,
      y: height - PAD - ((v - minVal) / range) * usableH,
    }));

    const line = pts.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = pts[i - 1];
      const cpx = (prev.x + pt.x) / 2;
      return `${acc} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
    }, '');

    const last = pts[pts.length - 1];
    const fill = `${line} L ${last.x} ${height} L ${pts[0].x} ${height} Z`;

    return { pathD: line, fillD: fill, points: pts };
  }, [values, height]);

  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const pctChange = firstVal !== 0
    ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100
    : 0;
  const changeLabel = `${Math.abs(pctChange).toFixed(1)}% ${pctChange >= 0 ? 'increase' : 'decrease'}`;

  const firstDate = dates[0];
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.metricLabel}>{metric}</Text>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>
            {arrow} {trend.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Sparkline */}
      <Svg width={CHART_W} height={height}>
        <Defs>
          <SvgGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        {/* Fill area */}
        <Path d={fillD} fill={`url(#grad-${metric})`} />
        {/* Line */}
        <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        {/* First dot */}
        {firstPoint && (
          <Circle cx={firstPoint.x} cy={firstPoint.y} r={3} fill={color} opacity={0.45} />
        )}
        {/* Last dot */}
        {lastPoint && (
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={4.5} fill={color} />
        )}
      </Svg>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.firstValue}>{firstVal}{unit}</Text>
        <Text style={[styles.changeLabel, { color }]}>{changeLabel}</Text>
        <Text style={[styles.lastValue, { color }]}>{lastVal}{unit}</Text>
      </View>

      {firstDate && (
        <Text style={styles.dateRange}>
          Since {formatTimeAgo(firstDate)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14, marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  metricLabel: {
    fontSize: 14, fontWeight: '600', color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  badgeText: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  firstValue: {
    fontSize: 12, color: 'rgba(255,255,255,0.30)',
  },
  changeLabel: {
    fontSize: 12, fontWeight: '500',
  },
  lastValue: {
    fontSize: 13, fontWeight: '700',
  },
  dateRange: {
    fontSize: 11, color: 'rgba(255,255,255,0.22)',
    marginTop: 4, textAlign: 'right',
  },
});
