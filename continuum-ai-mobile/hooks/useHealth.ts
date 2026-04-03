import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHealthStore } from '../store/healthStore';
import { healthApi } from '../api/health';
import type { HealthEntry, HealthProfile } from '../types';

const now = Date.now();

// ─── Mock data (used when API is unreachable) ─────────────────────────────────

const MOCK_PROFILE: HealthProfile = {
  userId: 'mock-user',
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  medications: [
    { id: 'm1', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', startDate: '2024-01-15' },
    { id: 'm2', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: '2024-03-01' },
  ],
  allergies: ['Penicillin'],
  updatedAt: new Date().toISOString(),
};

const day = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

const MOCK_TIMELINE: HealthEntry[] = [
  {
    id: 't1',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'HbA1c Blood Panel',
    description: 'Fasting glucose 118 mg/dL, HbA1c 6.8% — above target range.',
    severity: 'high',
    value: 6.8,
    unit: '%',
    tags: ['glucose', 'diabetes'],
    attachments: [],
    structuredData: {
      summary: 'HbA1c elevated at 6.8%, consistent with pre-diabetic range. Fasting glucose borderline at 118 mg/dL. Recommend dietary review and follow-up in 3 months.',
      conditions: ['Pre-diabetes'],
      lab_values: { 'HbA1c': '6.8%', 'Fasting Glucose': '118 mg/dL', 'eGFR': '92 mL/min' },
      risk_flags: ['HbA1c above normal threshold (>6.4%)', 'Fasting glucose borderline elevated'],
      source_file: 'lab_results_panel_q1.pdf',
    },
    recordedAt: day(0),
    createdAt: day(0),
  },
  {
    id: 't2',
    userId: 'mock-user',
    type: 'symptom',
    title: 'Frequent Urination & Thirst',
    description: 'Classic symptoms associated with elevated blood glucose.',
    severity: 'moderate',
    tags: ['urination', 'thirst', 'fatigue'],
    attachments: [],
    structuredData: {
      summary: 'Patient reports frequent urination, increased thirst, and persistent fatigue over the past 3 days. Symptoms consistent with hyperglycaemia.',
      symptoms: ['Frequent urination', 'Increased thirst', 'Fatigue', 'Blurred vision'],
      risk_flags: [],
    },
    recordedAt: day(1),
    createdAt: day(1),
  },
  {
    id: 't3',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'Annual Physical Report',
    description: 'Annual physical examination. BP 138/88 mmHg.',
    severity: 'moderate',
    value: '138/88',
    unit: 'mmHg',
    tags: ['blood-pressure', 'hypertension', 'annual'],
    attachments: [],
    structuredData: {
      summary: 'Annual physical examination report. Blood pressure 138/88 mmHg consistent with Stage 1 hypertension. BMI 27.4 (overweight). All other values within normal limits.',
      conditions: ['Hypertension', 'Pre-diabetes'],
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
        { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
      ],
      lab_values: { 'Blood Pressure': '138/88 mmHg', 'BMI': '27.4', 'Heart Rate': '74 bpm' },
      risk_flags: ['Stage 1 hypertension', 'BMI in overweight range'],
      source_file: 'annual_physical_2026.pdf',
    },
    recordedAt: day(3),
    createdAt: day(3),
  },
  {
    id: 't4',
    userId: 'mock-user',
    type: 'note',
    title: 'Started Daily Walking Routine',
    description: 'Started new walking routine — 20 minutes daily.',
    severity: 'low',
    tags: ['exercise', 'lifestyle'],
    attachments: [],
    structuredData: {
      summary: 'Started new walking routine — 20 minutes daily after dinner. Feeling more energetic after first week. Plan to increase to 30 minutes next month.',
      risk_flags: [],
    },
    recordedAt: day(7),
    createdAt: day(7),
  },
  {
    id: 't5',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'Lipid Panel',
    description: 'Total cholesterol 204 mg/dL, LDL borderline high.',
    severity: 'moderate',
    tags: ['cholesterol', 'lipids'],
    attachments: [],
    structuredData: {
      summary: 'Lipid panel shows borderline high LDL cholesterol at 128 mg/dL. HDL satisfactory at 52 mg/dL. Total cholesterol 204 mg/dL — borderline high. Dietary modifications recommended.',
      lab_values: {
        'Total Cholesterol': '204 mg/dL',
        'LDL': '128 mg/dL',
        'HDL': '52 mg/dL',
        'Triglycerides': '118 mg/dL',
      },
      risk_flags: ['LDL borderline high (>120 mg/dL)', 'Total cholesterol borderline high'],
      source_file: 'lipid_panel_march.pdf',
    },
    recordedAt: day(14),
    createdAt: day(14),
  },
  {
    id: 't6',
    userId: 'mock-user',
    type: 'appointment',
    title: 'Seasonal Allergy Follow-up',
    description: 'Follow-up for seasonal allergies. Symptoms well controlled.',
    severity: 'low',
    tags: ['allergy', 'follow-up'],
    attachments: [],
    structuredData: {
      summary: 'Follow-up visit for seasonal allergies. Symptoms well controlled on current Cetirizine regimen. No changes required. Next review in 6 months.',
      conditions: ['Seasonal allergies'],
      medications: [
        { name: 'Cetirizine', dosage: '10mg', frequency: 'as needed' },
      ],
      risk_flags: [],
    },
    recordedAt: day(35),
    createdAt: day(35),
  },
];

const MOCK_SCORE = 72;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHealth() {
  const queryClient = useQueryClient();
  const {
    setProfile,
    setTimeline,
    addEntry,
    setHealthScore,
    healthProfile,
    timeline,
    healthScore,
  } = useHealthStore();

  const profileQuery = useQuery({
    queryKey: ['health', 'profile'],
    queryFn: async () => {
      try {
        const { data } = await healthApi.getProfile();
        setProfile(data);
        return data;
      } catch {
        // API unreachable — fall back to mock
        setProfile(MOCK_PROFILE);
        return MOCK_PROFILE;
      }
    },
  });

  const timelineQuery = useQuery({
    queryKey: ['health', 'timeline'],
    queryFn: async () => {
      try {
        const { data } = await healthApi.getTimeline({ limit: 50 });
        setTimeline(data.data);
        return data.data;
      } catch {
        setTimeline(MOCK_TIMELINE);
        return MOCK_TIMELINE;
      }
    },
  });

  const scoreQuery = useQuery({
    queryKey: ['health', 'score'],
    queryFn: async () => {
      try {
        const { data } = await healthApi.getHealthScore();
        setHealthScore(data.score);
        return data;
      } catch {
        setHealthScore(MOCK_SCORE);
        return { score: MOCK_SCORE, breakdown: {} };
      }
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (entry: Omit<HealthEntry, 'id' | 'userId' | 'createdAt'>) =>
      healthApi.createEntry(entry),
    onSuccess: ({ data }) => {
      addEntry(data);
      queryClient.invalidateQueries({ queryKey: ['health', 'timeline'] });
    },
    onError: (_err, entry) => {
      // Offline fallback — add locally with a temp ID
      const localEntry: HealthEntry = {
        ...entry,
        id: `local-${Date.now()}`,
        userId: 'local',
        createdAt: new Date().toISOString(),
      };
      addEntry(localEntry);
    },
  });

  const refetchAll = () => {
    profileQuery.refetch();
    timelineQuery.refetch();
    scoreQuery.refetch();
  };

  return {
    healthProfile,
    timeline,
    healthScore,
    isLoading: profileQuery.isLoading || timelineQuery.isLoading || scoreQuery.isLoading,
    isRefetching: profileQuery.isRefetching || timelineQuery.isRefetching,
    createEntry: createEntryMutation.mutateAsync,
    createEntryAsync: createEntryMutation.mutateAsync,
    refetchAll,
  };
}
