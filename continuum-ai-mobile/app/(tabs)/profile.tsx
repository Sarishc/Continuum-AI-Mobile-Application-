import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActionSheetIOS,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useHealth } from '../../hooks/useHealth';
import { useHealthStore } from '../../store/healthStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { Avatar } from '../../components/ui/Avatar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SettingsRow } from '../../components/ui/SettingsRow';
import { EditProfileSheet } from '../../components/ui/EditProfileSheet';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';
import type { SeverityLevel } from '../../types';

// ─── Completion ring ──────────────────────────────────────────────────────────

const RING_SIZE = 48;
const RING_STROKE = 4;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CompletionRing({ percent }: { percent: number }) {
  const dash = (percent / 100) * CIRCUMFERENCE;
  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke={Colors.border}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke={Colors.primary}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
        strokeLinecap="round"
      />
      {/* Percent text drawn outside SVG via absolute View */}
    </Svg>
  );
}

function CompletionWidget({ percent }: { percent: number }) {
  return (
    <View style={ringStyles.wrap}>
      <CompletionRing percent={percent} />
      <View style={ringStyles.label}>
        <Text style={ringStyles.labelText}>{percent}%</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { width: RING_SIZE, height: RING_SIZE, position: 'relative' },
  label: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },
});

// ─── Profile header card ──────────────────────────────────────────────────────

interface ProfileHeaderCardProps {
  name: string;
  email: string;
  conditionCount: number;
  medicationCount: number;
  allergyCount: number;
  memberSince: string;
  isPro: boolean;
  onEditPress: () => void;
}

