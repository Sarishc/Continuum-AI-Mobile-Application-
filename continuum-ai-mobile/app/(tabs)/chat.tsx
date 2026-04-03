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
  LayoutAnimation,
  UIManager,
  ActionSheetIOS,
  Alert,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { format } from 'date-fns';

import { useHealthStore } from '../../store/healthStore';
import { healthAskApi, mockAIResponse, mockRuleResponse } from '../../api/chat';
import { ConversationHistorySheet } from '../../components/ui/ConversationHistorySheet';
import { SpecialistDetailSheet } from '../../components/ui/SpecialistDetailSheet';

import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import type { ChatMessage, SpecialistRecommendation, EngineMode } from '../../types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.78;


// ─── SVG Icons ────────────────────────────────────────────────────────────────

function PaperclipIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke={Colors.textSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MicIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"
        stroke={Colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"
        stroke={Colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowUpIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HistoryIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v4l3 3" stroke={Colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.05 11a9 9 0 1 0 .5-3M3 4v4h4" stroke={Colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
    >
      <Path d="M6 9l6 6 6-6" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DocumentIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke={Colors.textMuted} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M14 2v6h6" stroke={Colors.textMuted} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function StethoscopeIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .2.3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="20" cy="10" r="2" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}


// ─── Engine Toggle ────────────────────────────────────────────────────────────

interface EngineToggleProps {
  mode: EngineMode;
  onChange: (mode: EngineMode) => void;
}

function EngineToggle({ mode, onChange }: EngineToggleProps) {
  const slideX = useSharedValue(mode === 'rule' ? 0 : 1);

  useEffect(() => {
    slideX.value = withSpring(mode === 'rule' ? 0 : 1, {
      damping: 18,
      stiffness: 260,
    });
  }, [mode]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(slideX.value, [0, 1], [0, 88]),
      },
    ],
    backgroundColor: mode === 'rule' ? Colors.warning : Colors.primary,
  }));

  const handlePress = (next: EngineMode) => {
    if (next === mode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  return (
    <View style={toggleStyles.container}>
      {/* Sliding background pill */}
      <Animated.View style={[toggleStyles.indicator, indicatorStyle]} />

      <TouchableOpacity
        onPress={() => handlePress('rule')}
        activeOpacity={0.8}
        style={toggleStyles.option}
      >
        <Text style={[toggleStyles.optionText, mode === 'rule' && toggleStyles.activeText]}>
          Rule Engine
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('ai')}
        activeOpacity={0.8}
        style={toggleStyles.option}
      >
        <Text style={[toggleStyles.optionText, mode === 'ai' && toggleStyles.activeText]}>
          AI Mode
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    padding: 4,
    position: 'relative',
    width: 192,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 88,
    height: 28,
    borderRadius: BorderRadius.full,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  option: {
    width: 88,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  activeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bodySemiBold,
  },
});


// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.5, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,   { duration: 350, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[typingStyles.dot, style]} />;
}

function TypingIndicator() {
  return (
    <Animated.View entering={FadeInLeft.duration(250)} style={typingStyles.bubble}>
      <TypingDot delay={0} />
      <TypingDot delay={200} />
      <TypingDot delay={400} />
    </Animated.View>
  );
}

const typingStyles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginLeft: Spacing[4],
    marginBottom: Spacing[2],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.textMuted,
  },
});

