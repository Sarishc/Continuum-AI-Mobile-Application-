import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  cancelAnimation,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { track } from '../../services/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { healthApi } from '../../api/health';
import { useHealthStore } from '../../store/healthStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

// ─── Condition chips with emoji ───────────────────────────────────────────────

const PRESET_CONDITIONS = [
  { label: 'Diabetes',          emoji: '🩸' },
  { label: 'Hypertension',      emoji: '❤️' },
  { label: 'Heart Disease',     emoji: '💓' },
  { label: 'Asthma',            emoji: '🫁' },
  { label: 'High Cholesterol',  emoji: '🧪' },
  { label: 'Thyroid Disorder',  emoji: '⚡' },
  { label: 'None of the above', emoji: '✓' },
];

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={seg.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={[seg.btn, value === opt && seg.btnActive]}
          activeOpacity={0.8}
        >
          <Text style={[seg.label, value === opt && seg.labelActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const seg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  btn: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  btnActive: { backgroundColor: Colors.electric },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.textSecondary },
  labelActive: { color: '#FFFFFF' },
});

// ─── Radiating dots animation on CTA ─────────────────────────────────────────

const DOT_COUNT = 5;
const RADIUS = 36;

function RadiatingDots() {
  const anims = Array.from({ length: DOT_COUNT }, () => ({
    scale: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  useEffect(() => {
    anims.forEach(({ scale, opacity }, i) => {
      const delay = i * (600 / DOT_COUNT);
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 100, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        )
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.7, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0,   { duration: 300, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        )
      );
    });
    return () => {
      anims.forEach(({ scale, opacity }) => {
        cancelAnimation(scale);
        cancelAnimation(opacity);
      });
    };
  }, []);

  return (
    <View style={dot.container} pointerEvents="none">
      {anims.map(({ scale, opacity }, i) => {
        const angle = (i / DOT_COUNT) * 2 * Math.PI;
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;

        const animStyle = useAnimatedStyle(() => ({
          opacity: opacity.value,
          transform: [{ scale: scale.value }],
        }));

        return (
          <Animated.View
            key={i}
            style={[
              dot.dot,
              { left: x + dot.dot.width / 2, top: y + dot.dot.height / 2 },
              animStyle,
            ]}
          />
        );
      })}
    </View>
  );
}

const dot = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.electricBright,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Step3({ onComplete }: { onComplete: () => void }) {
  const { setProfile } = useHealthStore();
  const { completeOnboarding } = useAuthStore();

  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [medsText, setMedsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebScale = useSharedValue(0);

  const toggleCondition = useCallback((item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item === 'None of the above') {
      setSelectedConditions(['None of the above']);
      return;
    }
    setSelectedConditions((prev) => {
      const without = prev.filter((c) => c !== 'None of the above');
      return without.includes(item) ? without.filter((c) => c !== item) : [...without, item];
    });
  }, []);

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    const conditions = selectedConditions.filter((c) => c !== 'None of the above');
    const medications = medsText.trim()
      ? medsText.split(',').map((m, i) => ({
          id: `ob-m${i}`,
          name: m.trim(),
          dosage: '',
          frequency: 'As prescribed',
        }))
      : [];

    const profileData = {
      conditions,
      medications,
      allergies: [] as string[],
      dateOfBirth: age ? String(new Date().getFullYear() - Number(age)) : undefined,
      biologicalSex: sex as 'male' | 'female' | 'other' | undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      const { data } = await healthApi.updateProfile(profileData);
      setProfile({ ...profileData, ...data, userId: 'local' });
    } catch {
      setProfile({ ...profileData, userId: 'local' });
    }

    await completeOnboarding();
    track('onboarding_completed', { has_conditions: conditions.length > 0 });
    setSaving(false);

    // Show celebration overlay, then navigate
    setShowCelebration(true);
    celebScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1.0, { damping: 12 }),
    );
    setTimeout(() => {
      setShowCelebration(false);
      onComplete();
    }, 1500);
  };

  const celebAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebScale.value }],
  }));

  return (
    <>
    {/* ── Celebration overlay ── */}
    <Modal visible={showCelebration} transparent animationType="fade" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} style={styles.celebOverlay}>
        <Animated.Text style={[styles.celebEmoji, celebAnimStyle]}>🎉</Animated.Text>
        <Text style={styles.celebTitle}>Welcome to Continuum!</Text>
        <Text style={styles.celebSub}>You have 1 free AI message today</Text>
      </Animated.View>
    </Modal>

    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>{'Let\'s personalise\nyour experience.'}</Text>
        <Text style={styles.sub}>This helps us give you more accurate insights.</Text>

        {/* Age */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>How old are you?</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="Your age"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            maxLength={3}
          />
        </View>

        {/* Biological sex */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Biological sex</Text>
          <SegmentedControl
            options={['Male', 'Female', 'Prefer not to say']}
            value={sex || 'Prefer not to say'}
            onChange={setSex}
          />
        </View>

        {/* Conditions multi-select with emoji chips */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Any existing conditions?</Text>
          <View style={styles.chipsWrap}>
            {PRESET_CONDITIONS.map(({ label, emoji }) => {
              const isSelected = selectedConditions.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => toggleCondition(label)}
                  activeOpacity={0.75}
                  style={[styles.chip, isSelected && styles.chipActive]}
                >
                  <Text style={styles.chipEmoji}>{emoji}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Medications text */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Current medications?</Text>
          <TextInput
            value={medsText}
            onChangeText={setMedsText}
            placeholder="e.g. Metformin, Lisinopril (optional)"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            multiline
          />
        </View>

        {/* CTA with radiating dots */}
        <TouchableOpacity
          onPress={handleComplete}
          disabled={saving}
          activeOpacity={0.85}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={Colors.gradientElectric}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <RadiatingDots />
            <Text style={styles.ctaLabel}>{saving ? 'Saving…' : 'GET STARTED →'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
    gap: Spacing[5],
  },
  heading: {
    fontSize: 32,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    lineHeight: 40,
  },
  sub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: -Spacing[3],
  },
  field: { gap: Spacing[2] },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    color: Colors.textPrimary,
    fontFamily: FontFamily.bodyRegular,
    fontSize: FontSize.md,
    minHeight: 44,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.electricMist,
    borderColor: Colors.electric,
  },
  chipEmoji: { fontSize: 14 },
  chipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.electric },
  ctaWrap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing[2],
  },
  ctaGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaLabel: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Celebration overlay
  celebOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  celebEmoji: { fontSize: 72 },
  celebTitle: {
    fontSize: 32,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  celebSub: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