function ProfileHeaderCard({
  name,
  email,
  conditionCount,
  medicationCount,
  allergyCount,
  memberSince,
  isPro,
  onEditPress,
}: ProfileHeaderCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={headerCardStyles.card}>
      {/* Blue radial glow top-right */}
      <View style={headerCardStyles.glowWrap} pointerEvents="none">
        <View style={headerCardStyles.glow} />
      </View>

      {/* Identity row */}
      <View style={headerCardStyles.identityRow}>
        <View style={headerCardStyles.avatarWrap}>
          <LinearGradient colors={Colors.gradientElectric} style={headerCardStyles.avatarGradient}>
            <Text style={headerCardStyles.avatarInitials}>
              {name
                ? name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                : '?'}
            </Text>
          </LinearGradient>
        </View>
        <View style={headerCardStyles.identityText}>
          <View style={headerCardStyles.nameRow}>
            <Text style={headerCardStyles.name}>{name || '—'}</Text>
            {isPro && (
              <View style={headerCardStyles.proBadge}>
                <Text style={headerCardStyles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={headerCardStyles.email}>{email || '—'}</Text>
        </View>
      </View>

      {/* Health stat pills */}
      <View style={headerCardStyles.pillsRow}>
        <StatPill emoji="🫀" label={`${conditionCount} Condition${conditionCount !== 1 ? 's' : ''}`} muted={conditionCount === 0} />
        <StatPill emoji="💊" label={`${medicationCount} Medication${medicationCount !== 1 ? 's' : ''}`} muted={medicationCount === 0} />
        <StatPill emoji="⚠️" label={`${allergyCount} Allerg${allergyCount !== 1 ? 'ies' : 'y'}`} muted={allergyCount === 0} />
      </View>

      {/* Footer row */}
      <View style={headerCardStyles.footer}>
        <Text style={headerCardStyles.memberSince}>Member since {memberSince}</Text>
        <TouchableOpacity onPress={onEditPress} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={headerCardStyles.editLink}>Edit Profile →</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function StatPill({ emoji, label, muted }: { emoji: string; label: string; muted: boolean }) {
  return (
    <View style={[headerCardStyles.pill, muted && headerCardStyles.pillMuted]}>
      <Text style={headerCardStyles.pillEmoji}>{emoji}</Text>
      <Text style={[headerCardStyles.pillText, muted && { color: Colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const headerCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[5],
    gap: Spacing[4],
    overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  proBadge: {
    backgroundColor: Colors.electric,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  proBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  glowWrap: { position: 'absolute', top: -40, right: -40, width: 160, height: 160 },
  glow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.electricMist,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  avatarWrap: { borderRadius: 36, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 }, android: { elevation: 6 }, default: {} }) },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: FontFamily.displayBold,
    color: '#FFFFFF',
  },
  identityText: { flex: 1, gap: 3 },
  name: { fontSize: FontSize['2xl'], fontFamily: FontFamily.display, color: Colors.textPrimary },
  email: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary },
  pillsRow: { flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillMuted: { opacity: 0.6 },
  pillEmoji: { fontSize: 12 },
  pillText: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyMedium, color: Colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberSince: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted },
  editLink: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.primary },
});


// ─── Health profile section cards ────────────────────────────────────────────

function ConditionPill({ label }: { label: string }) {
  return (
    <View style={healthCardStyles.condPill}>
      <Text style={healthCardStyles.condPillText}>{label}</Text>
    </View>
  );
}

function MedPill({ label }: { label: string }) {
  return (
    <View style={healthCardStyles.medPill}>
      <Text style={healthCardStyles.medPillText}>{label}</Text>
    </View>
  );
}

function AllergyPill({ label }: { label: string }) {
  return (
    <View style={healthCardStyles.allergyPill}>
      <Text style={healthCardStyles.allergyPillText}>{label}</Text>
    </View>
  );
}

interface HealthDataCardProps {
  title: string;
  onEdit: () => void;
  empty: boolean;
  emptyLabel: string;
  addLabel: string;
  children: React.ReactNode;
}

function HealthDataCard({ title, onEdit, empty, emptyLabel, addLabel, children }: HealthDataCardProps) {
  return (
    <View style={healthCardStyles.card}>
      <View style={healthCardStyles.cardHeader}>
        <Text style={healthCardStyles.cardTitle}>{title}</Text>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={healthCardStyles.editBtn}>Edit</Text>
        </TouchableOpacity>
      </View>
      {empty ? (
        <View style={healthCardStyles.emptyRow}>
          <Text style={healthCardStyles.emptyText}>{emptyLabel}</Text>
          <TouchableOpacity onPress={onEdit}>
            <Text style={healthCardStyles.addLink}>{addLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={healthCardStyles.pillsWrap}>{children}</View>
      )}
    </View>
  );
}

const healthCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bodySemiBold, color: Colors.textPrimary },
  editBtn: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.primary },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  emptyText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted, fontStyle: 'italic' },
  addLink: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.primary },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  condPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.electricMist,
    borderWidth: 1,
    borderColor: 'rgba(56,139,253,0.3)',
  },
  condPillText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.primary },
  medPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(63,185,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(63,185,80,0.3)',
  },
  medPillText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.accent },
  allergyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(210,153,34,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(210,153,34,0.3)',
  },
  allergyPillText: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyMedium, color: Colors.warning },
});

// ─── Modals ───────────────────────────────────────────────────────────────────

interface CenteredModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function CenteredModal({ visible, onClose, children }: CenteredModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={modalStyles.centeredView} pointerEvents="box-none">
        <View style={modalStyles.card}>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={modalStyles.closeBtnText}>×</Text>
          </TouchableOpacity>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  centeredView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[6],
    gap: Spacing[3],
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
  },
  closeBtnText: {
    fontSize: 24,
    color: Colors.textSecondary,
    lineHeight: 28,
  },
});

function PrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <CenteredModal visible={visible} onClose={onClose}>
      <Text style={modalTextStyles.title}>Privacy & Security</Text>
      <Text style={modalTextStyles.body}>
        Your health data is stored securely and never shared with third parties without your explicit consent.
      </Text>
      <Text style={modalTextStyles.body}>
        All AI analysis is performed using encrypted connections. Your data is end-to-end encrypted at rest and in transit.
      </Text>
      <Text style={modalTextStyles.body}>
        You can export or delete your data at any time from this screen.
      </Text>
    </CenteredModal>
  );
}

function AboutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <CenteredModal visible={visible} onClose={onClose}>
      <View style={aboutStyles.logoWrap}>
        <LinearGradient colors={Colors.gradientElectric} style={aboutStyles.logo}>
          <Text style={aboutStyles.logoText}>C</Text>
        </LinearGradient>
      </View>
      <Text style={aboutStyles.appName}>Continuum AI</Text>
      <Text style={aboutStyles.version}>Version 1.0.0</Text>
      <Text style={aboutStyles.tagline}>Built to help you understand your health.</Text>
      <Text style={aboutStyles.copyright}>© 2026 Continuum Health, Inc.</Text>
    </CenteredModal>
  );
}

const modalTextStyles = StyleSheet.create({
  title: { fontSize: FontSize.lg, fontFamily: FontFamily.display, color: Colors.textPrimary, marginTop: Spacing[2] },
  body: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, lineHeight: 21 },
});

const aboutStyles = StyleSheet.create({
  logoWrap: { alignItems: 'center', marginTop: Spacing[2] },
  logo: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 32, fontFamily: FontFamily.display, color: '#FFFFFF' },
  appName: { fontSize: FontSize['2xl'], fontFamily: FontFamily.display, color: Colors.textPrimary, textAlign: 'center' },
  version: { fontSize: FontSize.sm, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
  tagline: { fontSize: FontSize.md, fontFamily: FontFamily.bodyRegular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  copyright: { fontSize: FontSize.xs, fontFamily: FontFamily.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
});


// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { healthProfile, timeline, engineMode, setEngineMode } = useHealthStore();
  const { isPro } = useSubscriptionStore();
  const { refetchAll } = useHealth();

  const [editOpen, setEditOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Notification toggles (local state)
  const [notifHealthAlerts, setNotifHealthAlerts] = useState(true);
  const [notifWeeklySummary, setNotifWeeklySummary] = useState(true);
  const [notifMedReminders, setNotifMedReminders] = useState(false);
  const [notifDoctorFollowups, setNotifDoctorFollowups] = useState(true);

  const handleToggle = useCallback((setter: (v: boolean) => void, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(!value);
  }, []);

  const profile = healthProfile;
  const conditions = profile?.conditions ?? [];
  const medications = profile?.medications ?? [];
  const allergies = profile?.allergies ?? [];

  // Completion % calculation
  const completionPct = (() => {
    let pct = 0;
    if (user?.name) pct += 25;
    if (conditions.length > 0) pct += 25;
    if (medications.length > 0) pct += 25;
    if (timeline.length >= 2) pct += 25;
    return pct;
  })();
  const showCompletionBanner = completionPct < 100;

  // Member since from user.createdAt or fallback
  const memberSince = (() => {
    try {
      const d = new Date((user as any)?.createdAt ?? Date.now());
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'April 2026';
    }
  })();

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out?',
      "You'll need to sign in again to access your health data.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  }, [logout]);

  const handleEngineMode = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Default AI Engine',
          options: ['AI Mode', 'Rule Engine', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) setEngineMode('ai');
          if (idx === 1) setEngineMode('rule');
        }
      );
    } else {
      Alert.alert('Default AI Engine', 'Select engine', [
        { text: 'AI Mode', onPress: () => setEngineMode('ai') },
        { text: 'Rule Engine', onPress: () => setEngineMode('rule') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [setEngineMode]);

  const handleExport = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Export Health Data',
          options: ['Export as PDF', 'Export as JSON', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0 || idx === 1) {
            Alert.alert('Coming Soon', 'Export feature coming soon.');
          }
        }
      );
    } else {
      Alert.alert('Export Health Data', 'Select format', [
        { text: 'Export as PDF', onPress: () => Alert.alert('Coming Soon', 'Export feature coming soon.') },
        { text: 'Export as JSON', onPress: () => Alert.alert('Coming Soon', 'Export feature coming soon.') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, []);

  const engineLabel = engineMode === 'ai' ? 'AI Mode' : 'Rule Engine';

  return (
    <View style={[profileStyles.root, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        contentContainerStyle={[profileStyles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={profileStyles.pageHeader}>
          <Text style={profileStyles.pageTitle}>Profile</Text>
        </View>

        {/* ── Profile header card ──────────────────────────────── */}
        <ProfileHeaderCard
          name={user?.name ?? ''}
          email={user?.email ?? ''}
          conditionCount={conditions.length}
          medicationCount={medications.length}
          allergyCount={allergies.length}
          memberSince={memberSince}
          isPro={isPro}
          onEditPress={() => setEditOpen(true)}
        />

        {/* ── Upgrade prompt (free users only) ─────────────────── */}
        {!isPro && (
          <Animated.View entering={FadeInUp.delay(60).duration(320)}>
            <TouchableOpacity
              onPress={() => router.push('/paywall' as any)}
              activeOpacity={0.88}
              style={profileStyles.upgradeCard}
            >
              <View style={profileStyles.upgradeLeft}>
                <Text style={profileStyles.upgradeIcon}>⚡</Text>
                <View>
                  <Text style={profileStyles.upgradeTitle}>Upgrade to Pro</Text>
                  <Text style={profileStyles.upgradeSub}>
                    Unlock unlimited entries and AI mode
                  </Text>
                </View>
              </View>
              <Text style={profileStyles.upgradeArrow}>See Plans →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Completion banner ─────────────────────────────────── */}
        {showCompletionBanner && (
          <Animated.View entering={FadeInUp.delay(120).duration(320)} style={profileStyles.completionBanner}>
            <View style={profileStyles.completionLeft}>
              <CompletionWidget percent={completionPct} />
            </View>
            <View style={profileStyles.completionRight}>
              <Text style={profileStyles.completionTitle}>Complete your health profile</Text>
              <Text style={profileStyles.completionSub}>Get more accurate insights by adding your health data</Text>
              <TouchableOpacity onPress={() => setEditOpen(true)}>
                <Text style={profileStyles.completionLink}>Continue setup →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Health Profile section ───────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(160).duration(320)} style={profileStyles.section}>
          <SectionHeader title="Health Profile" />

          <HealthDataCard
            title="Conditions"
            onEdit={() => setEditOpen(true)}
            empty={conditions.length === 0}
            emptyLabel="No conditions added"
            addLabel="+ Add condition"
          >
            {conditions.map((c) => <ConditionPill key={c} label={c} />)}
          </HealthDataCard>

          <HealthDataCard
            title="Medications"
            onEdit={() => setEditOpen(true)}
            empty={medications.length === 0}
            emptyLabel="No medications added"
            addLabel="+ Add medication"
          >
            {medications.map((m) => (
              <MedPill key={m.id} label={`${m.name} ${m.dosage}`.trim()} />
            ))}
          </HealthDataCard>

          <HealthDataCard
            title="Allergies"
            onEdit={() => setEditOpen(true)}
            empty={allergies.length === 0}
            emptyLabel="No allergies recorded"
            addLabel="+ Add allergy"
          >
            {allergies.map((a) => <AllergyPill key={a} label={a} />)}
          </HealthDataCard>
        </Animated.View>

        {/* ── Notifications section ────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(220).duration(320)} style={profileStyles.section}>
          <SectionHeader title="Notifications" />
          <View style={profileStyles.card}>
            <SettingsRow
              icon="🔔"
              label="Health Alerts"
              sublabel="Critical and high severity insights"
              rightElement={
                <Switch
                  value={notifHealthAlerts}
                  onValueChange={() => handleToggle(setNotifHealthAlerts, notifHealthAlerts)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
              showChevron={false}
            />
            <SettingsRow
              icon="📊"
              label="Weekly Summary"
              sublabel="Your health trends every Sunday"
              rightElement={
                <Switch
                  value={notifWeeklySummary}
                  onValueChange={() => handleToggle(setNotifWeeklySummary, notifWeeklySummary)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
              showChevron={false}
            />
            <SettingsRow
              icon="💊"
              label="Medication Reminders"
              sublabel="Daily reminders for your medications"
              rightElement={
                <Switch
                  value={notifMedReminders}
                  onValueChange={() => handleToggle(setNotifMedReminders, notifMedReminders)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
              showChevron={false}
            />
            <SettingsRow
              icon="🩺"
              label="Doctor Follow-ups"
              sublabel="Reminders for recommended appointments"
              rightElement={
                <Switch
                  value={notifDoctorFollowups}
                  onValueChange={() => handleToggle(setNotifDoctorFollowups, notifDoctorFollowups)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#FFFFFF"
                />
              }
              showChevron={false}
              showDivider={false}
            />
          </View>
        </Animated.View>

        {/* ── Preferences section ──────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(280).duration(320)} style={profileStyles.section}>
          <SectionHeader title="Preferences" />
          <View style={profileStyles.card}>
            <SettingsRow
              icon="⚡"
              label="Subscription"
              sublabel={isPro ? 'Continuum Pro' : 'Free Plan'}
              onPress={() => router.push('/paywall' as any)}
              rightElement={
                isPro ? (
                  <View style={profileStyles.activeProBadge}>
                    <Text style={profileStyles.activeProText}>Active ✓</Text>
                  </View>
                ) : (
                  <Text style={profileStyles.upgradeLink}>Upgrade →</Text>
                )
              }
            />
            <SettingsRow
              icon="🧠"
              label="Default Engine"
              sublabel="Used for new conversations"
              onPress={handleEngineMode}
              rightElement={
                <View style={profileStyles.rowValueWrap}>
                  <Text style={profileStyles.rowValue}>{engineLabel}</Text>
                </View>
              }
            />
            <SettingsRow
              icon="📤"
              label="Export Health Data"
              sublabel="Download all your health records"
              onPress={handleExport}
            />
            <SettingsRow
              icon="🔒"
              label="Privacy & Security"
              sublabel="Data storage and usage"
              onPress={() => setPrivacyOpen(true)}
            />
            <SettingsRow
              icon="ℹ️"
              label="About Continuum"
              sublabel="Version 1.0.0"
              onPress={() => setAboutOpen(true)}
              showDivider={false}
            />
          </View>
        </Animated.View>

        {/* ── Account section ──────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(340).duration(320)} style={profileStyles.section}>
          <SectionHeader title="Account" />
          <View style={profileStyles.card}>
            <SettingsRow
              icon="👤"
              label="Account Settings"
              sublabel={user?.email}
              onPress={() => setEditOpen(true)}
            />
            <SettingsRow
              icon="🔴"
              label="Sign Out"
              onPress={handleSignOut}
              labelColor={Colors.critical}
              showChevron={false}
              showDivider={false}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Sheets + modals ─────────────────────────────────────── */}
      <EditProfileSheet visible={editOpen} onClose={() => setEditOpen(false)} />
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <AboutModal visible={aboutOpen} onClose={() => setAboutOpen(false)} />
    </View>
  );
}

const profileStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[5],
    paddingTop: Spacing[4],
  },
  pageHeader: { paddingBottom: Spacing[1] },
  pageTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
  },
  // Upgrade card (free users)
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.electricMist,
    borderWidth: 1,
    borderColor: Colors.electric,
    borderRadius: 12,
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
  },
  upgradeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  upgradeIcon: { fontSize: 20 },
  upgradeTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.electric,
  },
  upgradeSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
    marginTop: 1,
  },
  upgradeArrow: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.electric,
  },
  // Subscription row badges
  activeProBadge: {
    backgroundColor: Colors.positiveGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  activeProText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.positive,
  },
  upgradeLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.electric,
  },
  section: { gap: Spacing[3] },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Completion banner
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: Spacing[4],
  },
  completionLeft: { alignItems: 'center', justifyContent: 'center' },
  completionRight: { flex: 1, gap: 4 },
  completionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  completionSub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  completionLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
    marginTop: 2,
  },

  // Preferences row value
  rowValueWrap: { marginRight: Spacing[2] },
  rowValue: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
});

