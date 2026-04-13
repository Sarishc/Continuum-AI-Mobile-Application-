import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDemoStore } from '@/store/demoStore';
import {
  getMedicationSchedules,
  createMedicationSchedule,
  updateMedicationSchedule,
  deleteMedicationSchedule,
  getMedicationLogs,
  logMedicationTaken,
  calculateAdherenceStats,
  subscribeToTodaysMeds,
  MedicationSchedule,
  MedicationLog,
  AdherenceStats,
} from '@/services/firestoreService';
import { scheduleMedicationReminders } from '@/services/medicationNotifications';

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_SCHEDULES: MedicationSchedule[] = [
  {
    id: 'demo-med-1',
    userId: 'demo-user',
    medicationName: 'Metformin',
    dosage: '500mg',
    frequency: 'twice_daily',
    times: ['08:00', '20:00'],
    isActive: true,
    startDate: '2026-01-15',
    color: '#4C8DFF',
    notificationsEnabled: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'demo-med-2',
    userId: 'demo-user',
    medicationName: 'Lisinopril',
    dosage: '10mg',
    frequency: 'once_daily',
    times: ['08:00'],
    isActive: true,
    startDate: '2026-01-15',
    color: '#30D158',
    notificationsEnabled: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

const DEMO_TODAY_LOGS: MedicationLog[] = [
  {
    id: 'demo-log-1',
    userId: 'demo-user',
    scheduleId: 'demo-med-1',
    medicationName: 'Metformin',
    scheduledTime: '08:00',
    scheduledDate: new Date().toISOString().split('T')[0],
    takenAt: new Date().toISOString(),
    status: 'taken',
    note: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-log-2',
    userId: 'demo-user',
    scheduleId: 'demo-med-2',
    medicationName: 'Lisinopril',
    scheduledTime: '08:00',
    scheduledDate: new Date().toISOString().split('T')[0],
    takenAt: new Date().toISOString(),
    status: 'taken',
    note: null,
    createdAt: new Date().toISOString(),
  },
];

const DEMO_ADHERENCE_STATS: AdherenceStats = {
  totalScheduled: 168,
  totalTaken: 155,
  totalMissed: 13,
  adherenceRate: 92,
  currentStreak: 14,
  longestStreak: 21,
  last30Days: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86_400_000).toISOString().split('T')[0],
    scheduled: 3,
    taken: Math.random() > 0.12 ? 3 : Math.random() > 0.5 ? 2 : 1,
    rate: Math.random() > 0.12 ? 100 : 67,
  })),
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMedications() {
  const { isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();

  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<MedicationLog[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (isDemoMode || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const [fetchedSchedules, logs] = await Promise.all([
        getMedicationSchedules(),
        getMedicationLogs(30),
      ]);
      setSchedules(fetchedSchedules);
      setAdherenceStats(calculateAdherenceStats(fetchedSchedules, logs));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, isAuthenticated]);

  useEffect(() => {
    if (isDemoMode) {
      setSchedules(DEMO_SCHEDULES);
      setTodaysLogs(DEMO_TODAY_LOGS);
      setAdherenceStats(DEMO_ADHERENCE_STATS);
      setIsLoading(false);
      return;
    }

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    loadAll();

    const unsub = subscribeToTodaysMeds((logs) => {
      setTodaysLogs(logs);
    });

    return () => unsub();
  }, [isAuthenticated, isDemoMode, loadAll]);

  const logTaken = useCallback(
    async (schedule: MedicationSchedule, scheduledTime: string) => {
      if (isDemoMode) {
        // Optimistic UI update for demo
        const today = new Date().toISOString().split('T')[0];
        setTodaysLogs((prev) => {
          const already = prev.some(
            (l) =>
              l.scheduleId === schedule.id &&
              l.scheduledTime === scheduledTime &&
              l.status === 'taken'
          );
          if (already) return prev;
          return [
            ...prev,
            {
              id: `demo-log-${Date.now()}`,
              userId: 'demo-user',
              scheduleId: schedule.id,
              medicationName: schedule.medicationName,
              scheduledTime,
              scheduledDate: today,
              takenAt: new Date().toISOString(),
              status: 'taken',
              note: null,
              createdAt: new Date().toISOString(),
            },
          ];
        });
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      await logMedicationTaken({
        scheduleId: schedule.id,
        medicationName: schedule.medicationName,
        scheduledTime,
        scheduledDate: today,
      });
    },
    [isDemoMode]
  );

  const addSchedule = useCallback(
    async (data: {
      medicationName: string;
      dosage: string;
      frequency: MedicationSchedule['frequency'];
      times: string[];
      notificationsEnabled: boolean;
    }): Promise<string> => {
      if (isDemoMode) return 'demo-new';
      await createMedicationSchedule(data);
      const updated = await getMedicationSchedules();
      setSchedules(updated);
      await scheduleMedicationReminders(updated);
      return updated[0]?.id ?? '';
    },
    [isDemoMode]
  );

  const updateSchedule = useCallback(
    async (id: string, data: Partial<MedicationSchedule>) => {
      if (isDemoMode) return;
      await updateMedicationSchedule(id, data);
      const updated = await getMedicationSchedules();
      setSchedules(updated);
      await scheduleMedicationReminders(updated);
    },
    [isDemoMode]
  );

  const removeSchedule = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        return;
      }
      await deleteMedicationSchedule(id);
      const updated = await getMedicationSchedules();
      setSchedules(updated);
      await scheduleMedicationReminders(updated);
    },
    [isDemoMode]
  );

  return {
    schedules,
    todaysLogs,
    adherenceStats,
    isLoading,
    error,
    logTaken,
    addSchedule,
    updateSchedule,
    removeSchedule,
    refetch: loadAll,
  };
}
