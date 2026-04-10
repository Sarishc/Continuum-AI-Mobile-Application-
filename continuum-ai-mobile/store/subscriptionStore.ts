import { create } from 'zustand';
import { CustomerInfo } from 'react-native-purchases';
import { isPro as checkIsPro } from '../services/purchases';

interface SubscriptionStore {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;

  // Pro trial (from referral rewards)
  isProTrial: boolean;
  proTrialEndsAt: Date | null;

  // Usage tracking (free tier limits)
  entriesThisMonth: number;
  aiMessagesToday: number;

  setCustomerInfo: (info: CustomerInfo | null) => void;
  setProTrial: (endsAt: Date | null) => void;
  setLoading: (loading: boolean) => void;
  incrementEntries: () => void;
  incrementAIMessages: () => void;
  resetDailyLimits: () => void;

  // Computed
  effectivelyPro: () => boolean;
  canUploadEntry: () => boolean;
  canUseAI: () => boolean;
  canExpandInsight: () => boolean;
  canViewTimeline: () => boolean;
  proTrialDaysLeft: () => number;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  isPro: false,
  customerInfo: null,
  isLoading: true,
  isProTrial: false,
  proTrialEndsAt: null,
  entriesThisMonth: 0,
  aiMessagesToday: 0,

  setCustomerInfo: (info) =>
    set({
      customerInfo: info,
      isPro: checkIsPro(info),
      isLoading: false,
    }),

  setProTrial: (endsAt) => {
    const active = endsAt != null && new Date() < endsAt;
    set({ isProTrial: active, proTrialEndsAt: endsAt });
  },

  setLoading: (isLoading) => set({ isLoading }),

  incrementEntries: () =>
    set((s) => ({ entriesThisMonth: s.entriesThisMonth + 1 })),

  incrementAIMessages: () =>
    set((s) => ({ aiMessagesToday: s.aiMessagesToday + 1 })),

  resetDailyLimits: () => set({ aiMessagesToday: 0 }),

  // Effectively Pro = paid sub OR active trial
  effectivelyPro: () => {
    const { isPro, isProTrial, proTrialEndsAt } = get();
    if (isPro) return true;
    if (isProTrial && proTrialEndsAt && new Date() < proTrialEndsAt) return true;
    return false;
  },

  // Free tier: 3 entries/month, 1 AI message/day
  canUploadEntry: () => {
    const { entriesThisMonth } = get();
    return get().effectivelyPro() || entriesThisMonth < 3;
  },
  canUseAI: () => {
    const { aiMessagesToday } = get();
    return get().effectivelyPro() || aiMessagesToday < 1;
  },
  canExpandInsight: () => get().effectivelyPro(),
  canViewTimeline: () => true,

  proTrialDaysLeft: () => {
    const { proTrialEndsAt } = get();
    if (!proTrialEndsAt) return 0;
    const msLeft = proTrialEndsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  },
}));
