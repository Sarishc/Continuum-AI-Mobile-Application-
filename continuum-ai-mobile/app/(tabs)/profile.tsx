import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useHealthStore } from '../../store/healthStore';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { reset } = useHealthStore();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          reset();
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Card */}
        <Card elevated style={styles.userCard}>
          <View style={styles.userRow}>
            <Avatar name={user?.name} size="lg" />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name ?? '—'}</Text>
              <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            </View>
          </View>
        </Card>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Health Profile</Text>
          <Card noPadding>
            <SettingsRow label="Personal Information" />
            <SettingsRow label="Medical History" />
            <SettingsRow label="Medications" showDivider={false} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <Card noPadding>
            <SettingsRow label="Notifications" />
            <SettingsRow label="Privacy & Data" />
            <SettingsRow label="Export Health Data" showDivider={false} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <Card noPadding>
            <SettingsRow label="Version 1.0.0" chevron={false} />
            <SettingsRow label="Terms of Service" />
            <SettingsRow label="Privacy Policy" showDivider={false} />
          </Card>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  label,
  showDivider = true,
  chevron = true,
}: {
  label: string;
  showDivider?: boolean;
  chevron?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, showDivider && styles.rowDivider]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {chevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing[4], gap: Spacing[5] },
  header: {
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  userCard: { padding: Spacing[4] },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  userInfo: { flex: 1, gap: 4 },
  userName: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  section: { gap: Spacing[2] },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
  },
  chevron: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    lineHeight: 24,
  },
  signOutButton: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.2)',
    borderRadius: BorderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[2],
  },
  signOutLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.critical,
  },
});