// ─── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const config = {
    high:   { label: 'High',   color: Colors.accent,   bg: 'rgba(63,185,80,0.12)' },
    medium: { label: 'Medium', color: Colors.warning,  bg: 'rgba(210,153,34,0.12)' },
    low:    { label: 'Low',    color: Colors.critical, bg: 'rgba(248,81,73,0.12)' },
  }[level];

  return (
    <View style={[confStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[confStyles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const confStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
  },
});

// ─── Specialist inline card ───────────────────────────────────────────────────

interface SpecialistInlineCardProps {
  specialist: SpecialistRecommendation;
  onPress: () => void;
}

function SpecialistInlineCard({ specialist, onPress }: SpecialistInlineCardProps) {
  const urgencyColor = specialist.urgency === 'routine' ? Colors.primary
    : specialist.urgency === 'soon' ? Colors.warning
    : Colors.critical;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78} style={specStyles.card}>
      <View style={[specStyles.iconCircle, { backgroundColor: `${urgencyColor}18` }]}>
        <StethoscopeIcon color={urgencyColor} />
      </View>
      <View style={specStyles.textCol}>
        <Text style={specStyles.seeLabel}>See {specialist.type}</Text>
        <View style={[specStyles.urgencyPill, { backgroundColor: `${urgencyColor}18` }]}>
          <Text style={[specStyles.urgencyText, { color: urgencyColor }]}>
            {specialist.urgency.charAt(0).toUpperCase() + specialist.urgency.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={specStyles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const specStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginTop: Spacing[2],
  },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, gap: 3 },
  seeLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  urgencyPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: BorderRadius.full },
  urgencyText: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium },
  arrow: { fontSize: FontSize.md, color: Colors.textMuted },
});


// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  onSpecialistPress: (s: SpecialistRecommendation) => void;
  onReasoningToggle: (id: string) => void;
}

function MessageBubble({ message, onSpecialistPress, onReasoningToggle }: MessageBubbleProps) {
  const { role, content, confidence, reasoning, disclaimer, specialist,
          attachment, reasoningExpanded, timestamp } = message;

  // ── System message ─────────────────────────────────────────────────────────
  if (role === 'system') {
    return (
      <Animated.View entering={FadeInUp.duration(300)} style={msgStyles.systemRow}>
        <Text style={msgStyles.systemText}>{content}</Text>
      </Animated.View>
    );
  }

  // ── User message ───────────────────────────────────────────────────────────
  if (role === 'user') {
    return (
      <Animated.View entering={FadeInRight.duration(280)} style={msgStyles.userRow}>
        {attachment && (
          <View style={msgStyles.attachPill}>
            <DocumentIcon />
            <Text style={msgStyles.attachName} numberOfLines={1}>
              {attachment.name.length > 22 ? attachment.name.slice(0, 22) + '…' : attachment.name}
            </Text>
          </View>
        )}
        <View style={msgStyles.userBubble}>
          <Text style={msgStyles.userText}>{content}</Text>
          <Text style={msgStyles.userTime}>
            {format(new Date(timestamp), 'h:mm a')}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // ── AI message ─────────────────────────────────────────────────────────────
  const handleReasoningToggle = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    onReasoningToggle(message.id);
  };

  return (
    <Animated.View entering={FadeInLeft.duration(280)} style={msgStyles.aiRow}>
      <View style={msgStyles.aiBubble}>
        {/* Main answer */}
        <Text style={msgStyles.aiText}>{content}</Text>

        {/* Confidence */}
        {confidence && (
          <View style={msgStyles.confRow}>
            <Text style={msgStyles.confLabel}>Confidence:</Text>
            <ConfidenceBadge level={confidence} />
          </View>
        )}

        {/* Reasoning accordion */}
        {reasoning && (
          <View style={msgStyles.reasoningSection}>
            <TouchableOpacity
              onPress={handleReasoningToggle}
              activeOpacity={0.7}
              style={msgStyles.reasoningToggle}
            >
              <Text style={msgStyles.reasoningToggleText}>
                {reasoningExpanded ? 'Hide reasoning' : 'View reasoning'} →
              </Text>
              <ChevronDownIcon expanded={!!reasoningExpanded} />
            </TouchableOpacity>
            {reasoningExpanded && (
              <View style={msgStyles.reasoningBody}>
                <Text style={msgStyles.reasoningText}>{reasoning}</Text>
              </View>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <Text style={msgStyles.disclaimer}>
          {disclaimer ?? 'This is not medical advice. Always consult a healthcare professional.'}
        </Text>

        {/* Specialist card */}
        {specialist && (
          <SpecialistInlineCard
            specialist={specialist}
            onPress={() => onSpecialistPress(specialist)}
          />
        )}
      </View>
    </Animated.View>
  );
}

const msgStyles = StyleSheet.create({
  // System
  systemRow: { alignItems: 'center', paddingVertical: Spacing[3] },
  systemText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  // User
  userRow: { alignItems: 'flex-end', paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  attachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachName: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: Spacing[3],
    maxWidth: MAX_BUBBLE_WIDTH,
    gap: 4,
  },
  userText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  userTime: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
  },
  // AI
  aiRow: { paddingHorizontal: Spacing[4], marginBottom: Spacing[3], alignItems: 'flex-start' },
  aiBubble: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: Spacing[4],
    maxWidth: MAX_BUBBLE_WIDTH,
    gap: Spacing[3],
  },
  aiText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  confLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  reasoningSection: { gap: 6 },
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reasoningToggleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  reasoningBody: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: 2,
    marginTop: 2,
  },
  reasoningText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});


// ─── Empty State ──────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  'Is my blood pressure normal?',
  'What does my HbA1c mean?',
  'Should I be worried about my symptoms?',
  'What specialist should I see?',
  'Review my medications',
  'Am I at risk for diabetes?',
];

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void;
}

