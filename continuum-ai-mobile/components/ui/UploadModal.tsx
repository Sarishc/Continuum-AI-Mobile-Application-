import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import { healthApi } from '../../api/health';
import { showToast } from '../../store/toastStore';
import { useHealthStore } from '../../store/healthStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.62;

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function DocumentIcon({ color = Colors.primary }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 2V8H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 13H8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 17H8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M10 9H8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SymptomIcon({ color = Colors.warning }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NoteIcon({ color = Colors.accent }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.50001C18.8978 2.10218 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10218 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56261 21.8978 5.10218 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={Colors.accent} strokeWidth={1.8} />
      <Path d="M8 12L11 15L16 9" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────

interface ToastProps { message: string; visible: boolean }

function Toast({ message, visible }: ToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 15 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-20, { duration: 200 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.toast, style]} pointerEvents="none">
      <View style={styles.toastDot} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Option row ───────────────────────────────────────────────────────────────

interface OptionRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}

function OptionRow({ icon, iconBg, title, subtitle, onPress, disabled }: OptionRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
      style={[styles.optionRow, disabled && { opacity: 0.45 }]}
    >
      <View style={[styles.optionIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRightIcon />
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type UploadMode = 'menu' | 'note' | 'success';

export interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToChat?: () => void;
}

export function UploadModal({ visible, onClose, onNavigateToChat }: UploadModalProps) {
  const queryClient = useQueryClient();
  const { addEntry } = useHealthStore();

  const [mode, setMode] = useState<UploadMode>('menu');
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sheet slide animation
  const translateY = useSharedValue(MODAL_HEIGHT);

  useEffect(() => {
    if (visible) {
      setMode('menu');
      setNoteText('');
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withTiming(MODAL_HEIGHT, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = useCallback(() => {
    translateY.value = withTiming(
      MODAL_HEIGHT,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      () => runOnJS(onClose)()
    );
  }, [onClose]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['health', 'timeline'] });
    queryClient.invalidateQueries({ queryKey: ['insights'] });
    setMode('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      handleClose();
      showToast('Data added — analysing…', 'info');
    }, 1500);
  };

  // ── Upload document ────────────────────────────────────────────────────────
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      setIsSubmitting(true);
      const file = result.assets[0];
      try {
        await healthApi.createEntry({
          type: 'lab_result',
          title: file.name ?? 'Uploaded Document',
          tags: ['upload', 'document'],
          attachments: [],
          recordedAt: new Date().toISOString(),
        });
      } catch {
        // Offline fallback
        addEntry({
          id: `local-${Date.now()}`,
          userId: 'local',
          type: 'lab_result',
          title: file.name ?? 'Uploaded Document',
          tags: ['upload', 'document'],
          attachments: [],
          recordedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      handleSuccess();
    } catch {
      // User cancelled or permission denied
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Chat with pre-fill ─────────────────────────────────────────────────────
  const handleDescribeSymptom = () => {
    handleClose();
    setTimeout(() => onNavigateToChat?.(), 320);
  };

  // ── Submit note ────────────────────────────────────────────────────────────
  const handleSubmitNote = async () => {
    if (!noteText.trim()) return;
    setIsSubmitting(true);
    try {
      await healthApi.createEntry({
        type: 'note',
        title: noteText.trim().slice(0, 60),
        description: noteText.trim(),
        tags: ['note'],
        attachments: [],
        recordedAt: new Date().toISOString(),
      });
    } catch {
      addEntry({
        id: `local-${Date.now()}`,
        userId: 'local',
        type: 'note',
        title: noteText.trim().slice(0, 60),
        description: noteText.trim(),
        tags: ['note'],
        attachments: [],
        recordedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
    handleSuccess();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavContainer}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, sheetStyle]}>
            {/* Drag handle */}
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            {/* ── Success state ────────────────────────────────────────── */}
            {mode === 'success' && (
              <View style={styles.successContainer}>
                <CheckCircleIcon />
                <Text style={styles.successTitle}>Data Added</Text>
                <Text style={styles.successSub}>
                  Continuum AI is analysing your new data for insights.
                </Text>
              </View>
            )}

            {/* ── Menu state ───────────────────────────────────────────── */}
            {mode === 'menu' && (
              <ScrollView
                contentContainerStyle={styles.menuContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetTitle}>Add Health Data</Text>
                <Text style={styles.sheetSubtitle}>
                  What would you like to add?
                </Text>

                <View style={styles.optionsList}>
                  <OptionRow
                    icon={<DocumentIcon />}
                    iconBg="rgba(56, 139, 253, 0.15)"
                    title="Upload Document"
                    subtitle="PDF, image, or lab report"
                    onPress={handlePickDocument}
                    disabled={isSubmitting}
                  />
                  <OptionRow
                    icon={<SymptomIcon />}
                    iconBg="rgba(210, 153, 34, 0.15)"
                    title="Describe Symptoms"
                    subtitle="Tell us how you're feeling"
                    onPress={handleDescribeSymptom}
                  />
                  <OptionRow
                    icon={<NoteIcon />}
                    iconBg="rgba(63, 185, 80, 0.15)"
                    title="Add a Note"
                    subtitle="Record observations or medications"
                    onPress={() => setMode('note')}
                  />
                </View>
              </ScrollView>
            )}

            {/* ── Note entry state ─────────────────────────────────────── */}
            {mode === 'note' && (
              <View style={styles.noteContainer}>
                <TouchableOpacity
                  onPress={() => setMode('menu')}
                  style={styles.backRow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backLink}>← Back</Text>
                </TouchableOpacity>

                <Text style={styles.sheetTitle}>Add a Note</Text>
                <Text style={styles.sheetSubtitle}>
                  Record observations, medication changes, or anything health-related.
                </Text>

                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="e.g. Felt shortness of breath after climbing stairs. Started Metformin 500mg today."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={5}
                  style={styles.noteInput}
                  selectionColor={Colors.primary}
                  autoFocus
                />

                <TouchableOpacity
                  onPress={handleSubmitNote}
                  disabled={!noteText.trim() || isSubmitting}
                  activeOpacity={0.85}
                  style={[
                    styles.submitBtn,
                    (!noteText.trim() || isSubmitting) && styles.submitBtnDisabled,
                  ]}
                >
                  <Text style={styles.submitBtnLabel}>
                    {isSubmitting ? 'Saving…' : 'Save Note'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  kavContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  } as any,
  sheet: {
    height: MODAL_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceElevated,
  },

  // ── Success ────────────────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[8],
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  successSub: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Menu ───────────────────────────────────────────────────────────────────
  menuContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  sheetTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    marginTop: -Spacing[2],
  },
  optionsList: {
    gap: Spacing[2],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 3 },
  optionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  optionSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },

  // ── Note ───────────────────────────────────────────────────────────────────
  noteContainer: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    gap: Spacing[3],
  },
  backRow: { marginBottom: -Spacing[1] },
  backLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  noteInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 130,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[6],
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
  },

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 18,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  toastDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  toastText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textPrimary,
  },
});
