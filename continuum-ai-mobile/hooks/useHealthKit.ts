import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isHealthKitAvailable,
  requestHealthKitPermissions,
  getHealthKitPermissionStatus,
  getFullHealthSummary,
  healthKitSummaryToEntry,
  generateHealthKitInsights,
  extractLatestVitals,
  HealthKitSummary,
  LatestVitals,
} from '@/services/healthKitService';
import { useHealth } from './useHealth';
import { addInsight } from '@/services/firestoreService';

const LAST_SYNC_KEY = 'healthkit_last_sync';
const PERMISSION_KEY = 'healthkit_permission_granted';

function shouldSync(lastSync: string | null): boolean {
  if (!lastSync) return true;
  const hourAgo = new Date();
  hourAgo.setHours(hourAgo.getHours() - 1);
  return new Date(lastSync) < hourAgo;
}

export function useHealthKit() {
  const { createEntry, healthProfile, timeline } = useHealth();

  const [isAvailable] = useState(isHealthKitAvailable());
  const [hasPermission, setHasPermission] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [latestData, setLatestData] = useState<HealthKitSummary | null>(null);
  const [latestVitals, setLatestVitals] = useState<LatestVitals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAvailable) return;
    (async () => {
      const granted = await getHealthKitPermissionStatus();
      setHasPermission(granted);

      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      setLastSyncTime(lastSync);

      if (granted && shouldSync(lastSync)) {
        await performSync();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvailable]);

  const performSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const summary = await getFullHealthSummary();
      setLatestData(summary);
      setLatestVitals(extractLatestVitals(summary));

      // Only save entry if we actually got data
      const hasData = Object.values(summary).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      );
      if (hasData) {
        const entry = healthKitSummaryToEntry(summary);
        await createEntry(entry);

        // Rule-based HealthKit insights (fast, no AI call needed)
        const insights = generateHealthKitInsights(summary);
        if (insights.length > 0) {
          await Promise.all(insights.map((i) => addInsight(i)));
        }
      }

      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncTime(now);
    } catch (err: any) {
      setError(err?.message ?? 'HealthKit sync failed');
      console.warn('[useHealthKit] sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [createEntry]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    const granted = await requestHealthKitPermissions();
    setHasPermission(granted);
    if (granted) {
      await AsyncStorage.setItem(PERMISSION_KEY, 'true');
      await performSync();
    }
    return granted;
  }, [isAvailable, performSync]);

  const syncHealthData = useCallback(async () => {
    if (!isAvailable || !hasPermission) return;
    await performSync();
  }, [isAvailable, hasPermission, performSync]);

  return {
    isAvailable,
    hasPermission,
    isSyncing,
    lastSyncTime,
    latestData,
    latestVitals,
    error,
    requestPermission,
    syncHealthData,
  };
}
