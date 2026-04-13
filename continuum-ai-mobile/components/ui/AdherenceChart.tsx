import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DayData {
  date: string;
  scheduled: number;
  taken: number;
  rate: number;
}

interface Props {
  data: DayData[];
}

function cellColor(d: DayData): string {
  if (d.scheduled === 0) return 'rgba(255,255,255,0.05)';
  if (d.rate === 100) return '#30D158';
  if (d.rate >= 80)   return '#30D15877';
  if (d.rate > 0)     return '#FF9F0A55';
  return '#FF453A33';
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = 12;
const GAP  = 4;

export function AdherenceChart({ data }: Props) {
  // Pad data to fill full 5-week grid (35 cells) ending today
  const cells = useMemo(() => {
    const today = new Date();
    const endDow = today.getDay(); // 0=Sun
    const totalCells = 35;
    const result: (DayData | null)[] = [];

    // Build a date → data map
    const map = new Map<string, DayData>();
    data.forEach((d) => map.set(d.date, d));

    // Fill backwards 35 days + pad to full week start
    const startOffset = totalCells - 1;
    for (let i = startOffset; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push(map.get(key) ?? { date: key, scheduled: 0, taken: 0, rate: 0 });
    }

    // Pad beginning so first cell aligns to Sunday
    const firstDow = new Date(result[0]!.date).getDay();
    const padded: (DayData | null)[] = Array(firstDow).fill(null).concat(result);
    return padded;
  }, [data]);

  // Chunk into rows of 7
  const rows = useMemo(() => {
    const r: (DayData | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      r.push(cells.slice(i, i + 7));
    }
    return r;
  }, [cells]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>30-DAY ADHERENCE</Text>
      {/* Day-of-week headers */}
      <View style={styles.dowRow}>
        {DAYS.map((d, i) => (
          <View key={i} style={styles.dowCell}>
            <Text style={styles.dowText}>{d}</Text>
          </View>
        ))}
      </View>
      {/* Grid */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[
                styles.cell,
                { backgroundColor: cell ? cellColor(cell) : 'transparent' },
              ]}
            />
          ))}
        </View>
      ))}
      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: '#30D158', label: '100%' },
          { color: '#30D15877', label: '≥80%' },
          { color: '#FF9F0A55', label: 'Partial' },
          { color: '#FF453A33', label: 'Missed' },
        ].map((l, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendCell, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 12,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: GAP,
  },
  dowCell: {
    width: CELL,
    alignItems: 'center',
  },
  dowText: {
    fontSize: 9, color: 'rgba(255,255,255,0.25)',
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: CELL, height: CELL,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendCell: {
    width: 9, height: 9, borderRadius: 2,
  },
  legendText: {
    fontSize: 10, color: 'rgba(255,255,255,0.30)',
  },
});
