import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Spacing, BorderRadius } from '../constants/theme';

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={Colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: string }) {
  return <Text style={styles.para}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.updated}>Last updated: April 2026</Text>

        <Section title="1. What We Collect">
          <Para>
            Continuum collects only the health information you explicitly provide, including:
          </Para>
          <Bullet>Health documents and lab reports you upload</Bullet>
          <Bullet>Symptoms and notes you log manually</Bullet>
          <Bullet>Profile information (age, sex, conditions, medications)</Bullet>
          <Bullet>Usage analytics to improve the app (anonymized)</Bullet>
        </Section>

        <Section title="2. How We Use It">
          <Para>Your health data is used exclusively to:</Para>
          <Bullet>Provide AI-powered analysis and personalized insights</Bullet>
          <Bullet>Track your health trends over time</Bullet>
          <Bullet>Generate specialist recommendations relevant to your profile</Bullet>
          <Para>
            We do not sell, share, or license your health data to any third party for advertising, research, or any other commercial purpose.
          </Para>
        </Section>

        <Section title="3. Data Storage &amp; Security">
          <Para>
            All health data is encrypted at rest using AES-256 and in transit using TLS 1.3. Data is stored on our secured servers located in the United States.
          </Para>
          <Para>
            Access tokens are stored using your device's secure enclave (iOS Keychain / Android Keystore). We never store passwords in plain text.
          </Para>
        </Section>

        <Section title="4. Your Rights">
          <Para>You have the right to:</Para>
          <Bullet>Export all your health data at any time (Profile → Export Health Data)</Bullet>
          <Bullet>Delete your account and all associated data permanently</Bullet>
          <Bullet>Request a copy of your data in JSON or PDF format</Bullet>
          <Bullet>Opt out of anonymized analytics at any time</Bullet>
        </Section>

        <Section title="5. Push Notifications">
          <Para>
            Push notifications are used only for health alerts and reminders you configure in the app. You can disable them at any time in Profile → Notifications or in your device Settings.
          </Para>
        </Section>

        <Section title="6. Contact">
          <Para>
            For privacy questions, data requests, or to delete your account, contact us at:
          </Para>
          <Para>privacy@continuum-health.app</Para>
          <Para>Continuum Health, Inc. · San Francisco, CA</Para>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    gap: Spacing[1],
  },
  updated: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginBottom: Spacing[4],
  },
  section: { gap: Spacing[3], marginBottom: Spacing[6] },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  para: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2] },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
