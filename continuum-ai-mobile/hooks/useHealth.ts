import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHealthStore } from '../store/healthStore';
import { healthApi } from '../api/health';
import type { HealthEntry } from '../types';

export function useHealth() {
  const queryClient = useQueryClient();
  const { setProfile, setTimeline, addEntry, setHealthScore, healthProfile, timeline, healthScore } =
    useHealthStore();

  const profileQuery = useQuery({
    queryKey: ['health', 'profile'],
    queryFn: async () => {
      const { data } = await healthApi.getProfile();
      setProfile(data);
      return data;
    },
  });

  const timelineQuery = useQuery({
    queryKey: ['health', 'timeline'],
    queryFn: async () => {
      const { data } = await healthApi.getTimeline({ limit: 50 });
      setTimeline(data.data);
      return data.data;
    },
  });

  const scoreQuery = useQuery({
    queryKey: ['health', 'score'],
    queryFn: async () => {
      const { data } = await healthApi.getHealthScore();
      setHealthScore(data.score);
      return data;
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (entry: Omit<HealthEntry, 'id' | 'userId' | 'createdAt'>) =>
      healthApi.createEntry(entry),
    onSuccess: ({ data }) => {
      addEntry(data);
      queryClient.invalidateQueries({ queryKey: ['health', 'timeline'] });
    },
  });

  return {
    healthProfile,
    timeline,
    healthScore,
    isLoading: profileQuery.isLoading || timelineQuery.isLoading,
    createEntry: createEntryMutation.mutateAsync,
    refetchAll: () => {
      profileQuery.refetch();
      timelineQuery.refetch();
      scoreQuery.refetch();
    },
  };
}
