import { create } from 'zustand';
import { CustomerInfo } from 'react-native-purchases';
import { isPro as checkIsPro } from '../services/purchases';

interface SubscriptionStore {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;

  // Usage tracking (free tier limits)
  entriesThisMonth: number;
  aiMessagesToday: number;

  setCustomerInfo: (info: CustomerInfo | null) => void;
  setLoading: (loading: boolean) => void;
  incrementEntries: () => void;
  incrementAIMessages: () => void;
  resetDailyLimits: () => void;

  // Computed
  canUploadEntry: () => boolean;
  canUseAI: () => boolean;
  canExpandInsight: () => boolean;
  canViewTimeline: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  isPro: false,
  customerInfo: null,
  isLoading: true,
  entriesThisMonth: 0,
  aiMessagesToday: 0,

  setCustomerInfo: (info) =>
    set({
      customerInfo: info,
      isPro: checkIsPro(info),
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  incrementEntries: () =>
    set((s) => ({ entriesThisMonth: s.entriesThisMonth + 1 })),

  incrementAIMessages: () =>
    set((s) => ({ aiMessagesToday: s.aiMessagesToday + 1 })),

  resetDailyLimits: () => set({ aiMessagesToday: 0 }),

  // Free tier: 3 entries/month, 1 AI message/day
  canUploadEntry: () => {
    const { isPro, entriesThisMonth } = get();
    return isPro || entriesThisMonth < 3;
  },
  canUseAI: () => {
    const { isPro, aiMessagesToday } = get();
    return isPro || aiMessagesToday < 1;
  },
  canExpandInsight: () => get().isPro,
  canViewTimeline: () => true,
}));
