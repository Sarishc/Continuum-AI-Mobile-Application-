import { create } from 'zustand';
import type { HealthProfile, HealthEntry, Insight, Conversation } from '../types';

interface HealthState {
  healthProfile: HealthProfile | null;
  insights: Insight[];
  timeline: HealthEntry[];
  conversations: Conversation[];
  healthScore: number;

  setProfile: (profile: HealthProfile) => void;
  setInsights: (insights: Insight[]) => void;
  addInsight: (insight: Insight) => void;
  dismissInsight: (id: string) => void;
  setTimeline: (entries: HealthEntry[]) => void;
  addEntry: (entry: HealthEntry) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setHealthScore: (score: number) => void;
  reset: () => void;
}

const initialState = {
  healthProfile: null,
  insights: [],
  timeline: [],
  conversations: [],
  healthScore: 0,
};

export const useHealthStore = create<HealthState>((set) => ({
  ...initialState,

  setProfile: (profile) => set({ healthProfile: profile }),

  setInsights: (insights) => set({ insights }),

  addInsight: (insight) =>
    set((state) => ({ insights: [insight, ...state.insights] })),

  dismissInsight: (id) =>
    set((state) => ({
      insights: state.insights.map((i) =>
        i.id === id ? { ...i, dismissed: true } : i
      ),
    })),

  setTimeline: (entries) => set({ timeline: entries }),

  addEntry: (entry) =>
    set((state) => ({
      timeline: [entry, ...state.timeline].sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      ),
    })),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  setHealthScore: (healthScore) => set({ healthScore }),

  reset: () => set(initialState),
}));
