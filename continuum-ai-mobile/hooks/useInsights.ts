import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHealthStore } from '../store/healthStore';
import { insightsApi } from '../api/insights';

export function useInsights() {
  const queryClient = useQueryClient();
  const { insights, setInsights, dismissInsight } = useHealthStore();

  const insightsQuery = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data } = await insightsApi.getInsights({ dismissed: false });
      setInsights(data.data);
      return data.data;
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => insightsApi.dismissInsight(id),
    onMutate: (id) => {
      // Optimistic update
      dismissInsight(id);
    },
    onError: (_err, id) => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  const doctorRecsQuery = useQuery({
    queryKey: ['insights', 'doctors'],
    queryFn: async () => {
      const { data } = await insightsApi.getDoctorRecommendations();
      return data.data;
    },
  });

  return {
    insights: insights.filter((i) => !i.dismissed),
    doctorRecommendations: doctorRecsQuery.data ?? [],
    isLoading: insightsQuery.isLoading,
    dismiss: dismissMutation.mutate,
    refetch: insightsQuery.refetch,
  };
}
