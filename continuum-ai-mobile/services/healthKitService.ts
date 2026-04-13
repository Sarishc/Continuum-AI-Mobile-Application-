/**
 * HealthKit Service
 *
 * Wraps expo-health (Apple HealthKit) with graceful fallbacks.
 * All functions return empty arrays / false on web or Android.
 * On iOS the native module is loaded lazily so the JS bundle
 * always parses correctly even when the native plugin isn't built.
 */
import { Platform } from 'react-native';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface HealthKitReading {
  type: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  sourceName: string;
}

export interface HealthKitSummary {
  bloodGlucose: HealthKitReading[];
  heartRate: HealthKitReading[];
  bloodPressureSystolic: HealthKitReading[];
  bloodPressureDiastolic: HealthKitReading[];
  weight: HealthKitReading[];
  steps: HealthKitReading[];
  sleep: HealthKitReading[];
  oxygenSaturation: HealthKitReading[];
  restingHeartRate: HealthKitReading[];
  hrv: HealthKitReading[];
}

export interface LatestVitals {
  bloodGlucose?: number;       // mg/dL
  heartRate?: number;          // bpm
  systolicBP?: number;         // mmHg
  diastolicBP?: number;        // mmHg
  weight?: number;             // lbs
  dailySteps?: number;
  oxygenSaturation?: number;  // %
  restingHeartRate?: number;  // bpm
}

// ─── Native module loader (lazy, iOS-only) ────────────────────────────────────

let _Health: any = null;

function getHealthModule(): any | null {
  if (Platform.OS !== 'ios') return null;
  if (_Health !== null) return _Health;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _Health = require('expo-health').default ?? require('expo-health');
    return _Health;
  } catch {
    return null;
  }
}

// Enum values used for queries – mirrored from expo-health spec so
// TypeScript never imports the (possibly absent) native module at build time.
const HDataType = {
  BloodGlucose:              'bloodGlucose',
  HeartRate:                 'heartRate',
  BloodPressureSystolic:     'bloodPressureSystolic',
  BloodPressureDiastolic:    'bloodPressureDiastolic',
  BodyMass:                  'bodyMass',
  StepCount:                 'stepCount',
  SleepAnalysis:             'sleepAnalysis',
  OxygenSaturation:          'oxygenSaturation',
  RestingHeartRate:          'restingHeartRate',
  HeartRateVariabilitySDNN:  'heartRateVariabilitySDNN',
  ActiveEnergyBurned:        'activeEnergyBurned',
  BodyMassIndex:             'bodyMassIndex',
  Height:                    'height',
} as const;

const HUnit = {
  GlucoseMmolPerL:  'mmol/L',
  BeatsPerMinute:   'count/min',
  Mmhg:             'mmHg',
  Pound:            'lb',
  Count:            'count',
  Percent:          '%',
} as const;

export const HEALTH_DATA_TYPES = Object.values(HDataType);

// ─── Availability ─────────────────────────────────────────────────────────────

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios';
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestHealthKitPermissions(): Promise<boolean> {
  const Health = getHealthModule();
  if (!Health) return false;
  try {
    const result = await Health.requestPermissionsAsync(
      HEALTH_DATA_TYPES,
      [] // write types
    );
    return result?.status === 'granted' || result === true;
  } catch (e) {
    console.warn('[HealthKit] requestPermissions failed:', e);
    return false;
  }
}

export async function getHealthKitPermissionStatus(): Promise<boolean> {
  const Health = getHealthModule();
  if (!Health) return false;
  try {
    const status = await Health.getAuthorizationStatusAsync(HDataType.HeartRate);
    return status === 'sharingAuthorized' || status === 'authorized' || status === true;
  } catch {
    return false;
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateRange(daysBack: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  return { startDate, endDate };
}

function toReading(
  s: any,
  type: string,
  unit: string,
  transformValue?: (v: number) => number
): HealthKitReading {
  const raw = s?.value ?? 0;
  return {
    type,
    value: transformValue ? transformValue(raw) : raw,
    unit,
    startDate: (s?.startDate instanceof Date ? s.startDate : new Date(s?.startDate)).toISOString(),
    endDate:   (s?.endDate   instanceof Date ? s.endDate   : new Date(s?.endDate)).toISOString(),
    sourceName: s?.sourceName ?? 'Apple Health',
  };
}

// ─── Readers ──────────────────────────────────────────────────────────────────

export async function getBloodGlucoseReadings(daysBack = 30): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.BloodGlucose, {
      unit: HUnit.GlucoseMmolPerL,
      startDate,
      endDate,
      limit: 100,
    });
    // expo-health returns mmol/L → convert to mg/dL (* 18.0182)
    return (samples ?? []).map((s: any) =>
      toReading(s, 'blood_glucose', 'mg/dL', (v) => Number((v * 18.0182).toFixed(1)))
    );
  } catch { return []; }
}

