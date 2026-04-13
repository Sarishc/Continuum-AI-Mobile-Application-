import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal, TextInput, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<boolean>;
}

type State = 'input' | 'loading' | 'success' | 'error';

export function JoinFamilySheet({ visible, onClose, onJoin }: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>('input');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCodeChange = (v: string) => {
    // Keep only digits, max 6
    const cleaned = v.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    if (state === 'error') setState('input');
  };

  const handleJoin = async () => {
    if (code.length !== 6) return;
    setState('loading');
    try {
      const ok = await onJoin(code);
      if (ok) {
        setState('success');
      } else {
        setErrorMsg('Invalid or expired code. Please try again.');
        setState('error');
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Something went wrong');
      setState('error');
    }
  };

  const handleClose = () => {
    setCode('');
    setState('input');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handle} />

          <View style={styles.content}>
            {state === 'success' ? (
              /* Success */
              <>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.title}>You joined the family!</Text>
                <Text style={styles.subtitle}>
                  You now have access to your family health plan.
                </Text>
                <Pressable onPress={handleClose} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Get Started</Text>
                </Pressable>
              </>
            ) : (
              /* Input / error state */
              <>
                <Text style={styles.title}>Join a Family Plan</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit invite code sent by your family member.
                </Text>

                <TextInput
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder="000000"
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  style={[styles.codeInput, state === 'error' && styles.codeInputError]}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                />

                {state === 'error' && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}

                <Pressable
                  onPress={handleJoin}
                  disabled={code.length !== 6 || state === 'loading'}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (code.length !== 6 || state === 'loading') && styles.primaryBtnDisabled,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {state === 'loading' ? 'Joining…' : 'Join Family'}
                  </Text>
                </Pressable>

                <Pressable onPress={handleClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
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
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  content: { paddingHorizontal: 28, paddingTop: 12, alignItems: 'center' },
  successEmoji: { fontSize: 56, marginVertical: 16, textAlign: 'center' },
  title: {
    fontSize: 22, fontWeight: '700', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 16, height: 72, width: 200,
    fontSize: 36, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: 10, marginBottom: 16,
  },
  codeInputError: {
    borderColor: '#FF453A',
  },
  errorText: {
    fontSize: 13, color: '#FF453A',
    textAlign: 'center', marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#4C8DFF', height: 52, width: '100%',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(76,141,255,0.35)',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '600', color: 'white' },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
});
