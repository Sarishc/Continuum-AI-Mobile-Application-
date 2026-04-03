import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { format } from 'date-fns';
import { useHealthStore } from '../../store/healthStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import type { Conversation, ChatMessage } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

// ─── Icons ────────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={Colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

interface ConvRowProps {
  conversation: Conversation;
  onPress: () => void;
}

function ConvRow({ conversation, onPress }: ConvRowProps) {
  const msgCount = conversation.messages.length;
  const preview =
    conversation.messages.find((m) => m.role === 'user')?.content?.slice(0, 50) ??
    'No messages';
  const dateLabel = format(new Date(conversation.createdAt), 'MMM d, yyyy');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.row}>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowPreview} numberOfLines={1}>
            {preview}
            {preview.length >= 50 ? '…' : ''}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{msgCount}</Text>
          </View>
        </View>
        <Text style={styles.rowDate}>{dateLabel}</Text>
      </View>
      <ChevronRightIcon />
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ConversationHistorySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ConversationHistorySheet({
  visible,
  onClose,
}: ConversationHistorySheetProps) {
  const { conversations, loadConversation, clearConversation, addMessage } =
    useHealthStore();

  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration: 280,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible]);

  const handleClose = () => {
    translateY.value = withTiming(
      SHEET_HEIGHT,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      () => runOnJS(onClose)()
    );
  };

  const handleSelectConversation = (conv: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadConversation(conv.messages);
    handleClose();
  };

  const handleNewConversation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearConversation();
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: 'New conversation started.',
      timestamp: new Date().toISOString(),
    };
    addMessage(sysMsg);
    handleClose();
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No past conversations</Text>
      <Text style={styles.emptySub}>
        Your conversations will appear here after you start chatting.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Past Conversations</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CloseIcon />
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConvRow
              conversation={item}
              onPress={() => handleSelectConversation(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />

        {/* New conversation button */}
        <TouchableOpacity
          onPress={handleNewConversation}
          activeOpacity={0.8}
          style={styles.newConvBtn}
        >
          <PlusIcon />
          <Text style={styles.newConvLabel}>New Conversation</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
    paddingBottom: Spacing[6],
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceElevated },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  rowPreview: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  rowDate: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 0 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    paddingTop: Spacing[10],
    gap: Spacing[2],
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  newConvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    height: 50,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newConvLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },
});