export async function getHeartRateReadings(daysBack = 7): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.HeartRate, {
      unit: HUnit.BeatsPerMinute,
      startDate,
      endDate,
      limit: 50,
    });
    return (samples ?? []).map((s: any) =>
      toReading(s, 'heart_rate', 'bpm', Math.round)
    );
  } catch { return []; }
}

export async function getBloodPressureReadings(
  daysBack = 30
): Promise<{ systolic: HealthKitReading[]; diastolic: HealthKitReading[] }> {
  const Health = getHealthModule();
  if (!Health) return { systolic: [], diastolic: [] };
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const [sysSamples, diaSamples] = await Promise.all([
      Health.queryAsync(HDataType.BloodPressureSystolic, { unit: HUnit.Mmhg, startDate, endDate, limit: 50 }),
      Health.queryAsync(HDataType.BloodPressureDiastolic, { unit: HUnit.Mmhg, startDate, endDate, limit: 50 }),
    ]);
    return {
      systolic:  (sysSamples ?? []).map((s: any) => toReading(s, 'blood_pressure_systolic', 'mmHg', Math.round)),
      diastolic: (diaSamples ?? []).map((s: any) => toReading(s, 'blood_pressure_diastolic', 'mmHg', Math.round)),
    };
  } catch { return { systolic: [], diastolic: [] }; }
}

export async function getStepCount(daysBack = 7): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.StepCount, {
      unit: HUnit.Count,
      startDate,
      endDate,
      limit: 30,
    });
    return (samples ?? []).map((s: any) => toReading(s, 'steps', 'steps', Math.round));
  } catch { return []; }
}

export async function getWeightReadings(daysBack = 30): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.BodyMass, {
      unit: HUnit.Pound,
      startDate,
      endDate,
      limit: 20,
    });
    return (samples ?? []).map((s: any) =>
      toReading(s, 'weight', 'lbs', (v) => Number(v.toFixed(1)))
    );
  } catch { return []; }
}

export async function getSleepData(daysBack = 7): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.SleepAnalysis, {
      startDate,
      endDate,
      limit: 30,
    });
    return (samples ?? []).map((s: any) => toReading(s, 'sleep', 'hours'));
  } catch { return []; }
}

export async function getOxygenSaturationReadings(daysBack = 7): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.OxygenSaturation, {
      unit: HUnit.Percent,
      startDate,
      endDate,
      limit: 30,
    });
    return (samples ?? []).map((s: any) =>
      toReading(s, 'oxygen_saturation', '%', (v) => Number((v * 100).toFixed(1)))
    );
  } catch { return []; }
}

export async function getRestingHeartRateReadings(daysBack = 14): Promise<HealthKitReading[]> {
  const Health = getHealthModule();
  if (!Health) return [];
  try {
    const { startDate, endDate } = dateRange(daysBack);
    const samples = await Health.queryAsync(HDataType.RestingHeartRate, {
      unit: HUnit.BeatsPerMinute,
      startDate,
      endDate,
      limit: 14,
    });
    return (samples ?? []).map((s: any) => toReading(s, 'resting_heart_rate', 'bpm', Math.round));
  } catch { return []; }
}

// ─── Full summary ─────────────────────────────────────────────────────────────

export async function getFullHealthSummary(): Promise<HealthKitSummary> {
  const [
    bloodGlucose,
    heartRate,
    bloodPressure,
    steps,
    weight,
    sleep,
    oxygenSaturation,
    restingHeartRate,
  ] = await Promise.all([
    getBloodGlucoseReadings(30),
    getHeartRateReadings(7),
    getBloodPressureReadings(30),
    getStepCount(7),
    getWeightReadings(30),
    getSleepData(7),
    getOxygenSaturationReadings(7),
    getRestingHeartRateReadings(14),
  ]);

  return {
    bloodGlucose,
    heartRate,
    bloodPressureSystolic:  bloodPressure.systolic,
    bloodPressureDiastolic: bloodPressure.diastolic,
    weight,
    steps,
    sleep,
    oxygenSaturation,
    restingHeartRate,
    hrv: [],
  };
}

