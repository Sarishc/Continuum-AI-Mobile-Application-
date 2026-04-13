import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useHealth } from '../../hooks/useHealth';
import { useHealthStore } from '../../store/healthStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useHealthKit } from '../../hooks/useHealthKit';
import { useConsultations } from '../../hooks/useConsultations';
import { useFamily } from '../../hooks/useFamily';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { formatTimeAgo } from '../../utils/formatters';

// ─── SVG icons ────────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={Colors.textTertiary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
}

function SettingsRow({ icon, iconBg, label, value, onPress, rightElement, isLast }: SettingsRowProps) {
  const inner = (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconSquare, { backgroundColor: iconBg }]}>
        <Text style={rowStyles.icon}>{icon}</Text>
      </View>
      <View style={rowStyles.middle}>
        <Text style={rowStyles.label}>{label}</Text>
      </View>
      <View style={rowStyles.right}>
        {!!value && <Text style={rowStyles.value}>{value}</Text>}
        {rightElement ?? <ChevronIcon />}
      </View>
    </View>
  );

  return (
    <>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {inner}
        </TouchableOpacity>
      ) : (
        inner
      )}
      {!isLast && <View style={rowStyles.separator} />}
    </>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconSquare: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 14,
  },
  middle: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '400',
    color: Colors.textPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.35)',
    maxWidth: 160,
    textAlign: 'right',
  },
  separator: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 52,
  },
});

// ─── Settings section ─────────────────────────────────────────────────────────

interface SettingsSectionProps {
  title: string;
  rows: Omit<SettingsRowProps, 'isLast'>[];
}

