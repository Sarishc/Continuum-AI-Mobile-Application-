import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  TextInput, StyleSheet, Share, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FamilyMember } from '@/services/firestoreService';

type Role = FamilyMember['role'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onInvite: (email: string, name: string, role: Role) => Promise<string>;
}

const ROLES: { value: Role; label: string; desc: string }[] = [
  {
    value: 'member',
    label: 'Member',
    desc: 'Can view their own health data. Shares health score with family.',
  },
  {
    value: 'caregiver',
    label: 'Caregiver',
    desc: 'Can view and help manage another member\'s health data.',
  },
  {
    value: 'dependent',
    label: 'Dependent',
    desc: 'Limited access. Ideal for children or elderly family members.',
  },
];

export function InviteMemberSheet({ visible, onClose, onInvite }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [isSending, setIsSending] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please fill in name and email');
      return;
    }
    setError('');
    setIsSending(true);
    try {
      const code = await onInvite(email.trim(), name.trim(), role);
      setGeneratedCode(code);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send invite');
    } finally {
      setIsSending(false);
    }
  };

  const handleShare = async () => {
    if (!generatedCode) return;
    try {
      await Share.share({
        message: `Join my family health plan on Continuum AI!\nYour invite code: ${generatedCode}\n\nDownload at continuum-health.app`,
        title: 'Join Family Health Plan',
      });
    } catch {
      // cancelled
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setRole('member');
    setGeneratedCode(null);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              {generatedCode ? (
                /* Success state — show code */
                <>
                  <Text style={styles.title}>Invite Sent! 🎉</Text>
                  <Text style={styles.subtitle}>Share this code with {name}</Text>

                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>INVITE CODE</Text>
                    <Text style={styles.codeValue}>{generatedCode}</Text>
                    <Text style={styles.codeExpiry}>Expires in 7 days</Text>
                  </View>

                  <Pressable onPress={handleShare} style={styles.shareBtn}>
                    <Text style={styles.shareBtnText}>📤 Share Code</Text>
                  </Pressable>
                  <Pressable onPress={handleClose} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                </>
              ) : (
                /* Form state */
                <>
                  <Text style={styles.title}>Invite Family Member</Text>

                  <Text style={styles.fieldLabel}>NAME</Text>
                  <TextInput
                    value={name}
                    onChangeText={(v) => { setName(v); setError(''); }}
                    placeholder="e.g. Sarah Morgan"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={styles.input}
                    autoCapitalize="words"
                  />

                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <TextInput
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(''); }}
                    placeholder="sarah@example.com"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.fieldLabel}>ROLE</Text>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r.value}
                      onPress={() => setRole(r.value)}
                      style={[styles.roleOption, role === r.value && styles.roleOptionActive]}
                    >
                      <View style={styles.roleRow}>
                        <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                          {r.label}
                        </Text>
                        {role === r.value && <Text style={styles.roleCheck}>✓</Text>}
                      </View>
                      <Text style={styles.roleDesc}>{r.desc}</Text>
                    </Pressable>
                  ))}

                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <Pressable
                    onPress={handleSend}
                    disabled={isSending}
                    style={({ pressed }) => [styles.sendBtn, (pressed || isSending) && { opacity: 0.7 }]}
                  >
                    <Text style={styles.sendBtnText}>
                      {isSending ? 'Sending…' : 'Send Invite'}
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
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  title: {
    fontSize: 22, fontWeight: '700', color: '#FFFFFF',
    marginBottom: 4, marginTop: 12,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 24,
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
  roleOption: {
    padding: 14, borderRadius: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
  roleOptionActive: {
    backgroundColor: 'rgba(76,141,255,0.12)',
    borderColor: '#4C8DFF',
  },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  roleLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  roleLabelActive: { color: '#4C8DFF' },
  roleCheck: { fontSize: 15, color: '#4C8DFF' },
  roleDesc: {
    fontSize: 12, color: 'rgba(255,255,255,0.35)',
    lineHeight: 18, marginTop: 4,
  },
  errorText: { fontSize: 13, color: '#FF453A', marginBottom: 8 },
  sendBtn: {
    backgroundColor: '#4C8DFF', height: 52,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginTop: 12, marginBottom: 10,
  },
  sendBtnText: { fontSize: 17, fontWeight: '600', color: 'white' },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
  // Code display
  codeBox: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: 'rgba(76,141,255,0.08)',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(76,141,255,0.30)',
    marginVertical: 20,
  },
  codeLabel: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2, marginBottom: 12,
  },
  codeValue: {
    fontSize: 44, fontWeight: '700',
    color: '#FFFFFF', letterSpacing: 8,
    marginBottom: 8,
  },
  codeExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.30)' },
  shareBtn: {
    backgroundColor: '#4C8DFF', height: 52,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  shareBtnText: { fontSize: 17, fontWeight: '600', color: 'white' },
  doneBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
});
