import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { healthApi } from '../../api/health';
import { useHealthStore } from '../../store/healthStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

const PRESET_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma',
  'High Cholesterol', 'Thyroid Disorder', 'None of the above',
];

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
  container: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, padding: 3 },
  btn: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  btnActive: { backgroundColor: Colors.primary },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.textSecondary },
  labelActive: { color: '#FFFFFF' },
});

export default function Step3({ onComplete }: { onComplete: () => void }) {
  const { setProfile } = useHealthStore();
  const { completeOnboarding } = useAuthStore();

  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [medsText, setMedsText] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCondition = useCallback((item: string) => {
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
    setSaving(false);
    onComplete();
  };

  return (
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

        {/* Conditions multi-select */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Any existing conditions?</Text>
          <View style={styles.chipsWrap}>
            {PRESET_CONDITIONS.map((cond) => {
              const isSelected = selectedConditions.includes(cond);
              return (
                <TouchableOpacity
                  key={cond}
                  onPress={() => toggleCondition(cond)}
                  activeOpacity={0.8}
                  style={[styles.chip, isSelected && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cond}</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing[6], paddingTop: Spacing[8], paddingBottom: Spacing[6], gap: Spacing[5] },
  heading: { fontSize: 32, fontFamily: FontFamily.display, color: Colors.textPrimary, lineHeight: 40 },
  sub: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, lineHeight: 20, marginTop: -Spacing[3] },
  field: { gap: Spacing[2] },
  fieldLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.bodySemiBold, color: Colors.textSecondary },
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: 'rgba(56,139,253,0.15)', borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
});
