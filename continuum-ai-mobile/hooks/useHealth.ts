import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHealthStore } from '../store/healthStore';
import { healthApi } from '../api/health';
import type { HealthEntry, HealthProfile } from '../types';

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

const MOCK_TIMELINE: HealthEntry[] = [
  {
    id: 't1',
    userId: 'mock-user',
    type: 'lab_result',
    title: 'HbA1c Blood Panel',
    description: 'Fasting glucose 118 mg/dL, HbA1c 6.8% — slightly above target range.',
    severity: 'moderate',
    value: 6.8,
    unit: '%',
    tags: ['glucose', 'diabetes'],
    attachments: [],
    recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 't2',
    userId: 'mock-user',
    type: 'symptom',
    title: 'Fatigue & Mild Headache',
    description: 'Persistent fatigue since morning, dull frontal headache. Possible dehydration.',
    severity: 'low',
    tags: ['fatigue', 'headache'],
    attachments: [],
    recordedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 't3',
    userId: 'mock-user',
    type: 'vital',
    title: 'Blood Pressure Reading',
    description: '142/88 mmHg — elevated. Taken after morning walk.',
    severity: 'moderate',
    value: '142/88',
    unit: 'mmHg',
    tags: ['blood-pressure', 'hypertension'],
    attachments: [],
    recordedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
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
