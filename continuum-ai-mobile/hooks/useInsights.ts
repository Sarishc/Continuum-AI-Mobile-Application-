import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHealthStore } from '../store/healthStore';
import { insightsApi } from '../api/insights';
import type { Insight, DoctorRecommendation } from '../types';

// ─── Mock data (used when API is unreachable) ─────────────────────────────────

const MOCK_INSIGHTS: Insight[] = [
  {
    id: 'i1',
    userId: 'mock-user',
    category: 'risk',
    title: 'Elevated Blood Glucose Trend',
    summary:
      'Your HbA1c has increased by 0.4% over the past 3 months. Consistent readings above 6.5% may indicate worsening glycaemic control.',
    details:
      'Based on your last three lab results, a progressive upward trend in fasting glucose and HbA1c has been identified. Consider reviewing dietary carbohydrate intake and consult your endocrinologist.',
    severity: 'high',
    confidence: 0.87,
    relatedEntryIds: ['t1'],
    actionable: true,
    dismissed: false,
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'i2',
    userId: 'mock-user',
    category: 'pattern',
    title: 'Blood Pressure Peaks in Morning',
    summary:
      'Your blood pressure readings are consistently 8–12% higher in the morning before medication. This morning surge pattern warrants attention.',
    details:
      'Morning hypertension surge detected across 5 of your last 7 readings. This pattern is associated with increased cardiovascular risk. Discuss timing of antihypertensive medication with your doctor.',
    severity: 'moderate',
    confidence: 0.79,
    relatedEntryIds: ['t3'],
    actionable: true,
    dismissed: false,
    generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'i3',
    userId: 'mock-user',
    category: 'recommendation',
    title: 'Hydration May Be Affecting Fatigue',
    summary:
      'Your reported fatigue episodes correlate with days where no fluid intake was logged. Aim for 2–2.5L of water daily.',
    details:
      'Cross-referencing your symptom logs with activity patterns, fatigue episodes are 3× more frequent on low-activity days without hydration tracking.',
    severity: 'low',
    confidence: 0.64,
    relatedEntryIds: ['t2'],
    actionable: true,
    dismissed: false,
    generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_DOCTOR_REC: DoctorRecommendation = {
  id: 'dr1',
  userId: 'mock-user',
  specialty: 'Endocrinologist',
  urgency: 'soon',
  reason:
    'Worsening glycaemic control with HbA1c trending above target. A specialist review of your diabetes management plan is recommended within the next 4–6 weeks.',
  relatedInsightIds: ['i1'],
  generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  dismissed: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInsights() {
  const queryClient = useQueryClient();
  const { insights, setInsights, dismissInsight } = useHealthStore();

  const insightsQuery = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      try {
        const { data } = await insightsApi.getInsights({ dismissed: false });
        setInsights(data.data);
        return data.data;
      } catch {
        setInsights(MOCK_INSIGHTS);
        return MOCK_INSIGHTS;
      }
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => insightsApi.dismissInsight(id),
    onMutate: (id) => {
      dismissInsight(id);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  const doctorRecsQuery = useQuery({
    queryKey: ['insights', 'doctors'],
    queryFn: async () => {
      try {
        const { data } = await insightsApi.getDoctorRecommendations();
        return data.data;
      } catch {
        return [MOCK_DOCTOR_REC];
      }
    },
  });

  const refetchAll = () => {
    insightsQuery.refetch();
    doctorRecsQuery.refetch();
  };

  return {
    insights: insights.filter((i) => !i.dismissed),
    doctorRecommendations: (doctorRecsQuery.data ?? []).filter((r) => !r.dismissed),
    isLoading: insightsQuery.isLoading,
    isRefetching: insightsQuery.isRefetching,
    dismiss: dismissMutation.mutate,
    refetch: insightsQuery.refetch,
    refetchAll,
  };
}
