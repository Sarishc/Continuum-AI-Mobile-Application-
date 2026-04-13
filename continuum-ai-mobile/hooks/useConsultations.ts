import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDemoStore } from '@/store/demoStore';
import {
  subscribeToConsultations,
  Consultation,
} from '@/services/firestoreService';
import { requestConsultation } from '@/services/consultationService';
import { useHealth } from './useHealth';

export function useConsultations() {
  const { isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();
  const { healthProfile, timeline } = useHealth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      // Lazy import to avoid circular deps at startup
      import('@/constants/demoData').then(({ DEMO_CONSULTATION }) => {
        setConsultations([DEMO_CONSULTATION]);
        setIsLoading(false);
      });
      return;
    }

    if (!isAuthenticated) {
      setConsultations([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToConsultations((data) => {
      setConsultations(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isDemoMode]);

  const requestDoctorConsultation = useCallback(
    async (insightId: string, insightText: string): Promise<Consultation | null> => {
      if (isDemoMode) {
        const { DEMO_CONSULTATION } = await import('@/constants/demoData');
        return DEMO_CONSULTATION;
      }

      if (!healthProfile) return null;

      setIsRequesting(true);
      setError(null);

      try {
        const result = await requestConsultation({
          insightId,
          insightText,
          healthProfile,
          recentEntries: (timeline ?? []).slice(0, 10),
        });

        if (!result) throw new Error('Consultation failed — please try again.');

        return {
          id: result.consultationId,
          userId: '',
          status: 'completed',
          insightId,
          insightText,
          healthProfile,
          recentEntries: [],
          paymentStatus: 'paid',
          paymentAmount: 2900,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          doctorResponse: result.doctorResponse,
        };
      } catch (err: any) {
        setError(err?.message ?? 'Consultation failed');
        return null;
      } finally {
        setIsRequesting(false);
      }
    },
    [isDemoMode, healthProfile, timeline]
  );

  return {
    consultations,
    isLoading,
    isRequesting,
    error,
    requestDoctorConsultation,
  };
}
