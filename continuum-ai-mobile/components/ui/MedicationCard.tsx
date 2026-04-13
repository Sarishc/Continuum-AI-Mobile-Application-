import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { MedicationSchedule, MedicationLog } from '@/services/firestoreService';

interface Props {
  schedule: MedicationSchedule;
  todaysLogs: MedicationLog[];
  onLogTaken: (schedule: MedicationSchedule, time: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function MedicationCard({ schedule, todaysLogs, onLogTaken, onDelete }: Props) {
  const [taking, setTaking] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isTimeTaken = (time: string) =>
    todaysLogs.some((l) => l.scheduledTime === time && l.status === 'taken');

  const handleTake = async (time: string) => {
    if (isTimeTaken(time) || taking) return;
    setTaking(time);
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await onLogTaken(schedule, time);
    setTaking(null);
  };

  const takenCount = schedule.times.filter((t) => isTimeTaken(t)).length;
  const allTaken = schedule.times.length > 0 && takenCount === schedule.times.length;

  return (
    <View style={[styles.card, { borderLeftColor: schedule.color }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.colorDot, { backgroundColor: schedule.color }]} />
        <View style={styles.medInfo}>
          <Text style={styles.medName}>{schedule.medicationName}</Text>
          <Text style={styles.medDosage}>{schedule.dosage}</Text>
        </View>
        <View style={styles.rightCol}>
          {schedule.times.length > 0 && (
            <Text style={[styles.progress, allTaken && styles.progressDone]}>
              {takenCount}/{schedule.times.length}
            </Text>
          )}
          {confirmDelete ? (
            <View style={styles.confirmRow}>
              <Pressable onPress={() => { onDelete(schedule.id); setConfirmDelete(false); }} style={styles.confirmYes}>
                <Text style={styles.confirmYesText}>Remove</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmDelete(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Time chips */}
      {schedule.times.length > 0 ? (
        <View style={styles.timesRow}>
          {schedule.times.map((time, i) => {
            const taken = isTimeTaken(time);
            const loading = taking === time;
            return (
              <Pressable
                key={i}
                onPress={() => handleTake(time)}
                disabled={taken || !!taking}
                style={({ pressed }) => [
                  styles.chip,
                  taken ? styles.chipTaken : {
                    borderColor: schedule.color + '50',
                    backgroundColor: schedule.color + '10',
                  },
                  pressed && !taken && { opacity: 0.7 },
                ]}
              >
                {taken ? (
                  <Text style={styles.chipTakenText}>✓ {formatTime(time)}</Text>
                ) : (
                  <Text style={[styles.chipText, { color: schedule.color }]}>
                    {loading ? '…' : `Take ${formatTime(time)}`}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.asNeeded}>Take as needed</Text>
      )}

      {allTaken && (
        <Text style={styles.allDone}>✓ All doses taken today</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  colorDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  medInfo: { flex: 1 },
  medName: {
    fontSize: 17, fontWeight: '600', color: '#FFFFFF',
  },
  medDosage: {
    fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  progress: {
    fontSize: 12, color: 'rgba(255,255,255,0.35)',
  },
  progressDone: {
    color: '#30D158',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmYes: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(255,69,58,0.15)',
    borderRadius: 6, borderWidth: 0.5,
    borderColor: 'rgba(255,69,58,0.30)',
  },
  confirmYesText: { fontSize: 12, color: '#FF453A' },
  cancelText: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  deleteText: {
    fontSize: 13, color: 'rgba(255,255,255,0.25)', padding: 4,
  },
  timesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  chipTaken: {
    backgroundColor: 'rgba(48,209,88,0.10)',
    borderColor: 'rgba(48,209,88,0.35)',
  },
  chipText: {
    fontSize: 14, fontWeight: '500',
  },
  chipTakenText: {
    fontSize: 14, fontWeight: '500', color: '#30D158',
  },
  asNeeded: {
    fontSize: 13, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic',
  },
  allDone: {
    fontSize: 12, color: '#30D158', marginTop: 8, textAlign: 'center',
  },
});