// ─── Convert to Firestore entry ───────────────────────────────────────────────

export function healthKitSummaryToEntry(
  summary: HealthKitSummary,
  date: Date = new Date()
): {
  entryType: string;
  title: string;
  rawText: string;
  structuredData: {
    conditions: string[];
    medications: string[];
    symptoms: string[];
    labValues: Record<string, string>;
    summary: string;
    riskFlags: string[];
    source: string;
  };
} {
  const labValues: Record<string, string> = {};

  if (summary.bloodGlucose.length > 0) {
    labValues['Blood Glucose'] = `${summary.bloodGlucose[0].value} mg/dL`;
  }
  if (summary.heartRate.length > 0) {
    const avg = Math.round(
      summary.heartRate.reduce((s, r) => s + r.value, 0) / summary.heartRate.length
    );
    labValues['Avg Heart Rate'] = `${avg} bpm`;
  }
  if (summary.bloodPressureSystolic.length > 0 && summary.bloodPressureDiastolic.length > 0) {
    labValues['Blood Pressure'] =
      `${summary.bloodPressureSystolic[0].value}/${summary.bloodPressureDiastolic[0].value} mmHg`;
  }
  if (summary.weight.length > 0) {
    labValues['Weight'] = `${summary.weight[0].value} lbs`;
  }
  if (summary.steps.length > 0) {
    const avg = Math.round(
      summary.steps.reduce((s, r) => s + r.value, 0) / summary.steps.length
    );
    labValues['Daily Steps (avg)'] = avg.toLocaleString();
  }
  if (summary.oxygenSaturation.length > 0) {
    labValues['Oxygen Saturation'] = `${summary.oxygenSaturation[0].value}%`;
  }
  if (summary.restingHeartRate.length > 0) {
    labValues['Resting Heart Rate'] = `${summary.restingHeartRate[0].value} bpm`;
  }

  const summaryText =
    'Apple Health sync: ' +
    Object.entries(labValues)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

  return {
    entryType: 'vitals',
    title: `Apple Health Sync — ${date.toLocaleDateString()}`,
    rawText: summaryText,
    structuredData: {
      conditions: [],
      medications: [],
      symptoms: [],
      labValues,
      summary: summaryText,
      riskFlags: [],
      source: 'apple_health',
    },
  };
}

// ─── Latest vitals snapshot (for AI context) ──────────────────────────────────

export function extractLatestVitals(summary: HealthKitSummary): LatestVitals {
  const vitals: LatestVitals = {};

  if (summary.bloodGlucose.length > 0)
    vitals.bloodGlucose = summary.bloodGlucose[0].value;
  if (summary.heartRate.length > 0)
    vitals.heartRate = Math.round(
      summary.heartRate.reduce((s, r) => s + r.value, 0) / summary.heartRate.length
    );
  if (summary.bloodPressureSystolic.length > 0)
    vitals.systolicBP = summary.bloodPressureSystolic[0].value;
  if (summary.bloodPressureDiastolic.length > 0)
    vitals.diastolicBP = summary.bloodPressureDiastolic[0].value;
  if (summary.weight.length > 0)
    vitals.weight = summary.weight[0].value;
  if (summary.steps.length > 0)
    vitals.dailySteps = Math.round(
      summary.steps.reduce((s, r) => s + r.value, 0) / summary.steps.length
    );
  if (summary.oxygenSaturation.length > 0)
    vitals.oxygenSaturation = summary.oxygenSaturation[0].value;
  if (summary.restingHeartRate.length > 0)
    vitals.restingHeartRate = summary.restingHeartRate[0].value;

  return vitals;
}

// ─── Rule-based HealthKit insights ───────────────────────────────────────────