function EmptyState({ onPromptSelect }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={emptyStyles.root}>
      {/* Logo mark */}
      <LinearGradient
        colors={Colors.gradientBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={emptyStyles.logo}
      >
        <Text style={emptyStyles.logoLetter}>C</Text>
      </LinearGradient>

      <Text style={emptyStyles.headline}>Ask anything about your health</Text>
      <Text style={emptyStyles.sub}>I have context from your health profile</Text>

      {/* Quick prompt chips */}
      <View style={emptyStyles.chips}>
        {QUICK_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPromptSelect(prompt);
            }}
            activeOpacity={0.75}
            style={emptyStyles.chip}
          >
            <Text style={emptyStyles.chipText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[5],
    paddingBottom: 80,
    gap: Spacing[4],
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 18 },
      android: { elevation: 6 },
    }),
  },
  logoLetter: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: '#FFFFFF',
    lineHeight: 34,
  },
  headline: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -Spacing[2],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
});

// ─── Input Bar ────────────────────────────────────────────────────────────────

interface InputBarProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  disabled?: boolean;
  inputRef: React.RefObject<TextInput | null>;
}

function InputBar({ value, onChange, onSend, onAttach, disabled, inputRef }: InputBarProps) {
  const hasText = value.trim().length > 0;
  const sendScale = useSharedValue(0);

  useEffect(() => {
    sendScale.value = withSpring(hasText ? 1 : 0, { damping: 14, stiffness: 280 });
  }, [hasText]);

  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
    opacity: sendScale.value,
  }));
  const micBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(sendScale.value, [0, 1], [1, 0]) }],
    opacity: interpolate(sendScale.value, [0, 1], [1, 0]),
  }));

  return (
    <View style={inputStyles.bar}>
      {/* Attach */}
      <TouchableOpacity
        onPress={onAttach}
        style={inputStyles.iconBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        disabled={disabled}
      >
        <PaperclipIcon />
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder="Ask about your health..."
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={4}
        style={inputStyles.input}
        selectionColor={Colors.primary}
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
      />

      {/* Send / Mic */}
      <View style={inputStyles.sendContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, inputStyles.sendBtn, sendBtnStyle]}>
          <TouchableOpacity
            onPress={() => {
              if (!hasText || disabled) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSend();
            }}
            style={inputStyles.sendBtnInner}
            activeOpacity={0.85}
          >
            <ArrowUpIcon />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, inputStyles.micBtn, micBtnStyle]}>
          <MicIcon />
        </Animated.View>
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendContainer: {
    width: 36,
    height: 36,
    marginBottom: 2,
  },
  sendBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  sendBtnInner: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});


