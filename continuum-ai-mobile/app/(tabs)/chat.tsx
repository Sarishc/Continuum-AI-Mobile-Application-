import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { hapticImpact, hapticNotification } from '@/utils/haptics';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { askHealthQuestion } from '../../services/aiService';
import { saveConversation } from '../../services/firestoreService';
import { useHealth } from '../../hooks/useHealth';
import { useHealthKit } from '../../hooks/useHealthKit';
import { SpecialistDetailSheet } from '../../components/ui/SpecialistDetailSheet';
import { ConversationHistorySheet } from '../../components/ui/ConversationHistorySheet';
import { showToast } from '../../store/toastStore';

import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import type { ChatMessage, SpecialistRecommendation } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── SVG icons ────────────────────────────────────────────────────────────────

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12L12 5L19 12" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1C10.3 1 9 2.3 9 4V12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12V4C15 2.3 13.7 1 12 1Z"
        stroke={color} strokeWidth={1.8} />
      <Path d="M19 10V12C19 15.9 15.9 19 12 19C8.1 19 5 15.9 5 12V10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 19V23M8 23H16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function HealthBotIcon() {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60" fill="none">
      <Circle cx="30" cy="30" r="28" stroke={Colors.primary} strokeWidth={1.5} strokeOpacity={0.3} />
      <Circle cx="30" cy="30" r="20" fill={`${Colors.primary}14`} />
      <Path d="M20 30C20 24.5 24.5 20 30 20C35.5 20 40 24.5 40 30" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="25" cy="32" r="3" fill={Colors.primary} fillOpacity={0.8} />
      <Circle cx="35" cy="32" r="3" fill={Colors.primary} fillOpacity={0.8} />
      <Path d="M26 38C27.3 39.3 28.7 40 30 40C31.3 40 32.7 39.3 34 38" stroke={Colors.primary} strokeWidth={1.8} strokeLinecap="round" />
      {/* Wifi signal arcs above */}
      <Path d="M26 22C27.2 20.7 28.6 20 30 20C31.4 20 32.8 20.7 34 22" stroke={Colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.5} />
    </Svg>
  );
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (sv: typeof dot1, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 280, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 280, easing: Easing.in(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    };
    animate(dot1, 0);
    animate(dot2, 160);
    animate(dot3, 320);
    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={typingStyles.bubble}>
      <Animated.View style={[typingStyles.dot, s1]} />
      <Animated.View style={[typingStyles.dot, s2]} />
      <Animated.View style={[typingStyles.dot, s3]} />
    </View>
  );
}

const typingStyles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    marginLeft: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
});

// ─── Blinking cursor ─────────────────────────────────────────────────────────

function BlinkingCursor() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[bubbleStyles.cursor, style]}>|</Animated.Text>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  onSpecialistPress?: (s: SpecialistRecommendation) => void;
}

