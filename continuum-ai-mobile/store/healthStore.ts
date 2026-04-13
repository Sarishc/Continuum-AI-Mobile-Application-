import { create } from 'zustand';
import type {
  HealthProfile,
  HealthEntry,
  Insight,
  Conversation,
  ChatMessage,
  EngineMode,
} from '../types';
import { MOCK_PROFILE, MOCK_TIMELINE, MOCK_INSIGHTS, MOCK_SCORE } from '../data/mockHealthData';

interface HealthState {
  // ── Health data ──────────────────────────────────────────────────────────
  healthProfile: HealthProfile | null;
  insights: Insight[];
  timeline: HealthEntry[];
  conversations: Conversation[];
  healthScore: number;

  // ── Chat state ───────────────────────────────────────────────────────────
  currentConversation: ChatMessage[];
  engineMode: EngineMode;
  isAITyping: boolean;
  pendingChatContext: string | null;

  // ── Health actions ───────────────────────────────────────────────────────
  setProfile: (profile: HealthProfile) => void;
  setInsights: (insights: Insight[]) => void;
  addInsight: (insight: Insight) => void;
  dismissInsight: (id: string) => void;
  markInsightRead: (id: string) => void;
  markAllInsightsRead: () => void;
  setTimeline: (entries: HealthEntry[]) => void;
  addEntry: (entry: HealthEntry) => void;
  deleteEntry: (id: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setHealthScore: (score: number) => void;

  // ── Chat actions ─────────────────────────────────────────────────────────
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setEngineMode: (mode: EngineMode) => void;
  setTyping: (typing: boolean) => void;
  clearConversation: () => void;
  loadConversation: (messages: ChatMessage[]) => void;
  archiveCurrentConversation: () => void;
  setPendingChatContext: (text: string | null) => void;

  // ── Global reset ─────────────────────────────────────────────────────────
  reset: () => void;

  loadDemoData: () => void;
}

const initialState = {
  healthProfile: null,
  insights: [],
  timeline: [],
  conversations: [],
  healthScore: 72,
  currentConversation: [],
  engineMode: 'ai' as EngineMode,
  isAITyping: false,
  pendingChatContext: null as string | null,
};

export const useHealthStore = create<HealthState>((set, get) => ({
  ...initialState,

  // ── Health ────────────────────────────────────────────────────────────────
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

  markInsightRead: (id) =>
    set((state) => ({
      insights: state.insights.map((i) =>
        i.id === id ? { ...i, is_read: true } : i
      ),
    })),

  markAllInsightsRead: () =>
    set((state) => ({
      insights: state.insights.map((i) => ({ ...i, is_read: true })),
    })),

  setTimeline: (entries) => set({ timeline: entries }),

  addEntry: (entry) =>
    set((state) => ({
      timeline: [entry, ...state.timeline].sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      ),
    })),

  deleteEntry: (id) =>
    set((state) => ({
      timeline: state.timeline.filter((e) => e.id !== id),
    })),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  setHealthScore: (healthScore) => set({ healthScore }),

  // ── Chat ──────────────────────────────────────────────────────────────────
  addMessage: (message) =>
    set((state) => {
      const msgs = [...state.currentConversation, message];
      // Hard cap at 50 messages; insert a system notice if hit
      if (msgs.length > 50) {
        const notice: ChatMessage = {
          id: `sys-limit-${Date.now()}`,
          role: 'system',
          content: 'Conversation limit reached. Start a new conversation to continue.',
          timestamp: new Date().toISOString(),
        };
        return { currentConversation: [...msgs.slice(-49), notice] };
      }
      return { currentConversation: msgs };
    }),

  updateMessage: (id, patch) =>
    set((state) => ({
      currentConversation: state.currentConversation.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    })),

  setEngineMode: (engineMode) => set({ engineMode }),

  setTyping: (isAITyping) => set({ isAITyping }),

  clearConversation: () => set({ currentConversation: [], isAITyping: false }),

  loadConversation: (messages) =>
    set({ currentConversation: messages, isAITyping: false }),

  setPendingChatContext: (text) => set({ pendingChatContext: text }),

  archiveCurrentConversation: () => {
    const { currentConversation } = get();
    if (currentConversation.length === 0) return;
    const firstUserMsg = currentConversation.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50)
      : 'Conversation';
    const archived: Conversation = {
      id: `conv-${Date.now()}`,
      userId: 'local',
      title,
      messages: currentConversation,
      createdAt: currentConversation[0]?.timestamp ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      conversations: [archived, ...state.conversations],
    }));
  },

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset: () => set(initialState),

  loadDemoData: () =>
    set({
      healthProfile: MOCK_PROFILE,
      timeline: MOCK_TIMELINE,
      insights: MOCK_INSIGHTS,
      healthScore: MOCK_SCORE,
    }),
}));
