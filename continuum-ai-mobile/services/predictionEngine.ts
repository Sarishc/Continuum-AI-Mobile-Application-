import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/constants/env';
import { addInsight } from './firestoreService';
import { scheduleLocalNotification } from './notifications';

const WORKER_URL = ENV.workerUrl;
const LAST_PREDICTION_KEY = 'last_prediction_run';

export interface PredictiveInsight {
  insightText: string;
  severity: string;
  category: string;
  confidenceScore: number;
  predictionType: 'trend' | 'anomaly' | 'threshold' | 'correlation';
  timeframe: string;
  currentValue: string | null;
  projectedValue: string | null;
  recommendedAction: string;
  specialist: {
    type: string;
    urgency: string;
    reason: string;
  } | null;
}

/** Returns true if no predictions have been run in the last 24 hours. */
export async function shouldRunPredictions(): Promise<boolean> {
  try {
    const lastRun = await AsyncStorage.getItem(LAST_PREDICTION_KEY);
    if (!lastRun) return true;
    const hoursSince = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60);
    return hoursSince >= 24;
  } catch {
    return true;
  }
}

/** Calls the /predict worker endpoint and returns predictions. */
export async function runPredictions(
  healthProfile: object,
  entries: any[],
  insights: any[]
): Promise<PredictiveInsight[]> {
  if (!entries || entries.length < 2) return [];

  try {
    const response = await fetch(`${WORKER_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthProfile,
        entries: entries.slice(0, 20),
        insights: insights.slice(0, 10),
      }),
    });

    if (!response.ok) return [];
    const data = await response.json() as any;
    if (!data?.success) return [];
    return (data.predictions ?? []) as PredictiveInsight[];
  } catch (err) {
    console.warn('[predictionEngine] runPredictions error:', err);
    return [];
  }
}

/** Persists predictions as Firestore insights and fires push notification if urgent. */
export async function savePredictions(predictions: PredictiveInsight[]): Promise<void> {
  if (predictions.length === 0) return;

  await Promise.allSettled(
    predictions.map((p) =>
      addInsight({
        insightText: p.insightText,
        severity: p.severity,
        category: p.category,
        confidenceScore: p.confidenceScore,
        specialist: p.specialist ?? undefined,
      })
    )
  );

  const urgent = predictions.filter(
    (p) => p.severity === 'critical' || p.severity === 'high'
  );

  if (urgent.length > 0) {
    const preview = urgent[0].insightText.slice(0, 100);
    await scheduleLocalNotification(
      '🔮 Health Trend Alert',
      preview.length < urgent[0].insightText.length ? preview + '…' : preview,
      2
    ).catch(() => {});
  }

  await AsyncStorage.setItem(LAST_PREDICTION_KEY, new Date().toISOString()).catch(() => {});
}

/** Fast, local trend analysis — no API call required. */
export function analyzeLocalTrends(
  entries: any[]
): Array<{
  metric: string;
  trend: 'improving' | 'worsening' | 'stable';
  changePercent: number;
  values: number[];
  dates: string[];
}> {
  const metrics: Record<string, Array<{ value: number; date: string }>> = {};

  for (const entry of entries) {
    const labValues: Record<string, unknown> = entry.structuredData?.labValues ?? {};
    const dateStr: string = entry.createdAt ?? new Date().toISOString();
    for (const [key, val] of Object.entries(labValues)) {
      const numVal = parseFloat(String(val));
      if (!isNaN(numVal)) {
        if (!metrics[key]) metrics[key] = [];
        metrics[key].push({ value: numVal, date: dateStr });
      }
    }
  }

  const LOWER_IS_BETTER = [
    'glucose', 'blood glucose', 'hba1c', 'a1c',
    'blood pressure', 'systolic', 'diastolic',
    'cholesterol', 'ldl', 'triglycerides',
    'weight', 'bmi',
  ];

  const trends: ReturnType<typeof analyzeLocalTrends> = [];

  for (const [metric, dataPoints] of Object.entries(metrics)) {
    if (dataPoints.length < 2) continue;

    dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const values = dataPoints.map((d) => d.value);
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) continue;
    const changePercent = ((last - first) / first) * 100;

    const isLowerBetter = LOWER_IS_BETTER.some((m) =>
      metric.toLowerCase().includes(m)
    );

    let trend: 'improving' | 'worsening' | 'stable';
    if (Math.abs(changePercent) < 3) {
      trend = 'stable';
    } else if (isLowerBetter) {
      trend = changePercent < 0 ? 'improving' : 'worsening';
    } else {
      trend = changePercent > 0 ? 'improving' : 'worsening';
    }

    trends.push({
      metric,
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
      values,
      dates: dataPoints.map((d) => d.date),
    });
  }

  return trends;
}
