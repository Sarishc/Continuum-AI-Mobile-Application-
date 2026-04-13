import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConsultations } from '@/hooks/useConsultations';
import type { DoctorResponse } from '@/services/firestoreService';

interface Props {
  visible: boolean;
  onClose: () => void;
  insightId: string;
  insightText: string;
  severity: string;
}

type SheetState = 'preview' | 'loading' | 'response' | 'error';

const WHAT_YOU_GET = [
  '📋 Full review of your health data',
  '🔬 Clinical analysis of your specific concern',
  '✅ Personalized, evidence-based recommendations',
  '📅 Recommended follow-up timeline',
  '👩‍⚕️ Response from a board-certified physician',
];

const MOCK_DOCTOR = {
  name: 'Dr. Sarah Chen, MD',
  credentials: 'Board Certified Internist',
  specialty: 'Internal Medicine & Endocrinology',
  experience: '15 years',
  avatar: '👩‍⚕️',
};

const URGENCY_COLOR: Record<string, string> = {
  routine:   '#30D158',
  follow_up: '#FF9F0A',
  urgent:    '#FF453A',
};

const URGENCY_LABEL: Record<string, string> = {
  routine:   '🟢 Routine',
  follow_up: '🟡 Follow Up',
  urgent:    '🔴 Urgent',
};