// ─── Chat Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentConversation,
    engineMode,
    isAITyping,
    addMessage,
    updateMessage,
    setEngineMode,
    setTyping,
    archiveCurrentConversation,
  } = useHealthStore();

  const [inputText, setInputText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<{
    name: string; type: string; uri: string;
  } | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [specialistSheet, setSpecialistSheet] = useState<SpecialistRecommendation | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (currentConversation.length > 0) {
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
    }
  }, [currentConversation.length]);

  // ── Engine mode switch ───────────────────────────────────────────────────
  const handleModeSwitch = useCallback(
    (next: EngineMode) => {
      if (next === engineMode) return;
      setEngineMode(next);
      const sysMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `Switched to ${next === 'ai' ? 'AI Mode' : 'Rule Engine'}.`,
        timestamp: new Date().toISOString(),
      };
      addMessage(sysMsg);
    },
    [engineMode, setEngineMode, addMessage]
  );

  // ── Attach handler ───────────────────────────────────────────────────────
  const handleAttach = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Upload Document', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (idx) => {
          if (idx === 1) await pickDocument();
          if (idx === 2) await pickImage('camera');
          if (idx === 3) await pickImage('library');
        }
      );
    } else {
      Alert.alert('Attach', 'Choose source', [
        { text: 'Document', onPress: pickDocument },
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Library', onPress: () => pickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, []);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const f = result.assets[0];
        setPendingAttachment({ name: f.name ?? 'document', type: f.mimeType ?? 'application/pdf', uri: f.uri });
      }
    } catch {}
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      const fn = source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;
      const result = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        const name = a.fileName ?? `photo_${Date.now()}.jpg`;
        setPendingAttachment({ name, type: 'image/jpeg', uri: a.uri });
      }
    } catch {}
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    // Build user message
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachment: pendingAttachment ?? undefined,
    };
    addMessage(userMsg);
    setInputText('');
    setPendingAttachment(null);

    // Show typing
    setTyping(true);

    // Determine delay: AI = 1200–1800ms random, Rule = 0
    const delay = engineMode === 'ai'
      ? 1200 + Math.random() * 600
      : 0;

    // Min typing display
    const minTyping = 800;
    const startTime = Date.now();

    try {
      // Try real API
      const { data } = await healthAskApi.ask({ question: text, mode: engineMode });
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minTyping - elapsed);
      await new Promise((r) => setTimeout(r, remaining + delay));

      setTyping(false);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        confidence: data.confidence,
        confidenceScore: data.confidence_score,
        reasoning: data.reasoning,
        disclaimer: data.disclaimer,
        specialist: data.specialist_recommendation
          ? {
              type: data.specialist_recommendation.specialist_type,
              reason: data.specialist_recommendation.reason,
              urgency: data.specialist_recommendation.urgency,
            }
          : undefined,
        reasoningExpanded: false,
      };
      addMessage(aiMsg);
    } catch {
      // Fallback to mock
      const mockFn = engineMode === 'rule' ? mockRuleResponse : mockAIResponse;
      const mock = mockFn(text);
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minTyping - elapsed);
      await new Promise((r) => setTimeout(r, remaining + delay));

      setTyping(false);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: mock.answer,
        timestamp: new Date().toISOString(),
        confidence: mock.confidence,
        confidenceScore: mock.confidence_score,
        reasoning: mock.reasoning,
        disclaimer: mock.disclaimer,
        specialist: mock.specialist_recommendation
          ? {
              type: mock.specialist_recommendation.specialist_type,
              reason: mock.specialist_recommendation.reason,
              urgency: mock.specialist_recommendation.urgency,
            }
          : undefined,
        reasoningExpanded: false,
      };
      addMessage(aiMsg);
    }
  }, [inputText, pendingAttachment, engineMode, addMessage, setTyping]);

  // ── Quick prompt ─────────────────────────────────────────────────────────
  const handleQuickPrompt = useCallback((prompt: string) => {
    setInputText(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
    // Auto-submit after a brief moment so it feels natural
    setTimeout(async () => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setInputText('');
      setTyping(true);

      const delay = engineMode === 'ai' ? 1200 + Math.random() * 600 : 0;
      await new Promise((r) => setTimeout(r, 800 + delay));

      const mockFn = engineMode === 'rule' ? mockRuleResponse : mockAIResponse;
      const mock = mockFn(prompt);
      setTyping(false);
      addMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: mock.answer,
        timestamp: new Date().toISOString(),
        confidence: mock.confidence,
        confidenceScore: mock.confidence_score,
        reasoning: mock.reasoning,
        disclaimer: mock.disclaimer,
        specialist: mock.specialist_recommendation
          ? { type: mock.specialist_recommendation.specialist_type, reason: mock.specialist_recommendation.reason, urgency: mock.specialist_recommendation.urgency }
          : undefined,
        reasoningExpanded: false,
      });
    }, 120);
  }, [engineMode, addMessage, setTyping]);

  // ── Reasoning toggle ─────────────────────────────────────────────────────
  const handleReasoningToggle = useCallback(
    (id: string) => {
      const msg = currentConversation.find((m) => m.id === id);
      if (!msg) return;
      updateMessage(id, { reasoningExpanded: !msg.reasoningExpanded });
    },
    [currentConversation, updateMessage]
  );

  // ── Render ───────────────────────────────────────────────────────────────
  const modeColor = engineMode === 'ai' ? Colors.primary : Colors.warning;
  const isEmpty = currentConversation.length === 0 && !isAITyping;

  // Inverted list data: newest first so FlatList inverted shows newest at bottom
  const listData = useMemo(
    () => [...currentConversation].reverse(),
    [currentConversation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        onSpecialistPress={(s) => setSpecialistSheet(s)}
        onReasoningToggle={handleReasoningToggle}
      />
    ),
    [handleReasoningToggle]
  );

  return (
    <View style={[screenStyles.root, { paddingTop: insets.top }]}>
      {/* ── A. Header ──────────────────────────────────────────────────── */}
      <View style={screenStyles.header}>
        <Text style={screenStyles.headerTitle}>AI Assistant</Text>

        <EngineToggle mode={engineMode} onChange={handleModeSwitch} />

        <TouchableOpacity
          onPress={() => setHistoryVisible(true)}
          style={screenStyles.historyBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <HistoryIcon />
        </TouchableOpacity>
      </View>

      {/* Mode indicator dot */}
      <View style={screenStyles.modeDotRow}>
        <View style={[screenStyles.modeDot, { backgroundColor: modeColor }]} />
        <Text style={[screenStyles.modeDotLabel, { color: modeColor }]}>
          {engineMode === 'ai' ? 'AI Mode active' : 'Rule Engine active'}
        </Text>
      </View>

      {/* ── B+C. Message list / Empty state ───────────────────────────── */}
      <KeyboardAvoidingView
        style={screenStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <EmptyState onPromptSelect={handleQuickPrompt} />
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={screenStyles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              isAITyping ? <TypingIndicator /> : null
            }
          />
        )}

        {/* Pending attachment preview */}
        {pendingAttachment && (
          <View style={screenStyles.pendingAttach}>
            <DocumentIcon />
            <Text style={screenStyles.pendingAttachName} numberOfLines={1}>
              {pendingAttachment.name}
            </Text>
            <TouchableOpacity onPress={() => setPendingAttachment(null)}>
              <Text style={screenStyles.pendingRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── E. Input bar ──────────────────────────────────────────────── */}
        <View style={{ paddingBottom: insets.bottom }}>
          <InputBar
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            onAttach={handleAttach}
            disabled={isAITyping}
            inputRef={inputRef}
          />
        </View>
      </KeyboardAvoidingView>

      {/* ── Sheets ────────────────────────────────────────────────────── */}
      <ConversationHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
      <SpecialistDetailSheet
        visible={specialistSheet !== null}
        specialist={specialistSheet}
        onClose={() => setSpecialistSheet(null)}
      />
    </View>
  );
}

const screenStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
    flex: 1,
  },
  historyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0,
  },
  modeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[4],
    paddingVertical: 6,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeDotLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
  },
  listContent: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
    flexGrow: 1,
  },
  pendingAttach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing[4],
    marginBottom: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pendingAttachName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  pendingRemove: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontFamily: FontFamily.bodyMedium,
  },
});
