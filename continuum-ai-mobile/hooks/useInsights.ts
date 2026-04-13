import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDemoStore } from '../store/demoStore';
import {
  getInsights,
  addInsight,
  markInsightRead,
  markAllInsightsRead,
  subscribeToInsights,
  type FirestoreInsight,
} from '../services/firestoreService';
import { DEMO_INSIGHTS } from '../constants/demoData';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInsights() {
  const { user, isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();

  const [insights, setInsights] = useState<FirestoreInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo mode — return mock data immediately
  if (isDemoMode) {
    return {
      insights: DEMO_INSIGHTS,
      isLoading: false,
      error: null,
      unreadCount: DEMO_INSIGHTS.filter((i) => !i.isRead).length,
      dismissInsight: async () => {},
      dismiss: async () => {},
      markRead: async () => {},
      markAllRead: async () => {},
      refetchAll: () => {},
      refetch: () => {},
      addNewInsight: async () => {},
      doctorRecommendations: [],
      isRefetching: false,
    };
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    // Real-time subscription — no initial fetch needed
    const unsubscribe = subscribeToInsights((data) => {
      setInsights(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      await markInsightRead(insightId);
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? { ...i, isRead: true } : i))
      );
    } catch (err: any) {
      setError(err.message ?? 'Failed to dismiss insight');
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await markAllInsightsRead(user.id);
      setInsights((prev) => prev.map((i) => ({ ...i, isRead: true })));
    } catch (err: any) {
      setError(err.message ?? 'Failed to mark all read');
    }
  }, [user?.id]);

  const addNewInsight = useCallback(
    async (insight: {
      insightText: string;
      severity: string;
      category: string;
      confidenceScore: number;
      specialist?: object | null;
    }) => {
      try {
        await addInsight(insight);
        // Real-time listener updates automatically
      } catch (err: any) {
        setError(err.message ?? 'Failed to add insight');
      }
    },
    []
  );

  const unreadCount = insights.filter((i) => !i.isRead).length;

  return {
    insights,
    isLoading,
    isRefetching: false,
    error,
    unreadCount,
    dismissInsight,
    dismiss: dismissInsight,
    markRead: dismissInsight,
    markAllRead,
    refetchAll: () => {},
    refetch: () => {},
    addNewInsight,
    doctorRecommendations: [],
  };
}
