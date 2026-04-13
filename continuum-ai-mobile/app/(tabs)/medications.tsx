import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMedications } from '@/hooks/useMedications';
import { useHealth } from '@/hooks/useHealth';
import { AddMedicationSheet } from '@/components/ui/AddMedicationSheet';
import { MedicationCard } from '@/components/ui/MedicationCard';
import { AdherenceChart } from '@/components/ui/AdherenceChart';
import { showToast } from '@/store/toastStore';

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    schedules,
    todaysLogs,
    adherenceStats,
    isLoading,
    logTaken,
    addSchedule,
    removeSchedule,
  } = useMedications();
  const { healthProfile } = useHealth();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [importing, setImporting] = useState(false);

  const profileMeds: any[] = healthProfile?.medications ?? [];
  const hasSchedules = schedules.length > 0;

  const todayTotal = schedules.reduce((sum, s) => sum + s.times.length, 0);
  const todayTaken = todaysLogs.filter((l) => l.status === 'taken').length;
  const todayProgress = todayTotal > 0 ? todayTaken / todayTotal : 0;

  const handleImportFromProfile = async () => {
    if (importing || profileMeds.length === 0) return;
    setImporting(true);
    try {
      for (const med of profileMeds) {
        const medName = typeof med === 'string' ? med : med?.name ?? '';
        const medDosage = typeof med === 'object' ? med?.dosage ?? '' : '';
        if (!medName) continue;
        await addSchedule({
          medicationName: medName,
          dosage: medDosage,
          frequency: 'once_daily',
          times: ['08:00'],
          notificationsEnabled: true,
        });
      }
      showToast(`${profileMeds.length} medication${profileMeds.length > 1 ? 's' : ''} imported!`, 'success');
    } catch {
      showToast('Failed to import medications', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#4C8DFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View>
            <Text style={styles.title}>Medications</Text>
            <Text style={styles.subtitle}>
              {schedules.length > 0
                ? `${schedules.length} active medication${schedules.length > 1 ? 's' : ''}`
                : 'Track your daily medications'}
            </Text>
          </View>
          <Pressable onPress={() => setShowAddSheet(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </Animated.View>

        {/* Import from profile suggestion */}
        {profileMeds.length > 0 && !hasSchedules && (
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.importCard}>
            <Text style={styles.importTitle}>Import from health profile?</Text>
            <Text style={styles.importSub}>
              We found {profileMeds.length} medication{profileMeds.length > 1 ? 's' : ''} in your profile
            </Text>
            <Pressable
              onPress={handleImportFromProfile}
              disabled={importing}
              style={styles.importBtn}
            >
              <Text style={styles.importBtnText}>
                {importing ? 'Importing…' : 'Import Medications'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Today's Progress */}
        {hasSchedules && (
          <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Today</Text>
              <Text style={styles.progressCount}>
                {todayTaken}/{todayTotal} taken
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round(todayProgress * 100)}%`,
                    backgroundColor: todayProgress === 1 ? '#30D158' : '#4C8DFF',
                  },
                ]}
              />
            </View>
            {todayProgress === 1 && todayTotal > 0 && (
              <Text style={styles.allDoneText}>✓ All medications taken today! 🎉</Text>
            )}
          </Animated.View>
        )}

        {/* Stats row */}
        {adherenceStats && hasSchedules && (
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.statsRow}>
            {[
              {
                value: `${adherenceStats.adherenceRate}%`,
                label: 'Adherence',
                color: adherenceStats.adherenceRate >= 80 ? '#30D158' : '#FF9F0A',
              },
              { value: `${adherenceStats.currentStreak}d`, label: 'Streak', color: '#FF9F0A' },
              { value: `${adherenceStats.totalTaken}`, label: 'Doses taken', color: '#4C8DFF' },
            ].map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Adherence heatmap */}
        {adherenceStats && hasSchedules && (
          <Animated.View entering={FadeInDown.delay(160).duration(300)}>
            <AdherenceChart data={adherenceStats.last30Days} />
          </Animated.View>
        )}

        {/* Today's schedule */}
        <Text style={styles.sectionHeader}>TODAY'S SCHEDULE</Text>

        {!hasSchedules ? (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>No medications added yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your medications to track adherence and get smart reminders
            </Text>
            <Pressable onPress={() => setShowAddSheet(true)} style={styles.emptyAddBtn}>
              <Text style={styles.emptyAddBtnText}>Add Medication</Text>
            </Pressable>
          </Animated.View>
        ) : (
          schedules.map((schedule, i) => (
            <Animated.View key={schedule.id} entering={FadeInDown.delay(200 + i * 40).duration(300)}>
              <MedicationCard
                schedule={schedule}
                todaysLogs={todaysLogs.filter((l) => l.scheduleId === schedule.id)}
                onLogTaken={logTaken}
                onDelete={removeSchedule}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>

      <AddMedicationSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={addSchedule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.40)', marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#4C8DFF',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginTop: 8,
  },
  addBtnText: {
    fontSize: 15, fontWeight: '600', color: 'white',
  },
  importCard: {
    marginHorizontal: 20, marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(76,141,255,0.08)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(76,141,255,0.25)',
  },
  importTitle: {
    fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 4,
  },
  importSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 12,
  },
  importBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#4C8DFF',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
  },
  importBtnText: {
    fontSize: 14, fontWeight: '600', color: 'white',
  },
  progressCard: {
    marginHorizontal: 20, marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 15, fontWeight: '600', color: '#FFFFFF',
  },
  progressCount: {
    fontSize: 15, color: 'rgba(255,255,255,0.50)',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', borderRadius: 3,
  },
  allDoneText: {
    fontSize: 13, color: '#30D158',
    marginTop: 8, textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20, marginTop: 12, gap: 10,
  },
  statCard: {
    flex: 1, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22, fontWeight: '700', marginBottom: 4,
  },
  statLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 24, paddingBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48, paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20, fontWeight: '600', color: '#FFFFFF',
    marginBottom: 8, textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.40)',
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  emptyAddBtn: {
    backgroundColor: '#4C8DFF',
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 15, fontWeight: '600', color: 'white',
  },
});
