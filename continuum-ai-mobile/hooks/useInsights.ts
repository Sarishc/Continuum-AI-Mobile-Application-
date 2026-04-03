import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHealthStore } from '../store/healthStore';
import { insightsApi } from '../api/insights';
import type { Insight, DoctorRecommendation } from '../types';

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = Date.now();
const days = (n: number) => new Date(now - n * 86_400_000).toISOString();

const MOCK_INSIGHTS: Insight[] = [
  {
    id: 'i1',
    userId: 'mock-user',
    category: 'risk',
    healthCategory: 'Metabolic',
    title: 'HbA1c Elevation Trend',
    summary:
      'Your HbA1c trend shows consistent elevation over the past 3 entries, suggesting progressive pre-diabetic progression rather than a one-time reading.',
    details:
      'Based on your last three lab results, a progressive upward trend in fasting glucose and HbA1c has been identified (5.7% → 6.1% → 6.8%). Consistent readings above 6.5% may indicate worsening glycaemic control. Consider reviewing dietary carbohydrate intake and consult your endocrinologist for a personalised management plan.',
    severity: 'high',
    confidence: 0.87,
    relatedEntryIds: ['t1'],
    actionable: true,
    dismissed: false,
    is_read: false,
    specialist: {
      type: 'Endocrinologist',
      reason:
        'Worsening glycaemic control with HbA1c trending above target. A specialist review of your diabetes management plan is recommended within the next 4–6 weeks.',
      urgency: 'soon',
    },
    generatedAt: days(0),
  },
  {
    id: 'i2',
    userId: 'mock-user',
    category: 'pattern',
    healthCategory: 'Cardiovascular',
    title: 'Stage 1 Hypertension Pattern',
    summary:
      'Blood pressure readings across two separate visits both show Stage 1 hypertension range. Consistent pattern detected.',
    details:
      'Morning hypertension surge detected across 5 of your last 7 readings (avg 138/88 mmHg). This pattern is associated with increased cardiovascular risk. Discuss timing of antihypertensive medication with your doctor, and consider DASH diet modifications.',
    severity: 'moderate',
    confidence: 0.79,
    relatedEntryIds: ['t3'],
    actionable: true,
    dismissed: false,
    is_read: false,
    specialist: {
      type: 'Cardiologist',
      reason:
        'Consistent Stage 1 hypertension readings warrant cardiovascular evaluation. A routine review with a cardiologist within the next 1–2 months is recommended.',
      urgency: 'routine',
    },
    generatedAt: days(1),
  },
  {
    id: 'i3',
    userId: 'mock-user',
    category: 'milestone',
    healthCategory: 'Lifestyle',
    title: 'Consistent Health Tracking — 5 Days',
    summary:
      'You have been consistently logging health data for 5 days. Regular tracking improves the accuracy of health recommendations by 40%.',
    details:
      'Consistent daily logging enables the AI engine to detect patterns that single readings cannot reveal. Your current logging streak of 5 consecutive days puts you on track for highly personalised insights within the next 2 weeks.',
    severity: 'low',
    confidence: 0.95,
    relatedEntryIds: [],
    actionable: false,
    dismissed: false,
    is_read: true,
    specialist: null as any,
    generatedAt: days(3),
  },
  {
    id: 'i4',
    userId: 'mock-user',
    category: 'recommendation',
    healthCategory: 'Medication',
    title: 'Metformin Timing Advisory',
    summary:
      'Metformin 500mg is listed in your profile. Ensure you are taking it with meals to reduce gastrointestinal side effects.',
    details:
      'Metformin is most effective and best tolerated when taken with or immediately after food. Taking it on an empty stomach significantly increases the risk of nausea and GI discomfort. Your current medication log does not include meal-timing data — adding this could improve AI adherence analysis.',
    severity: 'moderate',
    confidence: 0.82,
    relatedEntryIds: ['t4'],
    actionable: true,
    dismissed: false,
    is_read: false,
    specialist: null as any,
    generatedAt: days(4),
  },
  {
    id: 'i5',
    userId: 'mock-user',
    category: 'recommendation',
    healthCategory: 'Preventive',
    title: 'Annual Eye Exam Recommended',
    summary:
      'Based on your age and risk profile, an annual eye exam is recommended. Diabetic retinopathy screening is important for pre-diabetic patients.',
    details:
      'Patients with pre-diabetes or HbA1c ≥ 5.7% are advised to undergo annual dilated eye exams. Early detection of diabetic retinopathy significantly reduces the risk of vision loss. Your last recorded eye exam date is not on file.',
    severity: 'low',
    confidence: 0.74,
    relatedEntryIds: [],
    actionable: true,
    dismissed: false,
    is_read: true,
    specialist: {
      type: 'Ophthalmologist',
      reason:
        'Annual dilated eye examination is recommended for pre-diabetic patients to screen for early-stage diabetic retinopathy.',
      urgency: 'routine',
    },
    generatedAt: days(7),
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
  generatedAt: days(0),
  dismissed: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInsights() {
  const queryClient = useQueryClient();
  const {
    insights,
    setInsights,
    dismissInsight,
    markInsightRead,
    markAllInsightsRead,
  } = useHealthStore();

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
    onMutate: (id) => dismissInsight(id),
    onError: () => queryClient.invalidateQueries({ queryKey: ['insights'] }),
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

  const active = insights.filter((i) => !i.dismissed);
  const unreadCount = active.filter((i) => !i.is_read).length;

  const refetchAll = () => {
    insightsQuery.refetch();
    doctorRecsQuery.refetch();
  };

  const markAllRead = () => {
    markAllInsightsRead();
  };

  return {
    insights: active,
    unreadCount,
    doctorRecommendations: (doctorRecsQuery.data ?? []).filter((r) => !r.dismissed),
    isLoading: insightsQuery.isLoading,
    isRefetching: insightsQuery.isRefetching,
    dismiss: dismissMutation.mutate,
    markRead: markInsightRead,
    markAllRead,
    refetch: insightsQuery.refetch,
    refetchAll,
  };
}
