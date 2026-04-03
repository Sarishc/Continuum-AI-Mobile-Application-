import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import type { SpecialistRecommendation } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.52;

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function urgencyColor(urgency: string): string {
  switch (urgency) {
    case 'emergency': return Colors.critical;
    case 'urgent':    return Colors.critical;
    case 'soon':      return Colors.caution;
    default:          return Colors.primary;
  }
}

function urgencyLabel(urgency: string): string {
  switch (urgency) {
    case 'emergency': return 'Emergency';
    case 'urgent':    return 'Urgent';
    case 'soon':      return 'Within 4–6 weeks';
    default:          return 'Routine';
  }
}

// ─── What to expect bullets per specialist type ────────────────────────────────

const SPECIALIST_BULLETS: Record<string, string[]> = {
  Endocrinologist: [
    'Review of your HbA1c, fasting glucose, and insulin resistance markers',
    'Personalised management plan for your metabolic condition',
    'Medication adjustments and lifestyle recommendations',
  ],
  Cardiologist: [
    'ECG and blood pressure monitoring over 24–48 hours',
    'Assessment of cardiovascular risk factors and cholesterol panel',
    'Imaging (echocardiogram) if structural concerns are identified',
  ],
  Neurologist: [
    'Detailed neurological examination and reflex testing',
    'MRI or CT scan if indicated by your symptoms',
    'Assessment of headache patterns, sleep, and cognitive function',
  ],
  Dermatologist: [
    'Full-skin examination and mole mapping',
    'Biopsy or patch testing if required',
    'Prescription treatment plan and follow-up schedule',
  ],
  'Primary Care': [
    'Comprehensive annual health review',
    'Referrals to appropriate specialists as needed',
    'Review of all current medications and preventive screenings',
  ],
};

function getBullets(specialistType: string): string[] {
  return (
    SPECIALIST_BULLETS[specialistType] ??
    SPECIALIST_BULLETS['Primary Care']
  );
}

// ─── Close icon ───────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={Colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SpecialistDetailSheetProps {
  visible: boolean;
  specialist: SpecialistRecommendation | null;
  onClose: () => void;
}

export function SpecialistDetailSheet({
  visible,
  specialist,
  onClose,
}: SpecialistDetailSheetProps) {
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

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleFindSpecialist = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Coming Soon', 'Doctor network coming soon.');
  };

  if (!specialist) return null;

  const accentColor = urgencyColor(specialist.urgency);
  const bullets = getBullets(specialist.type);

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
          <View style={styles.headerLeft}>
            <View style={[styles.urgencyPill, { backgroundColor: `${accentColor}18` }]}>
              <View style={[styles.urgencyDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.urgencyText, { color: accentColor }]}>
                {urgencyLabel(specialist.urgency)}
              </Text>
            </View>
            <Text style={styles.specialistName}>{specialist.type}</Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CloseIcon />
          </TouchableOpacity>
        </View>

        {/* Reason */}
        <Text style={styles.reason}>{specialist.reason}</Text>

        {/* 3-step urgency indicator */}
        <View style={styles.urgencyTrack}>
          {(['routine', 'soon', 'urgent'] as const).map((level, i) => {
            const levels = ['routine', 'soon', 'urgent', 'emergency'];
            const activeIdx = levels.indexOf(specialist.urgency);
            const isActive = i <= (activeIdx === 3 ? 2 : activeIdx);
            const color = isActive ? accentColor : Colors.border;
            return (
              <React.Fragment key={level}>
                <View style={[styles.urgencyStep, { backgroundColor: color }]}>
                  <Text style={[styles.urgencyStepText, { color: isActive ? '#fff' : Colors.textMuted }]}>
                    {i + 1}
                  </Text>
                </View>
                {i < 2 && <View style={[styles.urgencyConnector, { backgroundColor: i < activeIdx ? accentColor : Colors.border }]} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* What to expect */}
        <Text style={styles.sectionLabel}>WHAT TO EXPECT</Text>
        <View style={styles.bullets}>
          {bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletNum, { color: accentColor }]}>{i + 1}</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleFindSpecialist}
          activeOpacity={0.85}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={Colors.gradientElectric}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaLabel}>Find a Specialist</Text>
          </LinearGradient>
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
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
    gap: Spacing[4],
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1, gap: Spacing[2] },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium },
  specialistName: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    lineHeight: 36,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reason: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  urgencyTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: -Spacing[1],
  },
  urgencyStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyStepText: { fontSize: FontSize.xs, fontFamily: FontFamily.bodySemiBold },
  urgencyConnector: { flex: 1, height: 2, borderRadius: 1 },
  bullets: { gap: Spacing[3] },
  bulletRow: { flexDirection: 'row', gap: Spacing[3], alignItems: 'flex-start' },
  bulletNum: {
    width: 18,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.displaySemiBold,
    marginTop: 2,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ctaWrap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: 'auto',
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  ctaGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
