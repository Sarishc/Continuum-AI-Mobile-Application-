import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal, TextInput,
  ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, planType: 'family' | 'caregiver') => Promise<string>;
}

export function CreateFamilySheet({ visible, onClose, onCreate }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [planType, setPlanType] = useState<'family' | 'caregiver'>('family');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a family name');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await onCreate(name.trim(), planType);
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create family plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPlanType('family');
    setError('');
    setDone(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              {done ? (
                /* Success state */
                <>
                  <Text style={styles.successEmoji}>👨‍👩‍👧‍👦</Text>
                  <Text style={styles.title}>Family Plan Created!</Text>
                  <Text style={styles.subtitle}>
                    "{name}" is ready. Invite family members to start sharing health data.
                  </Text>
                  <Pressable onPress={handleClose} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Invite Members</Text>
                  </Pressable>
                </>
              ) : (
                /* Form state */
                <>
                  <Text style={styles.title}>Create Family Plan</Text>
                  <Text style={styles.subtitle}>
                    Start monitoring your family's health together.
                  </Text>

                  <Text style={styles.fieldLabel}>FAMILY NAME</Text>
                  <TextInput
                    value={name}
                    onChangeText={(v) => { setName(v); setError(''); }}
                    placeholder="e.g. The Morgan Family"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={[styles.input, !!error && styles.inputError]}
                    autoCapitalize="words"
                  />
                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <Text style={styles.fieldLabel}>PLAN TYPE</Text>

                  <Pressable
                    onPress={() => setPlanType('family')}
                    style={[styles.planOption, planType === 'family' && styles.planOptionActive]}
                  >
                    <Text style={styles.planEmoji}>👨‍👩‍👧‍👦</Text>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, planType === 'family' && styles.planNameActive]}>
                        Family Plan
                      </Text>
                      <Text style={styles.planMeta}>Up to 4 members · $29.99/mo</Text>
                    </View>
                    {planType === 'family' && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>

                  <Pressable
                    onPress={() => setPlanType('caregiver')}
                    style={[styles.planOption, planType === 'caregiver' && styles.planOptionCare]}
                  >
                    <Text style={styles.planEmoji}>🏥</Text>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, planType === 'caregiver' && styles.planNameCare]}>
                        Caregiver Plan
                      </Text>
                      <Text style={styles.planMeta}>Up to 6 members · $39.99/mo</Text>
                    </View>
                    {planType === 'caregiver' && <Text style={[styles.checkmark, { color: '#30D158' }]}>✓</Text>}
                  </Pressable>

                  <Pressable
                    onPress={handleCreate}
                    disabled={isSaving}
                    style={({ pressed }) => [styles.primaryBtn, (pressed || isSaving) && { opacity: 0.7 }]}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isSaving ? 'Creating…' : 'Create Family Plan'}
                    </Text>
                  </Pressable>

                  <Pressable onPress={handleClose} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.12)',
    maxHeight: '88%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  successEmoji: { fontSize: 52, textAlign: 'center', marginVertical: 20 },
  title: {
    fontSize: 22, fontWeight: '700', color: '#FFFFFF',
    marginBottom: 6, marginTop: 12,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    lineHeight: 22, marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2, marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, height: 48, paddingHorizontal: 16,
    fontSize: 16, color: '#FFFFFF', marginBottom: 16,
  },
  inputError: { borderColor: 'rgba(255,69,58,0.60)' },
  errorText: { fontSize: 12, color: '#FF453A', marginTop: -12, marginBottom: 12 },
  planOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 10, gap: 12,
  },
  planOptionActive: {
    backgroundColor: 'rgba(76,141,255,0.10)',
    borderColor: '#4C8DFF',
  },
  planOptionCare: {
    backgroundColor: 'rgba(48,209,88,0.10)',
    borderColor: '#30D158',
  },
  planEmoji: { fontSize: 24 },
  planInfo: { flex: 1 },
  planName: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.60)' },
  planNameActive: { color: '#4C8DFF' },
  planNameCare: { color: '#30D158' },
  planMeta: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  checkmark: { fontSize: 18, color: '#4C8DFF' },
  primaryBtn: {
    backgroundColor: '#4C8DFF', height: 52,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginTop: 8, marginBottom: 10,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '600', color: 'white' },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
});
