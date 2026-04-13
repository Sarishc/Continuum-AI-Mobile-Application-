import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { FamilyMember } from '@/services/firestoreService';
import { formatTimeAgo } from '@/utils/formatters';

interface Props {
  member: FamilyMember;
  summary?: {
    healthScore: number | null;
    unreadInsights: number;
    lastEntry: string | null;
    medicationAdherence: number | null;
  };
  isCurrentUser: boolean;
  isOwner: boolean;
}

const ROLE_CONFIG: Record<
  FamilyMember['role'],
  { label: string; bg: string; color: string }
> = {
  owner:     { label: 'Owner',     bg: 'rgba(76,141,255,0.15)',  color: '#4C8DFF' },
  caregiver: { label: 'Caregiver', bg: 'rgba(48,209,88,0.15)',   color: '#30D158' },
  member:    { label: 'Member',    bg: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)' },
  dependent: { label: 'Dependent', bg: 'rgba(255,159,10,0.15)',  color: '#FF9F0A' },
};

export function FamilyMemberCard({ member, summary, isCurrentUser, isOwner }: Props) {
  const roleConf = ROLE_CONFIG[member.role];
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: member.avatarColor + '25' }]}>
        <Text style={[styles.avatarText, { color: member.avatarColor }]}>{initial}</Text>
        {/* Status dot */}
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                member.status === 'active'
                  ? '#30D158'
                  : member.status === 'invited'
                  ? '#FF9F0A'
                  : 'rgba(255,255,255,0.25)',
            },
          ]}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {member.name}
            {isCurrentUser && (
              <Text style={styles.youBadge}> (you)</Text>
            )}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: roleConf.bg }]}>
            <Text style={[styles.roleText, { color: roleConf.color }]}>
              {roleConf.label}
            </Text>
          </View>
        </View>

        {member.status === 'active' && summary?.lastEntry ? (
          <Text style={styles.meta}>
            Active {formatTimeAgo(summary.lastEntry)}
          </Text>
        ) : member.status === 'invited' ? (
          <Text style={[styles.meta, { color: '#FF9F0A' }]}>Invited · Awaiting join</Text>
        ) : member.status === 'pending' ? (
          <Text style={styles.meta}>Pending</Text>
        ) : null}
      </View>

      {/* Right: health score or lock */}
      <View style={styles.right}>
        {member.status === 'active' && summary && member.permissions.canViewHealthScore && summary.healthScore ? (
          <View style={styles.scoreWrap}>
            <Text
              style={[
                styles.scoreNum,
                { color: summary.healthScore >= 70 ? '#30D158' : '#FF9F0A' },
              ]}
            >
              {summary.healthScore}
            </Text>
            <Text style={styles.scoreSlash}>/100</Text>
          </View>
        ) : member.status === 'active' && !member.permissions.canViewHealthScore ? (
          <Text style={styles.lockIcon}>🔒</Text>
        ) : null}

        {member.status === 'active' && (summary?.unreadInsights ?? 0) > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>{summary!.unreadInsights}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 20,
    marginBottom: 2,
    borderRadius: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {
    fontSize: 17, fontWeight: '700',
  },
  statusDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: '#080808',
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  youBadge: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '400' },
  roleBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
  },
  roleText: { fontSize: 11, fontWeight: '600' },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  right: { alignItems: 'flex-end', gap: 4 },
  scoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  scoreNum: { fontSize: 22, fontWeight: '700' },
  scoreSlash: { fontSize: 11, color: 'rgba(255,255,255,0.30)' },
  lockIcon: { fontSize: 16 },
  alertBadge: {
    backgroundColor: 'rgba(255,159,10,0.20)',
    borderRadius: 999,
    minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  alertText: { fontSize: 11, fontWeight: '700', color: '#FF9F0A' },
});