export function generateHealthKitInsights(
  summary: HealthKitSummary
): Array<{
  insightText: string;
  severity: string;
  category: string;
  confidenceScore: number;
  specialist: { type: string; urgency: string; reason: string } | null;
}> {
  const insights: ReturnType<typeof generateHealthKitInsights> = [];

  // Blood glucose analysis
  if (summary.bloodGlucose.length >= 3) {
    const avg = summary.bloodGlucose.reduce((s, r) => s + r.value, 0) / summary.bloodGlucose.length;
    if (avg > 180) {
      insights.push({
        insightText: `Your average blood glucose over the past month is ${Math.round(avg)} mg/dL, above the 140 mg/dL target range. This pattern warrants discussion with your endocrinologist.`,
        severity: 'high',
        category: 'Metabolic',
        confidenceScore: 0.88,
        specialist: { type: 'Endocrinologist', urgency: 'soon', reason: 'Elevated average blood glucose detected from Apple Health' },
      });
    } else if (avg > 140) {
      insights.push({
        insightText: `Your average blood glucose is ${Math.round(avg)} mg/dL — borderline elevated. Consider adjusting your diet and exercise routine, and discuss with your doctor.`,
        severity: 'medium',
        category: 'Metabolic',
        confidenceScore: 0.82,
        specialist: null,
      });
    }
  }

  // Heart rate analysis
  if (summary.heartRate.length >= 5) {
    const avg = summary.heartRate.reduce((s, r) => s + r.value, 0) / summary.heartRate.length;
    if (avg > 100) {
      insights.push({
        insightText: `Your average heart rate is ${Math.round(avg)} bpm, indicating possible tachycardia. This may be related to stress, dehydration, caffeine, or an underlying condition.`,
        severity: 'medium',
        category: 'Cardiovascular',
        confidenceScore: 0.79,
        specialist: { type: 'Cardiologist', urgency: 'routine', reason: 'Elevated resting heart rate pattern from Apple Health' },
      });
    }
  }

  // Resting heart rate
  if (summary.restingHeartRate.length >= 3) {
    const avg = summary.restingHeartRate.reduce((s, r) => s + r.value, 0) / summary.restingHeartRate.length;
    if (avg > 90) {
      insights.push({
        insightText: `Your resting heart rate averages ${Math.round(avg)} bpm. A healthy resting HR is typically 60-100 bpm. Values above 80 are associated with higher cardiovascular risk.`,
        severity: 'medium',
        category: 'Cardiovascular',
        confidenceScore: 0.84,
        specialist: null,
      });
    }
  }

  // Blood pressure
  if (summary.bloodPressureSystolic.length >= 2) {
    const avgSys = summary.bloodPressureSystolic.reduce((s, r) => s + r.value, 0) / summary.bloodPressureSystolic.length;
    if (avgSys >= 140) {
      insights.push({
        insightText: `Your average systolic blood pressure is ${Math.round(avgSys)} mmHg, which falls in the Stage 2 hypertension range (≥140). Consult your doctor soon.`,
        severity: 'high',
        category: 'Cardiovascular',
        confidenceScore: 0.91,
        specialist: { type: 'Cardiologist', urgency: 'soon', reason: 'Stage 2 hypertension detected from Apple Health' },
      });
    } else if (avgSys >= 130) {
      insights.push({
        insightText: `Your average systolic BP is ${Math.round(avgSys)} mmHg — Stage 1 hypertension range (130-139). Lifestyle modifications and monitoring are recommended.`,
        severity: 'medium',
        category: 'Cardiovascular',
        confidenceScore: 0.87,
        specialist: null,
      });
    }
  }

  // Activity / steps
  if (summary.steps.length >= 5) {
    const avg = summary.steps.reduce((s, r) => s + r.value, 0) / summary.steps.length;
    if (avg < 5000) {
      insights.push({
        insightText: `Your average daily step count is ${Math.round(avg).toLocaleString()}. The AHA recommends 10,000 steps/day. Low activity is associated with higher insulin resistance and cardiovascular risk.`,
        severity: 'low',
        category: 'Lifestyle',
        confidenceScore: 0.91,
        specialist: null,
      });
    }
  }

  // O2 saturation
  if (summary.oxygenSaturation.length > 0) {
    const latest = summary.oxygenSaturation[0].value;
    if (latest < 95) {
      insights.push({
        insightText: `Your latest oxygen saturation reading is ${latest}%. Normal SpO2 is 95-100%. Readings below 95% should be evaluated by a physician.`,
        severity: latest < 92 ? 'high' : 'medium',
        category: 'Respiratory',
        confidenceScore: 0.93,
        specialist: { type: 'Pulmonologist', urgency: latest < 92 ? 'urgent' : 'soon', reason: 'Below-normal oxygen saturation from Apple Health' },
      });
    }
  }

  return insights;
}