function SettingsSection({ title, rows }: SettingsSectionProps) {
  return (
    <View>
      <Text style={sectionStyles.label}>{title.toUpperCase()}</Text>
      <View style={sectionStyles.card}>
        {rows.map((row, i) => (
          <SettingsRow key={row.label} {...row} isLast={i === rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
});

// ─── Health stat pill ─────────────────────────────────────────────────────────

function HealthStatPill({ num, label }: { num: string; label: string }) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.num}>{num}</Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  num: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
});

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { healthProfile, timeline, healthScore } = useHealth();
  const { isPro } = useSubscriptionStore();
  const { isAvailable, hasPermission, isSyncing, lastSyncTime, syncHealthData, requestPermission } = useHealthKit();
  const { consultations } = useConsultations();
  const { familyGroup } = useFamily();
  const completedConsultations = consultations.filter((c) => c.status === 'completed');
  const [notifHealthAlerts, setNotifHealthAlerts] = React.useState(true);
  const [notifWeeklyBrief, setNotifWeeklyBrief] = React.useState(true);

  const tabBarH = 49 + Math.max(insets.bottom, 0);

  const firstName = user?.name?.split(' ')[0] ?? 'User';
  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMMM yyyy')
    : 'Recently';

  // Days since first entry for share progress text
  const daysSinceStart = useMemo(() => {
    if (!user?.createdAt) return 0;
    const diff = Date.now() - new Date(user.createdAt).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [user?.createdAt]);

  const conditions = healthProfile?.conditions ?? [];
  const medications = healthProfile?.medications ?? [];
  const allergies = healthProfile?.allergies ?? [];

  const conditionsStr = conditions.slice(0, 2).join(', ') || '—';
  const medsStr = medications.length > 0 ? `${medications.length} medication${medications.length > 1 ? 's' : ''}` : '—';
  const allergiesStr = allergies.slice(0, 2).join(', ') || '—';
  const ageStr = healthProfile?.age ? String(healthProfile.age) : '—';
  const sexStr = healthProfile?.sex ?? '—';

  const handleSignOut = async () => {
    await logout();
    // Clear health store local state
    useHealthStore.getState().reset();
    router.replace('/(auth)/login');
  };

  const handleShareProgress = async () => {
    const entryCount = timeline?.length ?? 0;
    const score = healthScore ?? 0;
    const message = `I've been tracking my health with Continuum AI for ${daysSinceStart} day${daysSinceStart !== 1 ? 's' : ''}.\nHealth score: ${score > 0 ? `${score}/100` : 'building...'} · ${entryCount} health ${entryCount === 1 ? 'entry' : 'entries'} logged.\nGet personalized health insights: continuum-health.app`;
    try {
      await Share.share({ message });
    } catch { /* ignore */ }
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: tabBarH + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </Animated.View>

        {/* Profile hero card */}
        <Animated.View entering={FadeInDown.delay(60).duration(280)} style={styles.heroCard}>
          {/* Avatar + name row */}
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroName}>{user?.name ?? 'Alex Johnson'}</Text>
              <Text style={styles.heroEmail}>{user?.email ?? 'alex@example.com'}</Text>
              <Text style={styles.heroMember}>Member since {memberSince}</Text>
            </View>
          </View>

          {/* Thin separator */}
          <View style={styles.heroSep} />

          {/* 3 health stats */}
          <View style={styles.statsRow}>
            <HealthStatPill num={String(conditions.length)} label="Conditions" />
            <View style={styles.statDivider} />
            <HealthStatPill num={String(medications.length)} label="Medications" />
            <View style={styles.statDivider} />
            <HealthStatPill num={String(allergies.length)} label="Allergies" />
          </View>
        </Animated.View>

        <View style={styles.gap} />

        {/* Health summary */}
        <Animated.View entering={FadeInDown.delay(100).duration(280)}>
          <SettingsSection
            title="Health Details"
            rows={[
              { icon: '🩺', iconBg: '#2563EB20', label: 'Conditions', value: conditionsStr, onPress: () => {} },
              { icon: '💊', iconBg: '#BF5AF220', label: 'Medications', value: medsStr, onPress: () => {} },
              { icon: '⚠️', iconBg: '#FF9F0A20', label: 'Allergies', value: allergiesStr, onPress: () => {} },
              { icon: '📅', iconBg: '#30D15820', label: 'Age', value: ageStr, onPress: () => {} },
              { icon: '👤', iconBg: '#4C8DFF20', label: 'Biological Sex', value: sexStr, onPress: () => {} },
            ]}
          />
        </Animated.View>

        <View style={styles.gap} />

        {/* Family */}
        <Animated.View entering={FadeInDown.delay(135).duration(280)}>
          <SettingsSection
            title="Family"
            rows={[
              {
                icon: '👨‍👩‍👧‍👦',
                iconBg: '#4C8DFF20',
                label: familyGroup ? familyGroup.name : 'Family Health Plan',
                value: familyGroup
                  ? `${familyGroup.members.filter((m) => m.status === 'active').length} members`
                  : 'Monitor your family\'s health together',
                onPress: () => router.push('/family' as any),
                rightElement: familyGroup ? (
                  <Text style={{ fontSize: 13, color: '#4C8DFF' }}>Manage →</Text>
                ) : (
                  <Text style={{ fontSize: 13, color: '#30D158', fontWeight: '500' }}>$29.99/mo</Text>
                ),
              },
            ]}
          />
        </Animated.View>

        <View style={styles.gap} />

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(140).duration(280)}>
          <SettingsSection
            title="Notifications"
            rows={[
              {
                icon: '🔔',
                iconBg: '#FF453A20',
                label: 'Health Alerts',
                rightElement: (
                  <Switch
                    value={notifHealthAlerts}
                    onValueChange={setNotifHealthAlerts}
                    trackColor={{ false: Colors.elevated, true: Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                ),
              },
              {
                icon: '📊',
                iconBg: '#BF5AF220',
                label: 'Weekly Brief',
                rightElement: (
                  <Switch
                    value={notifWeeklyBrief}
                    onValueChange={setNotifWeeklyBrief}
                    trackColor={{ false: Colors.elevated, true: Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                ),
              },
            ]}
          />
        </Animated.View>

        <View style={styles.gap} />

        {/* Consultations */}
        {completedConsultations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(155).duration(280)}>
            <Text style={sectionStyles.label}>CONSULTATIONS</Text>
            <View style={sectionStyles.card}>
              {completedConsultations.slice(0, 3).map((c, i) => (
                <View key={c.id} style={{
                  padding: 16,
                  borderBottomWidth: i < Math.min(completedConsultations.length, 3) - 1 ? 0.5 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.07)',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Text style={{ fontSize: 20 }}>👩‍⚕️</Text>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#FFFFFF' }}>
                      {c.doctorResponse?.doctorName ?? 'Dr. Sarah Chen, MD'}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
                      {formatTimeAgo(c.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 18 }} numberOfLines={2}>
                    {c.insightText}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={styles.gap} />

        {/* Integrations — Apple Health (iOS only) */}
        {isAvailable && (
          <Animated.View entering={FadeInDown.delay(160).duration(280)}>
            <Text style={sectionStyles.label}>INTEGRATIONS</Text>
            <View style={sectionStyles.card}>
              <SettingsRow
                icon="❤️"
                iconBg="rgba(255,45,85,0.12)"
                label="Apple Health"
                value={
                  hasPermission
                    ? isSyncing
                      ? 'Syncing...'
                      : lastSyncTime
                        ? `Synced ${formatTimeAgo(lastSyncTime)}`
                        : 'Connected'
                    : 'Not connected'
                }
                onPress={hasPermission ? syncHealthData : requestPermission}
                rightElement={
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: hasPermission ? '#30D158' : '#4C8DFF',
                  }}>
                    {hasPermission ? 'Connected ✓' : 'Connect'}
                  </Text>
                }
                isLast
              />
            </View>
          </Animated.View>
        )}

        <View style={styles.gap} />

        {/* Account */}
        <Animated.View entering={FadeInDown.delay(180).duration(280)}>
          <SettingsSection
            title="Account"
            rows={[
              { icon: '⭐', iconBg: '#FFD60A20', label: isPro ? 'Pro Plan' : 'Upgrade to Pro', value: isPro ? 'Active' : '', onPress: () => router.push('/paywall' as any) },
              { icon: '📤', iconBg: '#30D15820', label: 'Share Progress', onPress: handleShareProgress },
              { icon: '🎁', iconBg: '#30D15820', label: 'Invite Friends', onPress: () => router.push('/referral' as any) },
              { icon: '📋', iconBg: '#4C8DFF20', label: 'Weekly Brief', onPress: () => router.push('/weekly-brief' as any) },
              { icon: '📄', iconBg: '#FF9F0A20', label: 'Report Card', onPress: () => router.push('/report-card' as any) },
            ]}
          />
        </Animated.View>

        <View style={styles.gap} />

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(220).duration(280)}>
          <View style={styles.signOutCard}>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn} activeOpacity={0.75}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 16 }} />

        <Text style={styles.version}>Continuum AI v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    gap: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 34,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    gap: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(76,141,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76,141,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4C8DFF',
  },
  heroText: {
    flex: 1,
    gap: 3,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  heroMember: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
  heroSep: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statDivider: {
    width: 0.5,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  gap: {
    height: 24,
  },
  signOutCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.20)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  signOutBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 17,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: Colors.critical,
  },
  version: {
    fontSize: 12,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