function MessageBubble({ message, onSpecialistPress }: MessageBubbleProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const chevronRot = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${withSpring(reasoningOpen ? 90 : 0, { damping: 18, stiffness: 300 })}deg` }],
  }));

  const isUser = message.role === 'user';
  const isStreaming = (message as any).isStreaming as boolean | undefined;
  const displayText: string = isStreaming
    ? ((message as any).displayedContent as string) ?? ''
    : message.content;

  if (isUser) {
    return (
      <Animated.View entering={FadeInRight.duration(220)} style={bubbleStyles.userRow}>
        <View style={bubbleStyles.userBubble}>
          <Text style={bubbleStyles.userText}>{message.content}</Text>
        </View>
      </Animated.View>
    );
  }

  const toggleReasoning = () => {
    setReasoningOpen((o) => !o);
    chevronRot.value = reasoningOpen ? 0 : 1;
  };

  // AI bubble
  return (
    <Animated.View entering={FadeInLeft.duration(220)} style={bubbleStyles.aiRow}>
      <View style={bubbleStyles.aiBubble}>
        {/* Message text + cursor */}
        <View style={bubbleStyles.textRow}>
          <Text style={bubbleStyles.aiText}>{displayText}</Text>
          {isStreaming && <BlinkingCursor />}
        </View>

        {/* Confidence pill — show after streaming completes */}
        {!isStreaming && message.confidenceScore !== undefined && (
          <Animated.View entering={FadeIn.delay(200).duration(300)} style={bubbleStyles.confRow}>
            <View style={bubbleStyles.confPill}>
              <Text style={bubbleStyles.confText}>
                {Math.round(message.confidenceScore * 100)}% confident
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Reasoning toggle */}
        {!isStreaming && !!message.reasoning && (
          <Animated.View entering={FadeIn.delay(400).duration(300)}>
            <TouchableOpacity
              onPress={toggleReasoning}
              style={bubbleStyles.reasoningToggle}
              activeOpacity={0.7}
            >
              <Text style={bubbleStyles.reasoningLabel}>Reasoning</Text>
              <Animated.View style={chevronStyle}>
                <ChevronRightIcon color={Colors.textTertiary} />
              </Animated.View>
            </TouchableOpacity>
            {reasoningOpen && (
              <View style={bubbleStyles.reasoningBody}>
                <Text style={bubbleStyles.reasoningText}>{message.reasoning}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Disclaimer */}
        {!isStreaming && (
          <Text style={bubbleStyles.disclaimer}>Not medical advice.</Text>
        )}

        {/* Specialist pill */}
        {!isStreaming && message.specialist && (
          <TouchableOpacity
            onPress={() => onSpecialistPress?.(message.specialist!)}
            style={bubbleStyles.specialistPill}
            activeOpacity={0.75}
          >
            <Text style={bubbleStyles.specialistText}>
              See {message.specialist.type} →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const bubbleStyles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#4C8DFF',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  userText: {
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    maxWidth: '88%',
    gap: 10,
  },
  confRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  confPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyRegular,
    color: 'rgba(255,255,255,0.45)',
  },
  aiText: {
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  reasoningLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
  },
  reasoningBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  reasoningText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: FontFamily.bodyRegular,
    color: 'rgba(255,255,255,0.20)',
    marginTop: -4,
  },
  specialistPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specialistText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  cursor: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 1,
  },
});

// ─── Engine Selector (iOS segmented control aesthetic) ───────────────────────

interface EngineSelectorProps {
  mode: 'rule' | 'ai';
  onChange: (mode: 'rule' | 'ai') => void;
}

function EngineSelector({ mode, onChange }: EngineSelectorProps) {
  const translateX = useSharedValue(mode === 'rule' ? 0 : 1);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(translateX.value * ((SCREEN_W > 430 ? 390 : SCREEN_W) / 2 - 8), { damping: 20, stiffness: 400 }) }],
  }));

  const handleChange = (m: 'rule' | 'ai') => {
    translateX.value = m === 'rule' ? 0 : 1;
    onChange(m);
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={segStyles.container}>
      {/* Sliding active pill */}
      <Animated.View style={[segStyles.pill, pillStyle]} />
      {/* Buttons */}
      <TouchableOpacity style={segStyles.option} onPress={() => handleChange('rule')} activeOpacity={1}>
        <Text style={[segStyles.optionText, mode === 'rule' ? segStyles.activeText : segStyles.inactiveText]}>
          Rule Engine
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={segStyles.option} onPress={() => handleChange('ai')} activeOpacity={1}>
        <Text style={[segStyles.optionText, mode === 'ai' ? segStyles.activeText : segStyles.inactiveText]}>
          AI Mode
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: '50%',
    bottom: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  option: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  activeText: {
    color: '#000000',
  },
  inactiveText: {
    color: Colors.textSecondary,
  },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What does my HbA1c mean?",
  "How's my blood pressure?",
  "Should I be concerned about anything?",
  "What medications am I on?",
  "How has my health improved recently?",
  "Explain my lab results",
];

interface EmptyStateProps {
  onSuggestion: (s: string) => void;
}

function EmptyState({ onSuggestion }: EmptyStateProps) {
  const row1 = SUGGESTIONS.slice(0, 3);
  const row2 = SUGGESTIONS.slice(3);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={emptyStyles.container}>
      <HealthBotIcon />
      <Text style={emptyStyles.title}>Ask me anything</Text>
      <Text style={emptyStyles.sub}>{"About your labs, symptoms, medications,\nor anything health-related."}</Text>
      {/* Chip rows */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={emptyStyles.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {row1.map((s) => (
          <TouchableOpacity key={s} onPress={() => onSuggestion(s)} style={emptyStyles.chip} activeOpacity={0.75}>
            <Text style={emptyStyles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={emptyStyles.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {row2.map((s) => (
          <TouchableOpacity key={s} onPress={() => onSuggestion(s)} style={emptyStyles.chip} activeOpacity={0.75}>
            <Text style={emptyStyles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  sub: {
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  chipRow: {
    flexGrow: 0,
    marginTop: 4,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
});

// ─── Chat Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { healthProfile, timeline } = useHealth();
  const { isPro, incrementAIMessages, canUseAI } = useSubscriptionStore();
  const { latestVitals } = useHealthKit();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [engineMode, setEngineMode] = useState<'rule' | 'ai'>('ai');
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistRecommendation | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatMessage | 'typing'>>(null);
  const inputRef = useRef<TextInput>(null);

  const tabBarH = 49 + Math.max(insets.bottom, 0);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(scrollToBottom, 120);
    }
  }, [messages.length, isTyping]);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage & { isStreaming?: boolean; displayedContent?: string }>) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const streamText = useCallback(async (msgId: string, fullText: string) => {
    const CHAR_DELAY = 15;
    let current = '';
    for (let i = 0; i < fullText.length; i++) {
      current += fullText[i];
      updateMessage(msgId, { displayedContent: current } as any);
      await new Promise((r) => setTimeout(r, CHAR_DELAY));
    }
    updateMessage(msgId, { isStreaming: false, displayedContent: fullText } as any);
  }, [updateMessage]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setInputText('');
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);

    const userMsg = addMessage({ role: 'user', content: trimmed });
    setIsTyping(true);

    // Build last 10 messages for context (excluding the one we just added)
    const contextMessages = [...messages, userMsg].slice(-10);

    try {
      const aiResponse = await askHealthQuestion(
        trimmed,
        { ...(healthProfile ?? {}), latestVitals: latestVitals ?? undefined },
        timeline ?? [],
        engineMode,
        contextMessages
      );

      setIsTyping(false);

      const aiMsg: ChatMessage & { isStreaming?: boolean; displayedContent?: string } = {
        id: `msg-${Date.now()}-ai`,
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: aiResponse.answer,
        confidence: aiResponse.confidence,
        confidenceScore: aiResponse.confidenceScore,
        reasoning: aiResponse.reasoning,
        disclaimer: aiResponse.disclaimer,
        specialist: aiResponse.specialist ?? undefined,
        isStreaming: true,
        displayedContent: '',
      } as any;

      setMessages((prev) => {
        const updated = [...prev, aiMsg];
        // Auto-save conversation to Firestore (best-effort)
        saveConversation(currentConversationId, updated)
          .then((id) => {
            if (!currentConversationId) setCurrentConversationId(id);
          })
          .catch(() => {});
        return updated;
      });
      hapticNotification(Haptics.NotificationFeedbackType.Success);
      incrementAIMessages();

      await streamText(aiMsg.id, aiResponse.answer);
    } catch {
      setIsTyping(false);
      showToast('AI unavailable. Using offline mode.', 'info');
      addMessage({
        role: 'assistant',
        content: "I'm having trouble reaching the AI right now. Please try again or switch to Rule Engine mode for instant answers.",
        confidence: 'low',
        confidenceScore: 0,
      });
    }
  }, [isTyping, engineMode, healthProfile, timeline, messages, currentConversationId, addMessage, incrementAIMessages, streamText]);

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  const handleSuggestion = useCallback((s: string) => {
    sendMessage(s);
  }, [sendMessage]);

  const allItems = useMemo(() => {
    const items: (ChatMessage | 'typing')[] = [...messages];
    if (isTyping) items.push('typing');
    return items;
  }, [messages, isTyping]);

  const renderItem = useCallback(({ item }: { item: ChatMessage | 'typing' }) => {
    if (item === 'typing') {
      return (
        <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 8 }}>
          <TypingIndicator />
        </Animated.View>
      );
    }
    return (
      <MessageBubble
        message={item}
        onSpecialistPress={(s) => setSelectedSpecialist(s)}
      />
    );
  }, []);

  const hasText = inputText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.headerRight}>
          <View style={[styles.modeDot, { backgroundColor: engineMode === 'ai' ? Colors.primary : Colors.vital }]} />
          <TouchableOpacity onPress={() => setHistoryVisible(true)} style={styles.historyBtn}>
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Engine selector ─────────────────────────────────────────────── */}
      <View style={styles.engineWrap}>
        <EngineSelector mode={engineMode} onChange={setEngineMode} />
      </View>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      {allItems.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState onSuggestion={handleSuggestion} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={allItems}
          keyExtractor={(item, i) => (item === 'typing' ? 'typing' : item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarH + 80 }]}
          showsVerticalScrollIndicator={false}
          onLayout={scrollToBottom}
        />
      )}

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* + attach button */}
        <TouchableOpacity style={styles.attachBtn} activeOpacity={0.75}>
          <PlusIcon color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Input field */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={2000}
          selectionColor="#4C8DFF"
          keyboardAppearance="dark"
        />

        {/* Send / Mic button */}
        {hasText ? (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: Colors.primary }]}
            onPress={handleSend}
            activeOpacity={0.82}
          >
            <ArrowUpIcon color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micBtn} activeOpacity={0.75}>
            <MicIcon color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {selectedSpecialist && (
        <SpecialistDetailSheet
          specialist={selectedSpecialist}
          visible
          onClose={() => setSelectedSpecialist(null)}
        />
      )}
      <ConversationHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  historyText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  engineWrap: {
    marginBottom: 8,
  },
  listContent: {
    paddingTop: 12,
    gap: 0,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  attachBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    minHeight: 38,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  micBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
