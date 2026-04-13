import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  TextInput, Switch, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MedicationSchedule } from '@/services/firestoreService';

type Frequency = MedicationSchedule['frequency'];

interface AddData {
  medicationName: string;
  dosage: string;
  frequency: Frequency;
  times: string[];
  notificationsEnabled: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: AddData) => Promise<string>;
}

const FREQ_OPTIONS: { value: Frequency; label: string; defaultTimes: string[] }[] = [
  { value: 'once_daily',   label: 'Once daily',     defaultTimes: ['08:00'] },
  { value: 'twice_daily',  label: 'Twice daily',    defaultTimes: ['08:00', '20:00'] },
  { value: 'three_times',  label: 'Three times',    defaultTimes: ['08:00', '13:00', '20:00'] },
  { value: 'as_needed',    label: 'As needed',      defaultTimes: [] },
];

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor="rgba(255,255,255,0.25)"
      style={styles.timeInput}
      maxLength={5}
      keyboardType="numbers-and-punctuation"
    />
  );
}

export function AddMedicationSheet({ visible, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once_daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const handleFrequencyChange = useCallback((f: Frequency) => {
    setFrequency(f);
    const defaults = FREQ_OPTIONS.find((o) => o.value === f)?.defaultTimes ?? [];
    setTimes([...defaults]);
  }, []);

  const handleTimeChange = useCallback((index: number, val: string) => {
    setTimes((prev) => prev.map((t, i) => (i === index ? val : t)));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Medication name is required');
      return;
    }
    setNameError('');
    setIsSaving(true);
    try {
      await onAdd({
        medicationName: name.trim(),
        dosage: dosage.trim(),
        frequency,
        times,
        notificationsEnabled: notifications,
      });
      // Reset form
      setName('');
      setDosage('');
      setFrequency('once_daily');
      setTimes(['08:00']);
      setNotifications(true);
      onClose();
    } catch {
      // Fail silently — parent handles error
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDosage('');
    setFrequency('once_daily');
    setTimes(['08:00']);
    setNotifications(true);
    setNameError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <Text style={styles.sheetTitle}>Add Medication</Text>

              {/* Medication name */}
              <Text style={styles.fieldLabel}>MEDICATION NAME</Text>
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setNameError(''); }}
                placeholder="e.g. Metformin"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={[styles.input, !!nameError && styles.inputError]}
                autoCapitalize="words"
              />
              {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

              {/* Dosage */}
              <Text style={styles.fieldLabel}>DOSAGE (OPTIONAL)</Text>
              <TextInput
                value={dosage}
                onChangeText={setDosage}
                placeholder="e.g. 500mg"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.input}
              />

              {/* Frequency */}
              <Text style={styles.fieldLabel}>FREQUENCY</Text>
              <View style={styles.freqGrid}>
                {FREQ_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleFrequencyChange(opt.value)}
                    style={[
                      styles.freqChip,
                      frequency === opt.value && styles.freqChipActive,
                    ]}
                  >
                    <Text style={[
                      styles.freqChipText,
                      frequency === opt.value && styles.freqChipTextActive,
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Times */}
              {times.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>REMINDER TIMES</Text>
                  <View style={styles.timesRow}>
                    {times.map((t, i) => (
                      <TimeInput key={i} value={t} onChange={(v) => handleTimeChange(i, v)} />
                    ))}
                  </View>
                </>
              )}

              {/* Notifications toggle */}
              <View style={styles.notifRow}>
                <View>
                  <Text style={styles.notifLabel}>Daily Reminders</Text>
                  <Text style={styles.notifSub}>Push notifications at scheduled times</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: 'rgba(255,255,255,0.10)', true: '#4C8DFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => [styles.saveBtn, (pressed || isSaving) && { opacity: 0.7 }]}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Adding…' : 'Add Medication'}
                </Text>
              </Pressable>

              <Pressable onPress={handleClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.12)',
    maxHeight: '88%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: {
    fontSize: 22, fontWeight: '700', color: '#FFFFFF',
    marginBottom: 20, marginTop: 8,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, height: 48,
    paddingHorizontal: 16,
    fontSize: 16, color: '#FFFFFF',
    marginBottom: 16,
  },
  inputError: {
    borderColor: 'rgba(255,69,58,0.60)',
  },
  errorText: {
    fontSize: 12, color: '#FF453A', marginTop: -12, marginBottom: 8,
  },
  freqGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 16,
  },
  freqChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  freqChipActive: {
    backgroundColor: 'rgba(76,141,255,0.20)',
    borderColor: '#4C8DFF',
  },
  freqChipText: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
  },
  freqChipTextActive: {
    color: '#4C8DFF', fontWeight: '600',
  },
  timesRow: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  timeInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, height: 48, width: 90,
    paddingHorizontal: 12,
    fontSize: 18, fontWeight: '600', color: '#FFFFFF',
    textAlign: 'center',
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  notifLabel: {
    fontSize: 16, fontWeight: '500', color: '#FFFFFF',
  },
  notifSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#4C8DFF', height: 52,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnText: {
    fontSize: 17, fontWeight: '600', color: 'white',
  },
  cancelBtn: {
    height: 44, justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15, color: 'rgba(255,255,255,0.35)',
  },
});