export function ConsultationRequestSheet({
  visible,
  onClose,
  insightId,
  insightText,
  severity,
}: Props) {
  const insets = useSafeAreaInsets();
  const { requestDoctorConsultation } = useConsultations();

  const [state, setState] = useState<SheetState>('preview');
  const [doctorResponse, setDoctorResponse] = useState<DoctorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequest = useCallback(async () => {
    setState('loading');
    const result = await requestDoctorConsultation(insightId, insightText);
    if (result?.doctorResponse) {
      setDoctorResponse(result.doctorResponse);
      setState('response');
    } else {
      setErrorMsg('Unable to process consultation. Please try again.');
      setState('error');
    }
  }, [insightId, insightText, requestDoctorConsultation]);

  const handleClose = useCallback(() => {
    setState('preview');
    setDoctorResponse(null);
    setErrorMsg('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          {/* ── PREVIEW ────────────────────────────────────────────────── */}
          {state === 'preview' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.content}>
                {/* Doctor card */}
                <View style={styles.doctorCard}>
                  <Text style={styles.doctorAvatar}>{MOCK_DOCTOR.avatar}</Text>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{MOCK_DOCTOR.name}</Text>
                    <Text style={styles.doctorCreds}>{MOCK_DOCTOR.credentials}</Text>
                    <Text style={styles.doctorSpec}>
                      {MOCK_DOCTOR.specialty} · {MOCK_DOCTOR.experience}
                    </Text>
                  </View>
                </View>

                {/* What you get */}
                <Text style={styles.sectionLabel}>WHAT YOU'LL GET</Text>
                {WHAT_YOU_GET.map((item, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <Text style={styles.benefitText}>{item}</Text>
                  </View>
                ))}

                {/* Insight being reviewed */}
                <View style={styles.insightPreview}>
                  <Text style={styles.insightPreviewLabel}>INSIGHT BEING REVIEWED</Text>
                  <Text style={styles.insightPreviewText} numberOfLines={3}>
                    {insightText}
                  </Text>
                </View>

                {/* Turnaround */}
                <View style={styles.turnaroundCard}>
                  <Text style={{ fontSize: 24 }}>⚡</Text>
                  <View>
                    <Text style={styles.turnaroundTitle}>Response within 4 hours</Text>
                    <Text style={styles.turnaroundSub}>Average response time: 47 minutes</Text>
                  </View>
                </View>

                {/* Price row */}
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Doctor Consultation</Text>
                  <Text style={styles.priceValue}>$29</Text>
                </View>

                <Pressable
                  onPress={handleRequest}
                  style={({ pressed }) => [styles.requestBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.requestBtnText}>Request Consultation — $29</Text>
                </Pressable>

                <Text style={styles.disclaimer}>
                  This is an async educational consultation, not a substitute for in-person medical care.
                  For emergencies, call 911.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ── LOADING ────────────────────────────────────────────────── */}
          {state === 'loading' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4C8DFF" />
              <Text style={styles.loadingTitle}>Reviewing your health data...</Text>
              <Text style={styles.loadingSubtitle}>
                Dr. Chen is analyzing your complete health profile and this specific concern.
              </Text>
              <View style={styles.loadingSteps}>
                {[
                  '✓ Reading your health profile',
                  '✓ Analyzing recent entries',
                  '⟳ Preparing clinical response',
                ].map((step, i) => (
                  <Text key={i} style={styles.loadingStep}>{step}</Text>
                ))}
              </View>
            </View>
          )}

          {/* ── RESPONSE ───────────────────────────────────────────────── */}
          {state === 'response' && doctorResponse && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.content}>
                {/* Doctor header */}
                <View style={styles.responseHeader}>
                  <Text style={{ fontSize: 38 }}>{MOCK_DOCTOR.avatar}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName}>{doctorResponse.doctorName}</Text>
                    <Text style={styles.doctorCreds}>{doctorResponse.credentials}</Text>
                  </View>
                  <View style={[
                    styles.urgencyBadge,
                    {
                      backgroundColor: `${URGENCY_COLOR[doctorResponse.urgencyLevel]}20`,
                      borderColor:     `${URGENCY_COLOR[doctorResponse.urgencyLevel]}50`,
                    },
                  ]}>
                    <Text style={[styles.urgencyText, { color: URGENCY_COLOR[doctorResponse.urgencyLevel] }]}>
                      {URGENCY_LABEL[doctorResponse.urgencyLevel] ?? doctorResponse.urgencyLevel}
                    </Text>
                  </View>
                </View>

                {/* Clinical response */}
                <View style={styles.responseBody}>
                  <Text style={styles.responseText}>{doctorResponse.response}</Text>
                </View>

                {/* Recommendations */}
                <Text style={styles.sectionLabel}>RECOMMENDATIONS</Text>
                {doctorResponse.recommendations.map((rec, i) => (
                  <View key={i} style={styles.recommendRow}>
                    <View style={styles.recommendNum}>
                      <Text style={styles.recommendNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.recommendText}>{rec}</Text>
                  </View>
                ))}

                {/* Follow-up */}
                <View style={styles.followUpCard}>
                  <Text style={{ fontSize: 24 }}>📅</Text>
                  <View>
                    <Text style={styles.followUpTitle}>Recommended Follow-up</Text>
                    <Text style={styles.followUpValue}>{doctorResponse.followUpIn}</Text>
                  </View>
                </View>

                <Text style={styles.disclaimer}>
                  This consultation is for educational purposes. It does not constitute a doctor-patient
                  relationship or replace in-person medical care.
                </Text>

                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ── ERROR ──────────────────────────────────────────────────── */}
          {state === 'error' && (
            <View style={styles.errorContainer}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
              <Text style={styles.errorTitle}>Consultation Unavailable</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <Pressable
                onPress={() => setState('preview')}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.12)',
    maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Doctor card
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 24,
  },
  doctorAvatar: { fontSize: 40 },
  doctorInfo: { flex: 1 },
  doctorName: {
    fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2,
  },
  doctorCreds: {
    fontSize: 13, color: '#4C8DFF', marginBottom: 2,
  },
  doctorSpec: {
    fontSize: 12, color: 'rgba(255,255,255,0.40)',
  },

  // Section
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
    marginBottom: 12, marginTop: 4,
  },

  // Benefits
  benefitRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  benefitText: {
    fontSize: 15, color: '#FFFFFF',
  },

  // Insight preview
  insightPreview: {
    marginTop: 20,
    padding: 14,
    backgroundColor: 'rgba(255,159,10,0.08)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,159,10,0.20)',
  },
  insightPreviewLabel: {
    fontSize: 10, fontWeight: '600', color: '#FF9F0A',
    letterSpacing: 1.5, marginBottom: 6,
  },
  insightPreviewText: {
    fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 20,
  },

  // Turnaround
  turnaroundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 14,
    backgroundColor: 'rgba(76,141,255,0.08)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(76,141,255,0.20)',
  },
  turnaroundTitle: {
    fontSize: 15, fontWeight: '600', color: '#FFFFFF',
  },
  turnaroundSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.40)', marginTop: 2,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 17, fontWeight: '500', color: '#FFFFFF',
  },
  priceValue: {
    fontSize: 28, fontWeight: '700', color: '#FFFFFF',
  },

  // Buttons
  requestBtn: {
    backgroundColor: '#4C8DFF',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestBtnText: {
    fontSize: 17, fontWeight: '600', color: 'white',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },

  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    minHeight: 320,
  },
  loadingTitle: {
    fontSize: 20, fontWeight: '600', color: '#FFFFFF',
    marginTop: 20, marginBottom: 8, textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  loadingSteps: { alignSelf: 'flex-start', width: '100%' },
  loadingStep: {
    fontSize: 14, color: 'rgba(255,255,255,0.50)', paddingVertical: 6,
  },

  // Response
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  urgencyText: {
    fontSize: 12, fontWeight: '600',
  },
  responseBody: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  responseText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
  },
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  recommendNum: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76,141,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  recommendNumText: {
    fontSize: 12, fontWeight: '700', color: '#4C8DFF',
  },
  recommendText: {
    flex: 1, fontSize: 15,
    color: 'rgba(255,255,255,0.80)', lineHeight: 22,
  },
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20, marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(48,209,88,0.20)',
  },
  followUpTitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4,
  },
  followUpValue: {
    fontSize: 17, fontWeight: '600', color: '#30D158',
  },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 16, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  doneBtnText: {
    fontSize: 17, fontWeight: '500', color: '#FFFFFF',
  },

  // Error
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    minHeight: 320,
  },
  errorTitle: {
    fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 8,
  },
  errorText: {
    fontSize: 14, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#4C8DFF',
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 15, fontWeight: '600', color: 'white',
  },
});
