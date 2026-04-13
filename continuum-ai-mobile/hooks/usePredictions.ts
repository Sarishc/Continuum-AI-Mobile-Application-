import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDemoStore } from '@/store/demoStore';
import { useHealth } from './useHealth';
import { useInsights } from './useInsights';
import {
  runPredictions,
  savePredictions,
  shouldRunPredictions,
  analyzeLocalTrends,
  type PredictiveInsight,
} from '@/services/predictionEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PREDICTION_KEY = 'last_prediction_run';

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_TRENDS: ReturnType<typeof analyzeLocalTrends> = [
  {
    metric: 'Blood Glucose',
    trend: 'improving',
    changePercent: -15.2,
    values: [126, 118, 112, 104],
    dates: [
      new Date(Date.now() - 42 * 86_400_000).toISOString(),
      new Date(Date.now() - 28 * 86_400_000).toISOString(),
      new Date(Date.now() - 14 * 86_400_000).toISOString(),
      new Date(Date.now()).toISOString(),
    ],
  },
  {
    metric: 'Blood Pressure',
    trend: 'improving',
    changePercent: -4.3,
    values: [138, 135, 133, 132],
    dates: [
      new Date(Date.now() - 42 * 86_400_000).toISOString(),
      new Date(Date.now() - 28 * 86_400_000).toISOString(),
      new Date(Date.now() - 14 * 86_400_000).toISOString(),
      new Date(Date.now()).toISOString(),
    ],
  },
  {
    metric: 'HbA1c',
    trend: 'improving',
    changePercent: -8.7,
    values: [6.9, 6.8, 6.6, 6.3],
    dates: [
      new Date(Date.now() - 56 * 86_400_000).toISOString(),
      new Date(Date.now() - 42 * 86_400_000).toISOString(),
      new Date(Date.now() - 21 * 86_400_000).toISOString(),
      new Date(Date.now() - 7 * 86_400_000).toISOString(),
    ],
  },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePredictions() {
  const { isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();
  const { healthProfile, timeline } = useHealth();
  const { insights } = useInsights();

  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [localTrends, setLocalTrends] = useState<ReturnType<typeof analyzeLocalTrends>>([]);
  const [error, setError] = useState<string | null>(null);

  // Load persisted last-run time
  useEffect(() => {
    AsyncStorage.getItem(LAST_PREDICTION_KEY)
      .then((v) => { if (v) setLastRunTime(v); })
      .catch(() => {});
  }, []);

  // Compute local trends whenever timeline changes
  useEffect(() => {
    if (isDemoMode) {
      setLocalTrends(DEMO_TRENDS);
      setLastRunTime(new Date(Date.now() - 3_600_000).toISOString());
      return;
    }
    if (!timeline || timeline.length < 2) return;
    setLocalTrends(analyzeLocalTrends(timeline));
  }, [isDemoMode, timeline]);

  // Auto-run AI predictions once per day on data load
  useEffect(() => {
    if (isDemoMode || !isAuthenticated || !timeline || timeline.length < 2) return;
    shouldRunPredictions().then((should) => {
      if (should) triggerPredictions();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isDemoMode, (timeline ?? []).length]);

  const triggerPredictions = useCallback(async () => {
    if (!healthProfile || !timeline || timeline.length < 2 || isRunning || isDemoMode) return;
    setIsRunning(true);
    setError(null);
    try {
      const predictions = await runPredictions(healthProfile as object, timeline, insights ?? []);
      if (predictions.length > 0) {
        await savePredictions(predictions);
        const now = new Date().toISOString();
        setLastRunTime(now);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Prediction failed');
    } finally {
      setIsRunning(false);
    }
  }, [healthProfile, timeline, insights, isRunning, isDemoMode]);

  return {
    isRunning,
    lastRunTime,
    localTrends: isDemoMode ? DEMO_TRENDS : localTrends,
    error,
    runNow: triggerPredictions,
    triggerAfterUpload: triggerPredictions,
  };
}
