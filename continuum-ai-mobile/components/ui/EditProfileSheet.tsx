import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { healthApi } from '../../api/health';
import { useHealthStore } from '../../store/healthStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';
import type { HealthProfile, Medication } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─── Icons ────────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={Colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6H21M19 6L18.1 19.1C18.046 19.9 17.38 20.5 16.6 20.5H7.4C6.62 20.5 5.954 19.9 5.9 19.1L5 6M9 6V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V6"
        stroke={Colors.critical}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={segStyles.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={[segStyles.segment, opt === value && segStyles.segmentActive]}
          activeOpacity={0.8}
        >
          <Text style={[segStyles.segText, opt === value && segStyles.segTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  segment: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentActive: { backgroundColor: Colors.primary },
  segText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  segTextActive: { color: '#FFFFFF' },
});

// ─── Section title ────────────────────────────────────────────────────────────

function SheetSection({ label }: { label: string }) {
  return <Text style={sheetStyles.sectionLabel}>{label}</Text>;
}

// ─── Tag row (conditions / allergies) ────────────────────────────────────────

function TagRow({
  items,
  onRemove,
  color,
  bg,
}: {
  items: string[];
  onRemove: (item: string) => void;
  color: string;
  bg: string;
}) {
  return (
    <View style={tagStyles.row}>
      {items.map((item) => (
        <Animated.View
          key={item}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[tagStyles.pill, { backgroundColor: bg, borderColor: color }]}
        >
          <Text style={[tagStyles.pillText, { color }]}>{item}</Text>
          <TouchableOpacity onPress={() => onRemove(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <TrashIcon />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}

function MedRow({
  med,
  onRemove,
}: {
  med: Medication;
  onRemove: (id: string) => void;
}) {
  return (
    <Animated.View
      key={med.id}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={medStyles.pill}
    >
      <View style={medStyles.left}>
        <Text style={medStyles.name}>{med.name}</Text>
        <Text style={medStyles.detail}>{med.dosage} · {med.frequency}</Text>
      </View>
      <TouchableOpacity onPress={() => onRemove(med.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <TrashIcon />
      </TouchableOpacity>
    </Animated.View>
  );
}

const tagStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium },
});

const medStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(63,185,80,0.1)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(63,185,80,0.3)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[3],
  },
  left: { flex: 1, gap: 2 },
  name: { fontSize: FontSize.sm, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  detail: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary },
});

// ─── Add input row ────────────────────────────────────────────────────────────

function AddRow({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [text, setText] = useState('');
  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  };
  return (
    <View style={addStyles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={addStyles.input}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
      />
      <TouchableOpacity onPress={handleAdd} style={addStyles.btn} activeOpacity={0.8}>
        <Text style={addStyles.btnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

function AddMedRow({ onAdd }: { onAdd: (med: Omit<Medication, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [freq, setFreq] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), dosage: dosage.trim() || '', frequency: freq.trim() || 'As needed' });
    setName(''); setDosage(''); setFreq('');
  };

  return (
    <View style={addStyles.medContainer}>
      <TextInput value={name} onChangeText={setName} placeholder="Medication name" placeholderTextColor={Colors.textMuted} style={addStyles.input} />
      <View style={addStyles.medRow}>
        <TextInput value={dosage} onChangeText={setDosage} placeholder="Dosage (e.g. 500mg)" placeholderTextColor={Colors.textMuted} style={[addStyles.input, { flex: 1 }]} />
        <TextInput value={freq} onChangeText={setFreq} placeholder="Frequency" placeholderTextColor={Colors.textMuted} style={[addStyles.input, { flex: 1 }]} />
      </View>
      <TouchableOpacity onPress={handleAdd} style={addStyles.btn} activeOpacity={0.8}>
        <Text style={addStyles.btnText}>Add Medication</Text>
      </TouchableOpacity>
    </View>
  );
}

const addStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing[2], alignItems: 'center' },
  medContainer: { gap: Spacing[2] },
  medRow: { flexDirection: 'row', gap: Spacing[2] },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    color: Colors.textPrimary,
    fontFamily: FontFamily.bodyRegular,
    fontSize: FontSize.sm,
  },
  btn: {
    height: 40,
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: '#FFFFFF' },
});

// ─── Sheet ────────────────────────────────────────────────────────────────────

interface EditProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileSheet({ visible, onClose }: EditProfileSheetProps) {
  const { healthProfile, setProfile } = useHealthStore();
  const translateY = useSharedValue(SHEET_HEIGHT);

  // Local form state
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed from store when opening
  useEffect(() => {
    if (visible && healthProfile) {
      setConditions(healthProfile.conditions ?? []);
      setMedications(healthProfile.medications ?? []);
      setAllergies(healthProfile.allergies ?? []);
      setDob(healthProfile.dateOfBirth ?? '');
      setSex(healthProfile.biologicalSex ?? '');
    }
  }, [visible, healthProfile]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 280, easing: Easing.in(Easing.cubic) });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 260, easing: Easing.in(Easing.cubic) }, () => runOnJS(onClose)());
  };

  const removeCondition = useCallback((item: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setConditions((prev) => prev.filter((c) => c !== item));
  }, []);

  const addCondition = useCallback((item: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setConditions((prev) => (prev.includes(item) ? prev : [...prev, item]));
  }, []);

  const removeMed = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addMed = useCallback((med: Omit<Medication, 'id'>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMedications((prev) => [...prev, { ...med, id: `m-${Date.now()}` }]);
  }, []);

  const removeAllergy = useCallback((item: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAllergies((prev) => prev.filter((a) => a !== item));
  }, []);

  const addAllergy = useCallback((item: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAllergies((prev) => (prev.includes(item) ? prev : [...prev, item]));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updated: Partial<HealthProfile> = {
      conditions,
      medications,
      allergies,
      dateOfBirth: dob || undefined,
      biologicalSex: (sex as HealthProfile['biologicalSex']) || undefined,
      updatedAt: new Date().toISOString(),
    };
    try {
      const { data } = await healthApi.updateProfile(updated);
      setProfile({ ...healthProfile!, ...data });
    } catch {
      // Optimistic local update on API failure
      setProfile({ ...healthProfile!, ...updated });
    } finally {
      setSaving(false);
      handleClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={handleClose} />
      <Animated.View style={[sheetStyles.sheet, sheetStyle]}>
        {/* Handle */}
        <View style={sheetStyles.handleRow}>
          <View style={sheetStyles.handle} />
        </View>

        {/* Header */}
        <View style={sheetStyles.header}>
          <Text style={sheetStyles.title}>Edit Health Profile</Text>
          <TouchableOpacity onPress={handleClose} style={sheetStyles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CloseIcon />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sheetStyles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Personal Info */}
          <SheetSection label="Personal Info" />
          <View style={sheetStyles.field}>
            <Text style={sheetStyles.fieldLabel}>Date of Birth</Text>
            <TextInput
              value={dob}
              onChangeText={setDob}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={Colors.textMuted}
              style={sheetStyles.input}
            />
          </View>
          <View style={sheetStyles.field}>
            <Text style={sheetStyles.fieldLabel}>Biological Sex</Text>
            <SegmentedControl
              options={['Male', 'Female', 'Other']}
              value={sex || 'Male'}
              onChange={setSex}
            />
          </View>

          {/* Conditions */}
          <SheetSection label="Conditions" />
          {conditions.length > 0 && (
            <TagRow
              items={conditions}
              onRemove={removeCondition}
              color={Colors.primary}
              bg="rgba(56,139,253,0.12)"
            />
          )}
          <AddRow placeholder="e.g. Pre-diabetes" onAdd={addCondition} />

          {/* Medications */}
          <SheetSection label="Medications" />
          {medications.map((med) => (
            <MedRow key={med.id} med={med} onRemove={removeMed} />
          ))}
          <AddMedRow onAdd={addMed} />

          {/* Allergies */}
          <SheetSection label="Allergies" />
          {allergies.length > 0 && (
            <TagRow
              items={allergies}
              onRemove={removeAllergy}
              color={Colors.warning}
              bg="rgba(210,153,34,0.12)"
            />
          )}
          <AddRow placeholder="e.g. Penicillin" onAdd={addAllergy} />

          <View style={{ height: Spacing[6] }} />
        </ScrollView>

        {/* Save button */}
        <View style={sheetStyles.footer}>
          <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={sheetStyles.saveBtnWrap}>
            <LinearGradient
              colors={Colors.gradientElectric}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={sheetStyles.saveBtn}
            >
              <Text style={sheetStyles.saveBtnText}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
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
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceElevated },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
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
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    gap: Spacing[3],
  },
  field: { gap: Spacing[2] },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textSecondary,
  },
  input: {
    height: 44,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    color: Colors.textPrimary,
    fontFamily: FontFamily.bodyRegular,
    fontSize: FontSize.md,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing[2],
  },
  footer: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[6],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtnWrap: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  saveBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  saveBtnText: { fontSize: FontSize.lg, fontFamily: FontFamily.bodySemiBold, color: '#FFFFFF' },
});
