import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useDemoStore } from '../store/demoStore';
import {
  getHealthProfile,
  updateHealthProfile,
  getHealthEntries,
  addHealthEntry,
  deleteHealthEntry,
  subscribeToHealthEntries,
  getHealthScore,
  addInsight,
  type FirestoreHealthProfile,
  type FirestoreHealthEntry,
} from '../services/firestoreService';
import {
  DEMO_HEALTH_PROFILE,
  DEMO_ENTRIES,
  DEMO_HEALTH_SCORE,
} from '../constants/demoData';

const INSIGHT_GEN_KEY = 'last_insight_gen_date';

// ─── Streak calculation ───────────────────────────────────────────────────────

export function calculateStreak(entries: { createdAt: string }[]): number {
  if (!entries.length) return 0;
  const { format, subDays } = require('date-fns');
  const dates = [
    ...new Set(entries.map((e) => format(new Date(e.createdAt), 'yyyy-MM-dd'))),
  ]
    .sort()
    .reverse();
  if (!dates.length) return 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 0;
  let checkDate = dates[0] as string;
  for (const date of dates) {
    if (date === checkDate) {
      streak++;
      checkDate = format(subDays(new Date(checkDate), 1), 'yyyy-MM-dd');
    } else break;
  }
  return streak;
}

// ─── Insight generation (once per day) ───────────────────────────────────────

async function hasGeneratedInsightsToday(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(INSIGHT_GEN_KEY);
    if (!stored) return false;
    const lastDate = new Date(stored).toDateString();
    return lastDate === new Date().toDateString();
  } catch {
    return false;
  }
}

async function markInsightsGeneratedToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(INSIGHT_GEN_KEY, new Date().toISOString());
  } catch {}
}

async function generateFreshInsights(
  profile: FirestoreHealthProfile,
  entries: FirestoreHealthEntry[]
): Promise<void> {
  try {
    const { generateInsights } = await import('../services/aiService');
    const newInsights = await generateInsights(profile, entries);
    if (newInsights.length > 0) {
      await Promise.all(newInsights.map((i) => addInsight(i)));
      await markInsightsGeneratedToday();
    }
  } catch {
    // Fail silently — insights are nice-to-have, never crash-worthy
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHealth() {
  const { user, isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();

  const [healthProfile, setHealthProfile] = useState<FirestoreHealthProfile | null>(null);
  const [timeline, setTimeline] = useState<FirestoreHealthEntry[]>([]);
  const [healthScore, setHealthScore] = useState<number>(72);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo mode — return mock data immediately, no Firestore calls
  if (isDemoMode) {
    return {
      healthProfile: DEMO_HEALTH_PROFILE,
      timeline: DEMO_ENTRIES,
      healthScore: DEMO_HEALTH_SCORE,
      isLoading: false,
      isRefetching: false,
      error: null,
      refetchAll: () => {},
      createEntry: async () => 'demo',
      createEntryAsync: async () => 'demo',
      removeEntry: async () => {},
      updateProfile: async () => {},
    };
  }

  const loadAllData = useCallback(async () => {
    try {
      const [profile, entries, score] = await Promise.all([
        getHealthProfile(),
        getHealthEntries(),
        getHealthScore(),
      ]);
      setHealthProfile(profile);
      setTimeline(entries);
      setHealthScore(score);

      // Auto-generate insights once per day when user has data
      if (entries.length > 0) {
        hasGeneratedInsightsToday().then((alreadyDone) => {
          if (!alreadyDone) {
            generateFreshInsights(profile, entries);
          }
        });
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    loadAllData();

    const unsubscribe = subscribeToHealthEntries((entries) => {
      setTimeline(entries);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  const refetchAll = useCallback(async () => {
    setIsRefetching(true);
    await loadAllData();
    setIsRefetching(false);
  }, [loadAllData]);

  const createEntry = useCallback(
    async (entry: {
      entryType: string;
      title: string;
      rawText: string;
      structuredData: object;
      sourceFile?: string | null;
    }) => {
      try {
        const id = await addHealthEntry(entry);
        const newScore = await getHealthScore();
        setHealthScore(newScore);
        return id;
      } catch (err: any) {
        setError(err.message ?? 'Failed to save entry');
        throw err;
      }
    },
    []
  );

  const removeEntry = useCallback(async (entryId: string) => {
    try {
      await deleteHealthEntry(entryId);
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete entry');
      throw err;
    }
  }, []);

  const updateProfile = useCallback(
    async (data: Partial<Omit<FirestoreHealthProfile, 'userId' | 'createdAt' | 'updatedAt'>>) => {
      try {
        await updateHealthProfile(data);
        setHealthProfile((prev) => (prev ? { ...prev, ...data } : prev));
      } catch (err: any) {
        setError(err.message ?? 'Failed to update profile');
        throw err;
      }
    },
    []
  );

  return {
    healthProfile,
    timeline,
    healthScore,
    isLoading,
    isRefetching,
    error,
    refetchAll,
    createEntry,
    createEntryAsync: createEntry,
    removeEntry,
    updateProfile,
  };
}
